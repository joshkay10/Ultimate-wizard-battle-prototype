function teamMana(match, team) {
  return team === 'player' ? match.mana : match.enemyMana;
}

function spendMana(match, team, amount) {
  if (team === 'player') match.mana -= amount;
  else match.enemyMana -= amount;
}

function refillManaPools(match) {
  const cap = typeof MANA_CAP === 'number' ? MANA_CAP : 6;
  match.maxMana = Math.min(cap, match.maxMana + 1);
  match.mana = match.maxMana;
}

function summonManaCost() {
  return typeof SUMMON_MANA_COST === 'number' ? SUMMON_MANA_COST : 1;
}

function wizardSpellTier(wizard) {
  if (!wizard) return 0;
  return Math.min(2, wizard.kills || 0);
}

function canUseBasicSpell(wizard) {
  return wizardSpellTier(wizard) >= 1;
}

function canUseSpecialSpell(wizard) {
  return wizardSpellTier(wizard) >= 2;
}

// Stock is free. Spell 1 costs 1× kit cost. Spell 2 costs 2× kit cost.
function basicManaCost(wizard) {
  return wizard && wizard.cost ? wizard.cost : 0;
}

function specialManaCost(wizard) {
  return basicManaCost(wizard) * 2;
}

function attackManaCost(match, wizard, kind, which) {
  if (!wizard || kind !== 'cast') return 0;
  const special = (which || wizard.activeSpell) === 'special' && wizard.specialSpellId;
  if (special && !canUseSpecialSpell(wizard)) return Infinity;
  if (!special && !canUseBasicSpell(wizard)) return Infinity;
  return special ? specialManaCost(wizard) : basicManaCost(wizard);
}

function canPayCast(match, wizard, team, which) {
  if (!wizard) return false;
  which = which || wizard.activeSpell || 'basic';
  if (which === 'special') {
    if (!wizard.specialSpellId || !canUseSpecialSpell(wizard)) return false;
  } else if (!canUseBasicSpell(wizard)) {
    return false;
  }
  return teamMana(match, team) >= attackManaCost(match, wizard, 'cast', which);
}

function canCastSpecial(match, wizard, team) {
  return canPayCast(match, wizard, team, 'special');
}
