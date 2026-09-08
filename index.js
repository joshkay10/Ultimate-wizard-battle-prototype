(function () {

  // ---------- Icons (outline, inherit currentColor) ----------
  const ICONS = {
    fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.5-2-1-2.5.8 2 .5 4-1 5.2A5 5 0 0 1 7 7c0-2.5 1.8-4 2.5-5C10 3.5 11 3 12 2z"/><path d="M8.5 13.5A4.5 4.5 0 0 0 13 18a4 4 0 0 0 4-4c0-1.2-.5-2-1-2.6"/></svg>',
    ice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M5 6l14 12"/><path d="M19 6L5 18"/><path d="M9 3l3 3 3-3"/><path d="M9 21l3-3 3 3"/><path d="M3 9l3 3-3 3"/><path d="M21 9l-3 3 3 3"/></svg>',
    wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h9a3 3 0 1 0-3-3"/><path d="M3 16h13a3 3 0 1 1-3 3"/><path d="M3 12h16a3 3 0 1 0-3-3"/></svg>',
    move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><path d="M2 12h20"/><path d="M12 2v20"/></svg>',
    melee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>',
    cast: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v3"/><path d="M12 19v3"/><path d="M4.2 4.2l2.1 2.1"/><path d="M17.7 17.7l2.1 2.1"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="M4.2 19.8l2.1-2.1"/><path d="M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
    mana: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c3 4 6 7.5 6 11.5A6 6 0 0 1 6 13.5C6 9.5 9 6 12 2z"/></svg>'
  };

  const ELEMENT_COLOR = {
    fire: 'var(--fire)',
    ice: 'var(--ice)',
    wind: 'var(--wind)'
  };

  const WIZARD_TYPES = [
    { id: 'fire', name: 'Ember', element: 'fire', moveRange: 3, hp: 10, cost: 3, meleeAttack: 5, meleeDisplacement: 2, castAttack: 3, castDisplacement: 1 },
    { id: 'ice', name: 'Rime', element: 'ice', moveRange: 2, hp: 12, cost: 2, meleeAttack: 4, meleeDisplacement: 2, castAttack: 2, castDisplacement: 1 },
    { id: 'wind', name: 'Gale', element: 'wind', moveRange: 4, hp: 8, cost: 2, meleeAttack: 3, meleeDisplacement: 2, castAttack: 2, castDisplacement: 1 }
  ];

  const BOARD_SIZE = 9;
  const CENTER = 4; // 0-indexed center of 9x9

  // ---------- State ----------
  // wizards keyed by id: { id, name, element, hp, maxHp, moveRange, state: 'summoned'|'onboard'|'moving', row, col }
  let wizards = {};
  let nextId = 1;
  let selectedWizardId = null;
  let selectedAction = 'move'; // 'move' | 'melee' | 'cast'
  let animating = false;
  let turnCount = 1;

  // Turn ownership: whose turn it is. Increments turnCount once a full round (player+enemy) completes.
  let currentTurn = 'player'; // 'player' | 'enemy'
  let firstPlayerTurnDone = false;
  let firstEnemyTurnDone = false;

  // Game over state: once set, all actions are locked and a result banner shows.
  // null while the game is ongoing; otherwise 'player' | 'enemy' | 'draw' indicating who WON (or draw).
  let gameOverResult = null;

  // wizard currently picked from the roster, awaiting a tile tap to place
  let placingWizardId = null;

  // Elemental trails left behind by attacks: keyed by "row,col" -> { element, turnsLeft }
  // turnsLeft counts down at endTurn; a trail is removed once it hits 0 (visible for one full turn).
  let trails = {};
  function layTrail(row, col, element) {
    trails[row + ',' + col] = { element, turnsLeft: 1 };
  }
  function trailAt(row, col) {
    return trails[row + ',' + col] || null;
  }
  function tickTrails() {
    Object.keys(trails).forEach(key => {
      trails[key].turnsLeft -= 1;
      if (trails[key].turnsLeft <= 0) delete trails[key];
    });
  }

  // Mana: starts at 0, max mana +1 each turn (capped 10), refilled to max on turn start
  let mana = 0;
  let maxMana = 0;
  const MANA_CAP = 10;

  // Nexuses: fixed objects, block movement and summoning, cannot be selected
  // Row labels A..I map to 0-indexed rows 0..8; column 5 -> 0-indexed col 4
  const NEXUS = {
    mine: { row: BOARD_SIZE - 1, col: CENTER, hp: 20, maxHp: 20 },   // row I, col 5
    enemy: { row: 0, col: CENTER, hp: 20, maxHp: 20 }                // row A, col 5
  };
  function nexusAt(row, col) {
    if (NEXUS.mine.row === row && NEXUS.mine.col === col) return NEXUS.mine;
    if (NEXUS.enemy.row === row && NEXUS.enemy.col === col) return NEXUS.enemy;
    return null;
  }
  // A tile is blocked (can't summon onto it, can't move through/onto it) if it holds a wizard or a nexus
  function isBlocked(row, col) {
    return !!wizardAt(row, col) || !!nexusAt(row, col);
  }

  // player summon zone = bottom 3 rows of the board
  const SUMMON_ROW_START = BOARD_SIZE - 3;
  function isSummonTile(row, col) {
    return row >= SUMMON_ROW_START && row < BOARD_SIZE;
  }

  function createWizard(typeId, team) {
    const type = WIZARD_TYPES.find(t => t.id === typeId);
    const id = 'w' + (nextId++);
    wizards[id] = {
      id,
      name: type.name,
      element: type.element,
      moveRange: type.moveRange,
      hp: type.hp,
      maxHp: type.hp,
      cost: type.cost,
      meleeAttack: type.meleeAttack,
      meleeDisplacement: type.meleeDisplacement,
      castAttack: type.castAttack,
      castDisplacement: type.castDisplacement,
      team: team || 'player',
      state: 'summoned', // not on board
      row: null,
      col: null,
      hasMoved: false,
      hasAttacked: false
    };
    return id;
  }

})();
