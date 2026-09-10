const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [
  'js/constants.js',
  'js/domain/kits.js',
  'js/domain/spells.js',
  'js/domain/loadout.js',
  'js/domain/geo.js',
  'js/rng.js',
  'js/state.js',
  'js/util.js',
  'js/domain/occupancy.js',
  'js/domain/nexus.js',
  'js/domain/trail.js',
  'js/domain/terrain.js',
  'js/domain/path.js',
  'js/domain/wizard.js',
  'js/domain/mana.js',
  'js/domain/kill.js',
  'js/domain/push.js',
  'js/domain/summon.js',
  'js/domain/move.js',
  'js/domain/attack.js',
  'js/domain/turn-sim.js',
  'js/domain/match.js',
  'js/app/present.js',
  'js/log.js',
  'js/ai.js',
  'js/headless.js'
];

const ctx = {
  console,
  Math,
  Date,
  JSON,
  Object,
  Array,
  Promise,
  setTimeout,
  parseInt,
  Infinity,
  performance: { now: () => Date.now() }
};
vm.createContext(ctx);

files.forEach(function (file) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInContext(src, ctx, { filename: file });
});

ctx.runSimSelfTests().then(function (result) {
  console.log(JSON.stringify(result));
}).catch(function (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
