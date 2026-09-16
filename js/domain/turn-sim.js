function checkWinLoss(match) {
  if (isDefenseMode(match)) {
    const mineDead = teamNexusesFallen(match, 'player');
    if (mineDead || !teamHasPresence(match, 'player')) return 'enemy';
    if (typeof defenseWaveCleared === 'function' ? defenseWaveCleared(match) : !teamHasPresence(match, 'enemy')) {
      return 'player';
    }
    return null;
  }
  const playerNexusDead = teamNexusesFallen(match, 'player');
  const enemyNexusDead = teamNexusesFallen(match, 'enemy');
  const playerWiped = !teamHasPresence(match, 'player');
  const enemyWiped = !teamHasPresence(match, 'enemy');
  if ((playerNexusDead || playerWiped) && (enemyNexusDead || enemyWiped)) return 'draw';
  if (playerNexusDead || playerWiped) return 'enemy';
  if (enemyNexusDead || enemyWiped) return 'player';
  return null;
}

function playerHasLegalAction(match) {
  if (match.gameOverResult || match.currentTurn !== 'player') return false;
  if (match.placingWizardId && getPlayerSummonTiles(match).length) return true;

  const canDrop = Object.values(match.wizards).some(function (wizard) {
    return canPaySummon(match, wizard, 'player');
  });
  if (canDrop && getPlayerSummonTiles(match).length) return true;

  const onboard = Object.values(match.wizards).filter(function (wizard) {
    return wizard.team === 'player' && wizard.state === 'onboard' && (typeof canUseWizard !== 'function' || canUseWizard(match, wizard));
  });
  let i;
  for (i = 0; i < onboard.length; i++) {
    const wizard = onboard[i];
    if (canMove(wizard) && getMoveTiles(match, wizard).length) return true;
    if (canAttack(wizard) && getMeleeTiles(match, wizard).length) return true;
    if (canAttack(wizard) && getCastTiles(match, wizard).length && (typeof canPayCast !== 'function' || canPayCast(match, wizard, 'player'))) return true;
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
  const afterBurns = checkWinLoss(match);
  if (afterBurns) {
    match.gameOverResult = afterBurns;
    events.push({ type: 'gameOver', result: afterBurns });
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
  const afterBurns = checkWinLoss(match);
  if (afterBurns) {
    match.gameOverResult = afterBurns;
    events.push({ type: 'gameOver', result: afterBurns });
    return events;
  }
  events.push({ type: 'turnStart', team: 'player', round: match.turnCount });
  return events;
}
