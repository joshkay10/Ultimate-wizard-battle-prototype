const TEAM_STORAGE_KEY = 'wizard-battle-team';
const LOADOUT_STORAGE_KEY = 'wizard-battle-loadout';

function loadPlayerLoadout() {
  if (typeof localStorage === 'undefined') return normalizeLoadout(DEFAULT_LOADOUT);
  try {
    const rawLoadout = localStorage.getItem(LOADOUT_STORAGE_KEY);
    if (rawLoadout) return normalizeLoadout(JSON.parse(rawLoadout));
    const rawTeam = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!rawTeam) return normalizeLoadout(DEFAULT_LOADOUT);
    return normalizeLoadout(JSON.parse(rawTeam));
  } catch (err) {
    return normalizeLoadout(DEFAULT_LOADOUT);
  }
}

function savePlayerLoadout(raw) {
  const loadout = normalizeLoadout(raw);
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
