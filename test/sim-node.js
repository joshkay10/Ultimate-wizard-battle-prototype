const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [
  'js/constants.js',
  'js/rng.js',
  'js/state.js',
  'js/util.js',
  'js/board.js',
  'js/units.js',
  'js/sim.js',
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
