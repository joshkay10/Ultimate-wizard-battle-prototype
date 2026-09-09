function battleResetOpts() {
  return {
    playerTeam: loadPlayerTeam(),
    rollEnemy: true
  };
}

function startBattle(seed) {
  resetMatch(state, seed || ((Date.now() >>> 0) || 1), battleResetOpts());
}
