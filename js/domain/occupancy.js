function mountainAt(match, row, col) {
  const key = tileKey(row, col);
  if (match.mountains && match.mountains[key]) return true;
  if (match.tempMountains && match.tempMountains[key]) return true;
  return false;
}

function waterAt(match, row, col) {
  return !!(match.water && match.water[tileKey(row, col)]);
}

function voidAt(match, row, col) {
  return !!(match.voids && match.voids[tileKey(row, col)]);
}

function hazardAt(match, row, col) {
  return waterAt(match, row, col) || voidAt(match, row, col);
}

function wizardAt(match, row, col) {
  const wizards = Object.values(match.wizards);
  let i;
  for (i = 0; i < wizards.length; i++) {
    const wizard = wizards[i];
    if (wizard.state === 'onboard' && wizard.row === row && wizard.col === col) return wizard;
  }
  return null;
}

function emergingAt(match, row, col) {
  const wizards = Object.values(match.wizards);
  let i;
  for (i = 0; i < wizards.length; i++) {
    const wizard = wizards[i];
    if (wizard.state === 'emerging' && wizard.row === row && wizard.col === col) return wizard;
  }
  return null;
}

function portalAt(match, row, col) {
  return (match.portals && match.portals[tileKey(row, col)]) || null;
}

function isBlocked(match, row, col) {
  return !!wizardAt(match, row, col) || !!nexusAt(match, row, col) || mountainAt(match, row, col);
}

function canOpenPortalAt(match, row, col) {
  return !isBlocked(match, row, col) && !portalAt(match, row, col) && !hazardAt(match, row, col) && !emergingAt(match, row, col);
}

function isSummonTile(row, col) {
  return row >= SUMMON_ROW_START && row < BOARD_SIZE;
}

function isEnemySummonTile(row, col) {
  return row >= 0 && row < ENEMY_ROW_END;
}

function canSummonAt(match, row, col, team) {
  if (!inBounds(row, col) || !canOpenPortalAt(match, row, col)) return false;
  if (match.gameMode === 'defense' && team === 'player') return true;
  if (team === 'player') return isSummonTile(row, col);
  return isEnemySummonTile(row, col);
}

function summonTilesFor(match, team) {
  const tiles = [];
  let start = team === 'player' ? SUMMON_ROW_START : 0;
  let end = team === 'player' ? BOARD_SIZE : ENEMY_ROW_END;
  if (match.gameMode === 'defense' && team === 'player') {
    start = 0;
    end = BOARD_SIZE;
  }
  let r;
  let c;
  for (r = start; r < end; r++) {
    for (c = 0; c < BOARD_SIZE; c++) {
      if (canSummonAt(match, r, c, team)) tiles.push({ row: r, col: c });
    }
  }
  return tiles;
}

function getPlayerSummonTiles(match) {
  return summonTilesFor(match, 'player');
}

function getEnemySummonTiles(match) {
  return summonTilesFor(match, 'enemy');
}

function getTeamSummonTiles(match, team) {
  return summonTilesFor(match, team);
}
