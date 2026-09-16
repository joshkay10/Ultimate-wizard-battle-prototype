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
  match.mana = STARTING_MANA;
  match.maxMana = STARTING_MANA;
  match.enemyMana = STARTING_MANA;
  match.enemyMaxMana = STARTING_MANA;
  match.log = [];
  match.matchId = (match.matchId || 0) + 1;
  match.gameMode = 'vs';
  applyMatchLayout(match);
  match.mapId = '';
  match.mapName = '';
  match.nexuses = {
    player: makeNexusCamp('player', NEXUS_HP),
    enemy: makeNexusCamp('enemy', NEXUS_HP)
  };

  let playerLoadout = normalizeLoadout(opts.playerLoadout || opts.playerTeam || DEFAULT_LOADOUT);
  if (!playerLoadout.length) playerLoadout = normalizeLoadout(DEFAULT_LOADOUT);
  let enemyLoadout;
  if (opts.enemyLoadout) {
    enemyLoadout = normalizeLoadout(opts.enemyLoadout);
  } else if (opts.enemyTeam) {
    enemyLoadout = normalizeLoadout(opts.enemyTeam);
  } else if (opts.rollEnemy) {
    enemyLoadout = pickEnemyLoadout(match.rng, playerLoadout);
  } else {
    enemyLoadout = normalizeLoadout(DEFAULT_LOADOUT);
  }
  match.playerLoadout = playerLoadout;
  match.playerTeam = playerLoadout.map(function (slot) { return slot.kit; });
  match.enemyLoadout = enemyLoadout;
  match.enemyTeam = loadoutKitIds(enemyLoadout);

  generateTerrain(match);
  seedRosters(match, playerLoadout, enemyLoadout);
  seedVsOpening(match);
}
