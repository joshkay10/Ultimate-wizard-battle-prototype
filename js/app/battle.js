function battleResetOpts() {
  const mode = loadGameMode();
  return {
    playerLoadout: loadPlayerLoadout(),
    rollEnemy: mode === 'vs',
    gameMode: mode
  };
}

function startBattle(seed) {
  resetMatch(state, seed || ((Date.now() >>> 0) || 1), battleResetOpts());
  state.matchBestCombo = 0;
  state.resultRecorded = false;
  state.matchSummary = null;
}
