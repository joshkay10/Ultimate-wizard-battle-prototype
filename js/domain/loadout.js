const DEFAULT_LOADOUT = [
  { kit: 'fire', spell: 'stream' },
  { kit: 'ice', spell: 'pulse' },
  { kit: 'wind', spell: 'gust' },
  { kit: 'earth', spell: 'raise' }
];

function emptyLoadoutSlot(kitId) {
  return { kit: kitId, spell: normalizeSpellId(kitId, null) };
}

function cloneLoadout(loadout) {
  return (loadout || []).map(function (slot) {
    return { kit: slot.kit, spell: slot.spell };
  });
}

function parseLoadoutSlots(raw) {
  let slots = [];
  if (Array.isArray(raw) && raw.length && typeof raw[0] === 'string') {
    slots = validKitIds(raw).map(function (kitId) { return emptyLoadoutSlot(kitId); });
  } else if (raw && Array.isArray(raw.slots)) {
    slots = raw.slots.slice();
  } else if (Array.isArray(raw)) {
    slots = raw.slice();
  }
  const out = [];
  let i;
  for (i = 0; i < slots.length && out.length < TEAM_SIZE; i++) {
    const row = slots[i] || {};
    const kitId = row.kit || row.kitId || row.id;
    if (!kitById(kitId)) continue;
    out.push({ kit: kitId, spell: normalizeSpellId(kitId, row.spell || row.spellId) });
  }
  return out;
}

function padLoadout(slots) {
  const out = (slots || []).slice(0, TEAM_SIZE);
  const present = {};
  let i;
  for (i = 0; i < out.length; i++) present[out[i].kit] = true;
  for (i = 0; i < DEFAULT_LOADOUT.length && out.length < TEAM_SIZE; i++) {
    if (present[DEFAULT_LOADOUT[i].kit]) continue;
    out.push({ kit: DEFAULT_LOADOUT[i].kit, spell: DEFAULT_LOADOUT[i].spell });
    present[DEFAULT_LOADOUT[i].kit] = true;
  }
  i = 0;
  while (out.length < TEAM_SIZE) {
    const row = DEFAULT_LOADOUT[i % DEFAULT_LOADOUT.length];
    out.push({ kit: row.kit, spell: row.spell });
    i += 1;
  }
  return out;
}

function normalizeLoadout(raw) {
  return padLoadout(parseLoadoutSlots(raw));
}

function loadoutKitIds(loadout) {
  return normalizeLoadout(loadout).map(function (slot) { return slot.kit; });
}

function loadoutSpellIds(loadout) {
  return normalizeLoadout(loadout).map(function (slot) { return slot.spell; });
}

function loadoutNamed(loadout) {
  return normalizeLoadout(loadout).map(function (slot) {
    const kit = kitById(slot.kit);
    const spell = spellById(slot.spell);
    const kitName = kit ? kit.name : slot.kit;
    const spellName = spell ? spell.name : slot.spell;
    return kitName + ' (' + spellName + ')';
  });
}

function pickEnemyLoadout(rng, playerLoadout) {
  const kits = pickEnemyTeam(rng, loadoutKitIds(playerLoadout));
  return kits.map(function (kitId) {
    const pool = spellsForElement((kitById(kitId) || {}).element);
    const spell = pool.length ? pool[rng.int(pool.length)] : defaultSpellForKit(kitById(kitId));
    return { kit: kitId, spell: spell ? spell.id : normalizeSpellId(kitId, null) };
  });
}
