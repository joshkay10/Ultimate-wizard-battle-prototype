// Named Defense missions. Each one pins an island, a four, and a spawn mix.
// Vs stays free-play. Random Defense (no missionId) is still what the tests use.
const MISSIONS = [
  {
    id: 'mission-1',
    number: 1,
    islandId: 'pass',
    islandFlip: false,
    seed: 7,
    title: '1 · The Pass',
    mapLabel: 'the pass',
    blurb: 'A tight mountain gate. Drop, read the telegraph, and pop the mites before they stack.',
    spawnBudget: 4,
    pawnCap: 2,
    spawnKinds: ['mite'],
    opening: { kind: 'mite' },
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
    title: '2 · The Canal',
    mapLabel: 'the canal',
    blurb: 'A river splits the board. Tug and Gust exist to put bodies in the water.',
    spawnBudget: 6,
    pawnCap: 3,
    spawnKinds: ['melee', 'charge'],
    opening: { kind: 'melee' },
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
    title: '3 · The Alley',
    mapLabel: 'the alley',
    blurb: 'A corridor. Lance pays for itself when mites line up.',
    spawnBudget: 8,
    pawnCap: 3,
    spawnKinds: ['mite', 'melee', 'fireball'],
    opening: { kind: 'mite' },
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
    title: '4 · The Moat',
    mapLabel: 'the moat',
    blurb: 'The exam. A Golem you do not trade with — shove it in the drink. Full toolkit.',
    spawnBudget: 10,
    pawnCap: 3,
    spawnKinds: ['mite', 'melee', 'charge', 'fireball', 'golem'],
    opening: { kind: 'golem' },
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
    seed: mission.seed
  };
}

function playlistIdDefault() {
  return MISSIONS[0] ? MISSIONS[0].id : 'defense';
}

function isVsPlaylist(id) {
  return id === 'vs';
}
