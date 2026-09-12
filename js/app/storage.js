const TEAM_STORAGE_KEY = 'wizard-battle-team';
const LOADOUT_STORAGE_KEY = 'wizard-battle-loadout';

function readStoredLoadoutRaw() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const rawLoadout = localStorage.getItem(LOADOUT_STORAGE_KEY);
    if (rawLoadout) return JSON.parse(rawLoadout);
    const rawTeam = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!rawTeam) return null;
    return JSON.parse(rawTeam);
  } catch (err) {
    return null;
  }
}

function loadStoredLoadoutSlots() {
  const raw = readStoredLoadoutRaw();
  if (raw == null) return cloneLoadout(DEFAULT_LOADOUT);
  const slots = filterPlayableLoadout(raw);
  return slots.length ? slots : cloneLoadout(DEFAULT_LOADOUT);
}

function loadPlayerLoadout() {
  return filterPlayableLoadout(readStoredLoadoutRaw() || DEFAULT_LOADOUT);
}

function savePlayerLoadout(raw) {
  const loadout = filterPlayableLoadout(raw);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(loadout));
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(loadoutKitIds(loadout)));
  }
  return loadout;
}

function loadPlayerTeam() {
  return loadoutKitIds(loadPlayerLoadout());
}

function savePlayerTeam(ids) {
  return loadoutKitIds(savePlayerLoadout(ids));
}

const MODE_STORAGE_KEY = 'wizard-battle-mode';

function loadGameMode() {
  if (typeof localStorage === 'undefined') return 'defense';
  try {
    const raw = localStorage.getItem(MODE_STORAGE_KEY);
    if (raw === 'vs' || raw === 'defense') return raw;
  } catch (err) {}
  return 'defense';
}

function saveGameMode(mode) {
  mode = mode === 'vs' ? 'vs' : 'defense';
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }
  return mode;
}

const STATS_STORAGE_KEY = 'wizard-battle-stats';

function emptyModeStats() {
  return { streak: 0, best: 0, flawless: 0, wins: 0 };
}

function readAllStats() {
  const base = { defense: emptyModeStats(), vs: emptyModeStats() };
  if (typeof localStorage === 'undefined') return base;
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    ['defense', 'vs'].forEach(function (mode) {
      if (parsed && parsed[mode]) {
        base[mode] = Object.assign(emptyModeStats(), parsed[mode]);
      }
    });
  } catch (err) {}
  return base;
}

function loadModeStats(mode) {
  mode = mode === 'vs' ? 'vs' : 'defense';
  return readAllStats()[mode];
}

function writeAllStats(all) {
  if (typeof localStorage === 'undefined') return all;
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(all));
  } catch (err) {}
  return all;
}

// Records a finished match and returns the updated stats for that mode,
// including the streak value *before* this match (handy for "streak broken" copy).
function recordMatchStats(mode, outcome, flawless) {
  mode = mode === 'vs' ? 'vs' : 'defense';
  const all = readAllStats();
  const stats = all[mode];
  const prevStreak = stats.streak;
  if (outcome === 'player') {
    stats.wins += 1;
    stats.streak += 1;
    if (stats.streak > stats.best) stats.best = stats.streak;
    if (flawless) stats.flawless += 1;
  } else if (outcome === 'enemy') {
    stats.streak = 0;
  }
  writeAllStats(all);
  return { stats: stats, prevStreak: prevStreak };
}
