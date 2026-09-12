function flipCol(col, flip) {
  return flip ? BOARD_SIZE - 1 - col : col;
}

function uniqueCells(cells, flip, allow) {
  const seen = {};
  const out = [];
  let i;
  for (i = 0; i < cells.length; i++) {
    const row = cells[i][0];
    const col = flipCol(cells[i][1], flip);
    if (!inBounds(row, col)) continue;
    if (allow && !allow(row, col)) continue;
    const key = tileKey(row, col);
    if (seen[key]) continue;
    seen[key] = true;
    out.push({ row: row, col: col, key: key });
  }
  return out;
}

function fillMap(cells) {
  const map = {};
  cells.forEach(function (tile) { map[tile.key] = true; });
  return map;
}

function rectCells(r0, c0, r1, c1, skip) {
  const out = [];
  let r;
  let c;
  for (r = r0; r <= r1; r++) {
    for (c = c0; c <= c1; c++) {
      if (skip && skip(r, c)) continue;
      out.push([r, c]);
    }
  }
  return out;
}

function cityPacked(tiles) {
  if (tiles.length <= 1) return true;
  const keys = {};
  tiles.forEach(function (t) { keys[tileKey(t.row, t.col)] = true; });
  return tiles.every(function (t) {
    return CARDINALS.some(function (d) {
      return keys[tileKey(t.row + d[0], t.col + d[1])];
    });
  });
}

function countOpenRows(mountains, water, cityKeys, r0, r1) {
  let n = 0;
  let r;
  let c;
  for (r = r0; r <= r1; r++) {
    for (c = 0; c < BOARD_SIZE; c++) {
      const key = tileKey(r, c);
      if (cityKeys[key] || mountains[key] || water[key]) continue;
      n += 1;
    }
  }
  return n;
}

function defenseIslandWalkable(match, nexuses, mountains, water) {
  const prevN = match.nexuses;
  const prevM = match.mountains;
  const prevW = match.water;
  match.nexuses = { player: nexuses, enemy: [] };
  match.mountains = mountains;
  match.water = water;
  const ok = campsConnected(match, mountains, water);
  match.nexuses = prevN;
  match.mountains = prevM;
  match.water = prevW;
  return ok;
}

function bakeDefenseIsland(spec, flip) {
  const city = uniqueCells(spec.city, flip, function (row, col) {
    return defenseNexusCellOk(row, col);
  });
  const cityKeys = {};
  city.forEach(function (t) { cityKeys[t.key] = true; });
  const mountains = fillMap(uniqueCells(spec.mountains || [], flip, function (row, col) {
    return !cityKeys[tileKey(row, col)];
  }));
  const water = fillMap(uniqueCells(spec.water || [], flip, function (row, col) {
    return !cityKeys[tileKey(row, col)] && !mountains[tileKey(row, col)];
  }));
  pruneSingletons(mountains);
  pruneSingletons(water);
  return {
    id: spec.id,
    name: spec.name,
    city: city,
    mountains: mountains,
    water: water,
    cityKeys: cityKeys
  };
}

function islandOk(match, baked) {
  const min = typeof DEFENSE_NEXUS_MIN === 'number' ? DEFENSE_NEXUS_MIN : 3;
  const max = typeof DEFENSE_NEXUS_MAX === 'number' ? DEFENSE_NEXUS_MAX : 6;
  if (baked.city.length < min || baked.city.length > max) return false;
  if (!cityPacked(baked.city)) return false;
  const nexuses = baked.city.map(function (tile, idx) {
    return makeNexus({
      id: 'player-cluster-' + idx,
      row: tile.row,
      col: tile.col
    }, 'player', DEFENSE_NEXUS_HP);
  });
  if (!defenseIslandWalkable(match, nexuses, baked.mountains, baked.water)) return false;
  if (countOpenRows(baked.mountains, baked.water, baked.cityKeys, 0, 2) < 4) return false;
  if (countOpenRows(baked.mountains, baked.water, baked.cityKeys, 0, BOARD_SIZE - 3) < 10) return false;
  return true;
}

function extraCity(rng, base, extras) {
  const n = rng.int(Math.min(3, extras.length + 1));
  return base.concat(extras.slice(0, n));
}

function buildPass(rng) {
  const mountains = rectCells(0, 0, 6, 1).concat(rectCells(0, 7, 6, 8));
  mountains.push([3, 2], [4, 2], [3, 6], [4, 6]);
  const water = rng.next() < 0.65 ? [[2, 4], [3, 4], [2, 5]] : [];
  const city = extraCity(rng, [[6, 4], [6, 3], [7, 4]], [[6, 5], [5, 4], [7, 3]]);
  return { id: 'pass', name: 'the pass', city: city, mountains: mountains, water: water };
}

function buildCanal(rng) {
  const riverCol = 3;
  const water = rectCells(1, riverCol, 7, riverCol);
  if (rng.next() < 0.5) water.push([2, riverCol + 1], [3, riverCol + 1]);
  const mountains = rectCells(0, 0, 5, 0).concat([[1, 1], [2, 1], [4, 8], [5, 8], [5, 7]]);
  const city = extraCity(rng, [[6, 5], [6, 6], [7, 5]], [[5, 5], [7, 6], [6, 4]]);
  return { id: 'canal', name: 'the canal', city: city, mountains: mountains, water: water };
}

function buildTwins(rng) {
  const west = [[6, 1], [6, 2], [7, 1]];
  const east = [[6, 6], [6, 7], [5, 7]];
  if (rng.next() < 0.5) west[2] = [7, 2];
  const mountains = [[3, 4], [4, 4], [5, 4], [4, 3], [4, 5], [2, 4], [1, 0], [2, 0], [1, 8], [2, 8]];
  const water = rng.next() < 0.45 ? [[3, 3], [3, 4], [3, 5]] : [];
  return { id: 'twins', name: 'twin towns', city: west.concat(east), mountains: mountains, water: water };
}

function buildShelf(rng) {
  const mountains = rectCells(0, 0, 7, 1).concat([[2, 2], [3, 2], [5, 2]]);
  const water = rng.next() < 0.7 ? [[2, 5], [2, 6], [3, 6], [3, 7]] : [[4, 7], [5, 7]];
  const city = extraCity(rng, [[6, 3], [7, 3], [6, 4]], [[5, 3], [7, 4], [6, 2]]);
  return { id: 'shelf', name: 'the shelf', city: city, mountains: mountains, water: water };
}

function buildMoat(rng) {
  const city = extraCity(rng, [[6, 4], [6, 5], [5, 4]], [[7, 4], [5, 5], [6, 3]]);
  const water = [
    [4, 3], [5, 3], [6, 3], [7, 3],
    [4, 4], [4, 5], [4, 6],
    [5, 6], [6, 6]
  ];
  if (rng.next() < 0.5) water.push([7, 5]);
  const mountains = [[0, 0], [1, 0], [0, 1], [0, 8], [1, 8], [0, 7], [2, 8]];
  return { id: 'moat', name: 'the moat', city: city, mountains: mountains, water: water };
}

function buildFunnel(rng) {
  const mountains = [
    [0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 2],
    [0, 8], [1, 8], [2, 8], [2, 7], [3, 7], [4, 6],
    [5, 2], [5, 6], [1, 1], [1, 7]
  ];
  const water = rng.next() < 0.5 ? [[2, 4], [3, 3]] : [];
  const city = extraCity(rng, [[6, 4], [7, 4], [6, 3]], [[6, 5], [7, 3], [5, 4]]);
  return { id: 'funnel', name: 'the funnel', city: city, mountains: mountains, water: water };
}

function buildLake(rng) {
  const water = rectCells(2, 2, 5, 6, function (r, c) {
    return r === 4 && c === 4;
  });
  const mountains = [[0, 0], [1, 0], [0, 1], [6, 8], [5, 8], [7, 8], [1, 8]];
  const city = extraCity(rng, [[6, 4], [7, 4], [6, 3]], [[6, 5], [7, 3], [7, 5]]);
  return { id: 'lake', name: 'broken lake', city: city, mountains: mountains, water: water };
}

function buildAlley(rng) {
  const mountains = rectCells(0, 2, 6, 2).concat(rectCells(0, 6, 6, 6));
  mountains.push([3, 1], [4, 1], [3, 7], [4, 7], [0, 0], [0, 8]);
  const water = rng.next() < 0.55 ? [[2, 4], [3, 4]] : [];
  const city = extraCity(rng, [[6, 4], [6, 3], [7, 4]], [[6, 5], [7, 3], [5, 4]]);
  return { id: 'alley', name: 'the alley', city: city, mountains: mountains, water: water };
}

function buildDam(rng) {
  const mountains = rectCells(4, 0, 4, 2).concat(rectCells(4, 5, 4, 8)).concat([[3, 0], [3, 8], [5, 1], [5, 7]]);
  const water = rectCells(1, 1, 3, 7, function (r, c) {
    return r === 3 && (c === 3 || c === 4);
  });
  const city = extraCity(rng, [[6, 4], [6, 3], [7, 4]], [[6, 5], [7, 3], [5, 4]]);
  return { id: 'dam', name: 'the dam', city: city, mountains: mountains, water: water };
}

function buildKeep(rng) {
  const city = extraCity(rng, [[6, 1], [7, 1], [6, 2]], [[7, 2], [5, 1], [6, 0]]);
  const mountains = [[4, 0], [5, 0], [4, 1], [4, 2], [3, 0], [7, 4], [6, 4], [5, 4], [0, 8], [1, 8], [2, 8]];
  const water = rng.next() < 0.6 ? [[2, 4], [2, 5], [3, 5], [3, 6]] : [[1, 3], [1, 4]];
  return { id: 'keep', name: 'corner keep', city: city, mountains: mountains, water: water };
}

const DEFENSE_ISLANDS = [
  buildPass,
  buildCanal,
  buildTwins,
  buildShelf,
  buildMoat,
  buildFunnel,
  buildLake,
  buildAlley,
  buildDam,
  buildKeep
];

function fallbackDefenseIsland() {
  const city = fallbackDefenseNexusTiles();
  return {
    id: 'ridge',
    name: 'the ridge',
    nexuses: city.map(function (tile, idx) {
      return makeNexus({
        id: 'player-cluster-' + idx,
        row: tile.row,
        col: tile.col
      }, 'player', DEFENSE_NEXUS_HP);
    }),
    mountains: { '0,0': true, '1,0': true, '0,8': true, '1,8': true, '2,8': true },
    water: {}
  };
}

function applyBakedIsland(match, baked) {
  match.mapId = baked.id;
  match.mapName = baked.name;
  match.nexuses = {
    player: baked.city.map(function (tile, idx) {
      return makeNexus({
        id: 'player-cluster-' + idx,
        row: tile.row,
        col: tile.col
      }, 'player', DEFENSE_NEXUS_HP);
    }),
    enemy: []
  };
  match.mountains = baked.mountains;
  match.water = baked.water;
}

function generateDefenseIsland(match) {
  if (!match.rng) {
    const fallback = fallbackDefenseIsland();
    match.mapId = fallback.id;
    match.mapName = fallback.name;
    match.nexuses = { player: fallback.nexuses, enemy: [] };
    match.mountains = fallback.mountains;
    match.water = fallback.water;
    return;
  }
  let attempt;
  for (attempt = 0; attempt < 16; attempt++) {
    const build = DEFENSE_ISLANDS[match.rng.int(DEFENSE_ISLANDS.length)];
    const flip = match.rng.next() < 0.5;
    const baked = bakeDefenseIsland(build(match.rng), flip);
    if (!islandOk(match, baked)) continue;
    applyBakedIsland(match, baked);
    return;
  }
  const fallback = fallbackDefenseIsland();
  match.mapId = fallback.id;
  match.mapName = fallback.name;
  match.nexuses = { player: fallback.nexuses, enemy: [] };
  match.mountains = fallback.mountains;
  match.water = fallback.water;
}
