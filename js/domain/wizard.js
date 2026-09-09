function createWizard(match, typeId, team) {
  const type = kitById(typeId);
  const id = 'w' + (match.nextId++);
  match.wizards[id] = {
    id: id,
    name: type.name,
    element: type.element,
    castKind: type.castKind,
    castRange: type.castRange,
    moveRange: type.moveRange,
    hp: type.hp,
    maxHp: type.hp,
    cost: type.cost,
    meleeAttack: type.meleeAttack,
    meleeDisplacement: type.meleeDisplacement,
    castAttack: type.castAttack,
    castDisplacement: type.castDisplacement,
    team: team || 'player',
    state: 'summoned',
    row: null,
    col: null,
    hasMoved: false,
    hasAttacked: false,
    summoningSickness: false,
    silenced: false
  };
  return id;
}

function seedRosters(match, playerTeam, enemyTeam) {
  const player = normalizeTeam(playerTeam);
  const enemy = normalizeTeam(enemyTeam);
  let i;
  for (i = 0; i < player.length; i++) createWizard(match, player[i], 'player');
  for (i = 0; i < enemy.length; i++) createWizard(match, enemy[i], 'enemy');
}

function canMove(wizard) {
  return !!(wizard && wizard.state === 'onboard' && !wizard.hasMoved);
}

function canAttack(wizard) {
  return !!(wizard && wizard.state === 'onboard' && !wizard.hasAttacked);
}

function resetActionFlagsFor(match, team) {
  Object.values(match.wizards).forEach(function (wizard) {
    if (wizard.state === 'onboard' && wizard.team === team) {
      wizard.hasMoved = false;
      wizard.summoningSickness = false;
      if (wizard.silenced) {
        wizard.hasAttacked = true;
        wizard.silenced = false;
      } else {
        wizard.hasAttacked = false;
      }
    }
  });
}

function applySilence(match, wizard) {
  if (!wizard || wizard.state !== 'onboard') return;
  if (wizard.team === match.currentTurn && !wizard.hasAttacked) {
    wizard.hasAttacked = true;
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
      wizard.state === 'portaling'
    );
  });
}

function wizardsOnTeam(match, team) {
  return Object.values(match.wizards).filter(function (wizard) {
    return wizard.team === team;
  });
}
