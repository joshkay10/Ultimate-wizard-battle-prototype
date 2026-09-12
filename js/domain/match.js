function resetMatch(match, seed, opts) {
  opts = Object.assign({}, opts || {});
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
  match.playerSummonedThisTurn = false;
  match.log = [];
  match.matchId = (match.matchId || 0) + 1;
  match.missionId = '';
  match.missionTitle = '';
  match.islandId = '';
  match.islandFlip = null;
  match.spawnBudget = null;
  match.pawnCap = null;
  match.spawnKinds = null;
  match.missionOpening = null;

  if (opts.missionId && typeof missionById === 'function') {
    const mission = missionById(opts.missionId);
    if (mission) {
      const baked = missionResetOpts(mission);
      Object.keys(baked).forEach(function (key) {
        if (opts[key] == null) opts[key] = baked[key];
      });
    }
  }

  match.gameMode = opts.gameMode === 'defense' ? 'defense' : 'vs';
  match.mapId = '';
  match.mapName = '';
  match.missionId = opts.missionId || '';
  match.missionTitle = opts.missionTitle || '';
  match.islandId = opts.islandId || '';
  match.islandFlip = opts.islandFlip != null ? !!opts.islandFlip : null;
  match.spawnBudget = typeof opts.spawnBudget === 'number' ? opts.spawnBudget : null;
  match.pawnCap = typeof opts.pawnCap === 'number' ? opts.pawnCap : null;
  match.spawnKinds = opts.spawnKinds ? opts.spawnKinds.slice() : null;
  match.missionOpening = opts.opening || null;
  if (match.gameMode === 'defense') {
    match.nexuses = { player: [], enemy: [] };
  } else {
    match.nexuses = {
      player: makeNexusCamp('player'),
      enemy: makeNexusCamp('enemy')
    };
  }

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
