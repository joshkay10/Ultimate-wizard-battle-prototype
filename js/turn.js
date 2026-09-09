function canAct() {
  return !state.gameOverResult && state.currentTurn === 'player';
}

async function maybeAutoEndTurn() {
  if (state.gameOverResult || state.animating) return;
  if (state.currentTurn !== 'player') return;
  if (playerHasLegalAction()) return;
  await endTurn();
}

async function afterPlayerAction() {
  if (typeof render === 'function') render();
  await maybeAutoEndTurn();
}

let endingTurn = false;

async function endTurn() {
  if (endingTurn || state.animating || state.gameOverResult) return;
  if (!canAct()) return;
  endingTurn = true;
  try {
    await present(simEndPlayerTurn());
    if (typeof render === 'function') render();
    if (state.gameOverResult) return;

    await maybeWait(420);
    await runTeamAi('enemy');
    await present(simEndEnemyTurn());
    if (typeof render === 'function') render();
  } finally {
    endingTurn = false;
  }
  await maybeAutoEndTurn();
}
