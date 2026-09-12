function teamMana(match, team) {
  return team === 'player' ? match.mana : match.enemyMana;
}

function spendMana(match, team, amount) {
  if (team === 'player') match.mana -= amount;
  else match.enemyMana -= amount;
}

function refillManaPools(match) {
  if (match.gameMode === 'defense') return;
  match.maxMana = Math.min(MANA_CAP, match.maxMana + 1);
  match.mana = match.maxMana;
  match.enemyMaxMana = Math.min(MANA_CAP, match.enemyMaxMana + 1);
  match.enemyMana = match.enemyMaxMana;
}
