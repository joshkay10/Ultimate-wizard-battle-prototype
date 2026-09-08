function canAct() {
  return !state.gameOverResult && state.currentTurn === 'player';
}

// Returns 'player' | 'enemy' | 'draw' if the game has just ended, otherwise null.
// Checked at the end of each side's turn. Neither condition can trigger on a team's
// very first turn (both sides get one turn to summon before the board-wipe condition applies).
function checkWinLoss() {
  const mineDead = NEXUS.mine.hp <= 0;
  const enemyDead = NEXUS.enemy.hp <= 0;
  if (mineDead && enemyDead) return 'draw';

  const playerWiped = mineDead || !teamHasPresence('player');
  const enemyWiped = enemyDead || !teamHasPresence('enemy');

  if (playerWiped && enemyWiped) return 'draw';
  if (playerWiped) return 'enemy'; // player lost -> enemy wins
  if (enemyWiped) return 'player'; // enemy lost -> player wins
  return null;
}

function teamHasPresence(team) {
  return Object.values(state.wizards).some(w =>
    w.team === team && (w.state === 'onboard' || w.state === 'summoned')
  );
}

function resetActionFlagsFor(team) {
  Object.values(state.wizards).forEach(w => {
    if (w.state === 'onboard' && w.team === team) {
      w.hasMoved = false;
      w.hasAttacked = false;
    }
  });
}

function endTurn() {
  if (state.animating || state.gameOverResult) return;

  // --- Resolve the end of the player's turn ---
  const isPlayersFirstTurn = !state.firstPlayerTurnDone;
  state.firstPlayerTurnDone = true;
  tickTrails();
  state.selectedWizardId = null;
  state.placingWizardId = null;

  let result = isPlayersFirstTurn ? null : checkWinLoss();
  if (result) {
    state.gameOverResult = result;
    render();
    return;
  }

  // --- Hand the turn to the enemy ---
  state.currentTurn = 'enemy';
  render();

  // Enemy turn: run a simple AI pass for each enemy wizard, then hand back to the player.
  setTimeout(async () => {
    await runEnemyTurn();

    const isEnemysFirstTurn = !state.firstEnemyTurnDone;
    state.firstEnemyTurnDone = true;
    resetActionFlagsFor('enemy');

    result = isEnemysFirstTurn ? null : checkWinLoss();
    if (result) {
      state.gameOverResult = result;
      render();
      return;
    }

    // --- Round complete: hand the turn back to the player ---
      state.turnCount++;
      state.currentTurn = 'player';
      state.maxMana = Math.min(MANA_CAP, state.maxMana + 1);
      state.mana = state.maxMana;
      state.enemyMaxMana = Math.min(MANA_CAP, state.enemyMaxMana + 1);
      state.enemyMana = state.enemyMaxMana;
      resetActionFlagsFor('player');
    render();
  }, 500); // brief pause so the "enemy turn" state is visibly readable before AI acts
}
