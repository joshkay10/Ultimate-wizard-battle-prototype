const ROSTER = [
  { typeId: 'fire' },
  { typeId: 'ice' },
  { typeId: 'wind' },
  { typeId: 'earth' },
  { typeId: 'lightning' },
  { typeId: 'temporal' }
];

function createWizard(typeId, team) {
  const type = WIZARD_TYPES.find(t => t.id === typeId);
  const id = 'w' + (state.nextId++);
  state.wizards[id] = {
    id,
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
    state: 'summoned', // not on board
    row: null,
    col: null,
    hasMoved: false,
    hasAttacked: false,
    summoningSickness: false,
    silenced: false
  };
  return id;
}

function seedRosters() {
  ROSTER.forEach(r => createWizard(r.typeId, 'player'));
  ROSTER.forEach(r => createWizard(r.typeId, 'enemy'));
}
