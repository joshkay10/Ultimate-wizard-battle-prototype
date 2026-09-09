function paintsTrail(element) {
  return element === 'fire' || element === 'ice' || element === 'wind';
}

function trailAt(match, row, col) {
  return match.trails[tileKey(row, col)] || null;
}

function layTrail(match, row, col, element) {
  if (!paintsTrail(element)) return;
  if (mountainAt(match, row, col) || waterAt(match, row, col) || voidAt(match, row, col) || nexusAt(match, row, col)) return;
  match.trails[tileKey(row, col)] = { element: element, turnsLeft: TRAIL_TURNS };
}

function tickTrails(match) {
  Object.keys(match.trails).forEach(function (key) {
    match.trails[key].turnsLeft -= 1;
    if (match.trails[key].turnsLeft <= 0) delete match.trails[key];
  });
}
