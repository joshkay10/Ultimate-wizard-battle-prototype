function landPlayerWizard(match, wizard, row, col, team) {
  wizard.state = 'onboard';
  wizard.row = row;
  wizard.col = col;
  wizard.hasMoved = false;
  wizard.hasAttacked = false;
  wizard.summoningSickness = false;
  const events = [{
    type: 'summon',
    wizardId: wizard.id,
    row: row,
    col: col,
    team: team,
    element: wizard.element
  }];
  events.push.apply(events, applyTileEnter(match, wizard));
  return events;
}

function canPaySummon(match, wizard, team) {
  if (!wizard || wizard.state !== 'summoned' || wizard.team !== team) return false;
  const cost = typeof summonManaCost === 'function' ? summonManaCost() : 1;
  return teamMana(match, team) >= cost;
}

function simSummon(match, wizard, row, col, team) {
  if (!canPaySummon(match, wizard, team)) return [];
  if (!canSummonAt(match, row, col, team)) return [];
  const cost = typeof summonManaCost === 'function' ? summonManaCost() : 1;
  spendMana(match, team, cost);
  return landPlayerWizard(match, wizard, row, col, team);
}
