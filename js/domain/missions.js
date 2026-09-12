// Named Defense missions. Each one pins an island, a four, and a spawn mix.
// Vs stays free-play. Random Defense (no missionId) is still what the tests use.
const MISSIONS = [
  {
    id: 'mission-1',
    number: 1,
    islandId: 'pass',
    islandFlip: false,
    seed: 7,
    title: '1 · Pop the mites',
    mapLabel: 'the pass',
    goal: 'Kill every mite. One hit pops them.',
    hint: 'Your four start on the board, ready this turn. Mites are the tiny circles. Shove, gust, or shoot — then keep the city alive.',
    blurb: 'Your four start on the board. Mites die in one hit. Pop them all before they stack on a crystal.',
    spawnBudget: 4,
    pawnCap: 2,
    spawnKinds: ['mite'],
    opening: { kind: 'mite' },
    dropsPerTurn: 4,
    deploySquad: true,
    loadout: [
      { kit: 'ice', spell: 'sheet', special: 'pulse' },
      { kit: 'ice', spell: 'lock', special: 'blizzard' },
      { kit: 'wind', spell: 'gust', special: 'gale' },
      { kit: 'fire', spell: 'stream', special: 'lance' }
    ]
  },
  {
    id: 'mission-2',
    number: 2,
    islandId: 'canal',
    islandFlip: false,
    seed: 11,
    title: '2 · Drown them',
    mapLabel: 'the canal',
    goal: 'Shove invaders into the canal. Water kills them.',
    hint: 'Tug and Gust push. Charge vek dash in a line — step aside, then dump them in the water.',
    blurb: 'Your four start on the board. Tug and Gust exist to put bodies in the water.',
    spawnBudget: 6,
    pawnCap: 3,
    spawnKinds: ['melee', 'charge'],
    opening: { kind: 'melee' },
    dropsPerTurn: 4,
    deploySquad: true,
    loadout: [
      { kit: 'wind', spell: 'tug', special: 'draft' },
      { kit: 'wind', spell: 'gust', special: 'gale' },
      { kit: 'ice', spell: 'sheet', special: 'pulse' },
      { kit: 'fire', spell: 'stream', special: 'inferno' }
    ]
  },
  {
    id: 'mission-3',
    number: 3,
    islandId: 'alley',
    islandFlip: false,
    seed: 19,
    title: '3 · Pierce the line',
    mapLabel: 'the alley',
    goal: 'Punch through a packed alley. Lance hits a whole row.',
    hint: 'Enemies stack in the choke. Pyre Stream (Lance) burns a line. Bombers shoot from range — do not stand in their aim.',
    blurb: 'Your four start on the board. Lance pays for itself when bodies line up in the corridor.',
    spawnBudget: 8,
    pawnCap: 3,
    spawnKinds: ['mite', 'melee', 'fireball'],
    opening: { kind: 'mite' },
    dropsPerTurn: 4,
    deploySquad: true,
    loadout: [
      { kit: 'fire', spell: 'stream', special: 'lance' },
      { kit: 'fire', spell: 'cinder', special: 'inferno' },
      { kit: 'ice', spell: 'lock', special: 'pulse' },
      { kit: 'wind', spell: 'gust', special: 'draft' }
    ]
  },
  {
    id: 'mission-4',
    number: 4,
    islandId: 'moat',
    islandFlip: false,
    seed: 23,
    title: '4 · Shove the Golem',
    mapLabel: 'the moat',
    goal: 'The big circle is a Golem. Shove it into water or a mountain.',
    hint: 'Golems soak shots. Tug, Lock, Brand, then dump it in a hazard. Mites still swarm — pop them too.',
    blurb: 'Your four start on the board. Do not trade with the Golem — shove it in the drink.',
    spawnBudget: 10,
    pawnCap: 3,
    spawnKinds: ['mite', 'melee', 'charge', 'fireball', 'golem'],
    opening: { kind: 'golem' },
    dropsPerTurn: 4,
    deploySquad: true,
    loadout: [
      { kit: 'wind', spell: 'tug', special: 'gale' },
      { kit: 'ice', spell: 'lock', special: 'pulse' },
      { kit: 'fire', spell: 'brand', special: 'lance' },
      { kit: 'ice', spell: 'sheet', special: 'blizzard' }
    ]
  }
];

function missionById(id) {
  if (!id) return null;
  let i;
  for (i = 0; i < MISSIONS.length; i++) {
    if (MISSIONS[i].id === id) return MISSIONS[i];
  }
  return null;
}

function missionResetOpts(mission) {
  if (!mission) return { gameMode: 'defense' };
  return {
    gameMode: 'defense',
    missionId: mission.id,
    missionTitle: mission.title,
    islandId: mission.islandId,
    islandFlip: !!mission.islandFlip,
    spawnBudget: mission.spawnBudget,
    pawnCap: mission.pawnCap,
    spawnKinds: mission.spawnKinds ? mission.spawnKinds.slice() : null,
    opening: mission.opening ? { kind: mission.opening.kind, row: mission.opening.row, col: mission.opening.col } : null,
    playerLoadout: cloneLoadout(mission.loadout),
    seed: mission.seed,
    dropsPerTurn: mission.dropsPerTurn == null ? 1 : mission.dropsPerTurn,
    deploySquad: !!mission.deploySquad
  };
}

function playlistIdDefault() {
  return MISSIONS[0] ? MISSIONS[0].id : 'defense';
}

function isVsPlaylist(id) {
  return id === 'vs';
}

function seedMissionSquad(match) {
  const city = (match.nexuses && match.nexuses.player) || [];
  const used = {};
  function mark(row, col) {
    if (row != null && col != null) used[tileKey(row, col)] = true;
  }
  city.forEach(function (n) { mark(n.row, n.col); });
  Object.values(match.wizards).forEach(function (w) {
    if (w.row != null) mark(w.row, w.col);
  });

  function cityDist(row, col) {
    let best = 99;
    let i;
    for (i = 0; i < city.length; i++) {
      const d = manhattan(row, col, city[i].row, city[i].col);
      if (d < best) best = d;
    }
    return best;
  }

  const candidates = [];
  let r;
  let c;
  for (r = 0; r < BOARD_SIZE; r++) {
    for (c = 0; c < BOARD_SIZE; c++) {
      if (used[tileKey(r, c)]) continue;
      if (mountainAt(match, r, c) || waterAt(match, r, c) || voidAt(match, r, c)) continue;
      if (typeof emergingAt === 'function' && emergingAt(match, r, c)) continue;
      if (typeof portalAt === 'function' && portalAt(match, r, c)) continue;
      candidates.push({ row: r, col: c, d: cityDist(r, c) });
    }
  }
  candidates.sort(function (a, b) {
    const aBand = a.d <= 3 ? 0 : (a.d <= 5 ? 1 : 2);
    const bBand = b.d <= 3 ? 0 : (b.d <= 5 ? 1 : 2);
    if (aBand !== bBand) return aBand - bBand;
    if (a.d !== b.d) return a.d - b.d;
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const squad = Object.values(match.wizards).filter(function (w) {
    return w.team === 'player' && !w.pawnKind && w.state === 'summoned';
  }).sort(function (a, b) {
    return parseInt(a.id.slice(1), 10) - parseInt(b.id.slice(1), 10);
  });
  let i;
  for (i = 0; i < squad.length; i++) {
    const tile = candidates[i];
    if (!tile) break;
    const wiz = squad[i];
    wiz.state = 'onboard';
    wiz.row = tile.row;
    wiz.col = tile.col;
    wiz.hasMoved = false;
    wiz.hasAttacked = false;
    wiz.summoningSickness = false;
    wiz.moveUndo = null;
  }
}
