function opposingTeam(team) {
  return team === 'player' ? 'enemy' : 'player';
}

function teamMana(team) {
  return team === 'player' ? state.mana : state.enemyMana;
}

function spendMana(team, amount) {
  if (team === 'player') state.mana -= amount;
  else state.enemyMana -= amount;
}

function foeNexusOf(team) {
  const living = livingNexuses(opposingTeam(team));
  return living.length ? living[0] : NEXUS[opposingTeam(team)][0];
}

function nearestFoeNexus(fromWizard, team) {
  const living = livingNexuses(opposingTeam(team));
  if (!living.length) return NEXUS[opposingTeam(team)][0];
  let best = living[0];
  let bestD = manhattan(fromWizard.row, fromWizard.col, best.row, best.col);
  for (let i = 1; i < living.length; i++) {
    const d = manhattan(fromWizard.row, fromWizard.col, living[i].row, living[i].col);
    if (d < bestD) {
      bestD = d;
      best = living[i];
    }
  }
  return best;
}

function isFoeNexusAt(row, col, team) {
  const n = nexusAt(row, col);
  return !!(n && n.team === opposingTeam(team) && n.hp > 0);
}

function ownNexusOf(team) {
  return NEXUS[team][0];
}

function nexusId(nex) {
  return nex && nex.id;
}

function resetNexuses() {
  eachNexus(function (n) {
    n.hp = n.maxHp;
  });
}

function resetMatch(seed) {
  seed = (seed >>> 0) || 1;
  state.seed = seed;
  state.rng = createRng(seed);
  state.wizards = {};
  state.nextId = 1;
  state.selectedWizardId = null;
  state.selectedAction = 'move';
  state.animating = false;
  state.turnCount = 1;
  state.currentTurn = 'player';
  state.firstPlayerTurnDone = false;
  state.firstEnemyTurnDone = false;
  state.gameOverResult = null;
  state.placingWizardId = null;
  state.trails = {};
  state.mountains = {};
  state.tempMountains = {};
  state.water = {};
  state.voids = {};
  state.portals = {};
  state.mana = STARTING_MANA;
  state.maxMana = STARTING_MANA;
  state.enemyMana = STARTING_MANA;
  state.enemyMaxMana = STARTING_MANA;
  state.log = [];
  state.matchId = (state.matchId || 0) + 1;
  resetNexuses();
  generateTerrain();
  seedRosters();
}

function present(events) {
  if (!events) events = [];
  for (let i = 0; i < events.length; i++) state.log.push(events[i]);
  if (state.fxEnabled && typeof playEvents === 'function') {
    if (!events.length) return Promise.resolve();
    state.animating = true;
    return playEvents(events).catch(function (err) {
      console.error(err);
      state.animating = false;
    });
  }
  return Promise.resolve();
}

function maybeWait(ms) {
  if (!state.fxEnabled) return Promise.resolve();
  return sleep(ms);
}

function teamHasPresence(team) {
  return Object.values(state.wizards).some(w =>
    w.team === team && (w.state === 'onboard' || w.state === 'summoned' || w.state === 'portaling')
  );
}

function checkWinLoss() {
  const mineDead = teamNexusesFallen('player');
  const enemyDead = teamNexusesFallen('enemy');
  if (mineDead && enemyDead) return 'draw';

  const playerWiped = mineDead || !teamHasPresence('player');
  const enemyWiped = enemyDead || !teamHasPresence('enemy');

  if (playerWiped && enemyWiped) return 'draw';
  if (playerWiped) return 'enemy';
  if (enemyWiped) return 'player';
  return null;
}

function resetActionFlagsFor(team) {
  Object.values(state.wizards).forEach(w => {
    if (w.state === 'onboard' && w.team === team) {
      w.hasMoved = false;
      w.summoningSickness = false;
      if (w.silenced) {
        w.hasAttacked = true;
        w.silenced = false;
      } else {
        w.hasAttacked = false;
      }
    }
  });
}

function applySilence(wizard) {
  if (!wizard || wizard.state !== 'onboard') return;
  if (wizard.team === state.currentTurn && !wizard.hasAttacked) {
    wizard.hasAttacked = true;
    wizard.silenced = false;
    return;
  }
  wizard.silenced = true;
}

function canMove(wizard) {
  return !!(wizard && wizard.state === 'onboard' && !wizard.hasMoved);
}

function canAttack(wizard) {
  return !!(wizard && wizard.state === 'onboard' && !wizard.hasAttacked);
}

function playerHasLegalAction() {
  if (state.gameOverResult || state.currentTurn !== 'player') return false;
  if (state.placingWizardId && getPlayerSummonTiles().length) return true;

  const canPortal = Object.values(state.wizards).some(w =>
    w.team === 'player' && w.state === 'summoned' && state.mana >= w.cost
  );
  if (canPortal && getPlayerSummonTiles().length) return true;

  const onboard = Object.values(state.wizards).filter(w =>
    w.team === 'player' && w.state === 'onboard'
  );
  for (let i = 0; i < onboard.length; i++) {
    const w = onboard[i];
    if (canMove(w) && getMoveTiles(w).length) return true;
    if (canAttack(w) && (getMeleeTiles(w).length || getCastTiles(w).length)) return true;
  }
  return false;
}

function directionBetween(fromRow, fromCol, toRow, toCol) {
  return {
    dr: Math.sign(toRow - fromRow),
    dc: Math.sign(toCol - fromCol)
  };
}

function getDisplacementPath(target, dr, dc, amount) {
  if (amount === 0) return { path: [], tilesShort: 0, crash: null };
  const dir = amount > 0 ? 1 : -1;
  let remaining = Math.abs(amount);
  const path = [];
  let curRow = target.row, curCol = target.col;
  let guard = 0;
  while (remaining > 0 && guard++ < BOARD_SIZE + 2) {
    const nr = curRow + dr * dir;
    const nc = curCol + dc * dir;
    const crash = crashObstacle(nr, nc);
    if (crash) {
      return { path, tilesShort: remaining, crash: crash };
    }
    path.push({ row: nr, col: nc });
    curRow = nr;
    curCol = nc;
    const trail = trailAt(nr, nc);
    if (!(trail && trail.element === 'ice')) remaining -= 1;
  }
  return { path, tilesShort: 0, crash: null };
}

function crashObstacle(row, col) {
  if (!inBounds(row, col)) return { kind: 'wall', row: row, col: col };
  const w = wizardAt(row, col);
  if (w) return { kind: 'wizard', wizardId: w.id, row: row, col: col };
  const n = nexusAt(row, col);
  if (n) return { kind: 'nexus', nexusId: n.id, row: row, col: col };
  if (mountainAt(row, col)) {
    return { kind: 'wall', row: row, col: col };
  }
  return null;
}

function simKill(wizard) {
  if (!wizard || wizard.state === 'dead' || wizard.hp > 0) return null;
  const ev = {
    type: 'death',
    wizardId: wizard.id,
    row: wizard.row,
    col: wizard.col,
    element: wizard.element,
    team: wizard.team
  };
  wizard.hp = 0;
  wizard.state = 'dead';
  wizard.row = null;
  wizard.col = null;
  if (state.selectedWizardId === wizard.id) state.selectedWizardId = null;
  return ev;
}

function applyHazardEnter(wizard) {
  const events = [];
  if (!wizard || wizard.state !== 'onboard') return events;
  const cause = voidAt(wizard.row, wizard.col) ? 'void' : (waterAt(wizard.row, wizard.col) ? 'water' : null);
  if (!cause) return events;
  const amount = Math.max(1, wizard.hp);
  wizard.hp = 0;
  events.push({
    type: 'damage',
    targetKind: 'wizard',
    targetId: wizard.id,
    amount: amount,
    row: wizard.row,
    col: wizard.col,
    cause: cause
  });
  const death = simKill(wizard);
  if (death) {
    death.cause = cause;
    events.push(death);
  }
  return events;
}

function applyTileEnter(wizard) {
  const events = applyHazardEnter(wizard);
  if (!wizard || wizard.state !== 'onboard') return events;
  events.push.apply(events, applyFireEnter(wizard));
  return events;
}

function hurtNexus(nexus, amount, cause) {
  const events = [];
  if (!nexus || nexus.hp <= 0) return events;
  nexus.hp = Math.max(0, nexus.hp - amount);
  events.push({
    type: 'damage',
    targetKind: 'nexus',
    targetId: nexusId(nexus),
    amount: amount,
    row: nexus.row,
    col: nexus.col,
    cause: cause
  });
  if (nexus.hp <= 0) {
    openVoid(nexus.row, nexus.col);
    events.push({
      type: 'void',
      row: nexus.row,
      col: nexus.col,
      nexusId: nexus.id,
      team: nexus.team
    });
  }
  return events;
}

function applyFireEnter(wizard) {
  const events = [];
  if (!wizard || wizard.state !== 'onboard') return events;
  const trail = trailAt(wizard.row, wizard.col);
  if (!trail || trail.element !== 'fire') return events;
  wizard.hp -= FIRE_TRAIL_DAMAGE;
  events.push({
    type: 'damage',
    targetKind: 'wizard',
    targetId: wizard.id,
    amount: FIRE_TRAIL_DAMAGE,
    row: wizard.row,
    col: wizard.col,
    cause: 'fire'
  });
  const death = simKill(wizard);
  if (death) events.push(death);
  return events;
}

function applyWindCarry(wizard, dr, dc, travelled) {
  const events = [];
  if (!wizard || wizard.state !== 'onboard') return events;
  if (!dr && !dc) return events;
  let guard = 0;
  while (wizard.state === 'onboard' && guard++ < BOARD_SIZE) {
    const trail = trailAt(wizard.row, wizard.col);
    if (!trail || trail.element !== 'wind') break;
    const nr = wizard.row + dr;
    const nc = wizard.col + dc;
    if (crashObstacle(nr, nc)) break;
    wizard.row = nr;
    wizard.col = nc;
    travelled.push({ row: nr, col: nc });
    events.push.apply(events, applyTileEnter(wizard));
  }
  return events;
}

function simPush(target, dr, dc, amount) {
  const from = { row: target.row, col: target.col };
  const planned = getDisplacementPath(target, dr, dc, amount);
  const events = [];
  const extra = [];
  const travelled = [];
  for (let i = 0; i < planned.path.length; i++) {
    const step = planned.path[i];
    target.row = step.row;
    target.col = step.col;
    travelled.push(step);
    extra.push.apply(extra, applyTileEnter(target));
    if (target.state !== 'onboard') break;
  }
  const finished = travelled.length === planned.path.length && target.state === 'onboard';
  if (finished) {
    extra.push.apply(extra, applyWindCarry(target, dr, dc, travelled));
  }
  events.push({ type: 'push', wizardId: target.id, from: from, path: travelled, tilesShort: planned.tilesShort, crash: planned.crash });
  events.push.apply(events, extra);
  if (finished && planned.crash) {
    events.push.apply(events, applyCrashDamage(target, planned.crash, CRASH_DAMAGE));
  }
  return events;
}

function applyCrashDamage(pushed, crash, amount) {
  const events = [];
  pushed.hp -= amount;
  events.push({
    type: 'damage',
    targetKind: 'wizard',
    targetId: pushed.id,
    amount: amount,
    row: pushed.row,
    col: pushed.col,
    cause: 'crash'
  });
  const death = simKill(pushed);
  if (death) events.push(death);
  if (crash.kind === 'wizard') {
    const other = state.wizards[crash.wizardId];
    if (other && other.state === 'onboard') {
      other.hp -= amount;
      events.push({
        type: 'damage',
        targetKind: 'wizard',
        targetId: other.id,
        amount: amount,
        row: other.row,
        col: other.col,
        cause: 'crash'
      });
      const otherDeath = simKill(other);
      if (otherDeath) events.push(otherDeath);
    }
  }
  if (crash.kind === 'nexus') {
    const n = NEXUS.player.concat(NEXUS.enemy).find(function (x) { return x.id === crash.nexusId; })
      || nexusAt(crash.row, crash.col);
    events.push.apply(events, hurtNexus(n, amount, 'crash'));
  }
  return events;
}

function simSummon(wizard, row, col, team) {
  if (!wizard || wizard.state !== 'summoned' || wizard.team !== team) return [];
  if (teamMana(team) < wizard.cost) return [];
  if (!canOpenPortalAt(row, col)) return [];
  if (team === 'player' && !isSummonTile(row, col)) return [];
  if (team === 'enemy' && !isEnemySummonTile(row, col)) return [];
  spendMana(team, wizard.cost);
  wizard.state = 'portaling';
  wizard.row = row;
  wizard.col = col;
  wizard.hasMoved = false;
  wizard.hasAttacked = false;
  wizard.summoningSickness = false;
  state.portals[row + ',' + col] = {
    row: row,
    col: col,
    wizardId: wizard.id,
    team: team,
    element: wizard.element
  };
  if (team === 'player') state.placingWizardId = null;
  return [{
    type: 'portal',
    wizardId: wizard.id,
    row: row,
    col: col,
    team: team,
    element: wizard.element
  }];
}

function simResolvePortals(team) {
  const events = [];
  Object.keys(state.portals || {}).forEach(function (k) {
    const p = state.portals[k];
    if (!p || p.team !== team) return;
    const wizard = state.wizards[p.wizardId];
    delete state.portals[k];
    if (!wizard || wizard.state !== 'portaling') return;
    const blocker = wizardAt(p.row, p.col);
    if (blocker) {
      events.push({
        type: 'portalBlocked',
        wizardId: wizard.id,
        blockerId: blocker.id,
        row: p.row,
        col: p.col,
        team: team,
        element: wizard.element
      });
      wizard.hp = 0;
      const death = simKill(wizard);
      if (death) {
        death.cause = 'portal';
        events.push(death);
      }
      blocker.hp = 0;
      const bDeath = simKill(blocker);
      if (bDeath) {
        bDeath.cause = 'portal';
        events.push(bDeath);
      }
      return;
    }
    wizard.state = 'onboard';
    wizard.row = p.row;
    wizard.col = p.col;
    wizard.hasMoved = false;
    wizard.hasAttacked = false;
    wizard.summoningSickness = false;
    events.push({
      type: 'summon',
      wizardId: wizard.id,
      row: p.row,
      col: p.col,
      team: team,
      element: wizard.element
    });
    events.push.apply(events, applyTileEnter(wizard));
  });
  return events;
}

function simMove(wizard, path) {
  if (!canMove(wizard)) return [];
  if (!path || !path.length) return [];
  const from = { row: wizard.row, col: wizard.col };
  const travelled = [];
  const extra = [];
  for (let i = 0; i < path.length; i++) {
    const step = path[i];
    wizard.row = step.row;
    wizard.col = step.col;
    travelled.push(step);
    extra.push.apply(extra, applyTileEnter(wizard));
    if (wizard.state !== 'onboard') break;
  }
  if (wizard.state === 'onboard' && travelled.length) {
    const last = travelled[travelled.length - 1];
    const prev = travelled.length >= 2 ? travelled[travelled.length - 2] : from;
    extra.push.apply(extra, applyWindCarry(wizard, last.row - prev.row, last.col - prev.col, travelled));
  }
  wizard.hasMoved = true;
  return [{ type: 'move', wizardId: wizard.id, from: from, path: travelled }].concat(extra);
}

function simAttack(attacker, row, col, kind) {
  if (!canAttack(attacker) || attacker.row === null) return [];
  const legal = kind === 'cast' ? getCastTiles(attacker) : getMeleeTiles(attacker);
  if (!legal.some(t => t.row === row && t.col === col)) return [];

  if (kind === 'cast' && attacker.castKind === 'pulse') return simPulse(attacker, row, col);
  if (kind === 'cast' && attacker.castKind === 'raise') return simRaise(attacker, row, col);
  if (kind === 'cast' && attacker.castKind === 'swap') return simSwap(attacker, row, col);
  return simStrike(attacker, row, col, kind);
}

function simBoltJump(attacker, pathTiles, skipRow, skipCol) {
  const events = [];
  const seeds = [];
  function seedWater(r, c) {
    if (waterAt(r, c)) seeds.push({ row: r, col: c });
  }
  pathTiles.forEach(function (t) {
    seedWater(t.row, t.col);
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) {
      seedWater(t.row + d[0], t.col + d[1]);
    });
  });
  if (!seeds.length) return events;

  const seen = {};
  const waterTiles = [];
  const q = seeds.slice();
  while (q.length) {
    const t = q.pop();
    const key = t.row + ',' + t.col;
    if (seen[key] || !waterAt(t.row, t.col)) continue;
    seen[key] = true;
    waterTiles.push(t);
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) {
      const nr = t.row + d[0];
      const nc = t.col + d[1];
      if (inBounds(nr, nc)) q.push({ row: nr, col: nc });
    });
  }

  const hit = {};
  hit[skipRow + ',' + skipCol] = true;
  function consider(r, c) {
    const key = r + ',' + c;
    if (hit[key]) return;
    hit[key] = true;
    const w = wizardAt(r, c);
    if (w && w.id !== attacker.id && w.state === 'onboard') {
      w.hp -= attacker.castAttack;
      events.push({
        type: 'damage',
        targetKind: 'wizard',
        targetId: w.id,
        amount: attacker.castAttack,
        row: r,
        col: c,
        cause: 'jump'
      });
      applySilence(w);
      events.push({ type: 'silence', targetId: w.id, row: w.row, col: w.col, cause: 'jump' });
      const death = simKill(w);
      if (death) events.push(death);
    }
    const n = nexusAt(r, c);
    if (n) events.push.apply(events, hurtNexus(n, attacker.castAttack, 'jump'));
  }

  waterTiles.forEach(function (t) {
    consider(t.row, t.col);
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) {
      consider(t.row + d[0], t.col + d[1]);
    });
  });

  if (events.length || waterTiles.length) {
    events.unshift({ type: 'jump', tiles: waterTiles, attackerId: attacker.id });
  }
  return events;
}

function simStrike(attacker, row, col, kind) {
  const events = [];
  const dir = directionBetween(attacker.row, attacker.col, row, col);
  const dmg = kind === 'cast' ? attacker.castAttack : attacker.meleeAttack;
  const pushAmt = kind === 'cast' ? attacker.castDisplacement : attacker.meleeDisplacement;
  const targetWizard = wizardAt(row, col);
  const targetNexus = nexusAt(row, col);
  const hit = mountainAt(row, col) && kind === 'cast' && attacker.castKind === 'bolt'
    ? 'fizzle'
    : (targetWizard ? 'wizard' : (targetNexus ? 'nexus' : 'tile'));

  const pathTiles = [];
  if (kind === 'cast') {
    const dist = Math.max(Math.abs(row - attacker.row), Math.abs(col - attacker.col));
    for (let i = 1; i <= dist; i++) {
      pathTiles.push({ row: attacker.row + dir.dr * i, col: attacker.col + dir.dc * i });
    }
  } else {
    pathTiles.push({ row: row, col: col });
  }

  if (hit === 'fizzle') {
    events.push({
      type: 'attack',
      kind: kind,
      castKind: 'bolt',
      attackerId: attacker.id,
      from: { row: attacker.row, col: attacker.col },
      row: row,
      col: col,
      element: attacker.element,
      hit: 'fizzle',
      pathTiles: pathTiles,
      trails: [],
      damage: 0
    });
    events.push({ type: 'fizzle', row: row, col: col, attackerId: attacker.id });
    attacker.hasAttacked = true;
    return events;
  }

  const hadFire = pathTiles.map(function (t) {
    const tr = trailAt(t.row, t.col);
    return !!(tr && tr.element === 'fire');
  });

  const trails = [];
  pathTiles.forEach(t => {
    if (!paintsTrail(attacker.element)) return;
    layTrail(t.row, t.col, attacker.element);
    trails.push({ row: t.row, col: t.col, element: attacker.element });
  });

  if (kind === 'cast' && attacker.castKind === 'gust') {
    let spreading = false;
    pathTiles.forEach(function (t, i) {
      if (hadFire[i]) spreading = true;
      if (!spreading) return;
      layTrail(t.row, t.col, 'fire');
      let found = false;
      trails.forEach(function (tr) {
        if (tr.row === t.row && tr.col === t.col) {
          tr.element = 'fire';
          found = true;
        }
      });
      if (!found) trails.push({ row: t.row, col: t.col, element: 'fire' });
    });
  }

  events.push({
    type: 'attack',
    kind: kind,
    castKind: kind === 'cast' ? (attacker.castKind || 'stream') : null,
    attackerId: attacker.id,
    from: { row: attacker.row, col: attacker.col },
    row: row,
    col: col,
    element: attacker.element,
    hit: hit,
    pathTiles: pathTiles,
    trails: trails,
    damage: hit === 'tile' ? 0 : dmg
  });
  trails.forEach(t => {
    events.push({ type: 'trail', row: t.row, col: t.col, element: t.element });
  });

  if (targetWizard) {
    targetWizard.hp -= dmg;
    events.push({
      type: 'damage',
      targetKind: 'wizard',
      targetId: targetWizard.id,
      amount: dmg,
      row: row,
      col: col,
      cause: kind
    });
    if (kind === 'cast' && attacker.castKind === 'bolt') {
      applySilence(targetWizard);
      events.push({
        type: 'silence',
        targetId: targetWizard.id,
        row: targetWizard.row,
        col: targetWizard.col
      });
    }
    if (pushAmt) events.push.apply(events, simPush(targetWizard, dir.dr, dir.dc, pushAmt));
    const death = simKill(targetWizard);
    if (death) events.push(death);
  } else if (targetNexus) {
    events.push.apply(events, hurtNexus(targetNexus, dmg, kind));
  } else {
    events.push({ type: 'ground', row: row, col: col, element: attacker.element, kind: kind });
  }

  if (kind === 'cast' && attacker.castKind === 'bolt') {
    events.push.apply(events, simBoltJump(attacker, pathTiles, row, col));
  }

  attacker.hasAttacked = true;
  return events;
}

function simPulse(attacker, clickRow, clickCol) {
  const tiles = getPulseTiles(attacker);
  const events = [];
  const dmg = attacker.castAttack;
  const pushAmt = attacker.castDisplacement;
  const trails = [];
  const hits = [];

  tiles.forEach(function (t) {
    if (paintsTrail(attacker.element)) {
      layTrail(t.row, t.col, attacker.element);
      trails.push({ row: t.row, col: t.col, element: attacker.element });
    }
    const w = wizardAt(t.row, t.col);
    const n = nexusAt(t.row, t.col);
    if (w) hits.push({ kind: 'wizard', wizard: w, row: t.row, col: t.col });
    else if (n) hits.push({ kind: 'nexus', nexus: n, row: t.row, col: t.col });
  });

  events.push({
    type: 'attack',
    kind: 'cast',
    castKind: 'pulse',
    attackerId: attacker.id,
    from: { row: attacker.row, col: attacker.col },
    row: clickRow,
    col: clickCol,
    element: attacker.element,
    hit: hits.length ? 'burst' : 'tile',
    pathTiles: tiles.slice(),
    burstTiles: tiles.slice(),
    trails: trails,
    damage: dmg
  });
  trails.forEach(t => {
    events.push({ type: 'trail', row: t.row, col: t.col, element: t.element });
  });

  hits.forEach(function (h) {
    if (h.kind === 'wizard') {
      h.wizard.hp -= dmg;
      events.push({
        type: 'damage',
        targetKind: 'wizard',
        targetId: h.wizard.id,
        amount: dmg,
        row: h.row,
        col: h.col,
        cause: 'cast'
      });
    } else {
      events.push.apply(events, hurtNexus(h.nexus, dmg, 'cast'));
    }
  });

  hits.forEach(function (h) {
    if (h.kind !== 'wizard') return;
    const death = simKill(h.wizard);
    if (death) events.push(death);
  });

  const survivors = hits.filter(h => h.kind === 'wizard' && h.wizard.state === 'onboard');
  survivors.sort(function (a, b) {
    return manhattan(attacker.row, attacker.col, b.row, b.col) - manhattan(attacker.row, attacker.col, a.row, a.col);
  });
  survivors.forEach(function (h) {
    const dir = directionBetween(attacker.row, attacker.col, h.row, h.col);
    if (pushAmt) events.push.apply(events, simPush(h.wizard, dir.dr, dir.dc, pushAmt));
  });

  if (!hits.length) {
    events.push({ type: 'ground', row: clickRow, col: clickCol, element: attacker.element, kind: 'cast' });
  }

  attacker.hasAttacked = true;
  return events;
}

function simRaise(attacker, row, col) {
  raiseMountain(row, col);
  attacker.hasAttacked = true;
  return [{
    type: 'attack',
    kind: 'cast',
    castKind: 'raise',
    attackerId: attacker.id,
    from: { row: attacker.row, col: attacker.col },
    row: row,
    col: col,
    element: attacker.element,
    hit: 'tile',
    pathTiles: [{ row: row, col: col }],
    trails: [],
    damage: 0
  }, {
    type: 'raise',
    row: row,
    col: col,
    attackerId: attacker.id,
    turnsLeft: TEMP_MOUNTAIN_TURNS
  }];
}

function simSwap(attacker, row, col) {
  const other = wizardAt(row, col);
  const fromA = { row: attacker.row, col: attacker.col };
  let fromB = null;
  if (other) {
    fromB = { row: other.row, col: other.col };
    attacker.row = fromB.row;
    attacker.col = fromB.col;
    other.row = fromA.row;
    other.col = fromA.col;
  } else {
    attacker.row = row;
    attacker.col = col;
  }
  attacker.hasAttacked = true;
  const events = [{
    type: 'attack',
    kind: 'cast',
    castKind: 'swap',
    attackerId: attacker.id,
    from: fromA,
    row: row,
    col: col,
    element: attacker.element,
    hit: other ? 'wizard' : 'tile',
    pathTiles: [],
    trails: [],
    damage: 0
  }, {
    type: 'swap',
    aId: attacker.id,
    bId: other ? other.id : null,
    fromA: fromA,
    fromB: fromB,
    toA: { row: attacker.row, col: attacker.col },
    toB: other ? { row: other.row, col: other.col } : null,
    element: attacker.element
  }];
  events.push.apply(events, applyTileEnter(attacker));
  if (other) events.push.apply(events, applyTileEnter(other));
  return events;
}

function simEndPlayerTurn() {
  const events = [];
  const isFirst = !state.firstPlayerTurnDone;
  state.firstPlayerTurnDone = true;
  tickTrails();
  tickTempMountains();
  state.selectedWizardId = null;
  state.placingWizardId = null;
  events.push({ type: 'turnEnd', team: 'player' });
  if (!isFirst) {
    const result = checkWinLoss();
    if (result) {
      state.gameOverResult = result;
      events.push({ type: 'gameOver', result: result });
      return events;
    }
  }
  state.currentTurn = 'enemy';
  events.push.apply(events, simResolvePortals('enemy'));
  const afterPortals = checkWinLoss();
  if (afterPortals) {
    state.gameOverResult = afterPortals;
    events.push({ type: 'gameOver', result: afterPortals });
    return events;
  }
  events.push({ type: 'turnStart', team: 'enemy', round: state.turnCount });
  return events;
}

function simEndEnemyTurn() {
  const events = [];
  const isFirst = !state.firstEnemyTurnDone;
  state.firstEnemyTurnDone = true;
  tickTrails();
  tickTempMountains();
  resetActionFlagsFor('enemy');
  events.push({ type: 'turnEnd', team: 'enemy' });
  if (!isFirst) {
    const result = checkWinLoss();
    if (result) {
      state.gameOverResult = result;
      events.push({ type: 'gameOver', result: result });
      return events;
    }
  }
  state.turnCount++;
  state.currentTurn = 'player';
  state.maxMana = Math.min(MANA_CAP, state.maxMana + 1);
  state.mana = state.maxMana;
  state.enemyMaxMana = Math.min(MANA_CAP, state.enemyMaxMana + 1);
  state.enemyMana = state.enemyMaxMana;
  resetActionFlagsFor('player');
  events.push.apply(events, simResolvePortals('player'));
  const afterPortals = checkWinLoss();
  if (afterPortals) {
    state.gameOverResult = afterPortals;
    events.push({ type: 'gameOver', result: afterPortals });
    return events;
  }
  events.push({ type: 'turnStart', team: 'player', round: state.turnCount });
  return events;
}

function getTeamSummonTiles(team) {
  return team === 'player' ? getPlayerSummonTiles() : getEnemySummonTiles();
}
