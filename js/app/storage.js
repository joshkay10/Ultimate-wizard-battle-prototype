const TEAM_STORAGE_KEY = 'wizard-battle-team';

function loadPlayerTeam() {
  if (typeof localStorage === 'undefined') return DEFAULT_TEAM.slice();
  try {
    const raw = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!raw) return DEFAULT_TEAM.slice();
    return normalizeTeam(JSON.parse(raw));
  } catch (err) {
    return DEFAULT_TEAM.slice();
  }
}

function savePlayerTeam(ids) {
  const team = normalizeTeam(ids);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
  }
  return team;
}
