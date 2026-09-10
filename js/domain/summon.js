function simSummon(match, wizard, row, col, team) {
  if (!wizard || wizard.state !== 'summoned' || wizard.team !== team) return [];
  if (teamMana(match, team) < wizard.cost) return [];
  if (!canSummonAt(match, row, col, team)) return [];
  spendMana(match, team, wizard.cost);
  wizard.row = row;
  wizard.col = col;
  wizard.hasMoved = false;
  wizard.hasAttacked = false;
  wizard.summoningSickness = false;
  if (match.gameMode === 'defense' && team === 'player') {
    wizard.state = 'onboard';
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
  wizard.state = 'portaling';
  match.portals[tileKey(row, col)] = {
    row: row,
    col: col,
    wizardId: wizard.id,
    team: team,
    element: wizard.element
  };
  return [{
    type: 'portal',
    wizardId: wizard.id,
    row: row,
    col: col,
    team: team,
    element: wizard.element
  }];
}

function simResolvePortals(match, team) {
  const events = [];
  Object.keys(match.portals || {}).forEach(function (key) {
    const portal = match.portals[key];
    if (!portal || portal.team !== team) return;
    const wizard = match.wizards[portal.wizardId];
    delete match.portals[key];
    if (!wizard || wizard.state !== 'portaling') return;
    const blocker = wizardAt(match, portal.row, portal.col);
    if (blocker) {
      events.push({
        type: 'portalBlocked',
        wizardId: wizard.id,
        blockerId: blocker.id,
        row: portal.row,
        col: portal.col,
        team: team,
        element: wizard.element
      });
      wizard.hp = 0;
      const death = simKill(match, wizard);
      if (death) {
        death.cause = 'portal';
        events.push(death);
      }
      blocker.hp = 0;
      const blockerDeath = simKill(match, blocker);
      if (blockerDeath) {
        blockerDeath.cause = 'portal';
        events.push(blockerDeath);
      }
      return;
    }
    wizard.state = 'onboard';
    wizard.row = portal.row;
    wizard.col = portal.col;
    wizard.hasMoved = false;
    wizard.hasAttacked = false;
    wizard.summoningSickness = false;
    events.push({
      type: 'summon',
      wizardId: wizard.id,
      row: portal.row,
      col: portal.col,
      team: team,
      element: wizard.element
    });
    events.push.apply(events, applyTileEnter(match, wizard));
  });
  return events;
}
