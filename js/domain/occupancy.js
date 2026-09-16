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

function isBlocked(match, row, col) {
  return !!wizardAt(match, row, col) || !!nexusAt(match, row, col) || mountainAt(match, row, col);
}

function isSummonTile(row, col) {
  return row >= SUMMON_ROW_START && row < BOARD_SIZE;
}

function isEnemySummonTile(row, col) {
  return row >= 0 && row < ENEMY_ROW_END;
}
