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

function terrainTaken(row, col, mountains, water) {
  const key = tileKey(row, col);
  return !!(mountains[key] || water[key]);
}

function terrainAllowed(match, row, col, mountains, water) {
  if (!inBounds(row, col)) return false;
  if (nexusAt(match, row, col)) return false;
  if (nearNexus(match, row, col)) return false;
  if (terrainTaken(row, col, mountains, water)) return false;
  return true;
}

function stampVerticalPair(match, map, mountains, water, row, col) {
  if (row === CENTER) {
    const c2 = mirrorCol(col);
    if (!terrainAllowed(match, row, col, mountains, water)) return false;
    if (c2 !== col && !terrainAllowed(match, row, c2, mountains, water) && !map[tileKey(row, c2)]) return false;
    map[tileKey(row, col)] = true;
    map[tileKey(row, c2)] = true;
    return true;
  }
  const r2 = mirrorRow(row);
  if (!terrainAllowed(match, row, col, mountains, water)) return false;
  if (!terrainAllowed(match, r2, col, mountains, water) && !map[tileKey(r2, col)]) return false;
  map[tileKey(row, col)] = true;
  map[tileKey(r2, col)] = true;
  return true;
}

function pruneTerrainSingletons(map) {
  Object.keys(map).forEach(function (key) {
    const tile = parseTileKey(key);
    const neighbors = CARDINALS.filter(function (d) {
      return map[tileKey(tile.row + d[0], tile.col + d[1])];
    }).length;
    if (neighbors === 0) {
      delete map[key];
      delete map[tileKey(mirrorRow(tile.row), tile.col)];
      if (tile.row === CENTER) delete map[tileKey(tile.row, mirrorCol(tile.col))];
    }
  });
}

function campsConnected(match, mountains, water) {
  function blocked(row, col) {
    if (!inBounds(row, col)) return true;
    if (nexusAt(match, row, col)) return true;
    return terrainTaken(row, col, mountains, water);
  }
  const visited = {};
  const queue = [];
  let c;
  for (c = 0; c < BOARD_SIZE; c++) {
    if (blocked(SUMMON_ROW_START + 1, c)) continue;
    const key = tileKey(SUMMON_ROW_START + 1, c);
    visited[key] = true;
    queue.push({ row: SUMMON_ROW_START + 1, col: c });
  }
  while (queue.length) {
    const cur = queue.pop();
    if (cur.row < ENEMY_ROW_END) return true;
    let i;
    for (i = 0; i < CARDINALS.length; i++) {
      const nr = cur.row + CARDINALS[i][0];
      const nc = cur.col + CARDINALS[i][1];
      const key = tileKey(nr, nc);
      if (visited[key] || blocked(nr, nc)) continue;
      visited[key] = true;
      queue.push({ row: nr, col: nc });
    }
  }
  return false;
}

function countOpenSummonTiles(match, mountains, water, team) {
  let n = 0;
  const start = team === 'player' ? SUMMON_ROW_START : 0;
  const end = team === 'player' ? BOARD_SIZE : ENEMY_ROW_END;
  let r;
  let c;
  for (r = start; r < end; r++) {
    for (c = 0; c < BOARD_SIZE; c++) {
      if (nexusAt(match, r, c)) continue;
      if (terrainTaken(r, c, mountains, water)) continue;
      n += 1;
    }
  }
  return n;
}

function fallbackMountains(match) {
  const map = {};
  const empty = {};
  const seeds = [[1, 0], [2, 0], [2, 1], [1, 8], [2, 8], [2, 7]];
  let i;
  for (i = 0; i < seeds.length; i++) {
    stampVerticalPair(match, map, map, empty, seeds[i][0], seeds[i][1]);
  }
  return map;
}

function growTerrainCluster(match, map, mountains, water, seed, size, edgeBias) {
  if (!seed) return;
  const body = [];
  if (stampVerticalPair(match, map, mountains, water, seed.row, seed.col)) body.push(seed);
  let guard = 0;
  while (body.length < size && guard++ < 28) {
    const from = body[match.rng.int(body.length)];
    if (!from) break;
    const neigh = [];
    CARDINALS.forEach(function (d) {
      const nr = from.row + d[0];
      const nc = from.col + d[1];
      if (nr > CENTER) return;
      if (!terrainAllowed(match, nr, nc, mountains, water)) return;
      const lr = Math.min(nc, BOARD_SIZE - 1 - nc);
      let weight = 1;
      if (edgeBias) weight = lr === 0 ? 7 : lr === 1 ? 3 : 1;
      else weight = lr <= 1 ? 1 : 3;
      let i;
      for (i = 0; i < weight; i++) neigh.push({ row: nr, col: nc });
    });
    if (!neigh.length) continue;
    const next = neigh[match.rng.int(neigh.length)];
    if (stampVerticalPair(match, map, mountains, water, next.row, next.col)) body.push(next);
  }
}

function pickTerrainSeed(match, mountains, water, cols, maxRow, colWeight) {
  const opts = [];
  cols.forEach(function (c) {
    let r;
    for (r = 0; r <= maxRow; r++) {
      if (!terrainAllowed(match, r, c, mountains, water)) continue;
      const copies = colWeight(c, r);
      let i;
      for (i = 0; i < copies; i++) opts.push({ row: r, col: c });
    }
  });
  if (!opts.length) return null;
  return opts[match.rng.int(opts.length)];
}

function generateMountainsInto(match, mountains, water) {
  function edgeWeight(c, r) {
    const edge = (c === 0 || c === 8) ? 5 : (c === 1 || c === 7) ? 3 : 1;
    const rowW = r === 0 ? 2 : 3;
    return edge * rowW;
  }
  growTerrainCluster(
    match, mountains, mountains, water,
    pickTerrainSeed(match, mountains, water, [0, 1, 2], 3, edgeWeight),
    3 + match.rng.int(2),
    true
  );
  growTerrainCluster(
    match, mountains, mountains, water,
    pickTerrainSeed(match, mountains, water, [8, 7, 6], 3, edgeWeight),
    2 + match.rng.int(3),
    true
  );
  pruneTerrainSingletons(mountains);
}

function generateWaterInto(match, mountains, water) {
  function lakeWeight(c, r) {
    const lr = Math.min(c, BOARD_SIZE - 1 - c);
    const colW = lr <= 1 ? 1 : 4;
    const rowW = r <= 1 ? 1 : 3;
    return colW * rowW;
  }
  const groups = 1 + match.rng.int(2);
  let g;
  for (g = 0; g < groups; g++) {
    growTerrainCluster(
      match, water, mountains, water,
      pickTerrainSeed(match, mountains, water, [1, 2, 3, 4, 5, 6, 7], 4, lakeWeight),
      2 + match.rng.int(3),
      false
    );
  }
  pruneTerrainSingletons(water);
}

function generateTerrain(match) {
  if (match.gameMode === 'defense') {
    generateDefenseTerrain(match);
    return;
  }
  if (!match.rng) {
    match.mountains = fallbackMountains(match);
    match.water = {};
    return;
  }

  const mountains = {};
  const water = {};
  generateMountainsInto(match, mountains, water);
  if (!campsConnected(match, mountains, water)) {
    match.mountains = fallbackMountains(match);
    match.water = {};
    return;
  }
  if (match.rng.next() < 0.48) generateWaterInto(match, mountains, water);
  if (!campsConnected(match, mountains, water)) {
    Object.keys(water).forEach(function (key) { delete water[key]; });
  }

  if (countOpenSummonTiles(match, mountains, water, 'player') < 6 || countOpenSummonTiles(match, mountains, water, 'enemy') < 6) {
    match.mountains = fallbackMountains(match);
    match.water = {};
    return;
  }
  match.mountains = mountains;
  match.water = water;
}

function stampOne(match, map, mountains, water, row, col) {
  if (!terrainAllowed(match, row, col, mountains, water)) return false;
  map[tileKey(row, col)] = true;
  return true;
}

function pruneSingletons(map) {
  Object.keys(map).forEach(function (key) {
    const tile = parseTileKey(key);
    const neighbors = CARDINALS.filter(function (d) {
      return map[tileKey(tile.row + d[0], tile.col + d[1])];
    }).length;
    if (neighbors === 0) delete map[key];
  });
}

function growUnmirroredCluster(match, map, mountains, water, seed, size, edgeBias) {
  if (!seed) return;
  const body = [];
  if (stampOne(match, map, mountains, water, seed.row, seed.col)) body.push(seed);
  let guard = 0;
  while (body.length < size && guard++ < 36) {
    const from = body[match.rng.int(body.length)];
    if (!from) break;
    const neigh = [];
    CARDINALS.forEach(function (d) {
      const nr = from.row + d[0];
      const nc = from.col + d[1];
      if (!terrainAllowed(match, nr, nc, mountains, water)) return;
      const lr = Math.min(nc, BOARD_SIZE - 1 - nc);
      let weight = 1;
      if (edgeBias) weight = lr === 0 ? 6 : lr === 1 ? 3 : 1;
      else weight = lr <= 1 ? 1 : 3;
      let i;
      for (i = 0; i < weight; i++) neigh.push({ row: nr, col: nc });
    });
    if (!neigh.length) continue;
    const next = neigh[match.rng.int(neigh.length)];
    if (stampOne(match, map, mountains, water, next.row, next.col)) body.push(next);
  }
}

function pickUnmirroredSeed(match, mountains, water, cols, minRow, maxRow, colWeight) {
  const opts = [];
  cols.forEach(function (c) {
    let r;
    for (r = minRow; r <= maxRow; r++) {
      if (!terrainAllowed(match, r, c, mountains, water)) continue;
      const copies = colWeight(c, r);
      let i;
      for (i = 0; i < copies; i++) opts.push({ row: r, col: c });
    }
  });
  if (!opts.length) return null;
  return opts[match.rng.int(opts.length)];
}

function generateDefenseTerrain(match) {
  if (!match.rng) {
    match.mountains = { '1,0': true, '2,0': true, '1,8': true, '2,8': true, '3,8': true };
    match.water = {};
    return;
  }
  const style = match.rng.int(5);
  const mountains = {};
  const water = {};
  function edgeWeight(c, r) {
    const edge = (c === 0 || c === 8) ? 6 : (c === 1 || c === 7) ? 3 : 1;
    return edge * (r <= 2 ? 2 : 3);
  }
  function lakeWeight(c, r) {
    const lr = Math.min(c, BOARD_SIZE - 1 - c);
    return (lr <= 1 ? 1 : 4) * (r <= 1 ? 1 : 3);
  }
  const mountainPasses = style === 3 ? 3 : (style === 2 ? 1 : 2);
  const mountainCols = [
    [0, 1, 2],
    [8, 7, 6],
    [0, 8, 1, 7]
  ];
  let p;
  for (p = 0; p < mountainPasses; p++) {
    const cols = mountainCols[p] || mountainCols[0];
    const size = style === 2
      ? (1 + match.rng.int(3))
      : (style === 3 ? (3 + match.rng.int(4)) : (2 + match.rng.int(4)));
    growUnmirroredCluster(
      match, mountains, mountains, water,
      pickUnmirroredSeed(match, mountains, water, cols, 0, style === 3 ? 8 : 7, edgeWeight),
      size,
      true
    );
  }
  pruneSingletons(mountains);

  const waterChance = style === 1 ? 0.92 : (style === 4 ? 0.8 : (style === 2 ? 0.22 : 0.5));
  if (match.rng.next() < waterChance) {
    const groups = style === 1 ? (2 + match.rng.int(2)) : (style === 4 ? 1 : (1 + match.rng.int(2)));
    const waterSize = style === 4 ? (4 + match.rng.int(4)) : (2 + match.rng.int(4));
    const waterCols = style === 4 ? [3, 4, 5] : [1, 2, 3, 4, 5, 6, 7];
    let g;
    for (g = 0; g < groups; g++) {
      growUnmirroredCluster(
        match, water, mountains, water,
        pickUnmirroredSeed(match, mountains, water, waterCols, 1, style === 4 ? 7 : 6, lakeWeight),
        waterSize,
        false
      );
    }
    pruneSingletons(water);
  }
  if (!campsConnected(match, mountains, water)) {
    Object.keys(water).forEach(function (key) { delete water[key]; });
  }
  if (!campsConnected(match, mountains, water)) {
    match.mountains = { '0,0': true, '1,0': true, '0,8': true, '2,8': true, '3,7': true };
    match.water = {};
    return;
  }
  let spawnOpen = 0;
  let r;
  let c;
  for (r = 0; r < ENEMY_ROW_END; r++) {
    for (c = 0; c < BOARD_SIZE; c++) {
      if (nexusAt(match, r, c)) continue;
      if (terrainTaken(r, c, mountains, water)) continue;
      spawnOpen += 1;
    }
  }
  if (spawnOpen < 4) {
    match.mountains = { '0,0': true, '1,0': true, '0,8': true, '2,8': true };
    match.water = {};
    return;
  }
  match.mountains = mountains;
  match.water = water;
}
