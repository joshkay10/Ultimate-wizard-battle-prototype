import { WIZARD_TYPES, BOARD_SIZE, ENEMY_ROW_END } from './constants.js';
import { state } from './state.js';
import { nexusAt } from './board.js';
import { shuffle } from './util.js';

export const ROSTER = [
  { typeId: 'fire' }, { typeId: 'ice' }, { typeId: 'wind' },
  { typeId: 'fire' }, { typeId: 'ice' }, { typeId: 'wind' }
];

export function createWizard(typeId, team) {
  const type = WIZARD_TYPES.find(t => t.id === typeId);
  const id = 'w' + (state.nextId++);
  state.wizards[id] = {
    id,
    name: type.name,
    element: type.element,
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
    hasAttacked: false
  };
  return id;
}

export function seedRoster() {
  ROSTER.forEach(r => createWizard(r.typeId, 'player'));
}

export function spawnRandomEnemies() {
  const occupied = new Set();
  const elementPool = shuffle(['fire', 'ice', 'wind']);

  // Split the 9 columns into 3 bands so each of the 3 enemies lands in a different third
  // of the row, then pick a random free row+column within that band — avoids the visual
  // clustering that pure uniform-random-across-all-tiles can produce.
  const bandWidth = Math.ceil(BOARD_SIZE / 3);
  const bands = shuffle([0, 1, 2]);

  for (let i = 0; i < 3; i++) {
    const typeId = elementPool[i];
    const bandIndex = bands[i];
    const colStart = bandIndex * bandWidth;
    const colEnd = Math.min(BOARD_SIZE, colStart + bandWidth);

    const candidates = [];
    for (let r = 0; r < ENEMY_ROW_END; r++) {
      for (let c = colStart; c < colEnd; c++) {
        const key = r + ',' + c;
        if (!occupied.has(key) && !nexusAt(r, c)) candidates.push({ row: r, col: c });
      }
    }
    if (!candidates.length) continue; // band full/blocked, skip rather than crash

    const tile = candidates[Math.floor(Math.random() * candidates.length)];
    const id = createWizard(typeId, 'enemy');
    const w = state.wizards[id];
    w.state = 'onboard';
    w.row = tile.row;
    w.col = tile.col;
    occupied.add(tile.row + ',' + tile.col);
  }
}
