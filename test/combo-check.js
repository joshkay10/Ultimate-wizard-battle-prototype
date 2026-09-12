const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [
  'js/constants.js', 'js/domain/kits.js', 'js/domain/spells.js', 'js/domain/loadout.js',
  'js/domain/geo.js', 'js/rng.js', 'js/state.js', 'js/util.js', 'js/domain/occupancy.js',
  'js/domain/nexus.js', 'js/domain/trail.js', 'js/domain/terrain.js', 'js/domain/islands.js',
  'js/domain/path.js', 'js/domain/wizard.js', 'js/domain/mana.js', 'js/domain/kill.js',
  'js/domain/push.js', 'js/domain/summon.js', 'js/domain/move.js', 'js/domain/attack.js',
  'js/domain/turn-sim.js', 'js/domain/defense.js', 'js/domain/match.js', 'js/app/present.js',
  'js/log.js', 'js/ai.js', 'js/combat.js', 'js/headless.js'
];

const ctx = { console, Math, Date, JSON, Object, Array, Promise, setTimeout, parseInt, Infinity, performance: { now: () => Date.now() } };
vm.createContext(ctx);
files.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));

const scenario = `
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
`;

const out = vm.runInContext(scenario, ctx, { filename: 'combo-scenario' });
console.log(out);
const parsed = JSON.parse(out);
if (parsed.enemyDeaths < 2) { console.error('FAIL: expected >=2 enemy deaths'); process.exit(1); }
console.log('OK: combo pipeline input verified (' + parsed.enemyDeaths + ' enemy deaths from one pulse)');
