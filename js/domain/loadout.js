const DEFAULT_LOADOUT = [
  { kit: 'fire', spell: 'stream', special: 'lance' },
  { kit: 'ice', spell: 'sheet', special: 'pulse' },
  { kit: 'wind', spell: 'gust', special: 'draft' },
  { kit: 'fire', spell: 'cinder', special: 'inferno' }
];

function emptyLoadoutSlot(kitId) {
  return {
    kit: kitId,
    spell: normalizeBasicSpellId(kitId, null),
    special: normalizeSpecialSpellId(kitId, null)
  };
}

function cloneLoadout(loadout) {
  return (loadout || []).map(function (slot) {
    return { kit: slot.kit, spell: slot.spell, special: slot.special };
  });
}

function loadoutCap(opts) {
  if (opts && typeof opts.padTo === 'number') return opts.padTo;
  return TEAM_SIZE;
}

function parseLoadoutSlots(raw, opts) {
  const cap = loadoutCap(opts);
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
  for (i = 0; i < slots.length && out.length < cap; i++) {
    const row = slots[i] || {};
    const kitId = row.kit || row.kitId || row.id;
    if (!kitById(kitId)) continue;
    out.push({
      kit: kitId,
      spell: normalizeBasicSpellId(kitId, row.spell || row.spellId),
      special: normalizeSpecialSpellId(kitId, row.special)
    });
  }
  return out;
}

function padLoadout(slots, size) {
  const cap = typeof size === 'number' ? size : TEAM_SIZE;
  const out = (slots || []).slice(0, cap);
  const used = {};
  const seen = {};
  let i;
  for (i = 0; i < out.length; i++) used[out[i].kit] = (used[out[i].kit] || 0) + 1;
  for (i = 0; i < DEFAULT_LOADOUT.length && out.length < cap; i++) {
    const row = DEFAULT_LOADOUT[i];
    seen[row.kit] = (seen[row.kit] || 0) + 1;
    if ((used[row.kit] || 0) < seen[row.kit]) {
      out.push({ kit: row.kit, spell: row.spell, special: row.special });
      used[row.kit] = (used[row.kit] || 0) + 1;
    }
  }
  i = 0;
  while (out.length < cap) {
    const row = DEFAULT_LOADOUT[i % DEFAULT_LOADOUT.length];
    out.push({ kit: row.kit, spell: row.spell, special: row.special });
    i += 1;
  }
  return out;
}

function filterPlayableLoadout(raw) {
  const slots = parseLoadoutSlots(raw).filter(function (slot) {
    return kitPlayable(slot.kit);
  });
  return padLoadout(slots);
}

function randomPlayableLoadout(rng) {
  rng = rng || createRng((Date.now() >>> 0) || 1);
  const kits = PLAYABLE_KIT_IDS;
  const out = [];
  let i;
  for (i = 0; i < TEAM_SIZE; i++) {
    const kitId = kits[rng.int(kits.length)];
    const kit = kitById(kitId);
    const basics = basicsForElement((kit || {}).element);
    const specials = specialsForElement((kit || {}).element);
    const spell = basics.length ? basics[rng.int(basics.length)] : defaultSpellForKit(kit);
    const special = specials.length ? specials[rng.int(specials.length)] : null;
    out.push({
      kit: kitId,
      spell: spell ? spell.id : normalizeSpellId(kitId, null),
      special: special ? special.id : normalizeSpecialSpellId(kitId, null)
    });
  }
  return out;
}

function normalizeLoadout(raw, opts) {
  opts = opts || {};
  const parsed = parseLoadoutSlots(raw, opts);
  if (opts.pad === false) return parsed;
  return padLoadout(parsed, opts.padTo);
}

function loadoutKitIds(loadout) {
  return normalizeLoadout(loadout).map(function (slot) { return slot.kit; });
}

function pickEnemyLoadout(rng, playerLoadout) {
  const kits = pickEnemyTeam(rng, loadoutKitIds(playerLoadout));
  return kits.map(function (kitId) {
    const kit = kitById(kitId);
    const basics = basicsForElement((kit || {}).element);
    const specials = specialsForElement((kit || {}).element);
    const spell = basics.length ? basics[rng.int(basics.length)] : defaultSpellForKit(kit);
    const special = specials.length ? specials[rng.int(specials.length)] : null;
    return {
      kit: kitId,
      spell: spell ? spell.id : normalizeSpellId(kitId, null),
      special: special ? special.id : normalizeSpecialSpellId(kitId, null)
    };
  });
}
