function defenseKindLabel(kind) {
  if (kind === 'charge') return 'charge';
  if (kind === 'fireball') return 'shot';
  return 'melee';
}

function defenseTelegraphStyle(kind) {
  if (kind === 'charge') {
    return { fill: 'rgba(26, 140, 108, 0.42)', edge: '#17a078', label: 'CHARGE', dash: [8, 5], pip: true };
  }
  if (kind === 'fireball') {
    return { fill: 'rgba(214, 52, 36, 0.4)', edge: '#e23b28', label: 'SHOT', dash: [2.5, 4.5], pip: true };
  }
  return { fill: 'rgba(186, 78, 22, 0.52)', edge: '#d26518', label: 'MELEE', dash: [], pip: false };
}

const DEFENSE_PAWN_KINDS = {
  melee: { id: 'melee', name: 'Brute', element: 'earth', moveRange: 3, attack: 1, range: 1, hpMin: 3, hpMax: 3, displacement: 0 },
  charge: { id: 'charge', name: 'Charger', element: 'wind', moveRange: 3, attack: 1, range: 3, hpMin: 4, hpMax: 4, displacement: 1 },
  fireball: { id: 'fireball', name: 'Bomber', element: 'fire', moveRange: 2, attack: 1, range: 4, hpMin: 3, hpMax: 3, displacement: 0 }
};

const DEFENSE_PAWN_ORDER = ['melee', 'charge', 'fireball'];

function isDefenseMode(match) {
  return !!(match && match.gameMode === 'defense');
}

function defensePawnSpec(kind) {
  return DEFENSE_PAWN_KINDS[kind] || DEFENSE_PAWN_KINDS.melee;
}

function createDefensePawn(match, kind, extra) {
  const spec = defensePawnSpec(kind);
  const id = 'w' + (match.nextId++);
  const hpSpan = Math.max(0, spec.hpMax - spec.hpMin);
  const hp = spec.hpMin + ((match.rng && hpSpan) ? match.rng.int(hpSpan + 1) : 0);
  const pawn = {
    id: id,
    name: spec.name,
    element: spec.element,
    pawnKind: spec.id,
    moveRange: spec.moveRange,
    hp: hp,
    maxHp: hp,
    cost: 0,
    meleeAttack: spec.attack,
    meleeDisplacement: spec.displacement || 0,
    castAttack: spec.attack,
    castDisplacement: spec.displacement || 0,
    castRange: spec.range,
    castKind: spec.id === 'fireball' ? 'stream' : (spec.id === 'charge' ? 'charge' : 'melee'),
    spellName: spec.name,
    team: 'enemy',
    state: 'emerging',
    row: null,
    col: null,
    hasMoved: false,
    hasAttacked: false,
    summoningSickness: false,
    silenced: false,
    silenceSkip: false,
    moveUndo: null,
    intent: null
  };
  if (extra) Object.keys(extra).forEach(function (k) { pawn[k] = extra[k]; });
  match.wizards[id] = pawn;
  return pawn;
}

function defensePawns(match, states) {
  return Object.values(match.wizards).filter(function (w) {
    if (w.team !== 'enemy' || !w.pawnKind) return false;
    if (!states) return true;
    return states.indexOf(w.state) >= 0;
  });
}

function defenseFieldClear(match) {
  return defensePawns(match, ['onboard', 'emerging']).length === 0;
}

function defenseEverSpawned(match) {
  let n = 0;
  Object.values(match.wizards).forEach(function (w) {
    if (w.team === 'enemy' && w.pawnKind) n += 1;
  });
  return n;
}

function defenseBudgetLeft(match) {
  const budget = typeof DEFENSE_SPAWN_BUDGET === 'number' ? DEFENSE_SPAWN_BUDGET : 10;
  return Math.max(0, budget - defenseEverSpawned(match));
}

function compareDefenseActOrder(a, b) {
  const ar = a.row == null ? 99 : a.row;
  const br = b.row == null ? 99 : b.row;
  if (ar !== br) return ar - br;
  const ac = a.col == null ? 99 : a.col;
  const bc = b.col == null ? 99 : b.col;
  if (ac !== bc) return ac - bc;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

function defenseActQueue(match, states) {
  return defensePawns(match, states || ['onboard']).slice().sort(compareDefenseActOrder);
}

function defenseStrikeQueue(match) {
  return defenseActQueue(match).filter(function (pawn) {
    return !!(pawn && pawn.intent);
  });
}

function defenseStrikeIndex(match, pawn) {
  if (!pawn) return -1;
  const queue = defenseStrikeQueue(match);
  let i;
  for (i = 0; i < queue.length; i++) {
    if (queue[i].id === pawn.id) return i;
  }
  return -1;
}

function defenseOrdinal(n) {
  const k = n % 100;
  if (k >= 11 && k <= 13) return n + 'th';
  const d = n % 10;
  if (d === 1) return n + 'st';
  if (d === 2) return n + 'nd';
  if (d === 3) return n + 'rd';
  return n + 'th';
}

function defenseLivingCap() {
  return typeof DEFENSE_PAWN_CAP === 'number' ? DEFENSE_PAWN_CAP : 3;
}

function defenseSpawnCount(match) {
  const living = defensePawns(match, ['onboard', 'emerging']).length;
  if (living === 0) return 0;
  const budget = defenseBudgetLeft(match);
  if (budget <= 0) return 0;
  const room = defenseLivingCap() - living;
  if (room <= 0) return 0;
  const t = match.turnCount || 1;
  if (t <= 1) return living < 2 ? 1 : 0;
  return 1;
}

function isDefenseSpawnCell(row, col) {
  if (!inBounds(row, col)) return false;
  if (row >= BOARD_SIZE - 2) return false;
  return true;
}

function defenseSpawnSector(row, col) {
  if (col <= 2) return 'west';
  if (col >= BOARD_SIZE - 3) return 'east';
  return 'north';
}

function defenseSectorCounts(match) {
  const counts = { west: 0, north: 0, east: 0 };
  defensePawns(match, ['onboard', 'emerging']).forEach(function (w) {
    if (w.row == null || w.col == null) return;
    counts[defenseSpawnSector(w.row, w.col)] += 1;
  });
  return counts;
}

function pickDefenseSpawnSector(match) {
  const counts = defenseSectorCounts(match);
  const names = ['west', 'north', 'east'];
  let min = Infinity;
  names.forEach(function (name) {
    if (counts[name] < min) min = counts[name];
  });
  const tied = names.filter(function (name) { return counts[name] === min; });
  if (!tied.length) return 'north';
  return tied[match.rng ? match.rng.int(tied.length) : 0];
}

function nearestDefensePawnDist(match, row, col) {
  let best = 99;
  defensePawns(match, ['onboard', 'emerging']).forEach(function (w) {
    if (w.row == null || w.col == null) return;
    const d = manhattan(row, col, w.row, w.col);
    if (d < best) best = d;
  });
  return best;
}

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

function hurtWizardAmount(match, wizard, amount, cause, row, col) {
  const events = [];
  if (!wizard || wizard.state !== 'onboard') return events;
  events.push(stampWizardDamage(wizard, amount, cause, row, col));
  const death = simKill(match, wizard);
  if (death) events.push(death);
  return events;
}

function defenseRayTiles(match, row, col, dr, dc, range, opts) {
  opts = opts || {};
  const tiles = [];
  let i;
  for (i = 1; i <= range; i++) {
    const nr = row + dr * i;
    const nc = col + dc * i;
    if (!inBounds(nr, nc)) break;
    if (mountainAt(match, nr, nc)) break;
    tiles.push({ row: nr, col: nc });
    if (wizardAt(match, nr, nc) || nexusAt(match, nr, nc)) break;
    if (opts.stopOnHazard && hazardAt(match, nr, nc)) break;
    if (opts.oneTile) break;
  }
  return tiles;
}

function pawnAttackEvent(pawn, extra) {
  extra = extra || {};
  const ev = {
    type: 'attack',
    kind: extra.kind,
    attackerId: pawn.id,
    from: extra.from || { row: pawn.row, col: pawn.col },
    row: extra.row,
    col: extra.col,
    hit: extra.hit || 'none',
    spellName: extra.spellName || pawn.spellName,
    element: extra.element || pawn.element,
    damage: extra.damage != null ? extra.damage : pawn.meleeAttack,
    tiles: extra.tiles || [{ row: extra.row, col: extra.col }]
  };
  if (extra.castKind) ev.castKind = extra.castKind;
  if (extra.path) ev.path = extra.path;
  return ev;
}

function pawnHitAt(match, pawn, row, col, amount, shove) {
  const events = [];
  const victim = wizardAt(match, row, col);
  const nex = nexusAt(match, row, col);
  if (victim) {
    events.push.apply(events, hurtWizardAmount(match, victim, amount, 'pawn', row, col));
    if (shove && victim.state === 'onboard' && (pawn.meleeDisplacement || 0) > 0) {
      events.push.apply(events, simPush(match, victim, shove.dr, shove.dc, pawn.meleeDisplacement));
    }
    return events;
  }
  if (nex) events.push.apply(events, hurtNexus(match, nex, amount, 'pawn'));
  return events;
}

function pawnHitKind(match, row, col) {
  if (wizardAt(match, row, col)) return 'wizard';
  if (nexusAt(match, row, col)) return 'nexus';
  return 'none';
}

function simPawnMelee(match, pawn) {
  const row = pawn.row + pawn.intent.dr;
  const col = pawn.col + pawn.intent.dc;
  if (!inBounds(row, col)) return [];
  const tiles = [{ row: row, col: col }];
  const events = [pawnAttackEvent(pawn, {
    kind: 'melee',
    row: row,
    col: col,
    hit: pawnHitKind(match, row, col),
    spellName: pawn.name,
    tiles: tiles
  })];
  events.push.apply(events, pawnHitAt(match, pawn, row, col, pawn.meleeAttack));
  return events;
}

function simPawnFireball(match, pawn) {
  const dr = pawn.intent.dr;
  const dc = pawn.intent.dc;
  const range = pawn.castRange || 4;
  const tiles = defenseRayTiles(match, pawn.row, pawn.col, dr, dc, range);
  const last = tiles.length ? tiles[tiles.length - 1] : { row: pawn.row + dr, col: pawn.col + dc };
  const events = [pawnAttackEvent(pawn, {
    kind: 'cast',
    castKind: 'stream',
    row: last.row,
    col: last.col,
    hit: pawnHitKind(match, last.row, last.col),
    spellName: 'Fireball',
    element: 'fire',
    damage: pawn.castAttack,
    tiles: tiles.length ? tiles : [last]
  })];
  events.push.apply(events, pawnHitAt(match, pawn, last.row, last.col, pawn.castAttack));
  return events;
}

function simPawnCharge(match, pawn) {
  const dr = pawn.intent.dr;
  const dc = pawn.intent.dc;
  const from = { row: pawn.row, col: pawn.col };
  const path = [];
  const tiles = [];
  const after = [];
  let hit = 'none';
  let hitRow = pawn.row + dr;
  let hitCol = pawn.col + dc;
  let i;
  for (i = 1; i <= 3; i++) {
    if (pawn.state !== 'onboard') break;
    const nr = pawn.row + dr;
    const nc = pawn.col + dc;
    if (!inBounds(nr, nc)) break;
    if (mountainAt(match, nr, nc)) break;
    hitRow = nr;
    hitCol = nc;
    tiles.push({ row: nr, col: nc });
    const victim = wizardAt(match, nr, nc);
    const nex = nexusAt(match, nr, nc);
    if (victim || nex) {
      hit = victim ? 'wizard' : 'nexus';
      after.push.apply(after, pawnHitAt(match, pawn, nr, nc, pawn.meleeAttack, victim ? { dr: dr, dc: dc } : null));
      break;
    }
    pawn.row = nr;
    pawn.col = nc;
    path.push({ row: nr, col: nc });
    after.push.apply(after, applyTileEnter(match, pawn));
    if (pawn.state !== 'onboard') break;
  }
  const events = [pawnAttackEvent(pawn, {
    kind: 'cast',
    castKind: 'gust',
    from: from,
    row: hitRow,
    col: hitCol,
    hit: hit,
    spellName: 'Charge',
    element: 'wind',
    damage: pawn.meleeAttack,
    path: path,
    tiles: tiles.length ? tiles : [{ row: hitRow, col: hitCol }]
  })];
  events.push.apply(events, after);
  return events;
}

function stampDefenseStrikeOrder(match) {
  const queue = defenseStrikeQueue(match);
  let i;
  for (i = 0; i < queue.length; i++) queue[i].strikeOrder = i;
  return queue;
}

function simDefenseExecutePawn(match, pawn) {
  if (!pawn || pawn.state !== 'onboard') return [];
  const events = tickBurn(match, pawn);
  if (pawn.state !== 'onboard') return events;
  if (pawn.rooted) {
    pawn.rooted = false;
    const had = pawn.intent;
    pawn.intent = null;
    if (had) events.push({ type: 'root', targetId: pawn.id, row: pawn.row, col: pawn.col, skip: true });
    return events;
  }
  if (!pawn.intent) return events;
  const strikeOrder = typeof pawn.strikeOrder === 'number' ? pawn.strikeOrder : defenseStrikeIndex(match, pawn);
  let strike;
  if (pawn.pawnKind === 'fireball') strike = simPawnFireball(match, pawn);
  else if (pawn.pawnKind === 'charge') strike = simPawnCharge(match, pawn);
  else strike = simPawnMelee(match, pawn);
  if (strike && strike[0] && strike[0].type === 'attack') strike[0].strikeOrder = strikeOrder;
  pawn.intent = null;
  events.push.apply(events, strike || []);
  return events;
}

function simDefenseExecute(match) {
  const events = [];
  stampDefenseStrikeOrder(match);
  const pawns = defenseActQueue(match);
  let i;
  for (i = 0; i < pawns.length; i++) {
    events.push.apply(events, simDefenseExecutePawn(match, pawns[i]));
  }
  return events;
}

function simDefenseEmerge(match) {
  const events = [];
  defensePawns(match, ['emerging']).slice().forEach(function (pawn) {
    const row = pawn.row;
    const col = pawn.col;
    const blocker = wizardAt(match, row, col);
    if (blocker) {
      pawn.hp = 0;
      const death = simKill(match, pawn);
      if (death) {
        death.cause = 'spawn';
        death.row = row;
        death.col = col;
        events.push({ type: 'portalBlocked', wizardId: pawn.id, blockerId: blocker.id, row: row, col: col, element: pawn.element });
        events.push(death);
      }
      events.push.apply(events, hurtWizardAmount(match, blocker, 1, 'spawn', row, col));
      return;
    }
    if (nexusAt(match, row, col) || mountainAt(match, row, col)) {
      pawn.hp = 0;
      pawn.row = row;
      pawn.col = col;
      const death = simKill(match, pawn);
      if (death) {
        death.cause = 'spawn';
        events.push(death);
      }
      return;
    }
    pawn.state = 'onboard';
    pawn.hasMoved = false;
    pawn.intent = null;
    events.push({ type: 'summon', wizardId: pawn.id, row: row, col: col, element: pawn.element });
    events.push.apply(events, applyTileEnter(match, pawn));
  });
  return events;
}

function pickDefenseMove(match, pawn) {
  if (!pawn || pawn.state !== 'onboard' || pawn.hasMoved) return null;
  const stay = scoreDefenseTile(match, pawn, pawn.row, pawn.col);
  const options = [{
    row: pawn.row,
    col: pawn.col,
    stay: true,
    score: stay.score,
    hit: stay.hit
  }];
  getMoveTiles(match, pawn).forEach(function (tile) {
    const scored = scoreDefenseTile(match, pawn, tile.row, tile.col);
    options.push({
      row: tile.row,
      col: tile.col,
      stay: false,
      score: scored.score,
      hit: scored.hit
    });
  });
  const hits = options.filter(function (opt) { return opt.hit; });
  return pickScoredOption(match.rng, hits.length ? hits : options);
}

function simDefenseMovePawn(match, pawn) {
  if (!pawn || pawn.state !== 'onboard' || pawn.hasMoved) return [];
  const picked = pickDefenseMove(match, pawn);
  const events = [];
  if (picked && !picked.stay && (picked.row !== pawn.row || picked.col !== pawn.col)) {
    const path = pathBFS(match, pawn, picked.row, picked.col);
    if (path && path.length) events.push.apply(events, simMove(match, pawn, path));
  }
  pawn.hasMoved = true;
  return events;
}

function simDefenseBeat(match, beat, pawn) {
  if (beat === 'strike') return simDefenseExecutePawn(match, pawn);
  if (beat === 'emerge') return simDefenseEmerge(match);
  if (beat === 'walk') {
    const events = simDefenseMovePawn(match, pawn);
    const aimed = assignDefenseIntent(match, pawn);
    if (aimed) events.push(aimed);
    return events;
  }
  if (beat === 'mark') return markDefenseSpawns(match, defenseSpawnCount(match));
  return [];
}

function simDefenseMove(match) {
  const events = [];
  const pawns = defenseActQueue(match);
  let i;
  for (i = 0; i < pawns.length; i++) {
    events.push.apply(events, simDefenseMovePawn(match, pawns[i]));
  }
  return events;
}

function* defenseEnemyPhaseParts(match) {
  resetActionFlagsFor(match, 'enemy');
  stampDefenseStrikeOrder(match);
  const strikers = defenseActQueue(match);
  let i;
  for (i = 0; i < strikers.length; i++) {
    yield { kind: 'strike', events: simDefenseBeat(match, 'strike', strikers[i]), pawn: strikers[i] };
  }
  yield { kind: 'emerge', events: simDefenseBeat(match, 'emerge') };
  const movers = defenseActQueue(match);
  for (i = 0; i < movers.length; i++) {
    if (movers[i].state !== 'onboard') continue;
    yield { kind: 'walk', events: simDefenseBeat(match, 'walk', movers[i]), pawn: movers[i] };
  }
  yield { kind: 'mark', events: simDefenseBeat(match, 'mark') };
}

function simDefenseEnemyPhase(match) {
  const events = [];
  const iter = defenseEnemyPhaseParts(match);
  let step = iter.next();
  while (!step.done) {
    events.push.apply(events, step.value.events);
    step = iter.next();
  }
  return events;
}

function defenseIntentTiles(match, pawn) {
  if (!pawn || pawn.state !== 'onboard' || !pawn.intent) return [];
  const spec = defensePawnSpec(pawn.pawnKind);
  return defenseRayTiles(match, pawn.row, pawn.col, pawn.intent.dr, pawn.intent.dc, spec.range, {
    stopOnHazard: pawn.pawnKind === 'charge',
    oneTile: pawn.pawnKind === 'melee'
  });
}
