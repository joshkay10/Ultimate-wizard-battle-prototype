function battleResetOpts() {
  const playlist = typeof loadPlaylistId === 'function' ? loadPlaylistId() : 'defense';
  if (playlist === 'vs') {
    return {
      playerLoadout: loadPlayerLoadout(),
      rollEnemy: true,
      gameMode: 'vs'
    };
  }
  const mission = typeof missionById === 'function' ? missionById(playlist) : null;
  if (mission) return missionResetOpts(mission);
  return {
    playerLoadout: loadPlayerLoadout(),
    rollEnemy: false,
    gameMode: 'defense'
  };
}

function startBattle(seed) {
  const opts = battleResetOpts();
  if (seed == null) seed = opts.seed || ((Date.now() >>> 0) || 1);
  resetMatch(state, seed, opts);
  state.matchBestCombo = 0;
  state.matchDunks = 0;
  state.justUnlocked = false;
  state.resultRecorded = false;
  state.matchSummary = null;
}
