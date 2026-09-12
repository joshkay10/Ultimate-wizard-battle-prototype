// Opening pawn and incoming holes.
function pickDefenseSpawnTile(match, kind) {
  const used = {};
  defensePawns(match, ['onboard', 'emerging']).forEach(function (w) {
    if (w.row != null) used[tileKey(w.row, w.col)] = true;
  });
  const sector = pickDefenseSpawnSector(match);
  const candidates = [];
  let r;
  let c;
  for (r = 0; r < BOARD_SIZE; r++) {
    for (c = 0; c < BOARD_SIZE; c++) {
      if (!isDefenseSpawnCell(r, c)) continue;
      if (used[tileKey(r, c)]) continue;
      if (!canOpenPortalAt(match, r, c)) continue;
      const dist = nearestDefensePawnDist(match, r, c);
      const city = nearestDefenseNexus(match, r, c);
      const cityDist = city ? manhattan(r, c, city.row, city.col) : 12;
      let score = Math.min(dist, 4) * 12;
      if (defenseSpawnSector(r, c) === sector) score += 28;
      score += Math.max(0, 14 - cityDist) * 4;
      candidates.push({ row: r, col: c, score: score, sector: defenseSpawnSector(r, c) });
    }
  }
  if (!candidates.length) return null;
  candidates.sort(function (a, b) { return b.score - a.score; });
  const best = candidates[0].score;
  const pool = candidates.filter(function (tile) { return tile.score >= best - 40; });
  return pool[match.rng ? match.rng.int(pool.length) : 0];
}

function pickDefenseKind(match) {
  const roll = match.rng ? match.rng.next() : 0.2;
  if (roll < 0.46) return 'melee';
  if (roll < 0.76) return 'charge';
  return 'fireball';
}

function markDefenseSpawns(match, count) {
  const events = [];
  let n;
  for (n = 0; n < count; n++) {
    if (defensePawns(match, ['onboard', 'emerging']).length >= defenseLivingCap()) break;
    const kind = pickDefenseKind(match);
    const tile = pickDefenseSpawnTile(match, kind);
    if (!tile) break;
    const pawn = createDefensePawn(match, kind, {
      state: 'emerging',
      row: tile.row,
      col: tile.col
    });
    events.push({
      type: 'emergeMark',
      wizardId: pawn.id,
      row: tile.row,
      col: tile.col,
      element: pawn.element,
      pawnKind: pawn.pawnKind
    });
  }
  return events;
}

function seedDefenseOpening(match) {
  const kind = pickDefenseKind(match);
  const tile = pickDefenseSpawnTile(match, kind);
  if (!tile) return;
  createDefensePawn(match, kind, {
    state: 'onboard',
    row: tile.row,
    col: tile.col,
    intent: null
  });
}
