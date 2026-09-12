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
    name: 'The Pass',
    mapLabel: 'the pass',
    goal: 'Pop every mite.',
    hint: 'One hit kills them. Red tiles fire after you end turn — shove or shoot first.',
    fail: 'The mites got through.',
    blurb: 'A tight mountain gate. The mite is already on the city’s doorstep — pop it or the cluster takes the hit. Four mites, two at a time. Ignore a telegraph and you can lose the city.',
    spawnBudget: 4,
    pawnCap: 2,
    cityExtra: 0,
    spawnKinds: ['mite'],
    opening: { kind: 'mite', row: 4, col: 4 },
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
    name: 'The Canal',
    mapLabel: 'the canal',
    goal: 'Drown them.',
    hint: 'Gust or Tug a body into the river. Trading blows with the city at 6 HP is how you die.',
    fail: 'The canal wasn’t enough.',
    blurb: 'A charger sits one tile from the river. Gust or Tug it in — trading blows with 3–4 HP bodies while the city has 6 HP is how you die here.',
    spawnBudget: 6,
    pawnCap: 3,
    cityExtra: 0,
    spawnKinds: ['melee', 'charge'],
    opening: { kind: 'charge', row: 4, col: 4 },
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
    name: 'The Alley',
    mapLabel: 'the alley',
    goal: 'Pierce the line.',
    hint: 'Lance hits a whole row. Do not stand in a SHOT.',
    fail: 'The alley broke.',
    blurb: 'A bomber already has the corridor. Lance pays when bodies line up. Standing in a SHOT to save a crystal costs real HP now — three chips and Squall is gone.',
    spawnBudget: 8,
    pawnCap: 3,
    cityExtra: 0,
    spawnKinds: ['mite', 'melee', 'fireball'],
    opening: { kind: 'fireball', row: 4, col: 4 },
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
    name: 'The Moat',
    mapLabel: 'the moat',
    goal: 'Shove the Golem.',
    hint: 'Dunk it in the moat. Bombers still shoot — save the city too.',
    fail: 'The Golem walked in.',
    blurb: 'The exam. A Golem is one gust from the moat — dunk it. Bombers and chargers still come; greed the dunk and the cluster falls.',
    spawnBudget: 10,
    pawnCap: 3,
    cityExtra: 0,
    spawnKinds: ['fireball', 'fireball', 'charge', 'melee'],
    opening: { kind: 'golem', row: 4, col: 1 },
    loadout: [
      { kit: 'wind', spell: 'gust', special: 'draft' },
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
    cityExtra: typeof mission.cityExtra === 'number' ? mission.cityExtra : null,
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

function nextMission(mission) {
  if (!mission) return null;
  let i;
  for (i = 0; i < MISSIONS.length; i++) {
    if (MISSIONS[i].id === mission.id) return MISSIONS[i + 1] || null;
  }
  return null;
}

function emptyCampaign() {
  return { cleared: {}, unlocked: 1, complete: false };
}

function cloneCampaign(raw) {
  const out = emptyCampaign();
  if (!raw) return out;
  if (typeof raw.unlocked === 'number' && raw.unlocked >= 1) out.unlocked = raw.unlocked;
  out.complete = !!raw.complete;
  if (raw.cleared && typeof raw.cleared === 'object') {
    Object.keys(raw.cleared).forEach(function (id) {
      const row = raw.cleared[id];
      out.cleared[id] = { flawless: !!(row && row.flawless) };
    });
  }
  if (out.unlocked > MISSIONS.length) out.unlocked = MISSIONS.length;
  return out;
}

function missionIsUnlocked(mission, campaign) {
  if (!mission) return false;
  const cap = campaign && typeof campaign.unlocked === 'number' ? campaign.unlocked : 1;
  return mission.number <= cap;
}

function highestUnlockedMission(campaign) {
  let best = MISSIONS[0] || null;
  let i;
  for (i = 0; i < MISSIONS.length; i++) {
    if (missionIsUnlocked(MISSIONS[i], campaign)) best = MISSIONS[i];
  }
  return best;
}

function applyMissionClear(campaign, missionId, flawless) {
  const out = cloneCampaign(campaign);
  const mission = missionById(missionId);
  if (!mission) return out;
  const prev = out.cleared[mission.id] || {};
  out.cleared[mission.id] = { flawless: !!(prev.flawless || flawless) };
  out.unlocked = Math.max(out.unlocked, Math.min(MISSIONS.length, mission.number + 1));
  if (mission.number === MISSIONS.length) {
    out.unlocked = MISSIONS.length;
    out.complete = true;
  }
  return out;
}
