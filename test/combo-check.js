'use strict';

const vm = require('vm');
const { loadGame } = require('./load-game');

const ctx = loadGame();
const out = vm.runInContext(`
(function () {
  resetMatch(state, 12345, { gameMode: 'defense', playerLoadout: ['ice', 'ice', 'ice', 'ice'] });
  Object.values(state.wizards).forEach(function (w) { if (w.team === 'enemy') { w.state = 'dead'; w.row = null; w.col = null; } });
  for (var r = 2; r <= 6; r++) for (var c = 2; c <= 6; c++) {
    var key = r + ',' + c;
    if (state.mountains) delete state.mountains[key];
    if (state.tempMountains) delete state.tempMountains[key];
    if (state.water) delete state.water[key];
    if (state.voids) delete state.voids[key];
  }
  state.nexuses.player = state.nexuses.player.filter(function (n) { return !(n.row >= 3 && n.row <= 5 && n.col >= 3 && n.col <= 5); });
  var p = Object.values(state.wizards).find(function (w) { return w.team === 'player'; });
  p.state = 'onboard'; p.row = 4; p.col = 4; p.summoningSickness = false; p.hasMoved = false; p.hasAttacked = false;
  p.castKind = 'pulse'; p.spellId = 'pulse'; p.spellName = 'Pulse'; p.castAttack = 2; p.castDisplacement = 1; p.element = 'ice';
  [[3, 4], [5, 4], [4, 5]].forEach(function (rc) { var e = createDefensePawn(state, 'melee', { state: 'onboard', row: rc[0], col: rc[1], intent: null }); e.hp = 1; e.maxHp = 1; });
  state.currentTurn = 'player'; state.gameOverResult = null;
  var events = simAttack(state, p, 3, 4, 'cast');
  var deaths = events.filter(function (e) { return e.type === 'death'; });
  var enemyDeaths = deaths.filter(function (e) { return e.team === 'enemy'; }).length;
  return JSON.stringify({ totalEvents: events.length, deaths: deaths.length, enemyDeaths: enemyDeaths, comboWouldFire: enemyDeaths >= 2 });
})()
`, ctx, { filename: 'combo-scenario' });

console.log(out);
const parsed = JSON.parse(out);
if (parsed.enemyDeaths < 2) {
  console.error('FAIL: expected >=2 enemy deaths');
  process.exit(1);
}
console.log('OK: combo pipeline input verified (' + parsed.enemyDeaths + ' enemy deaths from one pulse)');
