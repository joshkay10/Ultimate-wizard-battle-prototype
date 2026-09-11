function simSummonBurst(match, wizard) {
  if (!wizard || wizard.state !== 'onboard' || wizard.row == null) return [];
  const tiles = getPulseTiles(match, wizard);
  const events = [];
  const hits = [];
  tiles.forEach(function (tile) {
    const victim = wizardAt(match, tile.row, tile.col);
    if (victim && victim.id !== wizard.id && victim.state === 'onboard') {
      hits.push({ wizard: victim, row: tile.row, col: tile.col });
    }
  });
  events.push({
    type: 'attack',
    kind: 'cast',
    castKind: 'summonBurst',
    spellId: 'burst',
    spellName: 'Burst',
    attackerId: wizard.id,
    from: { row: wizard.row, col: wizard.col },
    row: wizard.row,
    col: wizard.col,
    element: wizard.element,
    hit: hits.length ? 'burst' : 'tile',
    pathTiles: tiles.slice(),
    burstTiles: tiles.slice(),
    trails: [],
    damage: 0
  });
  hits.sort(function (a, b) {
    return manhattan(wizard.row, wizard.col, b.row, b.col) - manhattan(wizard.row, wizard.col, a.row, a.col);
  });
  hits.forEach(function (hit) {
    if (hit.wizard.state !== 'onboard') return;
    const dir = directionBetween(wizard.row, wizard.col, hit.row, hit.col);
    events.push.apply(events, simPush(match, hit.wizard, dir.dr, dir.dc, 1));
  });
  return events;
}

function landPlayerWizard(match, wizard, row, col, team) {
  wizard.state = 'onboard';
  wizard.row = row;
  wizard.col = col;
  wizard.hasMoved = false;
  wizard.hasAttacked = false;
  wizard.summoningSickness = true;
  const events = [{
    type: 'summon',
    wizardId: wizard.id,
    row: row,
    col: col,
    team: team,
    element: wizard.element
  }];
  events.push.apply(events, applyTileEnter(match, wizard));
  if (wizard.state === 'onboard') {
    events.push.apply(events, simSummonBurst(match, wizard));
  }
  return events;
}

function simSummon(match, wizard, row, col, team) {
  if (!wizard || wizard.state !== 'summoned' || wizard.team !== team) return [];
  if (teamMana(match, team) < wizard.cost) return [];
  if (!canSummonAt(match, row, col, team)) return [];
  spendMana(match, team, wizard.cost);
  wizard.row = row;
  wizard.col = col;
  wizard.hasMoved = false;
  wizard.hasAttacked = false;
  if (match.gameMode === 'defense' && team === 'player') {
    return landPlayerWizard(match, wizard, row, col, team);
  }
  wizard.summoningSickness = false;
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
    wizard.summoningSickness = team === 'player';
    events.push({
      type: 'summon',
      wizardId: wizard.id,
      row: portal.row,
      col: portal.col,
      team: team,
      element: wizard.element
    });
    events.push.apply(events, applyTileEnter(match, wizard));
    if (team === 'player' && wizard.state === 'onboard') {
      events.push.apply(events, simSummonBurst(match, wizard));
    }
  });
  return events;
}
