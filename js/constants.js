export const ICONS = {
  fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.5-2-1-2.5.8 2 .5 4-1 5.2A5 5 0 0 1 7 7c0-2.5 1.8-4 2.5-5C10 3.5 11 3 12 2z"/><path d="M8.5 13.5A4.5 4.5 0 0 0 13 18a4 4 0 0 0 4-4c0-1.2-.5-2-1-2.6"/></svg>',
  ice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M5 6l14 12"/><path d="M19 6L5 18"/><path d="M9 3l3 3 3-3"/><path d="M9 21l3-3 3 3"/><path d="M3 9l3 3-3 3"/><path d="M21 9l-3 3 3 3"/></svg>',
  wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h9a3 3 0 1 0-3-3"/><path d="M3 16h13a3 3 0 1 1-3 3"/><path d="M3 12h16a3 3 0 1 0-3-3"/></svg>',
  move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><path d="M2 12h20"/><path d="M12 2v20"/></svg>',
  melee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>',
  cast: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v3"/><path d="M12 19v3"/><path d="M4.2 4.2l2.1 2.1"/><path d="M17.7 17.7l2.1 2.1"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="M4.2 19.8l2.1-2.1"/><path d="M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="3"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
  mana: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c3 4 6 7.5 6 11.5A6 6 0 0 1 6 13.5C6 9.5 9 6 12 2z"/></svg>'
};

export const ELEMENT_COLOR = {
  fire: 'var(--fire)',
  ice: 'var(--ice)',
  wind: 'var(--wind)'
};

export const WIZARD_TYPES = [
  { id: 'fire', name: 'Ember', element: 'fire', moveRange: 3, hp: 10, cost: 3, meleeAttack: 5, meleeDisplacement: 2, castAttack: 3, castDisplacement: 1 },
  { id: 'ice', name: 'Rime', element: 'ice', moveRange: 2, hp: 12, cost: 2, meleeAttack: 4, meleeDisplacement: 2, castAttack: 2, castDisplacement: 1 },
  { id: 'wind', name: 'Gale', element: 'wind', moveRange: 4, hp: 8, cost: 2, meleeAttack: 3, meleeDisplacement: 2, castAttack: 2, castDisplacement: 1 }
];

export const BOARD_SIZE = 9;
export const CENTER = 4; // 0-indexed center of 9x9
export const MANA_CAP = 10;
export const SUMMON_ROW_START = BOARD_SIZE - 3;
export const ENEMY_ROW_END = 3; // rows 0,1,2 = enemy zone (mirrors player's bottom-3-rows zone)
