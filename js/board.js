function layTrail(row, col, element) {
  if (mountainAt(row, col) || nexusAt(row, col)) return;
  state.trails[row + ',' + col] = { element, turnsLeft: 1 };
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
  return !!(state.mountains && state.mountains[row + ',' + col]);
}

function mountainKey(row, col) {
  return row + ',' + col;
}

function nearNexus(row, col) {
  return manhattan(row, col, NEXUS.mine.row, NEXUS.mine.col) <= 1
    || manhattan(row, col, NEXUS.enemy.row, NEXUS.enemy.col) <= 1;
}

function nexusAt(row, col) {
  if (NEXUS.mine.row === row && NEXUS.mine.col === col) return NEXUS.mine;
  if (NEXUS.enemy.row === row && NEXUS.enemy.col === col) return NEXUS.enemy;
  return null;
}

function wizardAt(row, col) {
  return Object.values(state.wizards).find(w => w.state === 'onboard' && w.row === row && w.col === col);
}

// A tile is blocked (can't summon onto it, can't move through/onto it)
// if it holds a wizard, a nexus, or a mountain.
function isBlocked(row, col) {
  return !!wizardAt(row, col) || !!nexusAt(row, col) || mountainAt(row, col);
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
      if (!isBlocked(r, c)) tiles.push({ row: r, col: c });
    }
  }
  return tiles;
}

function getEnemySummonTiles() {
  const tiles = [];
  for (let r = 0; r < ENEMY_ROW_END; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!isBlocked(r, c)) tiles.push({ row: r, col: c });
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
    if (mountainAt(nr, nc)) continue;
    result.push({ row: nr, col: nc });
  }
  return result;
}

// Cast: line in each of 4 cardinal directions out to range 4.
// Stops on the first wizard or nexus (that tile is a valid hit).
// Mountains are fully opaque: the line does not include them and does not continue past them.
function getCastTiles(wizard) {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  const result = [];
  for (const [dr, dc] of dirs) {
    for (let dist = 1; dist <= 4; dist++) {
      const nr = wizard.row + dr * dist, nc = wizard.col + dc * dist;
      if (!inBounds(nr, nc)) break;
      if (mountainAt(nr, nc)) break;
      result.push({ row: nr, col: nc });
      if (wizardAt(nr, nc) || nexusAt(nr, nc)) break;
    }
  }
  return result;
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

function mountainAllowed(row, col, map) {
  if (!inBounds(row, col)) return false;
  if (col === CENTER) return false;
  if (nearNexus(row, col)) return false;
  if (map[mountainKey(row, col)]) return false;
  return true;
}

function stampMountainPair(map, row, col) {
  const mr = BOARD_SIZE - 1 - row;
  const mc = BOARD_SIZE - 1 - col;
  if (!mountainAllowed(row, col, map)) return false;
  if (row !== mr || col !== mc) {
    if (!mountainAllowed(mr, mc, map) && !map[mountainKey(mr, mc)]) return false;
  }
  map[mountainKey(row, col)] = true;
  map[mountainKey(mr, mc)] = true;
  return true;
}

function pruneMountainSingletons(map) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  Object.keys(map).forEach(function (k) {
    const parts = k.split(',');
    const r = parseInt(parts[0], 10);
    const c = parseInt(parts[1], 10);
    const n = dirs.filter(function (d) {
      return map[mountainKey(r + d[0], c + d[1])];
    }).length;
    if (n === 0) {
      delete map[k];
      delete map[mountainKey(BOARD_SIZE - 1 - r, BOARD_SIZE - 1 - c)];
    }
  });
}

function countOpenSummonTiles(map, team) {
  let n = 0;
  const start = team === 'player' ? SUMMON_ROW_START : 0;
  const end = team === 'player' ? BOARD_SIZE : ENEMY_ROW_END;
  for (let r = start; r < end; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (nexusAt(r, c)) continue;
      if (map[mountainKey(r, c)]) continue;
      n++;
    }
  }
  return n;
}

function fallbackMountains() {
  const map = {};
  [[1, 0], [2, 0], [2, 1], [1, 8], [2, 8], [2, 7]].forEach(function (t) {
    stampMountainPair(map, t[0], t[1]);
  });
  return map;
}

// Edge ridges in groups, 180-rotated so both sides get the same map.
// Center column stays open as the lane between nexuses.
function generateMountains() {
  const map = {};
  if (!state.rng) {
    state.mountains = fallbackMountains();
    return;
  }

  function pickSeed(cols) {
    const opts = [];
    cols.forEach(function (c) {
      for (let r = 0; r <= 3; r++) {
        if (!mountainAllowed(r, c, map)) continue;
        const edge = (c === 0 || c === 8) ? 5 : (c === 1 || c === 7) ? 3 : 1;
        const rowW = r === 0 ? 2 : 3;
        const copies = edge * rowW;
        for (let i = 0; i < copies; i++) opts.push({ row: r, col: c });
      }
    });
    if (!opts.length) return null;
    return opts[state.rng.int(opts.length)];
  }

  function growCluster(seed, size) {
    if (!seed) return;
    const body = [];
    if (stampMountainPair(map, seed.row, seed.col)) body.push(seed);
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    let guard = 0;
    while (body.length < size && guard++ < 28) {
      const from = body[state.rng.int(body.length)];
      if (!from) break;
      const neigh = [];
      dirs.forEach(function (d) {
        const nr = from.row + d[0];
        const nc = from.col + d[1];
        if (nr > 4) return;
        if (!mountainAllowed(nr, nc, map)) return;
        const lr = Math.min(nc, BOARD_SIZE - 1 - nc);
        const w = lr === 0 ? 7 : lr === 1 ? 3 : 1;
        for (let i = 0; i < w; i++) neigh.push({ row: nr, col: nc });
      });
      if (!neigh.length) continue;
      const n = neigh[state.rng.int(neigh.length)];
      if (stampMountainPair(map, n.row, n.col)) body.push(n);
    }
  }

  growCluster(pickSeed([0, 1, 2]), 3 + state.rng.int(2));
  growCluster(pickSeed([8, 7, 6]), 2 + state.rng.int(3));
  pruneMountainSingletons(map);

  if (countOpenSummonTiles(map, 'player') < 6 || countOpenSummonTiles(map, 'enemy') < 6) {
    state.mountains = fallbackMountains();
    return;
  }
  state.mountains = map;
}
