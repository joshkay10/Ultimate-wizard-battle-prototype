const TEAM_SIZE = 4;
const PLAYABLE_KIT_IDS = ['fire', 'ice', 'wind'];

const WIZARD_TYPES = [
  { id: 'fire', name: 'Pyre', element: 'fire', defaultSpellId: 'stream', moveRange: 3, hp: 10, cost: 3, meleeAttack: 5, meleeDisplacement: 2 },
  { id: 'ice', name: 'Rime', element: 'ice', defaultSpellId: 'pulse', moveRange: 3, hp: 12, cost: 2, meleeAttack: 4, meleeDisplacement: 2 },
  { id: 'wind', name: 'Squall', element: 'wind', defaultSpellId: 'gust', moveRange: 4, hp: 8, cost: 3, meleeAttack: 3, meleeDisplacement: 2 },
  { id: 'earth', name: 'Cairn', element: 'earth', defaultSpellId: 'raise', moveRange: 2, hp: 14, cost: 4, meleeAttack: 4, meleeDisplacement: 1 },
  { id: 'lightning', name: 'Volt', element: 'lightning', defaultSpellId: 'bolt', moveRange: 3, hp: 9, cost: 3, meleeAttack: 3, meleeDisplacement: 1 },
  { id: 'temporal', name: 'Chrono', element: 'temporal', defaultSpellId: 'swap', moveRange: 3, hp: 9, cost: 4, meleeAttack: 3, meleeDisplacement: 1 }
];

const DEFAULT_TEAM = ['fire', 'ice', 'wind', 'ice'];

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

function kitIds() {
  return WIZARD_TYPES.map(function (kit) { return kit.id; });
}

function validKitIds(ids) {
  const out = [];
  let i;
  for (i = 0; i < (ids || []).length; i++) {
    if (kitById(ids[i])) out.push(ids[i]);
  }
  return out;
}

function uniqueKitIds(ids) {
  const seen = {};
  const out = [];
  let i;
  for (i = 0; i < (ids || []).length; i++) {
    const id = ids[i];
    if (!kitById(id) || seen[id]) continue;
    seen[id] = true;
    out.push(id);
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

function teamHasKit(ids, id) {
  return normalizeTeam(ids).indexOf(id) !== -1;
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

function kitsNamed(ids) {
  return normalizeTeam(ids).map(function (id) {
    const kit = kitById(id);
    return kit ? kit.name : id;
  });
}
