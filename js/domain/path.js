function getMoveTiles(match, wizard) {
  const result = [];
  const visited = {};
  visited[tileKey(wizard.row, wizard.col)] = true;
  let frontier = [{ row: wizard.row, col: wizard.col, dist: 0 }];
  while (frontier.length) {
    const next = [];
    for (let i = 0; i < frontier.length; i++) {
      const cell = frontier[i];
      if (cell.dist >= wizard.moveRange) continue;
      for (let d = 0; d < CARDINALS.length; d++) {
        const nr = cell.row + CARDINALS[d][0];
        const nc = cell.col + CARDINALS[d][1];
        if (!inBounds(nr, nc)) continue;
        const key = tileKey(nr, nc);
        if (visited[key]) continue;
        if (isBlocked(match, nr, nc)) continue;
        visited[key] = true;
        result.push({ row: nr, col: nc });
        if (hazardAt(match, nr, nc)) continue;
        next.push({ row: nr, col: nc, dist: cell.dist + 1 });
      }
    }
    frontier = next;
  }
  return result;
}

function getMeleeTiles(match, wizard) {
  const result = [];
  for (let d = 0; d < CARDINALS.length; d++) {
    const nr = wizard.row + CARDINALS[d][0];
    const nc = wizard.col + CARDINALS[d][1];
    if (!inBounds(nr, nc)) continue;
    if (mountainAt(match, nr, nc) || hazardAt(match, nr, nc)) continue;
    result.push({ row: nr, col: nc });
  }
  return result;
}

function getLineCastTiles(match, wizard, range) {
  const result = [];
  for (let d = 0; d < CARDINALS.length; d++) {
    const dr = CARDINALS[d][0];
    const dc = CARDINALS[d][1];
    for (let dist = 1; dist <= range; dist++) {
      const nr = wizard.row + dr * dist;
      const nc = wizard.col + dc * dist;
      if (!inBounds(nr, nc)) break;
      if (mountainAt(match, nr, nc)) break;
      result.push({ row: nr, col: nc });
      if (wizardAt(match, nr, nc) || nexusAt(match, nr, nc)) break;
    }
  }
  return result;
}

function getBoltTiles(match, wizard) {
  const range = wizard.castRange || 4;
  const result = [];
  for (let d = 0; d < CARDINALS.length; d++) {
    const dr = CARDINALS[d][0];
    const dc = CARDINALS[d][1];
    for (let dist = 1; dist <= range; dist++) {
      const nr = wizard.row + dr * dist;
      const nc = wizard.col + dc * dist;
      if (!inBounds(nr, nc)) break;
      result.push({ row: nr, col: nc });
      if (mountainAt(match, nr, nc) || wizardAt(match, nr, nc) || nexusAt(match, nr, nc)) break;
    }
  }
  return result;
}

function getPulseTiles(match, wizard) {
  const result = [];
  let dr;
  let dc;
  for (dr = -1; dr <= 1; dr++) {
    for (dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = wizard.row + dr;
      const nc = wizard.col + dc;
      if (!inBounds(nr, nc)) continue;
      if (mountainAt(match, nr, nc) || hazardAt(match, nr, nc)) continue;
      result.push({ row: nr, col: nc });
    }
  }
  return result;
}

function getRaiseTiles(match, wizard) {
  const result = [];
  const range = wizard.castRange || 2;
  let r;
  let c;
  for (r = wizard.row - range; r <= wizard.row + range; r++) {
    for (c = wizard.col - range; c <= wizard.col + range; c++) {
      const dist = manhattan(wizard.row, wizard.col, r, c);
      if (dist < 1 || dist > range) continue;
      if (!inBounds(r, c)) continue;
      if (isBlocked(match, r, c) || portalAt(match, r, c) || hazardAt(match, r, c)) continue;
      result.push({ row: r, col: c });
    }
  }
  return result;
}

function getSwapTiles(match, wizard) {
  const result = [];
  const range = wizard.castRange || 3;
  let r;
  let c;
  for (r = wizard.row - range; r <= wizard.row + range; r++) {
    for (c = wizard.col - range; c <= wizard.col + range; c++) {
      const dist = manhattan(wizard.row, wizard.col, r, c);
      if (dist < 1 || dist > range) continue;
      if (!inBounds(r, c)) continue;
      const other = wizardAt(match, r, c);
      if (other && other.id !== wizard.id) {
        result.push({ row: r, col: c });
        continue;
      }
      if (other) continue;
      if (isBlocked(match, r, c)) continue;
      result.push({ row: r, col: c });
    }
  }
  return result;
}

function getBurstArea(row, col, radius) {
  const tiles = [];
  const r = radius == null ? 1 : radius;
  let dr;
  let dc;
  for (dr = -r; dr <= r; dr++) {
    for (dc = -r; dc <= r; dc++) {
      const nr = row + dr;
      const nc = col + dc;
      if (!inBounds(nr, nc)) continue;
      tiles.push({ row: nr, col: nc });
    }
  }
  return tiles;
}

function getBurstAimTiles(match, wizard) {
  const result = [];
  const range = wizard.castRange || 3;
  let r;
  let c;
  for (r = wizard.row - range; r <= wizard.row + range; r++) {
    for (c = wizard.col - range; c <= wizard.col + range; c++) {
      const dist = manhattan(wizard.row, wizard.col, r, c);
      if (dist < 1 || dist > range) continue;
      if (!inBounds(r, c)) continue;
      result.push({ row: r, col: c });
    }
  }
  return result;
}

function getBlinkTiles(match, wizard) {
  const result = [];
  const range = wizard.castRange || 4;
  let r;
  let c;
  for (r = wizard.row - range; r <= wizard.row + range; r++) {
    for (c = wizard.col - range; c <= wizard.col + range; c++) {
      const dist = manhattan(wizard.row, wizard.col, r, c);
      if (dist < 1 || dist > range) continue;
      if (!inBounds(r, c)) continue;
      if (wizardAt(match, r, c)) continue;
      if (isBlocked(match, r, c)) continue;
      result.push({ row: r, col: c });
    }
  }
  return result;
}

function getCastTiles(match, wizard) {
  const kind = wizard.castKind || 'stream';
  if (kind === 'pulse') return getPulseTiles(match, wizard);
  if (kind === 'gust') return getLineCastTiles(match, wizard, wizard.castRange || 3);
  if (kind === 'raise') return getRaiseTiles(match, wizard);
  if (kind === 'bolt') return getBoltTiles(match, wizard);
  if (kind === 'swap') return getSwapTiles(match, wizard);
  if (kind === 'blink') return getBlinkTiles(match, wizard);
  if (kind === 'burst') return getBurstAimTiles(match, wizard);
  return getLineCastTiles(match, wizard, wizard.castRange || 4);
}

function pathBFS(match, wizard, targetRow, targetCol) {
  const start = { row: wizard.row, col: wizard.col };
  const visited = {};
  visited[tileKey(start.row, start.col)] = true;
  const prev = {};
  let frontier = [start];
  let found = false;
  let steps = 0;
  while (frontier.length && steps <= wizard.moveRange && !found) {
    const next = [];
    for (let i = 0; i < frontier.length; i++) {
      const cell = frontier[i];
      for (let d = 0; d < CARDINALS.length; d++) {
        const nr = cell.row + CARDINALS[d][0];
        const nc = cell.col + CARDINALS[d][1];
        if (!inBounds(nr, nc)) continue;
        const key = tileKey(nr, nc);
        if (visited[key]) continue;
        if (isBlocked(match, nr, nc)) continue;
        visited[key] = true;
        prev[key] = cell;
        if (nr === targetRow && nc === targetCol) {
          found = true;
          break;
        }
        if (hazardAt(match, nr, nc)) continue;
        next.push({ row: nr, col: nc });
      }
      if (found) break;
    }
    frontier = next;
    steps++;
  }
  if (!found) return null;
  const path = [];
  let cur = { row: targetRow, col: targetCol };
  while (!(cur.row === start.row && cur.col === start.col)) {
    path.unshift(cur);
    cur = prev[tileKey(cur.row, cur.col)];
  }
  return path;
}
