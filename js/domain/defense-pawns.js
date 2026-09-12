// Defense pawn specs, queues, and spawn budget.
function defenseKindLabel(kind) {
  if (kind === 'charge') return 'charge';
  if (kind === 'fireball') return 'shot';
  return 'melee';
}

function defenseTelegraphStyle(kind) {
  if (kind === 'charge') {
    return { fill: 'rgba(26, 140, 108, 0.42)', edge: '#17a078', label: 'CHARGE', dash: [8, 5], pip: true };
  }
  if (kind === 'fireball') {
    return { fill: 'rgba(214, 52, 36, 0.4)', edge: '#e23b28', label: 'SHOT', dash: [2.5, 4.5], pip: true };
  }
  return { fill: 'rgba(186, 78, 22, 0.52)', edge: '#d26518', label: 'MELEE', dash: [], pip: false };
}

const DEFENSE_PAWN_KINDS = {
  mite: { id: 'mite', name: 'Mite', element: 'wind', moveRange: 4, attack: 1, range: 1, hpMin: 1, hpMax: 1, displacement: 0 },
  melee: { id: 'melee', name: 'Brute', element: 'earth', moveRange: 3, attack: 1, range: 1, hpMin: 3, hpMax: 3, displacement: 0 },
  charge: { id: 'charge', name: 'Charger', element: 'wind', moveRange: 3, attack: 1, range: 3, hpMin: 4, hpMax: 4, displacement: 1 },
  fireball: { id: 'fireball', name: 'Bomber', element: 'fire', moveRange: 2, attack: 1, range: 4, hpMin: 3, hpMax: 3, displacement: 0 },
  golem: { id: 'golem', name: 'Golem', element: 'earth', moveRange: 2, attack: 1, range: 1, hpMin: 7, hpMax: 8, displacement: 1 }
};

const DEFENSE_PAWN_ORDER = ['mite', 'melee', 'charge', 'fireball', 'golem'];

function isDefenseMode(match) {
  return !!(match && match.gameMode === 'defense');
}

function defensePawnSpec(kind) {
  return DEFENSE_PAWN_KINDS[kind] || DEFENSE_PAWN_KINDS.melee;
}

function createDefensePawn(match, kind, extra) {
  const spec = defensePawnSpec(kind);
  const id = 'w' + (match.nextId++);
  const hpSpan = Math.max(0, spec.hpMax - spec.hpMin);
  const hp = spec.hpMin + ((match.rng && hpSpan) ? match.rng.int(hpSpan + 1) : 0);
  const pawn = {
    id: id,
    name: spec.name,
    element: spec.element,
    pawnKind: spec.id,
    moveRange: spec.moveRange,
    hp: hp,
    maxHp: hp,
    cost: 0,
    meleeAttack: spec.attack,
    meleeDisplacement: spec.displacement || 0,
    castAttack: spec.attack,
    castDisplacement: spec.displacement || 0,
    castRange: spec.range,
    castKind: spec.id === 'fireball' ? 'stream' : (spec.id === 'charge' ? 'gust' : 'melee'),
    spellName: spec.name,
    team: 'enemy',
    state: 'emerging',
    row: null,
    col: null,
    hasMoved: false,
    hasAttacked: false,
    summoningSickness: false,
    silenced: false,
    silenceSkip: false,
    moveUndo: null,
    intent: null,
    stack: 1
  };
  if (extra) Object.keys(extra).forEach(function (k) { pawn[k] = extra[k]; });
  match.wizards[id] = pawn;
  return pawn;
}

function defensePawns(match, states) {
  return Object.values(match.wizards).filter(function (w) {
    if (w.team !== 'enemy' || !w.pawnKind) return false;
    if (!states) return true;
    return states.indexOf(w.state) >= 0;
  });
}

function defenseFieldClear(match) {
  return defensePawns(match, ['onboard', 'emerging']).length === 0;
}

function defenseEverSpawned(match) {
  let n = 0;
  Object.values(match.wizards).forEach(function (w) {
    if (w.team === 'enemy' && w.pawnKind) n += 1;
  });
  return n;
}

function defenseSpawnBudget(match) {
  if (match && typeof match.spawnBudget === 'number') return match.spawnBudget;
  return typeof DEFENSE_SPAWN_BUDGET === 'number' ? DEFENSE_SPAWN_BUDGET : 10;
}

function defenseBudgetLeft(match) {
  return Math.max(0, defenseSpawnBudget(match) - defenseEverSpawned(match));
}

function compareDefenseActOrder(a, b) {
  const ar = a.row == null ? 99 : a.row;
  const br = b.row == null ? 99 : b.row;
  if (ar !== br) return ar - br;
  const ac = a.col == null ? 99 : a.col;
  const bc = b.col == null ? 99 : b.col;
  if (ac !== bc) return ac - bc;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

function defenseActQueue(match, states) {
  return defensePawns(match, states || ['onboard']).slice().sort(compareDefenseActOrder);
}

function defenseStrikeQueue(match) {
  return defenseActQueue(match).filter(function (pawn) {
    return !!(pawn && pawn.intent);
  });
}

function defenseStrikeIndex(match, pawn) {
  if (!pawn) return -1;
  const queue = defenseStrikeQueue(match);
  let i;
  for (i = 0; i < queue.length; i++) {
    if (queue[i].id === pawn.id) return i;
  }
  return -1;
}

function defenseOrdinal(n) {
  const k = n % 100;
  if (k >= 11 && k <= 13) return n + 'th';
  const d = n % 10;
  if (d === 1) return n + 'st';
  if (d === 2) return n + 'nd';
  if (d === 3) return n + 'rd';
  return n + 'th';
}

function defenseLivingCap(match) {
  if (match && typeof match.pawnCap === 'number') return match.pawnCap;
  return typeof DEFENSE_PAWN_CAP === 'number' ? DEFENSE_PAWN_CAP : 3;
}

function defenseHoldsWave(match) {
  return !!(match && match.missionId);
}

function defenseWaveCleared(match) {
  if (!defenseFieldClear(match)) return false;
  if (defenseHoldsWave(match) && defenseBudgetLeft(match) > 0) return false;
  return true;
}

function defenseSpawnCount(match) {
  const living = defensePawns(match, ['onboard', 'emerging']).length;
  const budget = defenseBudgetLeft(match);
  if (budget <= 0) return 0;
  if (living === 0 && !defenseHoldsWave(match)) return 0;
  const room = defenseLivingCap(match) - living;
  if (room <= 0) return 0;
  const t = match.turnCount || 1;
  if (t <= 1) return living < 2 ? 1 : 0;
  return 1;
}

function isDefenseSpawnCell(row, col) {
  if (!inBounds(row, col)) return false;
  if (row >= BOARD_SIZE - 2) return false;
  return true;
}

function defenseSpawnSector(row, col) {
  if (col <= 2) return 'west';
  if (col >= BOARD_SIZE - 3) return 'east';
  return 'north';
}

function defenseSectorCounts(match) {
  const counts = { west: 0, north: 0, east: 0 };
  defensePawns(match, ['onboard', 'emerging']).forEach(function (w) {
    if (w.row == null || w.col == null) return;
    counts[defenseSpawnSector(w.row, w.col)] += 1;
  });
  return counts;
}

function pickDefenseSpawnSector(match) {
  const counts = defenseSectorCounts(match);
  const names = ['west', 'north', 'east'];
  let min = Infinity;
  names.forEach(function (name) {
    if (counts[name] < min) min = counts[name];
  });
  const tied = names.filter(function (name) { return counts[name] === min; });
  if (!tied.length) return 'north';
  return tied[match.rng ? match.rng.int(tied.length) : 0];
}

function nearestDefensePawnDist(match, row, col) {
  let best = 99;
  defensePawns(match, ['onboard', 'emerging']).forEach(function (w) {
    if (w.row == null || w.col == null) return;
    const d = manhattan(row, col, w.row, w.col);
    if (d < best) best = d;
  });
  return best;
}
