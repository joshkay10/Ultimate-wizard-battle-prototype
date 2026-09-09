function paintsTrail(element) {
  return element === 'fire' || element === 'ice' || element === 'wind';
}

function layTrail(row, col, element) {
  if (!paintsTrail(element)) return;
  if (mountainAt(row, col) || waterAt(row, col) || nexusAt(row, col)) return;
  state.trails[row + ',' + col] = { element, turnsLeft: TRAIL_TURNS };
}

function trailAt(row, col) {
  return state.trails[row + ',' + col] || null;
}

function tickTrails() {
  Object.keys(state.trails).forEach(key => {
    state.trails[key].turnsLeft -= 1;
    if (state.trails[key].turnsLeft <= 0) delete state.trails[key];
  });
}

function mountainAt(row, col) {
  const key = row + ',' + col;
  if (state.mountains && state.mountains[key]) return true;
  if (state.tempMountains && state.tempMountains[key]) return true;
  return false;
}

function tickTempMountains() {
  if (!state.tempMountains) return;
  Object.keys(state.tempMountains).forEach(function (key) {
    state.tempMountains[key].turnsLeft -= 1;
    if (state.tempMountains[key].turnsLeft <= 0) delete state.tempMountains[key];
  });
}

function raiseMountain(row, col) {
  if (!state.tempMountains) state.tempMountains = {};
  const key = row + ',' + col;
  state.tempMountains[key] = { turnsLeft: TEMP_MOUNTAIN_TURNS, element: 'earth' };
  if (state.trails) delete state.trails[key];
}

function waterAt(row, col) {
  return !!(state.water && state.water[row + ',' + col]);
}

function terrainKey(row, col) {
  return row + ',' + col;
}

function eachNexus(fn) {
  NEXUS.player.forEach(fn);
  NEXUS.enemy.forEach(fn);
}

function livingNexuses(team) {
  return NEXUS[team].filter(n => n.hp > 0);
}

function teamNexusesFallen(team) {
  return NEXUS[team].every(n => n.hp <= 0);
}

function nearNexus(row, col) {
  let near = false;
  eachNexus(function (n) {
    if (manhattan(row, col, n.row, n.col) <= 1) near = true;
  });
  return near;
}

function nexusAt(row, col) {
  let found = null;
  eachNexus(function (n) {
    if (n.row === row && n.col === col) found = n;
  });
  return found;
}

function wizardAt(row, col) {
  return Object.values(state.wizards).find(w => w.state === 'onboard' && w.row === row && w.col === col);
}

function portalAt(row, col) {
  return (state.portals && state.portals[row + ',' + col]) || null;
}

function canOpenPortalAt(row, col) {
  return !isBlocked(row, col) && !portalAt(row, col);
}

// Walk/push blocked by wizard, nexus, mountain, or water.
// Portals are walkable — standing on one contests the arrival.
function isBlocked(row, col) {
  return !!wizardAt(row, col) || !!nexusAt(row, col) || mountainAt(row, col) || waterAt(row, col);
}

function isSummonTile(row, col) {
  return row >= SUMMON_ROW_START && row < BOARD_SIZE;
}

function isEnemySummonTile(row, col) {
  return row >= 0 && row < ENEMY_ROW_END;
}

function getPlayerSummonTiles() {
  const tiles = [];
  for (let r = SUMMON_ROW_START; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (canOpenPortalAt(r, c)) tiles.push({ row: r, col: c });
    }
  }
  return tiles;
}

function getEnemySummonTiles() {
  const tiles = [];
  for (let r = 0; r < ENEMY_ROW_END; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (canOpenPortalAt(r, c)) tiles.push({ row: r, col: c });
    }
  }
  return tiles;
}

function inBounds(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function manhattan(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

// BFS move range respecting obstacles (other wizards block passage)
function getMoveTiles(wizard) {
  const result = [];
  const visited = new Set([wizard.row + ',' + wizard.col]);
  let frontier = [{ row: wizard.row, col: wizard.col, dist: 0 }];
  while (frontier.length) {
    const next = [];
    for (const cell of frontier) {
      if (cell.dist >= wizard.moveRange) continue;
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      for (const [dr, dc] of dirs) {
        const nr = cell.row + dr, nc = cell.col + dc;
        if (!inBounds(nr, nc)) continue;
        const key = nr + ',' + nc;
        if (visited.has(key)) continue;
        if (isBlocked(nr, nc)) continue; // blocked by wizard or nexus
        visited.add(key);
        result.push({ row: nr, col: nc });
        next.push({ row: nr, col: nc, dist: cell.dist + 1 });
      }
    }
    frontier = next;
  }
  return result;
}

function getMeleeTiles(wizard) {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  const result = [];
  for (const [dr, dc] of dirs) {
    const nr = wizard.row + dr, nc = wizard.col + dc;
    if (!inBounds(nr, nc)) continue;
    if (mountainAt(nr, nc) || waterAt(nr, nc)) continue;
    result.push({ row: nr, col: nc });
  }
  return result;
}

// Line in each of 4 cardinal directions out to `range`.
// Stops on the first wizard or nexus (that tile is a valid hit).
// Mountains are fully opaque: the line does not include them and does not continue past them.
// Water is impassable to walk/push but spells fly over it.
function getLineCastTiles(wizard, range) {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  const result = [];
  for (const [dr, dc] of dirs) {
    for (let dist = 1; dist <= range; dist++) {
      const nr = wizard.row + dr * dist, nc = wizard.col + dc * dist;
      if (!inBounds(nr, nc)) break;
      if (mountainAt(nr, nc)) break;
      result.push({ row: nr, col: nc });
      if (wizardAt(nr, nc) || nexusAt(nr, nc)) break;
    }
  }
  return result;
}

function getPulseTiles(wizard) {
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = wizard.row + dr, nc = wizard.col + dc;
      if (!inBounds(nr, nc)) continue;
      if (mountainAt(nr, nc) || waterAt(nr, nc)) continue;
      result.push({ row: nr, col: nc });
    }
  }
  return result;
}

function getRaiseTiles(wizard) {
  const result = [];
  const range = wizard.castRange || 2;
  for (let r = wizard.row - range; r <= wizard.row + range; r++) {
    for (let c = wizard.col - range; c <= wizard.col + range; c++) {
      const dist = manhattan(wizard.row, wizard.col, r, c);
      if (dist < 1 || dist > range) continue;
      if (!inBounds(r, c)) continue;
      if (isBlocked(r, c) || portalAt(r, c)) continue;
      result.push({ row: r, col: c });
    }
  }
  return result;
}

function getSwapTiles(wizard) {
  const result = [];
  const range = wizard.castRange || 3;
  for (let r = wizard.row - range; r <= wizard.row + range; r++) {
    for (let c = wizard.col - range; c <= wizard.col + range; c++) {
      const dist = manhattan(wizard.row, wizard.col, r, c);
      if (dist < 1 || dist > range) continue;
      if (!inBounds(r, c)) continue;
      const other = wizardAt(r, c);
      if (other && other.id !== wizard.id) {
        result.push({ row: r, col: c });
        continue;
      }
      if (other) continue;
      if (isBlocked(r, c)) continue;
      result.push({ row: r, col: c });
    }
  }
  return result;
}

function getCastTiles(wizard) {
  const kind = wizard.castKind || 'stream';
  if (kind === 'pulse') return getPulseTiles(wizard);
  if (kind === 'gust') return getLineCastTiles(wizard, wizard.castRange || 3);
  if (kind === 'raise') return getRaiseTiles(wizard);
  if (kind === 'bolt') return getLineCastTiles(wizard, wizard.castRange || 4);
  if (kind === 'swap') return getSwapTiles(wizard);
  return getLineCastTiles(wizard, wizard.castRange || 4);
}

function pathBFS(wizard, targetRow, targetCol) {
  // returns array of {row, col} steps from current to target (exclusive of start)
  const start = { row: wizard.row, col: wizard.col };
  const visited = new Set([start.row + ',' + start.col]);
  const prev = {};
  let frontier = [start];
  let found = false;
  let steps = 0;
  while (frontier.length && steps <= wizard.moveRange && !found) {
    const next = [];
    for (const cell of frontier) {
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      for (const [dr, dc] of dirs) {
        const nr = cell.row + dr, nc = cell.col + dc;
        if (!inBounds(nr, nc)) continue;
        const key = nr + ',' + nc;
        if (visited.has(key)) continue;
        if (isBlocked(nr, nc)) continue;
        visited.add(key);
        prev[key] = cell;
        next.push({ row: nr, col: nc });
        if (nr === targetRow && nc === targetCol) { found = true; break; }
      }
      if (found) break;
    }
    frontier = next;
    steps++;
  }
  if (!found) return null;
  // reconstruct
  const path = [];
  let cur = { row: targetRow, col: targetCol };
  while (!(cur.row === start.row && cur.col === start.col)) {
    path.unshift(cur);
    cur = prev[cur.row + ',' + cur.col];
  }
  return path;
}

function mirrorRow(row) {
  return BOARD_SIZE - 1 - row;
}

function mirrorCol(col) {
  return BOARD_SIZE - 1 - col;
}

function terrainTaken(row, col, mountains, water) {
  const k = terrainKey(row, col);
  return !!(mountains[k] || water[k]);
}

function terrainAllowed(row, col, mountains, water) {
  if (!inBounds(row, col)) return false;
  if (nexusAt(row, col)) return false;
  if (nearNexus(row, col)) return false;
  if (terrainTaken(row, col, mountains, water)) return false;
  return true;
}

// Vertical mirror: (r, c) <-> (8-r, c). Mid row also mirrors left-right
// so the equator stays fair. Top 3 and bottom 3 rows always match.
function stampVerticalPair(map, mountains, water, row, col) {
  if (row === CENTER) {
    const c2 = mirrorCol(col);
    if (!terrainAllowed(row, col, mountains, water)) return false;
    if (c2 !== col && !terrainAllowed(row, c2, mountains, water) && !map[terrainKey(row, c2)]) return false;
    map[terrainKey(row, col)] = true;
    map[terrainKey(row, c2)] = true;
    return true;
  }
  const r2 = mirrorRow(row);
  if (!terrainAllowed(row, col, mountains, water)) return false;
  if (!terrainAllowed(r2, col, mountains, water) && !map[terrainKey(r2, col)]) return false;
  map[terrainKey(row, col)] = true;
  map[terrainKey(r2, col)] = true;
  return true;
}

function pruneTerrainSingletons(map) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  Object.keys(map).forEach(function (k) {
    const parts = k.split(',');
    const r = parseInt(parts[0], 10);
    const c = parseInt(parts[1], 10);
    const n = dirs.filter(function (d) {
      return map[terrainKey(r + d[0], c + d[1])];
    }).length;
    if (n === 0) {
      delete map[k];
      delete map[terrainKey(mirrorRow(r), c)];
      if (r === CENTER) delete map[terrainKey(r, mirrorCol(c))];
    }
  });
}

function campsConnected(mountains, water) {
  function blocked(row, col) {
    if (!inBounds(row, col)) return true;
    if (nexusAt(row, col)) return true;
    return terrainTaken(row, col, mountains, water);
  }
  const visited = new Set();
  const queue = [];
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (blocked(SUMMON_ROW_START + 1, c)) continue;
    const k = terrainKey(SUMMON_ROW_START + 1, c);
    visited.add(k);
    queue.push({ row: SUMMON_ROW_START + 1, col: c });
  }
  while (queue.length) {
    const cur = queue.pop();
    if (cur.row < ENEMY_ROW_END) return true;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let i = 0; i < dirs.length; i++) {
      const nr = cur.row + dirs[i][0];
      const nc = cur.col + dirs[i][1];
      const k = terrainKey(nr, nc);
      if (visited.has(k) || blocked(nr, nc)) continue;
      visited.add(k);
      queue.push({ row: nr, col: nc });
    }
  }
  return false;
}

function countOpenSummonTiles(mountains, water, team) {
  let n = 0;
  const start = team === 'player' ? SUMMON_ROW_START : 0;
  const end = team === 'player' ? BOARD_SIZE : ENEMY_ROW_END;
  for (let r = start; r < end; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (nexusAt(r, c)) continue;
      if (terrainTaken(r, c, mountains, water)) continue;
      n++;
    }
  }
  return n;
}

function fallbackMountains() {
  const map = {};
  const empty = {};
  [[1, 0], [2, 0], [2, 1], [1, 8], [2, 8], [2, 7]].forEach(function (t) {
    stampVerticalPair(map, map, empty, t[0], t[1]);
  });
  return map;
}

function growTerrainCluster(map, mountains, water, seed, size, edgeBias) {
  if (!seed) return;
  const body = [];
  if (stampVerticalPair(map, mountains, water, seed.row, seed.col)) body.push(seed);
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  let guard = 0;
  while (body.length < size && guard++ < 28) {
    const from = body[state.rng.int(body.length)];
    if (!from) break;
    const neigh = [];
    dirs.forEach(function (d) {
      const nr = from.row + d[0];
      const nc = from.col + d[1];
      if (nr > CENTER) return;
      if (!terrainAllowed(nr, nc, mountains, water)) return;
      const lr = Math.min(nc, BOARD_SIZE - 1 - nc);
      let w = 1;
      if (edgeBias) w = lr === 0 ? 7 : lr === 1 ? 3 : 1;
      else w = lr <= 1 ? 1 : 3;
      for (let i = 0; i < w; i++) neigh.push({ row: nr, col: nc });
    });
    if (!neigh.length) continue;
    const n = neigh[state.rng.int(neigh.length)];
    if (stampVerticalPair(map, mountains, water, n.row, n.col)) body.push(n);
  }
}

function pickTerrainSeed(mountains, water, cols, maxRow, colWeight) {
  const opts = [];
  cols.forEach(function (c) {
    for (let r = 0; r <= maxRow; r++) {
      if (!terrainAllowed(r, c, mountains, water)) continue;
      const copies = colWeight(c, r);
      for (let i = 0; i < copies; i++) opts.push({ row: r, col: c });
    }
  });
  if (!opts.length) return null;
  return opts[state.rng.int(opts.length)];
}

function generateMountainsInto(mountains, water) {
  function edgeWeight(c, r) {
    const edge = (c === 0 || c === 8) ? 5 : (c === 1 || c === 7) ? 3 : 1;
    const rowW = r === 0 ? 2 : 3;
    return edge * rowW;
  }
  growTerrainCluster(
    mountains, mountains, water,
    pickTerrainSeed(mountains, water, [0, 1, 2], 3, edgeWeight),
    3 + state.rng.int(2),
    true
  );
  growTerrainCluster(
    mountains, mountains, water,
    pickTerrainSeed(mountains, water, [8, 7, 6], 3, edgeWeight),
    2 + state.rng.int(3),
    true
  );
  pruneTerrainSingletons(mountains);
}

function generateWaterInto(mountains, water) {
  function lakeWeight(c, r) {
    const lr = Math.min(c, BOARD_SIZE - 1 - c);
    const colW = lr <= 1 ? 1 : 4;
    const rowW = r <= 1 ? 1 : 3;
    return colW * rowW;
  }
  const groups = 1 + state.rng.int(2);
  for (let g = 0; g < groups; g++) {
    growTerrainCluster(
      water, mountains, water,
      pickTerrainSeed(mountains, water, [1, 2, 3, 4, 5, 6, 7], 4, lakeWeight),
      2 + state.rng.int(3),
      false
    );
  }
  pruneTerrainSingletons(water);
}

// Edge mountain ridges plus occasional lakes. Always vertically mirrored
// so both back-three-row camps get the same layout.
function generateTerrain() {
  if (!state.rng) {
    state.mountains = fallbackMountains();
    state.water = {};
    return;
  }

  const mountains = {};
  const water = {};
  generateMountainsInto(mountains, water);
  if (!campsConnected(mountains, water)) {
    state.mountains = fallbackMountains();
    state.water = {};
    return;
  }
  if (state.rng.next() < 0.48) generateWaterInto(mountains, water);
  if (!campsConnected(mountains, water)) {
    Object.keys(water).forEach(function (k) { delete water[k]; });
  }

  if (countOpenSummonTiles(mountains, water, 'player') < 6 || countOpenSummonTiles(mountains, water, 'enemy') < 6) {
    state.mountains = fallbackMountains();
    state.water = {};
    return;
  }
  state.mountains = mountains;
  state.water = water;
}

function generateMountains() {
  generateTerrain();
}
