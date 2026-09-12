function checkWinLoss(match) {
  const mineDead = teamNexusesFallen(match, 'player');
  if (isDefenseMode(match)) {
    if (mineDead || !teamHasPresence(match, 'player')) return 'enemy';
    if (typeof defenseWaveCleared === 'function' ? defenseWaveCleared(match) : !teamHasPresence(match, 'enemy')) {
      return 'player';
    }
    return null;
  }
  const enemyDead = teamNexusesFallen(match, 'enemy');
  if (mineDead && enemyDead) return 'draw';

  const playerWiped = mineDead || !teamHasPresence(match, 'player');
  const enemyWiped = enemyDead || !teamHasPresence(match, 'enemy');

  if (playerWiped && enemyWiped) return 'draw';
  if (playerWiped) return 'enemy';
  if (enemyWiped) return 'player';
  return null;
}

function playerHasLegalAction(match) {
  if (match.gameOverResult || match.currentTurn !== 'player') return false;
  if (match.placingWizardId && getPlayerSummonTiles(match).length) return true;

  const canPortal = Object.values(match.wizards).some(function (wizard) {
    return canPaySummon(match, wizard, 'player');
  });
  if (canPortal && getPlayerSummonTiles(match).length) return true;

  const onboard = Object.values(match.wizards).filter(function (wizard) {
    return wizard.team === 'player' && wizard.state === 'onboard';
  });
  let i;
  for (i = 0; i < onboard.length; i++) {
    const wizard = onboard[i];
    if (canMove(wizard) && getMoveTiles(match, wizard).length) return true;
    if (canAttack(wizard) && (getMeleeTiles(match, wizard).length || getCastTiles(match, wizard).length)) return true;
  }
  return false;
}

function simEndPlayerTurn(match) {
  const events = [];
  const isFirst = !match.firstPlayerTurnDone;
  match.firstPlayerTurnDone = true;
  tickTrails(match);
  tickTempMountains(match);
  match.selectedWizardId = null;
  match.placingWizardId = null;
  events.push({ type: 'turnEnd', team: 'player' });
  if (!isFirst || (isDefenseMode(match) && !teamHasPresence(match, 'enemy'))) {
    const result = checkWinLoss(match);
    if (result) {
      match.gameOverResult = result;
      events.push({ type: 'gameOver', result: result });
      return events;
    }
  }
  match.currentTurn = 'enemy';
  events.push.apply(events, tickBurnsForTeam(match, 'enemy'));
  events.push.apply(events, simResolvePortals(match, 'enemy'));
  const afterPortals = checkWinLoss(match);
  if (afterPortals) {
    match.gameOverResult = afterPortals;
    events.push({ type: 'gameOver', result: afterPortals });
    return events;
  }
  events.push({ type: 'turnStart', team: 'enemy', round: match.turnCount });
  return events;
}

function simEndEnemyTurn(match) {
  const events = [];
  const isFirst = !match.firstEnemyTurnDone;
  match.firstEnemyTurnDone = true;
  tickTrails(match);
  tickTempMountains(match);
  resetActionFlagsFor(match, 'enemy');
  events.push({ type: 'turnEnd', team: 'enemy' });
  if (!isFirst || (isDefenseMode(match) && !teamHasPresence(match, 'enemy'))) {
    const result = checkWinLoss(match);
    if (result) {
      match.gameOverResult = result;
      events.push({ type: 'gameOver', result: result });
      return events;
    }
  }
  match.turnCount++;
  match.currentTurn = 'player';
  match.playerSummonedThisTurn = false;
  refillManaPools(match);
  resetActionFlagsFor(match, 'player');
  events.push.apply(events, tickBurnsForTeam(match, 'player'));
  events.push.apply(events, simResolvePortals(match, 'player'));
  const afterPortals = checkWinLoss(match);
  if (afterPortals) {
    match.gameOverResult = afterPortals;
    events.push({ type: 'gameOver', result: afterPortals });
    return events;
  }
  events.push({ type: 'turnStart', team: 'player', round: match.turnCount });
  return events;
}
