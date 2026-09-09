function resetMatch(match, seed, opts) {
  opts = opts || {};
  seed = (seed >>> 0) || 1;
  match.seed = seed;
  match.rng = createRng(seed);
  match.wizards = {};
  match.nextId = 1;
  match.selectedWizardId = null;
  match.selectedAction = 'move';
  match.animating = false;
  match.turnCount = 1;
  match.currentTurn = 'player';
  match.firstPlayerTurnDone = false;
  match.firstEnemyTurnDone = false;
  match.gameOverResult = null;
  match.placingWizardId = null;
  match.trails = {};
  match.mountains = {};
  match.tempMountains = {};
  match.water = {};
  match.voids = {};
  match.portals = {};
  match.mana = STARTING_MANA;
  match.maxMana = STARTING_MANA;
  match.enemyMana = STARTING_MANA;
  match.enemyMaxMana = STARTING_MANA;
  match.log = [];
  match.matchId = (match.matchId || 0) + 1;
  match.nexuses = {
    player: makeNexusCamp('player'),
    enemy: makeNexusCamp('enemy')
  };

  const playerTeam = normalizeTeam(opts.playerTeam || DEFAULT_TEAM);
  let enemyTeam;
  if (opts.enemyTeam) {
    enemyTeam = normalizeTeam(opts.enemyTeam);
  } else if (opts.rollEnemy) {
    enemyTeam = pickEnemyTeam(match.rng, playerTeam);
  } else {
    enemyTeam = DEFAULT_TEAM.slice();
  }
  match.playerTeam = playerTeam;
  match.enemyTeam = enemyTeam;

  generateTerrain(match);
  seedRosters(match, playerTeam, enemyTeam);
}
