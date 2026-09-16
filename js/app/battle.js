function battleResetOpts() {
  return {
    playerLoadout: loadPlayerLoadout(),
    rollEnemy: true,
    gameMode: 'vs'
  };
}

function startBattle(seed) {
  const opts = battleResetOpts();
  if (seed == null) seed = opts.seed || ((Date.now() >>> 0) || 1);
  resetMatch(state, seed, opts);
  state.matchBestCombo = 0;
  state.matchDunks = 0;
  state.resultRecorded = false;
  state.matchSummary = null;
}
