function layTrail(row, col, element) {
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

function nexusAt(row, col) {
  if (NEXUS.mine.row === row && NEXUS.mine.col === col) return NEXUS.mine;
  if (NEXUS.enemy.row === row && NEXUS.enemy.col === col) return NEXUS.enemy;
  return null;
}

function wizardAt(row, col) {
  return Object.values(state.wizards).find(w => w.state === 'onboard' && w.row === row && w.col === col);
}

// A tile is blocked (can't summon onto it, can't move through/onto it) if it holds a wizard or a nexus
function isBlocked(row, col) {
  return !!wizardAt(row, col) || !!nexusAt(row, col);
}

function isSummonTile(row, col) {
  return row >= SUMMON_ROW_START && row < BOARD_SIZE;
}

function isEnemySummonTile(row, col) {
  return row >= 0 && row < ENEMY_ROW_END;
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
    if (inBounds(nr, nc)) result.push({ row: nr, col: nc });
  }
  return result;
}

// Cast: line in each of 4 cardinal directions out to range 4 (stops at first blocker, inclusive of blocker tile as far as it can reach)
function getCastTiles(wizard) {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  const result = [];
  for (const [dr, dc] of dirs) {
    for (let dist = 1; dist <= 4; dist++) {
      const nr = wizard.row + dr * dist, nc = wizard.col + dc * dist;
      if (!inBounds(nr, nc)) break;
      result.push({ row: nr, col: nc });
      if (isBlocked(nr, nc)) break; // line stops at first occupied tile (wizard or nexus)
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
