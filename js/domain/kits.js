const DEFENSE_TEAM_SIZE = 4;
const VS_TEAM_SIZE = 4;
const TEAM_SIZE = VS_TEAM_SIZE;
const PLAYABLE_KIT_IDS = ['fire', 'ice', 'wind'];

const WIZARD_TYPES = [
  { id: 'fire', name: 'Pyre', element: 'fire', defaultSpellId: 'stream', moveRange: 2, hp: 4, cost: 2, meleeAttack: 2, meleeDisplacement: 1 },
  { id: 'ice', name: 'Rime', element: 'ice', defaultSpellId: 'pulse', moveRange: 2, hp: 4, cost: 1, meleeAttack: 1, meleeDisplacement: 1 },
  { id: 'wind', name: 'Squall', element: 'wind', defaultSpellId: 'gust', moveRange: 3, hp: 4, cost: 2, meleeAttack: 1, meleeDisplacement: 2 },
  { id: 'earth', name: 'Cairn', element: 'earth', defaultSpellId: 'raise', moveRange: 2, hp: 5, cost: 3, meleeAttack: 2, meleeDisplacement: 1 },
  { id: 'lightning', name: 'Volt', element: 'lightning', defaultSpellId: 'bolt', moveRange: 2, hp: 4, cost: 2, meleeAttack: 1, meleeDisplacement: 1 },
  { id: 'temporal', name: 'Chrono', element: 'temporal', defaultSpellId: 'swap', moveRange: 2, hp: 4, cost: 3, meleeAttack: 1, meleeDisplacement: 1 }
];

const DEFAULT_TEAM = ['fire', 'ice', 'wind', 'fire'];

function kitPlayable(id) {
  return PLAYABLE_KIT_IDS.indexOf(id) !== -1;
}

function playableKits() {
  return WIZARD_TYPES.filter(function (kit) { return kitPlayable(kit.id); });
}

function kitById(id) {
  let i;
  for (i = 0; i < WIZARD_TYPES.length; i++) {
    if (WIZARD_TYPES[i].id === id) return WIZARD_TYPES[i];
  }
  return null;
}

function validKitIds(ids) {
  const out = [];
  let i;
  for (i = 0; i < (ids || []).length; i++) {
    if (kitById(ids[i])) out.push(ids[i]);
  }
  return out;
}

function padKitIds(ids) {
  const filled = validKitIds(ids).slice(0, TEAM_SIZE);
  const used = {};
  const seen = {};
  let i;
  for (i = 0; i < filled.length; i++) used[filled[i]] = (used[filled[i]] || 0) + 1;
  for (i = 0; i < DEFAULT_TEAM.length && filled.length < TEAM_SIZE; i++) {
    const id = DEFAULT_TEAM[i];
    seen[id] = (seen[id] || 0) + 1;
    if ((used[id] || 0) < seen[id]) {
      filled.push(id);
      used[id] = (used[id] || 0) + 1;
    }
  }
  i = 0;
  while (filled.length < TEAM_SIZE) {
    filled.push(DEFAULT_TEAM[i % DEFAULT_TEAM.length]);
    i += 1;
  }
  return filled;
}

function normalizeTeam(ids) {
  return padKitIds(ids);
}

function pickEnemyTeam(rng, playerTeam) {
  const pool = PLAYABLE_KIT_IDS.slice();
  const enemy = [];
  let i;
  if (!pool.length) return normalizeTeam(playerTeam);
  for (i = 0; i < TEAM_SIZE; i++) {
    enemy.push(pool[rng.int(pool.length)]);
  }
  return enemy;
}
