function raiseMountain(match, row, col) {
  if (!match.tempMountains) match.tempMountains = {};
  const key = tileKey(row, col);
  match.tempMountains[key] = { turnsLeft: TEMP_MOUNTAIN_TURNS, element: 'earth' };
  if (match.trails) delete match.trails[key];
}

function tickTempMountains(match) {
  if (!match.tempMountains) return;
  Object.keys(match.tempMountains).forEach(function (key) {
    match.tempMountains[key].turnsLeft -= 1;
    if (match.tempMountains[key].turnsLeft <= 0) delete match.tempMountains[key];
  });
}

function openVoid(match, row, col) {
  if (!match.voids) match.voids = {};
  const key = tileKey(row, col);
  match.voids[key] = true;
  if (match.trails) delete match.trails[key];
  if (match.tempMountains) delete match.tempMountains[key];
}

function generateTerrain(match) {
  match.mountains = {};
  match.water = {};
}
