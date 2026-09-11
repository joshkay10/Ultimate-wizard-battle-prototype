function makeNexus(spec, team, hp) {
  hp = hp == null ? NEXUS_HP : hp;
  return {
    id: spec.id,
    team: team,
    row: spec.row,
    col: spec.col,
    hp: hp,
    maxHp: hp
  };
}

function makeNexusCamp(team, hp) {
  return NEXUS_LAYOUT[team].map(function (spec) {
    return makeNexus(spec, team, hp);
  });
}

function defenseNexusCellOk(row, col, used) {
  if (!inBounds(row, col)) return false;
  if (row < 3 || row > 7) return false;
  if (used && used[tileKey(row, col)]) return false;
  return true;
}

function growDefenseNexusBlob(match, size, used) {
  const rng = match.rng;
  let attempt;
  for (attempt = 0; attempt < 50; attempt++) {
    const originRow = rng ? (4 + rng.int(4)) : 5;
    const originCol = rng ? (1 + rng.int(7)) : 4;
    if (!defenseNexusCellOk(originRow, originCol, used)) continue;
    const body = [{ row: originRow, col: originCol }];
    const local = {};
    local[tileKey(originRow, originCol)] = true;
    let guard = 0;
    while (body.length < size && guard++ < 48) {
      const from = body[rng ? rng.int(body.length) : 0];
      const opts = [];
      CARDINALS.forEach(function (d) {
        const nr = from.row + d[0];
        const nc = from.col + d[1];
        if (!defenseNexusCellOk(nr, nc, used)) return;
        if (local[tileKey(nr, nc)]) return;
        opts.push({ row: nr, col: nc });
      });
      if (!opts.length) break;
      const next = opts[rng ? rng.int(opts.length) : 0];
      local[tileKey(next.row, next.col)] = true;
      body.push(next);
    }
    if (body.length === size) return body;
  }
  return null;
}

function fallbackDefenseNexusTiles() {
  return [
    { row: 5, col: 3 },
    { row: 5, col: 4 },
    { row: 6, col: 4 }
  ];
}

function makeDefenseNexusCluster(match) {
  const rng = match.rng;
  const min = typeof DEFENSE_NEXUS_MIN === 'number' ? DEFENSE_NEXUS_MIN : 3;
  const max = typeof DEFENSE_NEXUS_MAX === 'number' ? DEFENSE_NEXUS_MAX : 6;
  const count = rng ? (min + rng.int(max - min + 1)) : min;
  const used = {};
  let tiles = [];
  const twoBlobs = !!(rng && count >= 5 && rng.next() < 0.42);
  if (twoBlobs) {
    const sizeA = 2 + rng.int(count - 3);
    const sizeB = count - sizeA;
    const blobA = growDefenseNexusBlob(match, sizeA, used);
    if (blobA) {
      blobA.forEach(function (t) {
        used[tileKey(t.row, t.col)] = true;
        tiles.push(t);
      });
    }
    const blobB = growDefenseNexusBlob(match, sizeB, used);
    if (blobB) {
      blobB.forEach(function (t) { tiles.push(t); });
    }
  } else {
    const blob = growDefenseNexusBlob(match, count, used);
    if (blob) tiles = blob;
  }
  if (tiles.length < min) tiles = fallbackDefenseNexusTiles();
  return tiles.map(function (tile, idx) {
    return makeNexus({
      id: 'player-cluster-' + idx,
      row: tile.row,
      col: tile.col
    }, 'player', DEFENSE_NEXUS_HP);
  });
}

function allNexuses(match) {
  return match.nexuses.player.concat(match.nexuses.enemy);
}

function eachNexus(match, fn) {
  allNexuses(match).forEach(fn);
}

function livingNexuses(match, team) {
  return match.nexuses[team].filter(function (nexus) {
    return nexus.hp > 0;
  });
}

function teamNexusesFallen(match, team) {
  const list = (match.nexuses && match.nexuses[team]) || [];
  if (!list.length) return false;
  return list.every(function (nexus) {
    return nexus.hp <= 0;
  });
}

function nexusAt(match, row, col) {
  const list = allNexuses(match);
  let i;
  for (i = 0; i < list.length; i++) {
    const nexus = list[i];
    if (nexus.hp > 0 && nexus.row === row && nexus.col === col) return nexus;
  }
  return null;
}

function nexusById(match, id) {
  const list = allNexuses(match);
  let i;
  for (i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

function nearNexus(match, row, col) {
  const list = allNexuses(match);
  let i;
  for (i = 0; i < list.length; i++) {
    if (manhattan(row, col, list[i].row, list[i].col) <= 1) return true;
  }
  return false;
}

function hurtNexus(match, nexus, amount, cause) {
  const events = [];
  if (!nexus || nexus.hp <= 0) return events;
  nexus.hp = Math.max(0, nexus.hp - amount);
  events.push({
    type: 'damage',
    targetKind: 'nexus',
    targetId: nexus.id,
    amount: amount,
    row: nexus.row,
    col: nexus.col,
    cause: cause
  });
  if (nexus.hp <= 0) {
    openVoid(match, nexus.row, nexus.col);
    events.push({
      type: 'void',
      row: nexus.row,
      col: nexus.col,
      nexusId: nexus.id,
      team: nexus.team
    });
  }
  return events;
}
