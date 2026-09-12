const SPELLS = [
  { id: 'stream', name: 'Stream', element: 'fire', kind: 'stream', hint: 'line of 4 — paints fire', castRange: 4, castAttack: 3, castDisplacement: 1, paint: true },
  { id: 'inferno', name: 'Inferno', element: 'fire', kind: 'burst', hint: '3×3 fire — burns, paints magma', castRange: 3, castAttack: 2, castDisplacement: 0, paint: true, hitNexus: false, burstRadius: 1, special: 3 },
  { id: 'cinder', name: 'Cinder', element: 'fire', kind: 'burst', hint: 'one tile — paints fire', castRange: 4, castAttack: 2, castDisplacement: 0, paint: true, hitNexus: false, burstRadius: 0 },
  { id: 'brand', name: 'Brand', element: 'fire', kind: 'stream', hint: 'line of 3 — 1 now, 2 burn when they next act', castRange: 3, castAttack: 1, castDisplacement: 0, paint: true, burn: 2 },
  { id: 'lance', name: 'Lance', element: 'fire', kind: 'pierce', hint: 'piercing beam — hits everything in a line of 4, paints fire', castRange: 4, castAttack: 2, castDisplacement: 0, paint: true, hitNexus: false, special: 3 },
  { id: 'pulse', name: 'Pulse', element: 'ice', kind: 'pulse', hint: 'hits every neighbor', castRange: 1, castAttack: 2, castDisplacement: 1, paint: true, special: 2 },
  { id: 'blizzard', name: 'Blizzard', element: 'ice', kind: 'burst', hint: '3×3 ice — freezes the ground', castRange: 3, castAttack: 1, castDisplacement: 0, paint: true, hitNexus: false, burstRadius: 1, special: 2 },
  { id: 'sheet', name: 'Sheet', element: 'ice', kind: 'stream', hint: 'line of 4 — paints ice, no push', castRange: 4, castAttack: 1, castDisplacement: 0, paint: true },
  { id: 'lock', name: 'Lock', element: 'ice', kind: 'stream', hint: 'line of 3 — skip their next strike', castRange: 3, castAttack: 1, castDisplacement: 0, paint: true, root: true },
  { id: 'gust', name: 'Gust', element: 'wind', kind: 'gust', hint: 'line of 3 — big push, paints wind', castRange: 3, castAttack: 1, castDisplacement: 3, paint: true },
  { id: 'gale', name: 'Gale', element: 'wind', kind: 'burst', hint: '3×3 wind — shove out, paints wind', castRange: 3, castAttack: 0, castDisplacement: 1, paint: true, hitNexus: false, burstRadius: 1, special: 2 },
  { id: 'draft', name: 'Draft', element: 'wind', kind: 'stream', hint: 'line of 4 — huge push, paints wind', castRange: 4, castAttack: 0, castDisplacement: 4, paint: true, special: 2 },
  { id: 'tug', name: 'Tug', element: 'wind', kind: 'pull', hint: 'line of 3 — yank toward you, paints wind', castRange: 3, castAttack: 1, castDisplacement: 3, paint: true },
  { id: 'raise', name: 'Raise', element: 'earth', kind: 'raise', hint: 'empty tile becomes a mountain', castRange: 2, castAttack: 0, castDisplacement: 0, paint: false },
  { id: 'quake', name: 'Quake', element: 'earth', kind: 'burst', hint: '3×3 shock — hits crystals too', castRange: 2, castAttack: 2, castDisplacement: 1, paint: false, hitNexus: true, burstRadius: 1, special: 3 },
  { id: 'spike', name: 'Spike', element: 'earth', kind: 'burst', hint: 'one tile smash — hits crystals', castRange: 2, castAttack: 3, castDisplacement: 0, paint: false, hitNexus: true, burstRadius: 0, special: 2 },
  { id: 'bolt', name: 'Bolt', element: 'lightning', kind: 'bolt', hint: 'line of 4 — silences', castRange: 4, castAttack: 2, castDisplacement: 0, paint: false, silence: true, special: 3 },
  { id: 'arc', name: 'Arc', element: 'lightning', kind: 'burst', hint: '3×3 spark — silences', castRange: 2, castAttack: 1, castDisplacement: 0, paint: false, silence: true, hitNexus: false, burstRadius: 1, special: 2 },
  { id: 'jolt', name: 'Jolt', element: 'lightning', kind: 'pulse', hint: 'every neighbor — silences', castRange: 1, castAttack: 1, castDisplacement: 0, paint: false, silence: true },
  { id: 'swap', name: 'Swap', element: 'temporal', kind: 'swap', hint: 'swap with a wizard, or blink to an empty tile', castRange: 3, castAttack: 0, castDisplacement: 0, paint: false },
  { id: 'step', name: 'Step', element: 'temporal', kind: 'blink', hint: 'blink to an empty tile', castRange: 4, castAttack: 0, castDisplacement: 0, paint: false },
  { id: 'loop', name: 'Loop', element: 'temporal', kind: 'swap', hint: 'long swap or blink', castRange: 5, castAttack: 0, castDisplacement: 0, paint: false, special: 2 }
];

const CAST_HINT = {};

function spellById(id) {
  let i;
  for (i = 0; i < SPELLS.length; i++) {
    if (SPELLS[i].id === id) return SPELLS[i];
  }
  return null;
}

function spellsForElement(element) {
  return SPELLS.filter(function (spell) { return spell.element === element; });
}

function isSpecialSpell(spell) {
  return !!(spell && spell.special);
}

function specialCostOf(spellId) {
  const spell = spellById(spellId);
  return spell && spell.special ? spell.special : 0;
}

function basicsForElement(element) {
  return spellsForElement(element).filter(function (spell) { return !isSpecialSpell(spell); });
}

function specialsForElement(element) {
  return spellsForElement(element).filter(isSpecialSpell);
}

function firstBasicId(element) {
  const pool = basicsForElement(element);
  if (pool.length) return pool[0].id;
  const any = spellsForElement(element);
  return any.length ? any[0].id : 'stream';
}

function firstSpecialId(element) {
  const pool = specialsForElement(element);
  return pool.length ? pool[0].id : null;
}

// The free cast slot only holds basic (non-special) spells.
function normalizeBasicSpellId(kitId, spellId) {
  const kit = kitById(kitId);
  const element = kit ? kit.element : '';
  const pool = basicsForElement(element);
  let i;
  for (i = 0; i < pool.length; i++) {
    if (pool[i].id === spellId) return spellId;
  }
  return firstBasicId(element);
}

// The paid special slot only holds special-tier spells.
function normalizeSpecialSpellId(kitId, spellId) {
  const kit = kitById(kitId);
  const element = kit ? kit.element : '';
  const pool = specialsForElement(element);
  let i;
  for (i = 0; i < pool.length; i++) {
    if (pool[i].id === spellId) return spellId;
  }
  return firstSpecialId(element);
}

// Swaps the wizard's live cast fields between its free basic and its paid special.
function setActiveSpell(wizard, which) {
  if (!wizard) return;
  if (which === 'special' && wizard.specialSpellId) {
    applySpellToWizard(wizard, spellById(wizard.specialSpellId));
    wizard.activeSpell = 'special';
  } else {
    applySpellToWizard(wizard, spellById(wizard.basicSpellId || wizard.spellId));
    wizard.activeSpell = 'basic';
  }
}

function defaultSpellForKit(kit) {
  if (!kit) return SPELLS[0];
  const named = spellById(kit.defaultSpellId);
  if (named) return named;
  const pool = spellsForElement(kit.element);
  return pool.length ? pool[0] : SPELLS[0];
}

function normalizeSpellId(kitId, spellId) {
  const kit = kitById(kitId);
  const pool = spellsForElement(kit ? kit.element : '');
  let i;
  for (i = 0; i < pool.length; i++) {
    if (pool[i].id === spellId) return spellId;
  }
  const fallback = defaultSpellForKit(kit);
  return fallback ? fallback.id : (pool[0] ? pool[0].id : 'stream');
}

function applySpellToWizard(wizard, spell) {
  if (!wizard || !spell) return;
  wizard.spellId = spell.id;
  wizard.spellName = spell.name;
  wizard.castKind = spell.kind;
  wizard.castRange = spell.castRange;
  wizard.castAttack = spell.castAttack;
  wizard.castDisplacement = spell.castDisplacement;
  wizard.spellPaint = spell.paint !== false;
  wizard.spellSilence = !!spell.silence;
  wizard.spellHitNexus = !!spell.hitNexus;
  wizard.spellRoot = !!spell.root;
  wizard.spellBurn = spell.burn || 0;
  wizard.burstRadius = spell.burstRadius == null ? 1 : spell.burstRadius;
}

function spellLabel(wizard) {
  if (wizard && wizard.spellName) return wizard.spellName;
  const named = wizard && spellById(wizard.spellId);
  if (named) return named.name;
  return (wizard && wizard.castKind) || 'cast';
}

(function buildCastHints() {
  SPELLS.forEach(function (spell) {
    CAST_HINT[spell.id] = spell.hint;
    if (!CAST_HINT[spell.kind]) CAST_HINT[spell.kind] = spell.hint;
  });
})();
