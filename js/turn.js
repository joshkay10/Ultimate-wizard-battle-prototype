function canAct() {
  return !state.gameOverResult && state.currentTurn === 'player';
}

async function endTurn() {
  if (state.animating || state.gameOverResult) return;
  if (!canAct()) return;

  await present(simEndPlayerTurn());
  if (typeof render === 'function') render();
  if (state.gameOverResult) return;

  await maybeWait(420);
  await runTeamAi('enemy');
  await present(simEndEnemyTurn());
  if (typeof render === 'function') render();
}
