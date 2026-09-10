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
  match.gameMode = opts.gameMode === 'defense' ? 'defense' : 'vs';
  match.nexuses = {
    player: makeNexusCamp('player'),
    enemy: makeNexusCamp('enemy')
  };

  const playerLoadout = normalizeLoadout(opts.playerLoadout || opts.playerTeam || DEFAULT_LOADOUT);
  let enemyLoadout;
  if (match.gameMode === 'defense') {
    enemyLoadout = [];
  } else if (opts.enemyLoadout) {
    enemyLoadout = normalizeLoadout(opts.enemyLoadout);
  } else if (opts.enemyTeam) {
    enemyLoadout = normalizeLoadout(opts.enemyTeam);
  } else if (opts.rollEnemy) {
    enemyLoadout = pickEnemyLoadout(match.rng, playerLoadout);
  } else {
    enemyLoadout = normalizeLoadout(DEFAULT_LOADOUT);
  }
  match.playerLoadout = playerLoadout;
  match.playerTeam = loadoutKitIds(playerLoadout);
  if (match.gameMode === 'defense') {
    match.enemyLoadout = [];
    match.enemyTeam = [];
  } else {
    match.enemyLoadout = enemyLoadout;
    match.enemyTeam = loadoutKitIds(enemyLoadout);
  }

  generateTerrain(match);
  seedRosters(match, playerLoadout, enemyLoadout);
  if (match.gameMode === 'defense') seedDefenseOpening(match);
}
