const ICONS = {
  fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.5-2-1-2.5.8 2 .5 4-1 5.2A5 5 0 0 1 7 7c0-2.5 1.8-4 2.5-5C10 3.5 11 3 12 2z"/><path d="M8.5 13.5A4.5 4.5 0 0 0 13 18a4 4 0 0 0 4-4c0-1.2-.5-2-1-2.6"/></svg>',
  ice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M5 6l14 12"/><path d="M19 6L5 18"/><path d="M9 3l3 3 3-3"/><path d="M9 21l3-3 3 3"/><path d="M3 9l3 3-3 3"/><path d="M21 9l-3 3 3 3"/></svg>',
  wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h9a3 3 0 1 0-3-3"/><path d="M3 16h13a3 3 0 1 1-3 3"/><path d="M3 12h16a3 3 0 1 0-3-3"/></svg>',
  earth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18L14 7l-3 5-2-3z"/><path d="M3 20h18"/></svg>',
  lightning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h8l-1 8 9-12h-8z"/></svg>',
  temporal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><path d="M2 12h20"/><path d="M12 2v20"/></svg>',
  melee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>',
  cast: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v3"/><path d="M12 19v3"/><path d="M4.2 4.2l2.1 2.1"/><path d="M17.7 17.7l2.1 2.1"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="M4.2 19.8l2.1-2.1"/><path d="M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="3"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
  mana: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c3 4 6 7.5 6 11.5A6 6 0 0 1 6 13.5C6 9.5 9 6 12 2z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12.6L12 20l-7.5-7.4a4.6 4.6 0 0 1 6.5-6.5L12 7.2l1 1a4.6 4.6 0 0 1 6.5 6.4z"/></svg>'
};

const ELEMENT_COLOR = {
  fire: 'var(--fire)',
  ice: 'var(--ice)',
  wind: 'var(--wind)',
  earth: 'var(--earth)',
  lightning: 'var(--lightning)',
  temporal: 'var(--temporal)'
};

const WIZARD_TYPES = [
  { id: 'fire', name: 'Ember', element: 'fire', castKind: 'stream', moveRange: 3, hp: 10, cost: 3, meleeAttack: 5, meleeDisplacement: 2, castAttack: 3, castDisplacement: 1, castRange: 4 },
  { id: 'ice', name: 'Ice', element: 'ice', castKind: 'pulse', moveRange: 3, hp: 12, cost: 2, meleeAttack: 4, meleeDisplacement: 2, castAttack: 2, castDisplacement: 1, castRange: 1 },
  { id: 'wind', name: 'Gale', element: 'wind', castKind: 'gust', moveRange: 4, hp: 8, cost: 2, meleeAttack: 3, meleeDisplacement: 2, castAttack: 1, castDisplacement: 3, castRange: 3 },
  { id: 'earth', name: 'Earth', element: 'earth', castKind: 'raise', moveRange: 2, hp: 14, cost: 3, meleeAttack: 4, meleeDisplacement: 1, castAttack: 0, castDisplacement: 0, castRange: 2 },
  { id: 'lightning', name: 'Lightning', element: 'lightning', castKind: 'bolt', moveRange: 3, hp: 9, cost: 2, meleeAttack: 3, meleeDisplacement: 1, castAttack: 2, castDisplacement: 0, castRange: 4 },
  { id: 'temporal', name: 'Temporal', element: 'temporal', castKind: 'swap', moveRange: 3, hp: 9, cost: 3, meleeAttack: 3, meleeDisplacement: 1, castAttack: 0, castDisplacement: 0, castRange: 3 }
];

const BOARD_SIZE = 9;
const CENTER = 4; // 0-indexed center of 9x9
const MANA_CAP = 10;
const SUMMON_ROW_START = BOARD_SIZE - 3;
const ENEMY_ROW_END = 3; // rows 0,1,2 = enemy zone (mirrors player's bottom-3-rows zone)
const NEXUS_HP = 5;
const PORTAL_BLOCK_DAMAGE = 2;
const CRASH_DAMAGE_CAP = 3;
const TEMP_MOUNTAIN_TURNS = 2;
const TRAIL_TURNS = 2;
const FIRE_TRAIL_DAMAGE = 1;
const STARTING_MANA = 2;
const CAST_HINT = {
  stream: 'line of 4 — paints fire',
  pulse: 'hits every neighbor',
  gust: 'line of 3 — big push, paints wind',
  raise: 'empty tile becomes a mountain',
  bolt: 'line of 4 — silences',
  swap: 'swap with a wizard, or blink to an empty tile'
};
// Four crystals per camp, spread through the back 3 rows and vertically mirrored.
const NEXUS_LAYOUT = {
  enemy: [
    { id: 'enemy-back-west', row: 0, col: 1 },
    { id: 'enemy-back-east', row: 0, col: 7 },
    { id: 'enemy-front-west', row: 2, col: 3 },
    { id: 'enemy-front-east', row: 2, col: 5 }
  ],
  player: [
    { id: 'player-back-west', row: 8, col: 1 },
    { id: 'player-back-east', row: 8, col: 7 },
    { id: 'player-front-west', row: 6, col: 3 },
    { id: 'player-front-east', row: 6, col: 5 }
  ]
};
