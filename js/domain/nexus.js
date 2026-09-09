function makeNexus(spec, team) {
  return {
    id: spec.id,
    team: team,
    row: spec.row,
    col: spec.col,
    hp: NEXUS_HP,
    maxHp: NEXUS_HP
  };
}

function makeNexusCamp(team) {
  return NEXUS_LAYOUT[team].map(function (spec) {
    return makeNexus(spec, team);
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
  return match.nexuses[team].every(function (nexus) {
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
