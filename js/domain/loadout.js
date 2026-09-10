const DEFAULT_LOADOUT = [
  { kit: 'fire', spell: 'stream' },
  { kit: 'ice', spell: 'pulse' },
  { kit: 'wind', spell: 'gust' }
];

function emptyLoadoutSlot(kitId) {
  return { kit: kitId, spell: normalizeSpellId(kitId, null) };
}

function normalizeLoadout(raw) {
  let slots = [];
  if (Array.isArray(raw) && raw.length && typeof raw[0] === 'string') {
    slots = uniqueKitIds(raw).map(function (kitId) { return emptyLoadoutSlot(kitId); });
  } else if (raw && Array.isArray(raw.slots)) {
    slots = raw.slots.slice();
  } else if (Array.isArray(raw)) {
    slots = raw.slice();
  }
  const kits = [];
  const out = [];
  let i;
  for (i = 0; i < slots.length; i++) {
    const row = slots[i] || {};
    const kitId = row.kit || row.kitId || row.id;
    if (!kitById(kitId) || kits.indexOf(kitId) !== -1) continue;
    kits.push(kitId);
    out.push({ kit: kitId, spell: normalizeSpellId(kitId, row.spell || row.spellId) });
    if (out.length === TEAM_SIZE) break;
  }
  const filledKits = normalizeTeam(kits);
  for (i = 0; i < filledKits.length; i++) {
    if (kits.indexOf(filledKits[i]) !== -1) continue;
    out.push(emptyLoadoutSlot(filledKits[i]));
  }
  return out.slice(0, TEAM_SIZE);
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
    return { kit: kitId, spell: spell.id };
  });
}
