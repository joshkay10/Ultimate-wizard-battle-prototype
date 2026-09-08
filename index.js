seedRosters();

// Turn 1 starts with 1 mana per the ruleset (mana progression normally happens on endTurn)
state.maxMana = 1;
state.mana = 1;
state.enemyMaxMana = 1;
state.enemyMana = 1;

render();
