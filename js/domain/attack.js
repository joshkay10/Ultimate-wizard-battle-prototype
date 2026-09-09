function simAttack(match, attacker, row, col, kind) {
  if (!canAttack(attacker) || attacker.row === null) return [];
  const legal = kind === 'cast' ? getCastTiles(match, attacker) : getMeleeTiles(match, attacker);
  if (!legal.some(function (tile) { return tile.row === row && tile.col === col; })) return [];

  if (kind === 'cast' && attacker.castKind === 'pulse') return simPulse(match, attacker, row, col);
  if (kind === 'cast' && attacker.castKind === 'raise') return simRaise(match, attacker, row, col);
  if (kind === 'cast' && attacker.castKind === 'swap') return simSwap(match, attacker, row, col);
  return simStrike(match, attacker, row, col, kind);
}

function simBoltJump(match, attacker, pathTiles, skipRow, skipCol) {
  const events = [];
  const seeds = [];
  function seedWater(r, c) {
    if (waterAt(match, r, c)) seeds.push({ row: r, col: c });
  }
  pathTiles.forEach(function (tile) {
    seedWater(tile.row, tile.col);
    CARDINALS.forEach(function (d) {
      seedWater(tile.row + d[0], tile.col + d[1]);
    });
  });
  if (!seeds.length) return events;

  const seen = {};
  const waterTiles = [];
  const q = seeds.slice();
  while (q.length) {
    const tile = q.pop();
    const key = tileKey(tile.row, tile.col);
    if (seen[key] || !waterAt(match, tile.row, tile.col)) continue;
    seen[key] = true;
    waterTiles.push(tile);
    CARDINALS.forEach(function (d) {
      const nr = tile.row + d[0];
      const nc = tile.col + d[1];
      if (inBounds(nr, nc)) q.push({ row: nr, col: nc });
    });
  }

  const hit = {};
  hit[tileKey(skipRow, skipCol)] = true;
  function consider(r, c) {
    const key = tileKey(r, c);
    if (hit[key]) return;
    hit[key] = true;
    const wizard = wizardAt(match, r, c);
    if (wizard && wizard.id !== attacker.id && wizard.state === 'onboard') {
      wizard.hp -= attacker.castAttack;
      events.push({
        type: 'damage',
        targetKind: 'wizard',
        targetId: wizard.id,
        amount: attacker.castAttack,
        row: r,
        col: c,
        cause: 'jump'
      });
      applySilence(match, wizard);
      events.push({ type: 'silence', targetId: wizard.id, row: wizard.row, col: wizard.col, cause: 'jump' });
      const death = simKill(match, wizard);
      if (death) events.push(death);
    }
    const nexus = nexusAt(match, r, c);
    if (nexus) events.push.apply(events, hurtNexus(match, nexus, attacker.castAttack, 'jump'));
  }

  waterTiles.forEach(function (tile) {
    consider(tile.row, tile.col);
    CARDINALS.forEach(function (d) {
      consider(tile.row + d[0], tile.col + d[1]);
    });
  });

  if (events.length || waterTiles.length) {
    events.unshift({ type: 'jump', tiles: waterTiles, attackerId: attacker.id });
  }
  return events;
}

function simStrike(match, attacker, row, col, kind) {
  const events = [];
  const dir = directionBetween(attacker.row, attacker.col, row, col);
  const dmg = kind === 'cast' ? attacker.castAttack : attacker.meleeAttack;
  const pushAmt = kind === 'cast' ? attacker.castDisplacement : attacker.meleeDisplacement;
  const targetWizard = wizardAt(match, row, col);
  const targetNexus = nexusAt(match, row, col);
  const hit = mountainAt(match, row, col) && kind === 'cast' && attacker.castKind === 'bolt'
    ? 'fizzle'
    : (targetWizard ? 'wizard' : (targetNexus ? 'nexus' : 'tile'));

  const pathTiles = [];
  if (kind === 'cast') {
    const dist = Math.max(Math.abs(row - attacker.row), Math.abs(col - attacker.col));
    let i;
    for (i = 1; i <= dist; i++) {
      pathTiles.push({ row: attacker.row + dir.dr * i, col: attacker.col + dir.dc * i });
    }
  } else {
    pathTiles.push({ row: row, col: col });
  }

  if (hit === 'fizzle') {
    events.push({
      type: 'attack',
      kind: kind,
      castKind: 'bolt',
      attackerId: attacker.id,
      from: { row: attacker.row, col: attacker.col },
      row: row,
      col: col,
      element: attacker.element,
      hit: 'fizzle',
      pathTiles: pathTiles,
      trails: [],
      damage: 0
    });
    events.push({ type: 'fizzle', row: row, col: col, attackerId: attacker.id });
    attacker.hasAttacked = true;
    return events;
  }

  const hadFire = pathTiles.map(function (tile) {
    const trail = trailAt(match, tile.row, tile.col);
    return !!(trail && trail.element === 'fire');
  });

  const trails = [];
  pathTiles.forEach(function (tile) {
    if (!paintsTrail(attacker.element)) return;
    layTrail(match, tile.row, tile.col, attacker.element);
    trails.push({ row: tile.row, col: tile.col, element: attacker.element });
  });

  if (kind === 'cast' && attacker.castKind === 'gust') {
    let spreading = false;
    pathTiles.forEach(function (tile, i) {
      if (hadFire[i]) spreading = true;
      if (!spreading) return;
      layTrail(match, tile.row, tile.col, 'fire');
      let found = false;
      trails.forEach(function (trail) {
        if (trail.row === tile.row && trail.col === tile.col) {
          trail.element = 'fire';
          found = true;
        }
      });
      if (!found) trails.push({ row: tile.row, col: tile.col, element: 'fire' });
    });
  }

  events.push({
    type: 'attack',
    kind: kind,
    castKind: kind === 'cast' ? (attacker.castKind || 'stream') : null,
    attackerId: attacker.id,
    from: { row: attacker.row, col: attacker.col },
    row: row,
    col: col,
    element: attacker.element,
    hit: hit,
    pathTiles: pathTiles,
    trails: trails,
    damage: hit === 'tile' ? 0 : dmg
  });
  trails.forEach(function (tile) {
    events.push({ type: 'trail', row: tile.row, col: tile.col, element: tile.element });
  });

  if (targetWizard) {
    targetWizard.hp -= dmg;
    events.push({
      type: 'damage',
      targetKind: 'wizard',
      targetId: targetWizard.id,
      amount: dmg,
      row: row,
      col: col,
      cause: kind
    });
    if (kind === 'cast' && attacker.castKind === 'bolt') {
      applySilence(match, targetWizard);
      events.push({
        type: 'silence',
        targetId: targetWizard.id,
        row: targetWizard.row,
        col: targetWizard.col
      });
    }
    if (pushAmt) events.push.apply(events, simPush(match, targetWizard, dir.dr, dir.dc, pushAmt));
    const death = simKill(match, targetWizard);
    if (death) events.push(death);
  } else if (targetNexus) {
    events.push.apply(events, hurtNexus(match, targetNexus, dmg, kind));
  } else {
    events.push({ type: 'ground', row: row, col: col, element: attacker.element, kind: kind });
  }

  if (kind === 'cast' && attacker.castKind === 'bolt') {
    events.push.apply(events, simBoltJump(match, attacker, pathTiles, row, col));
  }

  attacker.hasAttacked = true;
  return events;
}

function simPulse(match, attacker, clickRow, clickCol) {
  const tiles = getPulseTiles(match, attacker);
  const events = [];
  const dmg = attacker.castAttack;
  const pushAmt = attacker.castDisplacement;
  const trails = [];
  const hits = [];

  tiles.forEach(function (tile) {
    if (paintsTrail(attacker.element)) {
      layTrail(match, tile.row, tile.col, attacker.element);
      trails.push({ row: tile.row, col: tile.col, element: attacker.element });
    }
    const wizard = wizardAt(match, tile.row, tile.col);
    const nexus = nexusAt(match, tile.row, tile.col);
    if (wizard) hits.push({ kind: 'wizard', wizard: wizard, row: tile.row, col: tile.col });
    else if (nexus) hits.push({ kind: 'nexus', nexus: nexus, row: tile.row, col: tile.col });
  });

  events.push({
    type: 'attack',
    kind: 'cast',
    castKind: 'pulse',
    attackerId: attacker.id,
    from: { row: attacker.row, col: attacker.col },
    row: clickRow,
    col: clickCol,
    element: attacker.element,
    hit: hits.length ? 'burst' : 'tile',
    pathTiles: tiles.slice(),
    burstTiles: tiles.slice(),
    trails: trails,
    damage: dmg
  });
  trails.forEach(function (tile) {
    events.push({ type: 'trail', row: tile.row, col: tile.col, element: tile.element });
  });

  hits.forEach(function (hit) {
    if (hit.kind === 'wizard') {
      hit.wizard.hp -= dmg;
      events.push({
        type: 'damage',
        targetKind: 'wizard',
        targetId: hit.wizard.id,
        amount: dmg,
        row: hit.row,
        col: hit.col,
        cause: 'cast'
      });
    } else {
      events.push.apply(events, hurtNexus(match, hit.nexus, dmg, 'cast'));
    }
  });

  hits.forEach(function (hit) {
    if (hit.kind !== 'wizard') return;
    const death = simKill(match, hit.wizard);
    if (death) events.push(death);
  });

  const survivors = hits.filter(function (hit) {
    return hit.kind === 'wizard' && hit.wizard.state === 'onboard';
  });
  survivors.sort(function (a, b) {
    return manhattan(attacker.row, attacker.col, b.row, b.col) - manhattan(attacker.row, attacker.col, a.row, a.col);
  });
  survivors.forEach(function (hit) {
    const dir = directionBetween(attacker.row, attacker.col, hit.row, hit.col);
    if (pushAmt) events.push.apply(events, simPush(match, hit.wizard, dir.dr, dir.dc, pushAmt));
  });

  if (!hits.length) {
    events.push({ type: 'ground', row: clickRow, col: clickCol, element: attacker.element, kind: 'cast' });
  }

  attacker.hasAttacked = true;
  return events;
}

function simRaise(match, attacker, row, col) {
  raiseMountain(match, row, col);
  attacker.hasAttacked = true;
  return [{
    type: 'attack',
    kind: 'cast',
    castKind: 'raise',
    attackerId: attacker.id,
    from: { row: attacker.row, col: attacker.col },
    row: row,
    col: col,
    element: attacker.element,
    hit: 'tile',
    pathTiles: [{ row: row, col: col }],
    trails: [],
    damage: 0
  }, {
    type: 'raise',
    row: row,
    col: col,
    attackerId: attacker.id,
    turnsLeft: TEMP_MOUNTAIN_TURNS
  }];
}

function simSwap(match, attacker, row, col) {
  const other = wizardAt(match, row, col);
  const fromA = { row: attacker.row, col: attacker.col };
  let fromB = null;
  if (other) {
    fromB = { row: other.row, col: other.col };
    attacker.row = fromB.row;
    attacker.col = fromB.col;
    other.row = fromA.row;
    other.col = fromA.col;
  } else {
    attacker.row = row;
    attacker.col = col;
  }
  attacker.hasAttacked = true;
  const events = [{
    type: 'attack',
    kind: 'cast',
    castKind: 'swap',
    attackerId: attacker.id,
    from: fromA,
    row: row,
    col: col,
    element: attacker.element,
    hit: other ? 'wizard' : 'tile',
    pathTiles: [],
    trails: [],
    damage: 0
  }, {
    type: 'swap',
    aId: attacker.id,
    bId: other ? other.id : null,
    fromA: fromA,
    fromB: fromB,
    toA: { row: attacker.row, col: attacker.col },
    toB: other ? { row: other.row, col: other.col } : null,
    element: attacker.element
  }];
  events.push.apply(events, applyTileEnter(match, attacker));
  if (other) events.push.apply(events, applyTileEnter(match, other));
  return events;
}
