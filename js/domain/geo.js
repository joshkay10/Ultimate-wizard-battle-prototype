const CARDINALS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
];

function opposingTeam(team) {
  return team === 'player' ? 'enemy' : 'player';
}

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function manhattan(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

function tileKey(row, col) {
  return row + ',' + col;
}

function parseTileKey(key) {
  const parts = key.split(',');
  return {
    row: parseInt(parts[0], 10),
    col: parseInt(parts[1], 10)
  };
}

function directionBetween(fromRow, fromCol, toRow, toCol) {
  return {
    dr: Math.sign(toRow - fromRow),
    dc: Math.sign(toCol - fromCol)
  };
}

function mirrorRow(row) {
  return BOARD_SIZE - 1 - row;
}

function mirrorCol(col) {
  return BOARD_SIZE - 1 - col;
}

function shuffledCopy(rng, arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const swap = copy[i];
    copy[i] = copy[j];
    copy[j] = swap;
  }
  return copy;
}
