function teamMana(match, team) {
  return team === 'player' ? match.mana : match.enemyMana;
}

function spendMana(match, team, amount) {
  if (team === 'player') match.mana -= amount;
  else match.enemyMana -= amount;
}

function refillManaPools(match) {
  if (match.gameMode === 'defense') {
    // Defense has its own small pool, spent only on specials (drops stay free).
    const cap = typeof DEFENSE_MANA_CAP === 'number' ? DEFENSE_MANA_CAP : 6;
    match.maxMana = Math.min(cap, match.maxMana + 1);
    match.mana = match.maxMana;
    return;
  }
  match.maxMana = Math.min(MANA_CAP, match.maxMana + 1);
  match.mana = match.maxMana;
  match.enemyMaxMana = Math.min(MANA_CAP, match.enemyMaxMana + 1);
  match.enemyMana = match.enemyMaxMana;
}

// Melee is always free. Spell 1 costs 1× kit cost. Spell 2 costs 2× kit cost.
// Defense mana is specials only — basics stay free there.
function basicManaCost(wizard) {
  return wizard && wizard.cost ? wizard.cost : 0;
}

function specialManaCost(wizard) {
  return basicManaCost(wizard) * 2;
}

function attackManaCost(match, wizard, kind, which) {
  if (!wizard || kind !== 'cast') return 0;
  const special = (which || wizard.activeSpell) === 'special' && wizard.specialSpellId;
  if (match && match.gameMode === 'defense' && !special) return 0;
  return special ? specialManaCost(wizard) : basicManaCost(wizard);
}

function canPayCast(match, wizard, team, which) {
  if (!wizard) return false;
  which = which || wizard.activeSpell || 'basic';
  if (which === 'special' && !wizard.specialSpellId) return false;
  return teamMana(match, team) >= attackManaCost(match, wizard, 'cast', which);
}

function canCastSpecial(match, wizard, team) {
  return canPayCast(match, wizard, team, 'special');
}
