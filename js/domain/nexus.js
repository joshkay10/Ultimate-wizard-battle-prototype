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

function defenseNexusShapes() {
  return [
    [[0, 0], [0, 1], [1, 0]],
    [[0, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [1, 0], [1, -1]],
    [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [2, 0]]
  ];
}

function makeDefenseNexusCluster(match) {
  const rng = match.rng;
  const shapes = defenseNexusShapes();
  let attempt;
  for (attempt = 0; attempt < 40; attempt++) {
    const shape = shapes[rng ? rng.int(shapes.length) : attempt % shapes.length];
    const originRow = rng ? (4 + rng.int(4)) : 5;
    const originCol = rng ? (2 + rng.int(5)) : 4;
    const tiles = [];
    let ok = true;
    let i;
    for (i = 0; i < shape.length; i++) {
      const row = originRow + shape[i][0];
      const col = originCol + shape[i][1];
      if (!inBounds(row, col) || row < 4 || row > 7) {
        ok = false;
        break;
      }
      tiles.push({ row: row, col: col });
    }
    if (!ok) continue;
    const seen = {};
    for (i = 0; i < tiles.length; i++) {
      const key = tileKey(tiles[i].row, tiles[i].col);
      if (seen[key]) {
        ok = false;
        break;
      }
      seen[key] = true;
    }
    if (!ok) continue;
    return tiles.map(function (tile, idx) {
      return makeNexus({
        id: 'player-cluster-' + idx,
        row: tile.row,
        col: tile.col
      }, 'player', DEFENSE_NEXUS_HP);
    });
  }
  return [
    makeNexus({ id: 'player-cluster-0', row: 5, col: 3 }, 'player', DEFENSE_NEXUS_HP),
    makeNexus({ id: 'player-cluster-1', row: 5, col: 4 }, 'player', DEFENSE_NEXUS_HP),
    makeNexus({ id: 'player-cluster-2', row: 6, col: 4 }, 'player', DEFENSE_NEXUS_HP)
  ];
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
