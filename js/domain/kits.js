const TEAM_SIZE = 3;

const WIZARD_TYPES = [
  { id: 'fire', name: 'Pyre', element: 'fire', castKind: 'stream', moveRange: 3, hp: 10, cost: 3, meleeAttack: 5, meleeDisplacement: 2, castAttack: 3, castDisplacement: 1, castRange: 4 },
  { id: 'ice', name: 'Rime', element: 'ice', castKind: 'pulse', moveRange: 3, hp: 12, cost: 2, meleeAttack: 4, meleeDisplacement: 2, castAttack: 2, castDisplacement: 1, castRange: 1 },
  { id: 'wind', name: 'Squall', element: 'wind', castKind: 'gust', moveRange: 4, hp: 8, cost: 3, meleeAttack: 3, meleeDisplacement: 2, castAttack: 1, castDisplacement: 3, castRange: 3 },
  { id: 'earth', name: 'Cairn', element: 'earth', castKind: 'raise', moveRange: 2, hp: 14, cost: 4, meleeAttack: 4, meleeDisplacement: 1, castAttack: 0, castDisplacement: 0, castRange: 2 },
  { id: 'lightning', name: 'Volt', element: 'lightning', castKind: 'bolt', moveRange: 3, hp: 9, cost: 3, meleeAttack: 3, meleeDisplacement: 1, castAttack: 2, castDisplacement: 0, castRange: 4 },
  { id: 'temporal', name: 'Chrono', element: 'temporal', castKind: 'swap', moveRange: 3, hp: 9, cost: 4, meleeAttack: 3, meleeDisplacement: 1, castAttack: 0, castDisplacement: 0, castRange: 3 }
];

const DEFAULT_TEAM = ['fire', 'ice', 'wind'];

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

function uniqueKitIds(ids) {
  const seen = {};
  const out = [];
  let i;
  for (i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (!kitById(id) || seen[id]) continue;
    seen[id] = true;
    out.push(id);
  }
  return out;
}

function normalizeTeam(ids) {
  const unique = uniqueKitIds(ids || []);
  if (unique.length === TEAM_SIZE) return unique;
  const filled = unique.slice();
  const fallback = DEFAULT_TEAM;
  let i;
  for (i = 0; i < fallback.length && filled.length < TEAM_SIZE; i++) {
    if (filled.indexOf(fallback[i]) === -1) filled.push(fallback[i]);
  }
  const all = kitIds();
  for (i = 0; i < all.length && filled.length < TEAM_SIZE; i++) {
    if (filled.indexOf(all[i]) === -1) filled.push(all[i]);
  }
  return filled.slice(0, TEAM_SIZE);
}

function teamHasKit(ids, id) {
  return normalizeTeam(ids).indexOf(id) !== -1;
}

function pickEnemyTeam(rng, playerTeam) {
  const pool = kitIds();
  const shuffled = shuffledCopy(rng, pool);
  const enemy = [];
  let i;
  for (i = 0; i < shuffled.length && enemy.length < TEAM_SIZE; i++) {
    enemy.push(shuffled[i]);
  }
  return normalizeTeam(enemy.length ? enemy : playerTeam);
}

function kitsNamed(ids) {
  return normalizeTeam(ids).map(function (id) {
    const kit = kitById(id);
    return kit ? kit.name : id;
  });
}
