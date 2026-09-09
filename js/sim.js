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
  state.portals = {};
  state.mana = 1;
  state.maxMana = 1;
  state.enemyMana = 1;
  state.enemyMaxMana = 1;
  state.log = [];
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
    return playEvents(events);
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
  const steps = Math.abs(amount);
  const path = [];
  let curRow = target.row, curCol = target.col;
  for (let i = 0; i < steps; i++) {
    const nr = curRow + dr * dir;
    const nc = curCol + dc * dir;
    const crash = crashObstacle(nr, nc);
    if (crash) {
      return { path, tilesShort: Math.min(CRASH_DAMAGE_CAP, steps - i), crash: crash };
    }
    path.push({ row: nr, col: nc });
    curRow = nr;
    curCol = nc;
  }
  return { path, tilesShort: 0, crash: null };
}

function crashObstacle(row, col) {
  if (!inBounds(row, col)) return { kind: 'wall', row: row, col: col };
  const w = wizardAt(row, col);
  if (w) return { kind: 'wizard', wizardId: w.id, row: row, col: col };
  if (nexusAt(row, col) || mountainAt(row, col) || waterAt(row, col)) {
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

function simPush(target, dr, dc, amount) {
  const from = { row: target.row, col: target.col };
  const { path, tilesShort, crash } = getDisplacementPath(target, dr, dc, amount);
  const events = [];
  if (path.length) {
    const last = path[path.length - 1];
    target.row = last.row;
    target.col = last.col;
  }
  events.push({ type: 'push', wizardId: target.id, from, path, tilesShort, crash: crash });
  if (tilesShort > 0 && crash) {
    events.push.apply(events, applyCrashDamage(target, crash, tilesShort));
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
      blocker.hp -= PORTAL_BLOCK_DAMAGE;
      events.push({
        type: 'damage',
        targetKind: 'wizard',
        targetId: blocker.id,
        amount: PORTAL_BLOCK_DAMAGE,
        row: p.row,
        col: p.col,
        cause: 'portal'
      });
      const bDeath = simKill(blocker);
      if (bDeath) events.push(bDeath);
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
  });
  return events;
}

function simMove(wizard, path) {
  if (!canMove(wizard)) return [];
  if (!path || !path.length) return [];
  const from = { row: wizard.row, col: wizard.col };
  const last = path[path.length - 1];
  wizard.row = last.row;
  wizard.col = last.col;
  wizard.hasMoved = true;
  return [{ type: 'move', wizardId: wizard.id, from: from, path: path }];
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

function simStrike(attacker, row, col, kind) {
  const events = [];
  const dir = directionBetween(attacker.row, attacker.col, row, col);
  const dmg = kind === 'cast' ? attacker.castAttack : attacker.meleeAttack;
  const pushAmt = kind === 'cast' ? attacker.castDisplacement : attacker.meleeDisplacement;
  const targetWizard = wizardAt(row, col);
  const targetNexus = nexusAt(row, col);
  const hit = targetWizard ? 'wizard' : (targetNexus ? 'nexus' : 'tile');

  const pathTiles = [];
  if (kind === 'cast') {
    const dist = Math.max(Math.abs(row - attacker.row), Math.abs(col - attacker.col));
    for (let i = 1; i <= dist; i++) {
      pathTiles.push({ row: attacker.row + dir.dr * i, col: attacker.col + dir.dc * i });
    }
  } else {
    pathTiles.push({ row: row, col: col });
  }

  const trails = [];
  pathTiles.forEach(t => {
    layTrail(t.row, t.col, attacker.element);
    trails.push({ row: t.row, col: t.col, element: attacker.element });
  });

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
    targetNexus.hp = Math.max(0, targetNexus.hp - dmg);
    events.push({
      type: 'damage',
      targetKind: 'nexus',
      targetId: nexusId(targetNexus),
      amount: dmg,
      row: row,
      col: col,
      cause: kind
    });
  } else {
    events.push({ type: 'ground', row: row, col: col, element: attacker.element, kind: kind });
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
    layTrail(t.row, t.col, attacker.element);
    trails.push({ row: t.row, col: t.col, element: attacker.element });
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
      h.nexus.hp = Math.max(0, h.nexus.hp - dmg);
      events.push({
        type: 'damage',
        targetKind: 'nexus',
        targetId: nexusId(h.nexus),
        amount: dmg,
        row: h.row,
        col: h.col,
        cause: 'cast'
      });
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
  return [{
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
