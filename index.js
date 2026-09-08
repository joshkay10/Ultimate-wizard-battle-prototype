import { state } from './js/state.js';
import { seedRoster, spawnRandomEnemies } from './js/units.js';
import { render } from './js/ui.js';

seedRoster();
spawnRandomEnemies();

// Turn 1 starts with 1 mana per the ruleset (mana progression normally happens on endTurn)
state.maxMana = 1;
state.mana = 1;

render();
