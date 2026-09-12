function simAttack(match, attacker, row, col, kind) {
  if (!canAttack(attacker) || attacker.row === null) return [];
  const legal = kind === 'cast' ? getCastTiles(match, attacker) : getMeleeTiles(match, attacker);
  if (!legal.some(function (tile) { return tile.row === row && tile.col === col; })) return [];
  clearMoveUndo(attacker);

  if (kind === 'cast' && attacker.castKind === 'pulse') return simPulse(match, attacker, row, col);
  if (kind === 'cast' && attacker.castKind === 'raise') return simRaise(match, attacker, row, col);
  if (kind === 'cast' && (attacker.castKind === 'swap' || attacker.castKind === 'blink')) {
    return simSwap(match, attacker, row, col);
  }
  if (kind === 'cast' && attacker.castKind === 'burst') return simBurst(match, attacker, row, col);
  if (kind === 'cast' && attacker.castKind === 'pierce') return simPierce(match, attacker, row, col);
  return simStrike(match, attacker, row, col, kind);
}

function attackSpellFields(attacker, kind) {
  return {
    spellId: attacker.spellId || null,
    spellName: attacker.spellName || null,
    castKind: kind === 'cast' ? (attacker.castKind || 'stream') : null
  };
}

function casterPaints(attacker) {
  return attacker.spellPaint !== false && paintsTrail(attacker.element);
}

function applyHitStatuses(match, attacker, wizard, events) {
  if (!wizard || wizard.state !== 'onboard') return;
  if (attacker.spellRoot) {
    wizard.rooted = true;
    wizard.intent = null;
    events.push({ type: 'root', targetId: wizard.id, row: wizard.row, col: wizard.col });
  }
  if (attacker.spellBurn) {
    wizard.burn = attacker.spellBurn;
    events.push({ type: 'burn', targetId: wizard.id, amount: attacker.spellBurn, row: wizard.row, col: wizard.col });
  }
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
      events.push(stampWizardDamage(wizard, attacker.castAttack, 'jump', r, c));
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
      spellId: attacker.spellId || null,
      spellName: attacker.spellName || null,
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
    if (!casterPaints(attacker)) return;
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

  events.push(Object.assign({
    type: 'attack',
    kind: kind,
    attackerId: attacker.id,
    from: { row: attacker.row, col: attacker.col },
    row: row,
    col: col,
    element: attacker.element,
    hit: hit,
    pathTiles: pathTiles,
    trails: trails,
    damage: hit === 'tile' ? 0 : dmg
  }, attackSpellFields(attacker, kind)));
  trails.forEach(function (tile) {
    events.push({ type: 'trail', row: tile.row, col: tile.col, element: tile.element });
  });

  if (targetWizard) {
    events.push(stampWizardDamage(targetWizard, dmg, kind, row, col));
    if (kind === 'cast' && (attacker.castKind === 'bolt' || attacker.spellSilence)) {
      applySilence(match, targetWizard);
      events.push({
        type: 'silence',
        targetId: targetWizard.id,
        row: targetWizard.row,
        col: targetWizard.col
      });
    }
    applyHitStatuses(match, attacker, targetWizard, events);
    if (pushAmt) {
      const away = attacker.castKind === 'pull'
        ? { dr: -dir.dr, dc: -dir.dc }
        : dir;
      events.push.apply(events, simPush(match, targetWizard, away.dr, away.dc, pushAmt));
    }
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

function simPierce(match, attacker, clickRow, clickCol) {
  const dir = directionBetween(attacker.row, attacker.col, clickRow, clickCol);
  const range = attacker.castRange || 4;
  const events = [];
  const dmg = attacker.castAttack;
  const pushAmt = attacker.castDisplacement;
  const pathTiles = [];
  let i;
  for (i = 1; i <= range; i++) {
    const nr = attacker.row + dir.dr * i;
    const nc = attacker.col + dir.dc * i;
    if (!inBounds(nr, nc)) break;
    if (mountainAt(match, nr, nc)) break;
    pathTiles.push({ row: nr, col: nc });
  }
  const last = pathTiles.length ? pathTiles[pathTiles.length - 1] : { row: clickRow, col: clickCol };

  const trails = [];
  pathTiles.forEach(function (tile) {
    if (!casterPaints(attacker)) return;
    layTrail(match, tile.row, tile.col, attacker.element);
    trails.push({ row: tile.row, col: tile.col, element: attacker.element });
  });

  const hits = [];
  pathTiles.forEach(function (tile) {
    const wizard = wizardAt(match, tile.row, tile.col);
    const nexus = nexusAt(match, tile.row, tile.col);
    if (wizard) hits.push({ kind: 'wizard', wizard: wizard, row: tile.row, col: tile.col });
    else if (nexus && attacker.spellHitNexus) hits.push({ kind: 'nexus', nexus: nexus, row: tile.row, col: tile.col });
  });

  events.push(Object.assign({
    type: 'attack',
    kind: 'cast',
    attackerId: attacker.id,
    from: { row: attacker.row, col: attacker.col },
    row: last.row,
    col: last.col,
    element: attacker.element,
    hit: hits.length ? 'burst' : 'tile',
    pathTiles: pathTiles.slice(),
    trails: trails,
    damage: dmg
  }, attackSpellFields(attacker, 'cast')));
  trails.forEach(function (tile) {
    events.push({ type: 'trail', row: tile.row, col: tile.col, element: tile.element });
  });

  hits.forEach(function (hit) {
    if (hit.kind === 'wizard') {
      if (dmg) events.push(stampWizardDamage(hit.wizard, dmg, 'cast', hit.row, hit.col));
      applyHitStatuses(match, attacker, hit.wizard, events);
    } else if (dmg) {
      events.push.apply(events, hurtNexus(match, hit.nexus, dmg, 'cast'));
    }
  });

  if (pushAmt) {
    const shoves = hits.filter(function (hit) {
      return hit.kind === 'wizard' && hit.wizard.state === 'onboard';
    });
    shoves.sort(function (a, b) {
      return manhattan(attacker.row, attacker.col, b.row, b.col) - manhattan(attacker.row, attacker.col, a.row, a.col);
    });
    shoves.forEach(function (hit) {
      events.push.apply(events, simPush(match, hit.wizard, dir.dr, dir.dc, pushAmt));
    });
  }

  hits.forEach(function (hit) {
    if (hit.kind !== 'wizard') return;
    const death = simKill(match, hit.wizard);
    if (death) events.push(death);
  });

  if (!hits.length) {
    events.push({ type: 'ground', row: last.row, col: last.col, element: attacker.element, kind: 'cast' });
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
    if (casterPaints(attacker)) {
      layTrail(match, tile.row, tile.col, attacker.element);
      trails.push({ row: tile.row, col: tile.col, element: attacker.element });
    }
    const wizard = wizardAt(match, tile.row, tile.col);
    const nexus = nexusAt(match, tile.row, tile.col);
    if (wizard) hits.push({ kind: 'wizard', wizard: wizard, row: tile.row, col: tile.col });
    else if (nexus) hits.push({ kind: 'nexus', nexus: nexus, row: tile.row, col: tile.col });
  });

  events.push(Object.assign({
    type: 'attack',
    kind: 'cast',
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
  }, attackSpellFields(attacker, 'cast')));
  trails.forEach(function (tile) {
    events.push({ type: 'trail', row: tile.row, col: tile.col, element: tile.element });
  });

  hits.forEach(function (hit) {
    if (hit.kind === 'wizard') {
      if (dmg) events.push(stampWizardDamage(hit.wizard, dmg, 'cast', hit.row, hit.col));
      if (attacker.spellSilence) {
        applySilence(match, hit.wizard);
        events.push({
          type: 'silence',
          targetId: hit.wizard.id,
          row: hit.wizard.row,
          col: hit.wizard.col
        });
      }
      applyHitStatuses(match, attacker, hit.wizard, events);
    } else {
      events.push.apply(events, hurtNexus(match, hit.nexus, dmg, 'cast'));
    }
  });

  const pulseShoves = hits.filter(function (hit) {
    return hit.kind === 'wizard' && hit.wizard.state === 'onboard';
  });
  pulseShoves.sort(function (a, b) {
    return manhattan(attacker.row, attacker.col, b.row, b.col) - manhattan(attacker.row, attacker.col, a.row, a.col);
  });
  pulseShoves.forEach(function (hit) {
    const dir = directionBetween(attacker.row, attacker.col, hit.row, hit.col);
    if (pushAmt) events.push.apply(events, simPush(match, hit.wizard, dir.dr, dir.dc, pushAmt));
  });

  hits.forEach(function (hit) {
    if (hit.kind !== 'wizard') return;
    const death = simKill(match, hit.wizard);
    if (death) events.push(death);
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
  return [Object.assign({
    type: 'attack',
    kind: 'cast',
    attackerId: attacker.id,
    from: { row: attacker.row, col: attacker.col },
    row: row,
    col: col,
    element: attacker.element,
    hit: 'tile',
    pathTiles: [{ row: row, col: col }],
    trails: [],
    damage: 0
  }, attackSpellFields(attacker, 'cast')), {
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
  const events = [Object.assign({
    type: 'attack',
    kind: 'cast',
    attackerId: attacker.id,
    from: fromA,
    row: row,
    col: col,
    element: attacker.element,
    hit: other ? 'wizard' : 'tile',
    pathTiles: [],
    trails: [],
    damage: 0
  }, attackSpellFields(attacker, 'cast')), {
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

function simBurst(match, attacker, aimRow, aimCol) {
  const tiles = getBurstArea(aimRow, aimCol, attacker.burstRadius);
  const events = [];
  const dmg = attacker.castAttack;
  const pushAmt = attacker.castDisplacement;
  const trails = [];
  const hits = [];

  tiles.forEach(function (tile) {
    if (casterPaints(attacker)) {
      layTrail(match, tile.row, tile.col, attacker.element);
      if (trailAt(match, tile.row, tile.col) && trailAt(match, tile.row, tile.col).element === attacker.element) {
        trails.push({ row: tile.row, col: tile.col, element: attacker.element });
      }
    }
    const wizard = wizardAt(match, tile.row, tile.col);
    const nexus = nexusAt(match, tile.row, tile.col);
    if (wizard) hits.push({ kind: 'wizard', wizard: wizard, row: tile.row, col: tile.col });
    else if (nexus && attacker.spellHitNexus) hits.push({ kind: 'nexus', nexus: nexus, row: tile.row, col: tile.col });
  });

  events.push(Object.assign({
    type: 'attack',
    kind: 'cast',
    attackerId: attacker.id,
    from: { row: attacker.row, col: attacker.col },
    row: aimRow,
    col: aimCol,
    element: attacker.element,
    hit: hits.length ? 'burst' : 'tile',
    pathTiles: tiles.slice(),
    burstTiles: tiles.slice(),
    trails: trails,
    damage: dmg
  }, attackSpellFields(attacker, 'cast')));
  trails.forEach(function (tile) {
    events.push({ type: 'trail', row: tile.row, col: tile.col, element: tile.element });
  });

  hits.forEach(function (hit) {
    if (hit.kind === 'wizard') {
      if (dmg) events.push(stampWizardDamage(hit.wizard, dmg, 'cast', hit.row, hit.col));
      if (attacker.spellSilence) {
        applySilence(match, hit.wizard);
        events.push({
          type: 'silence',
          targetId: hit.wizard.id,
          row: hit.wizard.row,
          col: hit.wizard.col
        });
      }
      applyHitStatuses(match, attacker, hit.wizard, events);
    } else if (dmg) {
      events.push.apply(events, hurtNexus(match, hit.nexus, dmg, 'cast'));
    }
  });

  const burstShoves = hits.filter(function (hit) {
    return hit.kind === 'wizard' && hit.wizard.state === 'onboard';
  });
  burstShoves.sort(function (a, b) {
    return manhattan(aimRow, aimCol, b.row, b.col) - manhattan(aimRow, aimCol, a.row, a.col);
  });
  burstShoves.forEach(function (hit) {
    if (!pushAmt) return;
    const dir = directionBetween(aimRow, aimCol, hit.row, hit.col);
    if (!dir.dr && !dir.dc) return;
    events.push.apply(events, simPush(match, hit.wizard, dir.dr, dir.dc, pushAmt));
  });

  hits.forEach(function (hit) {
    if (hit.kind !== 'wizard') return;
    const death = simKill(match, hit.wizard);
    if (death) events.push(death);
  });

  if (!hits.length) {
    events.push({ type: 'ground', row: aimRow, col: aimCol, element: attacker.element, kind: 'cast' });
  }

  attacker.hasAttacked = true;
  return events;
}
