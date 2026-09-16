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

function defenseDropsOnce(match, team) {
  return match.gameMode === 'defense' && team === 'player';
}

function canPaySummon(match, wizard, team) {
  if (!wizard || wizard.state !== 'summoned' || wizard.team !== team) return false;
  if (!defenseDropsOnce(match, team)) return false;
  return !match.playerSummonedThisTurn;
}

function simSummon(match, wizard, row, col, team) {
  if (!canPaySummon(match, wizard, team)) return [];
  if (!canSummonAt(match, row, col, team)) return [];
  match.playerSummonedThisTurn = true;
  return landPlayerWizard(match, wizard, row, col, team);
}
