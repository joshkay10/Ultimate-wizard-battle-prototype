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
  melee: { id: 'melee', name: 'Brute', element: 'earth', moveRange: 3, attack: 2, range: 1, hpMin: 4, hpMax: 5 },
  charge: { id: 'charge', name: 'Charger', element: 'wind', moveRange: 3, attack: 2, range: 3, hpMin: 3, hpMax: 4 },
  fireball: { id: 'fireball', name: 'Bomber', element: 'fire', moveRange: 2, attack: 2, range: 4, hpMin: 2, hpMax: 3 }
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
    meleeDisplacement: 0,
    castAttack: spec.attack,
    castDisplacement: 0,
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

function defenseSpawnCount(match) {
  const living = defensePawns(match, ['onboard', 'emerging']).length;
  if (living === 0) return 0;
  const cap = typeof DEFENSE_PAWN_CAP === 'number' ? DEFENSE_PAWN_CAP : 7;
  const room = cap - living;
  if (room <= 0) return 0;
  const t = match.turnCount || 1;
  const rng = match.rng;
  let target = 1;
  if (t >= 4) target = 2;
  if (t >= 8) target = 2;
  if (living <= 2) target += 1;
  if (living >= 5) target = Math.min(target, 1);
  if (living >= 6) target = Math.min(target, 1);
  if (!rng) return Math.min(target, room);
  const roll = rng.int(10);
  let n = target;
  if (roll === 0 && t > 1 && living >= 3) n = Math.max(0, target - 1);
  else if (roll >= 8) n = target + 1;
  if (t >= 8 && rng.next() < 0.4) n = Math.max(n, 2);
  return Math.max(0, Math.min(n, room));
}

function isDefenseSpawnCell(row, col) {
  if (row >= 0 && row < ENEMY_ROW_END) return true;
  if ((col === 0 || col === BOARD_SIZE - 1) && row <= 5) return true;
  return false;
}

function pickDefenseSpawnTile(match) {
  const used = {};
  defensePawns(match, ['onboard', 'emerging']).forEach(function (w) {
    if (w.row != null) used[tileKey(w.row, w.col)] = true;
  });
  const candidates = [];
  let r;
  let c;
  for (r = 0; r < BOARD_SIZE; r++) {
    for (c = 0; c < BOARD_SIZE; c++) {
      if (!isDefenseSpawnCell(r, c)) continue;
      if (used[tileKey(r, c)]) continue;
      if (!canOpenPortalAt(match, r, c)) continue;
      let score = (ENEMY_ROW_END - Math.min(r, ENEMY_ROW_END)) * 3;
      if (c === 0 || c === BOARD_SIZE - 1) score += 2;
      if (nearNexus(match, r, c)) score -= 8;
      candidates.push({ row: r, col: c, score: score });
    }
  }
  if (!candidates.length) return null;
  candidates.sort(function (a, b) { return b.score - a.score; });
  const pool = Math.max(4, Math.min(12, candidates.length));
  const top = candidates.slice(0, pool);
  return top[match.rng.int(top.length)];
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
    if (defensePawns(match, ['onboard', 'emerging']).length >= (typeof DEFENSE_PAWN_CAP === 'number' ? DEFENSE_PAWN_CAP : 7)) break;
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
  const nexus = nearestDefenseNexus(match, row, col);
  if (nexus) return { row: nexus.row, col: nexus.col, kind: 'nexus' };
  let best = null;
  let bestD = Infinity;
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
      if (nex.team === 'player') return 800 - i * 10 + (nex.maxHp - nex.hp) * 60;
      return -20;
    }
    if (victim) {
      if (victim.team === 'player') return 70 - i * 6;
      return -40;
    }
    if (hazardAt(match, nr, nc)) return pawn.pawnKind === 'fireball' ? 0 : (pawn.pawnKind === 'charge' ? -200 : 0);
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
  const nexus = nearestDefenseNexus(match, row, col);
  const dist = nexus ? manhattan(row, col, nexus.row, nexus.col) : 12;
  const nexusShot = shot.score >= 400;
  let score;
  if (nexusShot) score = 9000 + shot.score - dist * 4;
  else score = (18 - dist) * 110;
  if (pawn.pawnKind === 'charge') {
    const toward = nexus ? cardinalToward(row, col, nexus.row, nexus.col) : null;
    if (toward && defenseChargeWouldFall(match, row, col, toward.dr, toward.dc)) score -= 2800;
    if (shot.score > 0 && !defenseChargeWouldFall(match, row, col, shot.dr, shot.dc)) score += 180;
  }
  return { score: score, dr: shot.dr, dc: shot.dc, nexusShot: nexusShot };
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
    options.push({ kind: spec.id, dr: dr, dc: dc, score: score, nexusShot: score >= 400 });
  }
  const nexusHits = options.filter(function (opt) { return opt.nexusShot; });
  const pool = nexusHits.length ? nexusHits : options;
  const hit = pickScoredOption(match.rng, pool);
  if (nexusHits.length && hit) {
    return pickSafeChargeDir(match, pawn, { kind: spec.id, dr: hit.dr, dc: hit.dc });
  }
  if (hit && hit.score >= 40) {
    const prey = nearestDefenseNexus(match, pawn.row, pawn.col);
    if (prey) {
      const dir = cardinalToward(pawn.row, pawn.col, prey.row, prey.col);
      return pickSafeChargeDir(match, pawn, { kind: spec.id, dr: dir.dr, dc: dir.dc });
    }
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
      if (victim) events.push.apply(events, hurtWizardAmount(match, victim, pawn.meleeAttack, 'pawn', nr, nc));
      else events.push.apply(events, hurtNexus(match, nex, pawn.meleeAttack, 'pawn'));
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
  const pawns = defensePawns(match, ['onboard']).slice().sort(function (a, b) {
    return a.id < b.id ? -1 : 1;
  });
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
  const pawns = defensePawns(match, ['onboard']).slice().sort(function (a, b) {
    return a.id < b.id ? -1 : 1;
  });
  let i;
  for (i = 0; i < pawns.length; i++) {
    events.push.apply(events, simDefenseMovePawn(match, pawns[i]));
    assignDefenseIntent(match, pawns[i]);
  }
  return events;
}

function simDefenseMove(match) {
  const events = [];
  const pawns = defensePawns(match, ['onboard']).slice().sort(function (a, b) {
    return a.id < b.id ? -1 : 1;
  });
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
