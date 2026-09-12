// City-beeline scoring, intent, and walk picks.
function cardinalToward(row, col, tRow, tCol) {
  const dr = tRow - row;
  const dc = tCol - col;
  if (!dr && !dc) return { dr: 1, dc: 0 };
  if (Math.abs(dr) >= Math.abs(dc)) return { dr: Math.sign(dr), dc: 0 };
  return { dr: 0, dc: Math.sign(dc) };
}

function nearestDefenseNexus(match, row, col) {
  let best = null;
  let bestD = Infinity;
  livingNexuses(match, 'player').forEach(function (n) {
    const d = manhattan(row, col, n.row, n.col);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  });
  return best;
}

function defenseClaimedTiles(match, exceptId) {
  const keys = {};
  defensePawns(match, ['onboard']).forEach(function (pawn) {
    if (!pawn || pawn.id === exceptId || !pawn.intent) return;
    defenseIntentTiles(match, pawn).forEach(function (tile) {
      keys[tileKey(tile.row, tile.col)] = true;
    });
  });
  return keys;
}

function defenseShotScore(match, pawn, row, col, dr, dc) {
  const spec = defensePawnSpec(pawn.pawnKind);
  let r = row;
  let c = col;
  let i;
  for (i = 1; i <= spec.range; i++) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc)) return 0;
    if (mountainAt(match, nr, nc)) return 0;
    const victim = wizardAt(match, nr, nc);
    const nex = nexusAt(match, nr, nc);
    if (nex) {
      if (nex.team === 'player') return 200 - i;
      return -20;
    }
    if (victim) {
      if (victim.team === 'player') return 40 - i;
      return -25;
    }
    if (hazardAt(match, nr, nc) && pawn.pawnKind === 'charge') return -200;
    r = nr;
    c = nc;
    if (pawn.pawnKind === 'melee') break;
  }
  return 0;
}

function defenseChargeWouldFall(match, row, col, dr, dc) {
  let i;
  for (i = 1; i <= 3; i++) {
    const nr = row + dr * i;
    const nc = col + dc * i;
    if (!inBounds(nr, nc)) return false;
    if (mountainAt(match, nr, nc)) return false;
    if (wizardAt(match, nr, nc) || nexusAt(match, nr, nc)) return false;
    if (hazardAt(match, nr, nc)) return true;
  }
  return false;
}

function bestDefenseShot(match, pawn, row, col) {
  let best = { score: 0, dr: 1, dc: 0 };
  let d;
  for (d = 0; d < CARDINALS.length; d++) {
    const dr = CARDINALS[d][0];
    const dc = CARDINALS[d][1];
    const score = defenseShotScore(match, pawn, row, col, dr, dc);
    if (score > best.score) best = { score: score, dr: dr, dc: dc };
  }
  return best;
}

function scoreDefenseTile(match, pawn, row, col) {
  const shot = bestDefenseShot(match, pawn, row, col);
  const city = nearestDefenseNexus(match, row, col);
  const dist = city ? manhattan(row, col, city.row, city.col) : 12;
  const claimed = defenseClaimedTiles(match, pawn.id);
  let score;
  if (shot.score > 0) score = 2000 + shot.score - dist * 2;
  else score = (18 - dist) * 40;
  if (claimed[tileKey(row, col)]) score -= 120;
  if (hazardAt(match, row, col)) score -= 800;
  if (pawn.pawnKind === 'charge') {
    if (shot.score > 0 && defenseChargeWouldFall(match, row, col, shot.dr, shot.dc)) score -= 2800;
    if (shot.score > 0 && !defenseChargeWouldFall(match, row, col, shot.dr, shot.dc)) score += 80;
  }
  const hit = shot.score > 0;
  return { score: score, dr: shot.dr, dc: shot.dc, hit: hit, nexusShot: shot.score >= 100 };
}

function pickScoredOption(rng, options) {
  if (!options.length) return null;
  options.sort(function (a, b) { return b.score - a.score; });
  const best = options[0].score;
  const floor = best - Math.max(12, Math.abs(best) * 0.12);
  const top = options.filter(function (opt) { return opt.score >= floor; }).slice(0, 3);
  if (!rng || top.length === 1) return top[0];
  return top[rng.int(top.length)];
}

function pickSafeChargeDir(match, pawn, preferred) {
  const kind = (preferred && preferred.kind) || (pawn && pawn.pawnKind) || 'charge';
  if (!preferred) return null;
  if (pawn.pawnKind !== 'charge') return { kind: kind, dr: preferred.dr, dc: preferred.dc };
  if (!defenseChargeWouldFall(match, pawn.row, pawn.col, preferred.dr, preferred.dc)) {
    return { kind: kind, dr: preferred.dr, dc: preferred.dc };
  }
  let best = null;
  let d;
  for (d = 0; d < CARDINALS.length; d++) {
    const dr = CARDINALS[d][0];
    const dc = CARDINALS[d][1];
    if (defenseChargeWouldFall(match, pawn.row, pawn.col, dr, dc)) continue;
    const score = defenseShotScore(match, pawn, pawn.row, pawn.col, dr, dc);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { dr: dr, dc: dc, score: score };
  }
  if (best) return { kind: kind, dr: best.dr, dc: best.dc };
  return null;
}

function pickDefenseIntent(match, pawn) {
  const spec = defensePawnSpec(pawn.pawnKind);
  const options = [];
  let d;
  for (d = 0; d < CARDINALS.length; d++) {
    const dr = CARDINALS[d][0];
    const dc = CARDINALS[d][1];
    const score = defenseShotScore(match, pawn, pawn.row, pawn.col, dr, dc);
    if (score > 0) options.push({ kind: spec.id, dr: dr, dc: dc, score: score });
  }
  if (!options.length) return null;
  const hit = pickScoredOption(match.rng, options);
  if (!hit) return null;
  return pickSafeChargeDir(match, pawn, { kind: spec.id, dr: hit.dr, dc: hit.dc });
}

function assignDefenseIntent(match, pawn) {
  if (!pawn || pawn.state !== 'onboard') return null;
  pawn.intent = pickDefenseIntent(match, pawn);
  if (!pawn.intent) return null;
  return {
    type: 'intent',
    wizardId: pawn.id,
    kind: pawn.intent.kind,
    dr: pawn.intent.dr,
    dc: pawn.intent.dc,
    row: pawn.row,
    col: pawn.col,
    element: pawn.element
  };
}
