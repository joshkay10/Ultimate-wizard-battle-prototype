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

function canCastSpecial(match, wizard, team) {
  if (!wizard || !wizard.specialSpellId) return false;
  return teamMana(match, team) >= (wizard.specialCost || 0);
}
