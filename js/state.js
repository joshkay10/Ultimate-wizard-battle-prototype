const state = {
  // wizards keyed by id: { id, name, element, hp, maxHp, moveRange, state: 'summoned'|'onboard'|'moving', row, col }
  wizards: {},
  nextId: 1,
  selectedWizardId: null,
  selectedAction: 'move', // 'move' | 'melee' | 'cast'
  animating: false,
  turnCount: 1,

  // Turn ownership: whose turn it is. Increments turnCount once a full round (player+enemy) completes.
  currentTurn: 'player', // 'player' | 'enemy'
  firstPlayerTurnDone: false,
  firstEnemyTurnDone: false,

  // Game over state: once set, all actions are locked and a result banner shows.
  // null while the game is ongoing; otherwise 'player' | 'enemy' | 'draw' indicating who WON (or draw).
  gameOverResult: null,

  // wizard currently picked from the roster, awaiting a tile tap to place
  placingWizardId: null,

  // Elemental trails left behind by attacks: keyed by "row,col" -> { element, turnsLeft }
  trails: {},
  mountains: {},
  tempMountains: {},
  water: {},
  voids: {},
  portals: {},

  // Mana: starts at 2, max mana +1 each round (capped 10), refilled to max on turn start.
  // Each team has its own pool so the enemy summons under the same rules.
  mana: 0,
  maxMana: 0,
  enemyMana: 0,
  enemyMaxMana: 0,

  seed: 1,
  rng: null,
  log: [],
  fxEnabled: true,
  matchId: 0
};

function makeNexus(spec, team) {
  return { id: spec.id, team: team, row: spec.row, col: spec.col, hp: NEXUS_HP, maxHp: NEXUS_HP };
}

const NEXUS = {
  player: NEXUS_LAYOUT.player.map(spec => makeNexus(spec, 'player')),
  enemy: NEXUS_LAYOUT.enemy.map(spec => makeNexus(spec, 'enemy'))
};
