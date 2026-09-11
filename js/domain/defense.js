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
    castKind: spec.id === 'fireball' ? 'stream' : (spec.id === 'charge' ? 'gust' : 'melee'),
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

function defenseSpawnCount(match) {
  const living = defensePawns(match, ['onboard', 'emerging']).length;
  if (living === 0) return 0;
  const budget = defenseBudgetLeft(match);
  if (budget <= 0) return 0;
  const cap = typeof DEFENSE_PAWN_CAP === 'number' ? DEFENSE_PAWN_CAP : 5;
  const room = cap - living;
  if (room <= 0) return 0;
  const t = match.turnCount || 1;
  const rng = match.rng;
  let target = 2;
  if (living >= 3) target = 1;
  if (t >= 4) target = Math.max(target, 1);
  if (!rng) return Math.min(target, room, budget);
  const roll = rng.int(10);
  let n = target;
  if (roll === 0 && t > 1 && living >= 3) n = Math.max(0, target - 1);
  else if (roll >= 8) n = target + 1;
  if (t >= 8 && rng.next() < 0.4) n = Math.max(n, 2);
  return Math.max(0, Math.min(n, room, budget));
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

function pickDefenseSpawnTile(match) {
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
      let score = Math.min(dist, 6) * 5;
      if (defenseSpawnSector(r, c) === sector) score += 14;
      if (nearNexus(match, r, c)) score -= 3;
      candidates.push({ row: r, col: c, score: score, sector: defenseSpawnSector(r, c) });
    }
  }
  if (!candidates.length) return null;
  candidates.sort(function (a, b) { return b.score - a.score; });
  const inSector = candidates.filter(function (tile) { return tile.sector === sector; });
  const poolSrc = inSector.length ? inSector : candidates;
  const best = poolSrc[0].score;
  const pool = poolSrc.filter(function (tile) { return tile.score >= best - 8; });
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
    if (defensePawns(match, ['onboard', 'emerging']).length >= (typeof DEFENSE_PAWN_CAP === 'number' ? DEFENSE_PAWN_CAP : 5)) break;
    const tile = pickDefenseSpawnTile(match);
    if (!tile) break;
    const pawn = createDefensePawn(match, pickDefenseKind(match), {
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
  const rng = match.rng;
  const opening = rng ? (1 + rng.int(2)) : 1;
  let i;
  for (i = 0; i < opening; i++) {
    const tile = pickDefenseSpawnTile(match);
    if (!tile) break;
    createDefensePawn(match, pickDefenseKind(match), {
      state: 'onboard',
      row: tile.row,
      col: tile.col,
      intent: null
    });
  }
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

function nearestDefensePrey(match, row, col) {
  let best = null;
  let bestD = Infinity;
  livingNexuses(match, 'player').forEach(function (n) {
    const d = manhattan(row, col, n.row, n.col);
    if (d < bestD) {
      bestD = d;
      best = { row: n.row, col: n.col, kind: 'nexus' };
    }
  });
  Object.values(match.wizards).forEach(function (w) {
    if (w.team !== 'player' || w.state !== 'onboard') return;
    const d = manhattan(row, col, w.row, w.col);
    if (d < bestD) {
      bestD = d;
      best = { row: w.row, col: w.col, kind: 'wizard' };
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
      if (nex.team === 'player') return 50 - i;
      return -20;
    }
    if (victim) {
      if (victim.team === 'player') return 50 - i;
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
  const prey = nearestDefensePrey(match, row, col);
  const dist = prey ? manhattan(row, col, prey.row, prey.col) : 12;
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
  return { score: score, dr: shot.dr, dc: shot.dc, nexusShot: shot.score > 0 };
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

function scoreDefenseDir(match, pawn, dr, dc) {
  return defenseShotScore(match, pawn, pawn.row, pawn.col, dr, dc);
}

function pickSafeChargeDir(match, pawn, preferred) {
  const kind = (preferred && preferred.kind) || (pawn && pawn.pawnKind) || 'charge';
  if (!preferred) return { kind: kind, dr: 1, dc: 0 };
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
    if (!best || score > best.score) best = { dr: dr, dc: dc, score: score };
  }
  if (best) return { kind: kind, dr: best.dr, dc: best.dc };
  return { kind: kind, dr: preferred.dr, dc: preferred.dc };
}

function pickDefenseIntent(match, pawn) {
  const spec = defensePawnSpec(pawn.pawnKind);
  const options = [];
  let d;
  for (d = 0; d < CARDINALS.length; d++) {
    const dr = CARDINALS[d][0];
    const dc = CARDINALS[d][1];
    const score = defenseShotScore(match, pawn, pawn.row, pawn.col, dr, dc);
    options.push({ kind: spec.id, dr: dr, dc: dc, score: score });
  }
  const hit = pickScoredOption(match.rng, options);
  if (hit && hit.score > 0) {
    return pickSafeChargeDir(match, pawn, { kind: spec.id, dr: hit.dr, dc: hit.dc });
  }
  const prey = nearestDefensePrey(match, pawn.row, pawn.col);
  if (prey) {
    const dir = cardinalToward(pawn.row, pawn.col, prey.row, prey.col);
    return pickSafeChargeDir(match, pawn, { kind: spec.id, dr: dir.dr, dc: dir.dc });
  }
  return pickSafeChargeDir(match, pawn, (hit && { kind: spec.id, dr: hit.dr, dc: hit.dc }) || { kind: spec.id, dr: 1, dc: 0 });
}

function assignDefenseIntent(match, pawn) {
  if (!pawn || pawn.state !== 'onboard') return;
  pawn.intent = pickDefenseIntent(match, pawn);
}

function assignDefenseIntents(match) {
  defensePawns(match, ['onboard']).forEach(function (pawn) {
    assignDefenseIntent(match, pawn);
  });
}

function hurtWizardAmount(match, wizard, amount, cause, row, col) {
  const events = [];
  if (!wizard || wizard.state !== 'onboard') return events;
  wizard.hp -= amount;
  events.push({
    type: 'damage',
    targetKind: 'wizard',
    targetId: wizard.id,
    amount: amount,
    row: row != null ? row : wizard.row,
    col: col != null ? col : wizard.col,
    cause: cause
  });
  const death = simKill(match, wizard);
  if (death) events.push(death);
  return events;
}

function simPawnMelee(match, pawn) {
  const events = [];
  const dr = pawn.intent.dr;
  const dc = pawn.intent.dc;
  const row = pawn.row + dr;
  const col = pawn.col + dc;
  if (!inBounds(row, col)) return events;
  events.push({
    type: 'attack',
    kind: 'melee',
    attackerId: pawn.id,
    from: { row: pawn.row, col: pawn.col },
    row: row,
    col: col,
    hit: 'none',
    spellName: pawn.name
  });
  const victim = wizardAt(match, row, col);
  const nex = nexusAt(match, row, col);
  if (victim) {
    events[0].hit = 'wizard';
    events.push.apply(events, hurtWizardAmount(match, victim, pawn.meleeAttack, 'pawn', row, col));
  } else if (nex) {
    events[0].hit = 'nexus';
    events.push.apply(events, hurtNexus(match, nex, pawn.meleeAttack, 'pawn'));
  }
  return events;
}

function simPawnFireball(match, pawn) {
  const events = [];
  const dr = pawn.intent.dr;
  const dc = pawn.intent.dc;
  const from = { row: pawn.row, col: pawn.col };
  let hitRow = pawn.row + dr;
  let hitCol = pawn.col + dc;
  let i;
  let hit = 'none';
  for (i = 1; i <= 4; i++) {
    const nr = pawn.row + dr * i;
    const nc = pawn.col + dc * i;
    if (!inBounds(nr, nc)) break;
    hitRow = nr;
    hitCol = nc;
    if (mountainAt(match, nr, nc)) break;
    const victim = wizardAt(match, nr, nc);
    const nex = nexusAt(match, nr, nc);
    if (victim) {
      hit = 'wizard';
      events.push({
        type: 'attack',
        kind: 'cast',
        castKind: 'stream',
        attackerId: pawn.id,
        from: from,
        row: nr,
        col: nc,
        hit: hit,
        spellName: 'Fireball',
        element: 'fire'
      });
      events.push.apply(events, hurtWizardAmount(match, victim, pawn.castAttack, 'pawn', nr, nc));
      return events;
    }
    if (nex) {
      hit = 'nexus';
      events.push({
        type: 'attack',
        kind: 'cast',
        castKind: 'stream',
        attackerId: pawn.id,
        from: from,
        row: nr,
        col: nc,
        hit: hit,
        spellName: 'Fireball',
        element: 'fire'
      });
      events.push.apply(events, hurtNexus(match, nex, pawn.castAttack, 'pawn'));
      return events;
    }
  }
  events.push({
    type: 'attack',
    kind: 'cast',
    castKind: 'stream',
    attackerId: pawn.id,
    from: from,
    row: hitRow,
    col: hitCol,
    hit: hit,
    spellName: 'Fireball',
    element: 'fire'
  });
  return events;
}

function simPawnCharge(match, pawn) {
  const events = [];
  const dr = pawn.intent.dr;
  const dc = pawn.intent.dc;
  const from = { row: pawn.row, col: pawn.col };
  const path = [];
  let i;
  events.push({
    type: 'attack',
    kind: 'cast',
    castKind: 'gust',
    attackerId: pawn.id,
    from: from,
    row: pawn.row + dr,
    col: pawn.col + dc,
    hit: 'none',
    spellName: 'Charge',
    element: 'wind'
  });
  for (i = 1; i <= 3; i++) {
    if (pawn.state !== 'onboard') break;
    const nr = pawn.row + dr;
    const nc = pawn.col + dc;
    if (!inBounds(nr, nc)) break;
    if (mountainAt(match, nr, nc)) break;
    const victim = wizardAt(match, nr, nc);
    const nex = nexusAt(match, nr, nc);
    if (victim || nex) {
      events[0].row = nr;
      events[0].col = nc;
      events[0].hit = victim ? 'wizard' : 'nexus';
      if (victim) {
        events.push.apply(events, hurtWizardAmount(match, victim, pawn.meleeAttack, 'pawn', nr, nc));
        if (victim.state === 'onboard' && (pawn.meleeDisplacement || 0) > 0) {
          events.push.apply(events, simPush(match, victim, dr, dc, pawn.meleeDisplacement));
        }
      } else events.push.apply(events, hurtNexus(match, nex, pawn.meleeAttack, 'pawn'));
      break;
    }
    pawn.row = nr;
    pawn.col = nc;
    path.push({ row: nr, col: nc });
    events[0].row = nr;
    events[0].col = nc;
    events.push.apply(events, applyTileEnter(match, pawn));
    if (pawn.state !== 'onboard') break;
  }
  if (path.length) {
    events.splice(1, 0, {
      type: 'push',
      wizardId: pawn.id,
      from: from,
      path: path,
      tilesShort: 0,
      crash: null
    });
  }
  return events;
}

function simDefenseExecutePawn(match, pawn) {
  if (!pawn || pawn.state !== 'onboard' || !pawn.intent) return [];
  let events;
  if (pawn.pawnKind === 'fireball') events = simPawnFireball(match, pawn);
  else if (pawn.pawnKind === 'charge') events = simPawnCharge(match, pawn);
  else events = simPawnMelee(match, pawn);
  pawn.intent = null;
  return events || [];
}

function simDefenseExecute(match) {
  const events = [];
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

function simDefenseMovePawn(match, pawn) {
  if (!pawn || pawn.state !== 'onboard' || pawn.hasMoved) return [];
  const stay = scoreDefenseTile(match, pawn, pawn.row, pawn.col);
  const options = [{
    row: pawn.row,
    col: pawn.col,
    stay: true,
    score: stay.score,
    nexusShot: stay.nexusShot
  }];
  getMoveTiles(match, pawn).forEach(function (tile) {
    const scored = scoreDefenseTile(match, pawn, tile.row, tile.col);
    options.push({
      row: tile.row,
      col: tile.col,
      stay: false,
      score: scored.score,
      nexusShot: scored.nexusShot
    });
  });
  const nexusOpts = options.filter(function (opt) { return opt.nexusShot; });
  const picked = pickScoredOption(match.rng, nexusOpts.length ? nexusOpts : options);
  const events = [];
  if (picked && !picked.stay && (picked.row !== pawn.row || picked.col !== pawn.col)) {
    const path = pathBFS(match, pawn, picked.row, picked.col);
    if (path && path.length) events.push.apply(events, simMove(match, pawn, path));
  }
  pawn.hasMoved = true;
  return events;
}

function simDefenseMoveAndTelegraph(match) {
  const events = [];
  const pawns = defenseActQueue(match);
  let i;
  for (i = 0; i < pawns.length; i++) {
    events.push.apply(events, simDefenseMovePawn(match, pawns[i]));
    assignDefenseIntent(match, pawns[i]);
  }
  return events;
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

function simDefenseEnemyPhase(match) {
  const events = [];
  events.push.apply(events, simDefenseExecute(match));
  events.push.apply(events, simDefenseEmerge(match));
  events.push.apply(events, simDefenseMoveAndTelegraph(match));
  events.push.apply(events, markDefenseSpawns(match, defenseSpawnCount(match)));
  return events;
}

function defenseIntentTiles(match, pawn) {
  const tiles = [];
  if (!pawn || pawn.state !== 'onboard' || !pawn.intent) return tiles;
  const spec = defensePawnSpec(pawn.pawnKind);
  let i;
  for (i = 1; i <= spec.range; i++) {
    const nr = pawn.row + pawn.intent.dr * i;
    const nc = pawn.col + pawn.intent.dc * i;
    if (!inBounds(nr, nc)) break;
    if (mountainAt(match, nr, nc)) break;
    tiles.push({ row: nr, col: nc });
    const victim = wizardAt(match, nr, nc);
    const nex = nexusAt(match, nr, nc);
    if (victim || nex) break;
    if (pawn.pawnKind === 'charge' && hazardAt(match, nr, nc)) break;
    if (pawn.pawnKind === 'melee') break;
  }
  return tiles;
}
