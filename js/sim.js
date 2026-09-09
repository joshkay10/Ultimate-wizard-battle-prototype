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
      w.hasAttacked = false;
      w.summoningSickness = false;
    }
  });
}

function canMove(wizard) {
  return !!(wizard && wizard.state === 'onboard' && !wizard.hasMoved);
}

function canAttack(wizard) {
  return !!(wizard && wizard.state === 'onboard' && !wizard.hasAttacked);
}

function directionBetween(fromRow, fromCol, toRow, toCol) {
  return {
    dr: Math.sign(toRow - fromRow),
    dc: Math.sign(toCol - fromCol)
  };
}

function getDisplacementPath(target, dr, dc, amount) {
  if (amount === 0) return { path: [], tilesShort: 0 };
  const dir = amount > 0 ? 1 : -1;
  const steps = Math.abs(amount);
  const path = [];
  let curRow = target.row, curCol = target.col;
  for (let i = 0; i < steps; i++) {
    const nr = curRow + dr * dir;
    const nc = curCol + dc * dir;
    if (!inBounds(nr, nc) || isBlocked(nr, nc)) {
      return { path, tilesShort: Math.min(3, steps - i) };
    }
    path.push({ row: nr, col: nc });
    curRow = nr;
    curCol = nc;
  }
  return { path, tilesShort: 0 };
}

function simKill(wizard) {
  if (!wizard || wizard.hp > 0) return null;
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
  const { path, tilesShort } = getDisplacementPath(target, dr, dc, amount);
  const events = [];
  if (path.length) {
    const last = path[path.length - 1];
    target.row = last.row;
    target.col = last.col;
  }
  events.push({ type: 'push', wizardId: target.id, from, path, tilesShort });
  if (tilesShort > 0) {
    target.hp -= tilesShort;
    events.push({
      type: 'damage',
      targetKind: 'wizard',
      targetId: target.id,
      amount: tilesShort,
      row: target.row,
      col: target.col,
      cause: 'collision'
    });
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
    events.push.apply(events, simPush(targetWizard, dir.dr, dir.dc, pushAmt));
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

function simEndPlayerTurn() {
  const events = [];
  const isFirst = !state.firstPlayerTurnDone;
  state.firstPlayerTurnDone = true;
  tickTrails();
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
