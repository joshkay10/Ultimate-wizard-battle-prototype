function battleResetOpts() {
  return {
    playerLoadout: loadPlayerLoadout(),
    rollEnemy: true
  };
}

function startBattle(seed) {
  resetMatch(state, seed || ((Date.now() >>> 0) || 1), battleResetOpts());
}
