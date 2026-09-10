function canAct() {
  return !state.gameOverResult && state.currentTurn === 'player';
}

async function maybeAutoEndTurn() {
  if (state.gameOverResult || state.animating) return;
  if (state.currentTurn !== 'player') return;
  if (teamHasMoveUndo(state, 'player')) return;
  if (playerHasLegalAction(state)) return;
  await endTurn();
}

async function afterPlayerAction() {
  if (typeof render === 'function') render();
  await maybeAutoEndTurn();
}

function rematch() {
  endingTurn = false;
  state.animating = false;
  if (typeof resetBoardFx === 'function') resetBoardFx();
  startBattle();
  render();
  maybeAutoEndTurn();
}

function setGameMode(mode) {
  saveGameMode(mode);
  rematch();
}

let endingTurn = false;

async function endTurn() {
  if (endingTurn || state.animating || state.gameOverResult) return;
  if (!canAct()) return;
  endingTurn = true;
  const matchId = state.matchId;
  try {
    await present(simEndPlayerTurn(state));
    if (state.matchId !== matchId) return;
    if (typeof render === 'function') render();
    if (state.gameOverResult) return;

    await maybeWait(420);
    if (state.matchId !== matchId) return;
    if (state.gameMode === 'defense') {
      await present(simDefenseEnemyPhase(state));
    } else {
      await runTeamAi('enemy');
    }
    if (state.matchId !== matchId) return;
    await present(simEndEnemyTurn(state));
    if (state.matchId !== matchId) return;
    if (typeof render === 'function') render();
  } finally {
    if (state.matchId === matchId) endingTurn = false;
  }
  if (state.matchId === matchId) await maybeAutoEndTurn();
}
