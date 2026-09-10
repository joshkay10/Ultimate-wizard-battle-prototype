function createWizard(match, typeId, team, spellId) {
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
    moveUndo: null
  };
  applySpellToWizard(wizard, spellById(normalizeSpellId(typeId, spellId)));
  match.wizards[id] = wizard;
  return id;
}

function seedRosters(match, playerLoadout, enemyLoadout) {
  const player = normalizeLoadout(playerLoadout);
  let i;
  for (i = 0; i < player.length; i++) createWizard(match, player[i].kit, 'player', player[i].spell);
  if (match.gameMode === 'defense') return;
  const enemy = normalizeLoadout(enemyLoadout);
  for (i = 0; i < enemy.length; i++) createWizard(match, enemy[i].kit, 'enemy', enemy[i].spell);
}

function canMove(wizard) {
  return !!(wizard && wizard.state === 'onboard' && !wizard.hasMoved);
}

function canAttack(wizard) {
  return !!(wizard && wizard.state === 'onboard' && !wizard.hasAttacked);
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

function teamHasPresence(match, team) {
  return Object.values(match.wizards).some(function (wizard) {
    return wizard.team === team && (
      wizard.state === 'onboard' ||
      wizard.state === 'summoned' ||
      wizard.state === 'portaling' ||
      wizard.state === 'emerging'
    );
  });
}

function wizardsOnTeam(match, team) {
  return Object.values(match.wizards).filter(function (wizard) {
    return wizard.team === team;
  });
}
