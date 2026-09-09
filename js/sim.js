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
  return team === 'player' ? NEXUS.enemy : NEXUS.mine;
}

function ownNexusOf(team) {
  return team === 'player' ? NEXUS.mine : NEXUS.enemy;
}

function nexusId(nex) {
  return nex === NEXUS.mine ? 'mine' : 'enemy';
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
  state.mana = 1;
  state.maxMana = 1;
  state.enemyMana = 1;
  state.enemyMaxMana = 1;
  state.log = [];
  NEXUS.mine.hp = NEXUS.mine.maxHp;
  NEXUS.enemy.hp = NEXUS.enemy.maxHp;
  generateMountains();
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
    w.team === team && (w.state === 'onboard' || w.state === 'summoned')
  );
}

function checkWinLoss() {
  const mineDead = NEXUS.mine.hp <= 0;
  const enemyDead = NEXUS.enemy.hp <= 0;
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
  return !!(wizard && wizard.state === 'onboard' && !wizard.hasMoved && !wizard.summoningSickness);
}

function canAttack(wizard) {
  return !!(wizard && wizard.state === 'onboard' && !wizard.hasAttacked && !wizard.summoningSickness);
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
  if (isBlocked(row, col)) return [];
  if (team === 'player' && !isSummonTile(row, col)) return [];
  if (team === 'enemy' && !isEnemySummonTile(row, col)) return [];
  spendMana(team, wizard.cost);
  wizard.state = 'onboard';
  wizard.row = row;
  wizard.col = col;
  wizard.hasMoved = true;
  wizard.hasAttacked = true;
  wizard.summoningSickness = true;
  if (team === 'player') state.placingWizardId = null;
  return [{
    type: 'summon',
    wizardId: wizard.id,
    row: row,
    col: col,
    team: team,
    element: wizard.element
  }];
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
  events.push({ type: 'turnStart', team: 'player', round: state.turnCount });
  return events;
}

function getTeamSummonTiles(team) {
  return team === 'player' ? getPlayerSummonTiles() : getEnemySummonTiles();
}
