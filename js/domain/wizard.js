function createWizard(match, typeId, team, spellId, specialId) {
  const type = kitById(typeId);
  const id = 'w' + (match.nextId++);
  const wizard = {
    id: id,
    name: type.name,
    element: type.element,
    moveRange: type.moveRange,
    hp: type.hp,
    maxHp: type.hp,
    cost: type.cost,
    meleeAttack: type.meleeAttack,
    meleeDisplacement: type.meleeDisplacement,
    team: team || 'player',
    state: 'summoned',
    row: null,
    col: null,
    hasMoved: false,
    hasAttacked: false,
    summoningSickness: false,
    silenced: false,
    silenceSkip: false,
    moveUndo: null,
    activeSpell: 'basic'
  };
  applySpellToWizard(wizard, spellById(normalizeSpellId(typeId, spellId)));
  wizard.basicSpellId = wizard.spellId;
  // Only the player fields a paid special for now; enemies cast their one spell freely.
  if ((team || 'player') === 'player' && specialId) {
    wizard.specialSpellId = normalizeSpecialSpellId(typeId, specialId);
    wizard.specialCost = specialCostOf(wizard.specialSpellId);
  } else {
    wizard.specialSpellId = null;
    wizard.specialCost = 0;
  }
  match.wizards[id] = wizard;
  return id;
}

function seedRosters(match, playerLoadout, enemyLoadout) {
  const player = normalizeLoadout(playerLoadout, { pad: false });
  if (!player.length) return;
  let i;
  for (i = 0; i < player.length; i++) createWizard(match, player[i].kit, 'player', player[i].spell, player[i].special);
  if (match.gameMode === 'defense') return;
  const enemy = normalizeLoadout(enemyLoadout, { pad: false });
  for (i = 0; i < enemy.length; i++) createWizard(match, enemy[i].kit, 'enemy', enemy[i].spell);
}

function vsDeployTiles(match, team) {
  const tiles = [];
  const last = BOARD_SIZE - 1;
  const cols = [0, 2, 4, 6, 3, 1, 5];
  const rows = team === 'player' ? [last, last - 1, SUMMON_ROW_START] : [0, 1, ENEMY_ROW_END - 1];
  let r;
  let i;
  for (r = 0; r < rows.length; r++) {
    for (i = 0; i < cols.length; i++) {
      const row = rows[r];
      const col = cols[i];
      if (!inBounds(row, col)) continue;
      if (isBlocked(match, row, col) || hazardAt(match, row, col)) continue;
      tiles.push({ row: row, col: col });
    }
  }
  return tiles;
}

function seedVsOpening(match) {
  if (!match || match.gameMode !== 'vs') return;
  const byId = function (a, b) {
    return parseInt(a.id.slice(1), 10) - parseInt(b.id.slice(1), 10);
  };
  function deploy(team, count) {
    const list = wizardsOnTeam(match, team).sort(byId);
    const tiles = vsDeployTiles(match, team);
    const n = Math.min(count, list.length, tiles.length);
    let i;
    for (i = 0; i < n; i++) {
      list[i].state = 'onboard';
      list[i].row = tiles[i].row;
      list[i].col = tiles[i].col;
      list[i].hasMoved = false;
      list[i].hasAttacked = false;
      list[i].summoningSickness = false;
    }
    for (; i < list.length; i++) list[i].state = 'summoned';
  }
  const field = typeof VS_FIELD_START === 'number' ? VS_FIELD_START : 4;
  deploy('player', field);
  deploy('enemy', wizardsOnTeam(match, 'enemy').length);
}

function drawVsWizard(match, team) {
  if (!match || match.gameMode !== 'vs') return null;
  const next = wizardsOnTeam(match, team)
    .filter(function (w) { return w.state === 'bench'; })
    .sort(function (a, b) {
      return parseInt(a.id.slice(1), 10) - parseInt(b.id.slice(1), 10);
    })[0];
  if (!next) return null;
  next.state = 'summoned';
  return next;
}

function canMove(wizard) {
  return !!(wizard && wizard.state === 'onboard' && !wizard.hasMoved && !wizard.summoningSickness && !wizard.rooted);
}

function canAttack(wizard) {
  return !!(wizard && wizard.state === 'onboard' && !wizard.hasAttacked && !wizard.summoningSickness && !wizard.rooted);
}

function clearMoveUndo(wizard) {
  if (wizard) wizard.moveUndo = null;
}

function teamHasMoveUndo(match, team) {
  return Object.values(match.wizards).some(function (wizard) {
    return wizard.team === team && canUndoMove(wizard);
  });
}

function resetActionFlagsFor(match, team) {
  Object.values(match.wizards).forEach(function (wizard) {
    if (wizard.state === 'onboard' && wizard.team === team) {
      wizard.hasMoved = false;
      wizard.summoningSickness = false;
      wizard.moveUndo = null;
      if (wizard.rooted) wizard.rooted = false;
      if (wizard.silenced) {
        wizard.hasAttacked = true;
        wizard.silenceSkip = true;
        wizard.silenced = false;
      } else {
        wizard.hasAttacked = false;
        wizard.silenceSkip = false;
      }
    }
  });
}

function applySilence(match, wizard) {
  if (!wizard || wizard.state !== 'onboard') return;
  if (wizard.team === match.currentTurn && !wizard.hasAttacked) {
    wizard.hasAttacked = true;
    wizard.silenceSkip = true;
    wizard.silenced = false;
    return;
  }
  wizard.silenced = true;
}

function tickBurn(match, wizard) {
  const events = [];
  if (!wizard || wizard.state !== 'onboard' || !wizard.burn) return events;
  const amount = wizard.burn;
  wizard.burn = 0;
  wizard.hp -= amount;
  events.push({
    type: 'damage',
    targetKind: 'wizard',
    targetId: wizard.id,
    amount: amount,
    row: wizard.row,
    col: wizard.col,
    cause: 'burn'
  });
  const death = simKill(match, wizard);
  if (death) events.push(death);
  return events;
}

function tickBurnsForTeam(match, team) {
  const events = [];
  if (isDefenseMode(match) && team === 'enemy') return events;
  Object.values(match.wizards).forEach(function (wizard) {
    if (wizard.team !== team || wizard.state !== 'onboard') return;
    events.push.apply(events, tickBurn(match, wizard));
  });
  return events;
}

function teamHasPresence(match, team) {
  return Object.values(match.wizards).some(function (wizard) {
    return wizard.team === team && (
      wizard.state === 'onboard' ||
      wizard.state === 'summoned' ||
      wizard.state === 'portaling' ||
      wizard.state === 'emerging' ||
      wizard.state === 'bench'
    );
  });
}

function wizardsOnTeam(match, team) {
  return Object.values(match.wizards).filter(function (wizard) {
    return wizard.team === team;
  });
}
