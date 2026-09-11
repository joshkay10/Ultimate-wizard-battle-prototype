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
