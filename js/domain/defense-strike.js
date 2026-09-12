// Strike execute, emerge, and enemy phase.
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
  const amount = pawn.meleeAttack * (pawn.stack || 1);
  const tiles = [{ row: row, col: col }];
  const events = [pawnAttackEvent(pawn, {
    kind: 'melee',
    row: row,
    col: col,
    hit: pawnHitKind(match, row, col),
    spellName: pawn.name,
    damage: amount,
    tiles: tiles
  })];
  events.push.apply(events, pawnHitAt(match, pawn, row, col, amount));
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

// A mite may step onto an adjacent friendly mite (stack < 2) to double up,
// as long as that tile is not farther from the city than where it stands.
function pickMiteMergeTile(match, pawn) {
  if (!pawn || pawn.pawnKind !== 'mite' || (pawn.stack || 1) >= 2) return null;
  const city = nearestDefenseNexus(match, pawn.row, pawn.col);
  const cur = city ? manhattan(pawn.row, pawn.col, city.row, city.col) : 0;
  let best = null;
  let d;
  for (d = 0; d < CARDINALS.length; d++) {
    const nr = pawn.row + CARDINALS[d][0];
    const nc = pawn.col + CARDINALS[d][1];
    if (!inBounds(nr, nc)) continue;
    if (mountainAt(match, nr, nc) || hazardAt(match, nr, nc)) continue;
    const occ = wizardAt(match, nr, nc);
    if (!occ || occ.id === pawn.id) continue;
    if (occ.team !== 'enemy' || occ.pawnKind !== 'mite' || (occ.stack || 1) >= 2) continue;
    const d2 = city ? manhattan(nr, nc, city.row, city.col) : 0;
    if (city && d2 > cur) continue;
    if (!best || d2 < best.d) best = { row: nr, col: nc, d: d2 };
  }
  return best;
}

function simMiteMerge(match, mover, tile) {
  const resident = wizardAt(match, tile.row, tile.col);
  const events = [];
  const from = { row: mover.row, col: mover.col };
  mover.row = tile.row;
  mover.col = tile.col;
  events.push({ type: 'move', wizardId: mover.id, from: from, path: [{ row: tile.row, col: tile.col }] });
  if (resident && resident !== mover) {
    resident.stack = Math.min(2, (resident.stack || 1) + (mover.stack || 1));
    mover.hp = 0;
    const death = simKill(match, mover);
    if (death) {
      death.cause = 'merge';
      death.row = tile.row;
      death.col = tile.col;
      events.push(death);
    }
  }
  return events;
}

function simDefenseMovePawn(match, pawn) {
  if (!pawn || pawn.state !== 'onboard' || pawn.hasMoved) return [];
  const picked = pickDefenseMove(match, pawn);
  if (pawn.pawnKind === 'mite' && (!picked || !picked.hit)) {
    const mergeTile = pickMiteMergeTile(match, pawn);
    if (mergeTile) {
      const merged = simMiteMerge(match, pawn, mergeTile);
      pawn.hasMoved = true;
      return merged;
    }
  }
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
