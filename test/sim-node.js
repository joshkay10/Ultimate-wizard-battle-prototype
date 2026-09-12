const { loadGame, GAME_SCRIPTS } = require('./load-game');

const ctx = loadGame(GAME_SCRIPTS.tests);

ctx.runSimSelfTests().then(function (result) {
  console.log(JSON.stringify(result));
}).catch(function (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
