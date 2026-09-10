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

function defenseSpawnCount(turnCount) {
  if (turnCount >= 6) return 2;
  return 1;
}

function pickDefenseSpawnTile(match) {
  const used = {};
  defensePawns(match, ['onboard', 'emerging']).forEach(function (w) {
    if (w.row != null) used[tileKey(w.row, w.col)] = true;
  });
  const candidates = [];
  let r;
  let c;
  for (r = 0; r < ENEMY_ROW_END; r++) {
    for (c = 0; c < BOARD_SIZE; c++) {
      if (used[tileKey(r, c)]) continue;
      if (!canOpenPortalAt(match, r, c)) continue;
      candidates.push({ row: r, col: c, score: r * 4 + (c === CENTER ? 1 : 0) });
    }
  }
  if (!candidates.length) return null;
  candidates.sort(function (a, b) { return b.score - a.score; });
  const top = candidates.slice(0, Math.min(6, candidates.length));
  return top[match.rng.int(top.length)];
}

function pickDefenseKind(match) {
  return DEFENSE_PAWN_ORDER[match.rng.int(DEFENSE_PAWN_ORDER.length)];
}

function markDefenseSpawns(match, count) {
  const events = [];
  let n;
  for (n = 0; n < count; n++) {
    if (defensePawns(match, ['onboard', 'emerging']).length >= 8) break;
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
  const opening = 2;
  let i;
  for (i = 0; i < opening; i++) {
    const tile = pickDefenseSpawnTile(match);
    if (!tile) break;
    createDefensePawn(match, pickDefenseKind(match), {
      state: 'onboard',
      row: tile.row,
      col: tile.col
    });
  }
  assignDefenseIntents(match);
  markDefenseSpawns(match, 1);
}

function cardinalToward(row, col, tRow, tCol) {
  const dr = tRow - row;
  const dc = tCol - col;
  if (!dr && !dc) return { dr: 1, dc: 0 };
  if (Math.abs(dr) >= Math.abs(dc)) return { dr: Math.sign(dr), dc: 0 };
  return { dr: 0, dc: Math.sign(dc) };
}

function nearestDefensePrey(match, row, col) {
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
  livingNexuses(match, 'player').forEach(function (n) {
    const d = manhattan(row, col, n.row, n.col);
    if (d < bestD) {
      bestD = d;
      best = { row: n.row, col: n.col, kind: 'nexus' };
    }
  });
  return best;
}

function scoreDefenseDir(match, pawn, dr, dc) {
  const spec = defensePawnSpec(pawn.pawnKind);
  let r = pawn.row;
  let c = pawn.col;
  let i;
  for (i = 1; i <= spec.range; i++) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc)) return i === 1 ? -20 : 1;
    if (mountainAt(match, nr, nc)) return i === 1 ? -15 : 2;
    const victim = wizardAt(match, nr, nc);
    const nex = nexusAt(match, nr, nc);
    if (victim) {
      if (victim.team === 'player') return 200 - i * 8;
      return -8;
    }
    if (nex) {
      if (nex.team === 'player') return 160 - i * 6;
      return -12;
    }
    if (pawn.pawnKind === 'charge' && hazardAt(match, nr, nc)) return 12 - i;
    if (pawn.pawnKind !== 'fireball' && hazardAt(match, nr, nc)) break;
    r = nr;
    c = nc;
    if (pawn.pawnKind === 'melee') break;
  }
  return 4;
}

function pickDefenseIntent(match, pawn) {
  const spec = defensePawnSpec(pawn.pawnKind);
  let best = null;
  let bestScore = -Infinity;
  let d;
  for (d = 0; d < CARDINALS.length; d++) {
    const dr = CARDINALS[d][0];
    const dc = CARDINALS[d][1];
    const score = scoreDefenseDir(match, pawn, dr, dc);
    if (score > bestScore) {
      bestScore = score;
      best = { kind: spec.id, dr: dr, dc: dc };
    }
  }
  if (bestScore < 20) {
    const prey = nearestDefensePrey(match, pawn.row, pawn.col);
    if (prey) {
      const dir = cardinalToward(pawn.row, pawn.col, prey.row, prey.col);
      best = { kind: spec.id, dr: dir.dr, dc: dir.dc };
    }
  }
  return best || { kind: spec.id, dr: 1, dc: 0 };
}

function assignDefenseIntents(match) {
  defensePawns(match, ['onboard']).forEach(function (pawn) {
    pawn.intent = pickDefenseIntent(match, pawn);
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

function simDefenseExecute(match) {
  const events = [];
  const pawns = defensePawns(match, ['onboard']).slice().sort(function (a, b) {
    return a.id < b.id ? -1 : 1;
  });
  let i;
  for (i = 0; i < pawns.length; i++) {
    const pawn = pawns[i];
    if (pawn.state !== 'onboard' || !pawn.intent) continue;
    if (pawn.pawnKind === 'fireball') events.push.apply(events, simPawnFireball(match, pawn));
    else if (pawn.pawnKind === 'charge') events.push.apply(events, simPawnCharge(match, pawn));
    else events.push.apply(events, simPawnMelee(match, pawn));
    pawn.intent = null;
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
    pawn.hasMoved = true;
    pawn.intent = null;
    events.push({ type: 'summon', wizardId: pawn.id, row: row, col: col, element: pawn.element });
    events.push.apply(events, applyTileEnter(match, pawn));
  });
  return events;
}

function simDefenseMove(match) {
  const events = [];
  const pawns = defensePawns(match, ['onboard']).slice().sort(function (a, b) {
    return a.id < b.id ? -1 : 1;
  });
  let i;
  for (i = 0; i < pawns.length; i++) {
    const pawn = pawns[i];
    if (pawn.state !== 'onboard' || pawn.hasMoved) continue;
    const prey = nearestDefensePrey(match, pawn.row, pawn.col);
    if (!prey) {
      pawn.hasMoved = true;
      continue;
    }
    const tiles = getMoveTiles(match, pawn);
    let best = null;
    let bestD = manhattan(pawn.row, pawn.col, prey.row, prey.col);
    tiles.forEach(function (tile) {
      const d = manhattan(tile.row, tile.col, prey.row, prey.col);
      if (d < bestD) {
        bestD = d;
        best = tile;
      }
    });
    if (best) {
      const path = pathBFS(match, pawn, best.row, best.col);
      if (path && path.length) events.push.apply(events, simMove(match, pawn, path));
    }
    pawn.hasMoved = true;
  }
  return events;
}

function simDefenseEnemyPhase(match) {
  const events = [];
  events.push.apply(events, simDefenseExecute(match));
  events.push.apply(events, simDefenseEmerge(match));
  events.push.apply(events, simDefenseMove(match));
  assignDefenseIntents(match);
  events.push.apply(events, markDefenseSpawns(match, defenseSpawnCount(match.turnCount)));
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
