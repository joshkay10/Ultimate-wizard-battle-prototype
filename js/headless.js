async function runHeadlessMatch(seed, maxRounds) {
  const prev = state.fxEnabled;
  state.fxEnabled = false;
  resetMatch(seed);
  maxRounds = maxRounds || 40;
  let guard = 0;
  while (!state.gameOverResult && state.turnCount <= maxRounds && guard++ < 90) {
    if (state.currentTurn === 'player') {
      await runTeamAi('player');
      simEndPlayerTurn().forEach(function (e) { state.log.push(e); });
      if (state.gameOverResult) break;
    }
    if (state.currentTurn === 'enemy' && !state.gameOverResult) {
      await runTeamAi('enemy');
      simEndEnemyTurn().forEach(function (e) { state.log.push(e); });
    }
  }
  state.fxEnabled = prev;
  return {
    result: state.gameOverResult,
    rounds: state.turnCount,
    seed: state.seed,
    log: state.log.slice()
  };
}

async function runSimSelfTests() {
  const fails = [];
  function assert(cond, msg) {
    if (!cond) fails.push(msg);
  }

  const a = createRng(42);
  const b = createRng(42);
  assert(a.next() === b.next(), 'rng is not deterministic');

  const prevFx = state.fxEnabled;
  state.fxEnabled = false;

  resetMatch(1);
  state.mountains = {};
  state.water = {};
  const rime = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  rime.state = 'onboard';
  rime.row = 5;
  rime.col = 4;
  const emptyHit = simAttack(rime, 4, 4, 'melee');
  assert(emptyHit.some(e => e.type === 'ground'), 'empty melee should strike the ground');
  assert(trailAt(4, 4) && trailAt(4, 4).element === 'ice', 'empty melee should ice the tile');
  assert(rime.hasAttacked, 'empty melee still spends the attack');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const ember = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  const gale = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'wind');
  ember.state = 'onboard';
  ember.row = 0;
  ember.col = 5;
  gale.state = 'onboard';
  gale.row = 0;
  gale.col = 6;
  gale.hp = 12;
  const hp0 = gale.hp;
  simAttack(ember, 0, 6, 'melee');
  assert(gale.row === 0 && gale.col === 6, 'push into a nexus should stay put');
  assert(gale.hp === hp0 - ember.meleeAttack - 2, 'blocked push should deal collision damage');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const walker = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  walker.state = 'onboard';
  walker.row = 7;
  walker.col = 4;
  const moves = getMoveTiles(walker);
  assert(moves.length > 0, 'move range should be open');
  assert(!moves.some(t => nexusAt(t.row, t.col)), 'move range should not include a nexus');
  assert(NEXUS.player.length === 4 && NEXUS.enemy.length === 4, 'each side has four nexuses');
  assert(NEXUS.player.every(n => n.maxHp === 5), 'nexuses have 5 HP');
  assert(NEXUS.enemy.some(n => n.row === 0 && n.col === 1), 'enemy back-west nexus');
  assert(NEXUS.enemy.some(n => n.row === 2 && n.col === 5), 'enemy front-east nexus');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const stepper = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  stepper.state = 'onboard';
  stepper.row = 7;
  stepper.col = 4;
  assert(stepper.moveRange === 3, 'rime should move 3');
  assert(getMoveTiles(stepper).some(t => t.row === 4 && t.col === 4), 'rime move 3 reaches midboard from the back');

  resetMatch(1);
  state.fxEnabled = false;
  NEXUS.enemy.forEach((n, i) => { if (i < 3) n.hp = 0; });
  assert(checkWinLoss() === null, 'one living enemy nexus should keep the game going');
  NEXUS.enemy[3].hp = 0;
  assert(checkWinLoss() === 'player', 'all enemy nexuses down is a win');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const hunter = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  hunter.state = 'onboard';
  hunter.row = 2;
  hunter.col = 4;
  const wounded = NEXUS.enemy.find(n => n.row === 2 && n.col === 3);
  const healthy = NEXUS.enemy.find(n => n.row === 2 && n.col === 5);
  wounded.hp = 1;
  healthy.hp = 5;
  const snipe = pickAttack(hunter, 'player');
  assert(snipe && snipe.row === 2 && snipe.col === 3, 'AI should snipe the wounded nexus');

  resetMatch(1);
  state.fxEnabled = false;
  state.mana = 10;
  state.mountains = {};
  state.water = {};
  const sick = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  const placed = simSummon(sick, 7, 3, 'player');
  assert(placed.length === 1, 'summon should succeed');
  assert(sick.summoningSickness, 'new summon should have sickness');
  assert(simMove(sick, [{ row: 6, col: 3 }]).length === 0, 'sick wizard cannot move');
  assert(simAttack(sick, 6, 3, 'melee').length === 0, 'sick wizard cannot attack');
  resetActionFlagsFor('player');
  assert(!sick.summoningSickness && canMove(sick) && canAttack(sick), 'sickness clears next turn');

  resetMatch(1);
  state.fxEnabled = false;
  const mountainKeys = Object.keys(state.mountains);
  assert(mountainKeys.length >= 4, 'mountains should generate in groups');
  NEXUS.player.concat(NEXUS.enemy).forEach(function (n) {
    assert(!mountainAt(n.row, n.col), 'no mountain on a nexus');
    assert(!waterAt(n.row, n.col), 'no water on a nexus');
  });
  function assertVerticalMirror(map, label) {
    Object.keys(map).forEach(function (k) {
      const p = k.split(',');
      const r = parseInt(p[0], 10);
      const c = parseInt(p[1], 10);
      const mirror = map[(BOARD_SIZE - 1 - r) + ',' + c];
      assert(!!mirror, label + ' at ' + k + ' should be vertically mirrored');
    });
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const a = !!map[r + ',' + c];
        const b = !!map[(BOARD_SIZE - 1 - r) + ',' + c];
        assert(a === b, 'top/bottom 3 rows of ' + label + ' must match columns');
      }
    }
  }
  assertVerticalMirror(state.mountains, 'mountain');
  assertVerticalMirror(state.water, 'water');
  mountainKeys.forEach(function (k) {
    const p = k.split(',');
    const r = parseInt(p[0], 10);
    const c = parseInt(p[1], 10);
    const n = [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(function (d) {
      return mountainAt(r + d[0], c + d[1]);
    }).length;
    assert(n > 0, 'mountains should not be loners (' + k + ')');
  });
  Object.keys(state.water).forEach(function (k) {
    const p = k.split(',');
    const r = parseInt(p[0], 10);
    const c = parseInt(p[1], 10);
    const n = [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(function (d) {
      return waterAt(r + d[0], c + d[1]);
    }).length;
    assert(n > 0, 'water should not be loners (' + k + ')');
  });
  const scout = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  scout.state = 'onboard';
  scout.row = 7;
  scout.col = 4;
  if (mountainAt(scout.row, scout.col) || waterAt(scout.row, scout.col)) scout.col = 3;
  if (mountainAt(scout.row, scout.col) || waterAt(scout.row, scout.col)) scout.col = 5;
  const scoutMoves = getMoveTiles(scout);
  assert(!scoutMoves.some(t => mountainAt(t.row, t.col)), 'cannot walk onto mountains');
  assert(!scoutMoves.some(t => waterAt(t.row, t.col)), 'cannot walk onto water');
  const castsFromLane = getCastTiles(scout);
  assert(!castsFromLane.some(t => mountainAt(t.row, t.col)), 'cannot cast onto a mountain');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = { '7,5': true, '7,6': true };
  const flyer = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  flyer.state = 'onboard';
  flyer.row = 7;
  flyer.col = 4;
  const waterCast = getCastTiles(flyer);
  assert(waterCast.some(t => t.row === 7 && t.col === 5), 'cast can target water');
  assert(waterCast.some(t => t.row === 7 && t.col === 7), 'cast continues past water');
  assert(getMeleeTiles(flyer).every(t => !waterAt(t.row, t.col)), 'melee cannot target water');
  assert(!getMoveTiles(flyer).some(t => waterAt(t.row, t.col)), 'cannot walk onto water');

  let waterMaps = 0;
  let dryMaps = 0;
  for (let s = 1; s <= 40; s++) {
    resetMatch(s);
    assertVerticalMirror(state.mountains, 'mountain seed ' + s);
    assertVerticalMirror(state.water, 'water seed ' + s);
    if (Object.keys(state.water).length) waterMaps++;
    else dryMaps++;
    assert(campsConnected(state.mountains, state.water), 'camps should stay connected on seed ' + s);
  }
  assert(waterMaps > 0, 'some maps should have water');
  assert(dryMaps > 0, 'some maps should be dry');

  resetMatch(1);
  const mtnA = Object.keys(state.mountains).sort().join(',') + '|' + Object.keys(state.water).sort().join(',');
  resetMatch(1);
  const mtnB = Object.keys(state.mountains).sort().join(',') + '|' + Object.keys(state.water).sort().join(',');
  assert(mtnA === mtnB, 'same seed should place the same terrain');

  const m1 = await runHeadlessMatch(99, 25);
  const m2 = await runHeadlessMatch(99, 25);
  assert(m1.result === m2.result, 'same seed should same winner (' + m1.result + ' vs ' + m2.result + ')');
  assert(
    m1.log.map(e => e.type).join(',') === m2.log.map(e => e.type).join(','),
    'same seed should same event log'
  );

  state.fxEnabled = prevFx;
  if (fails.length) throw new Error(fails.join('\n'));
  return { ok: true, sample: { result: m1.result, rounds: m1.rounds, events: m1.log.length } };
}
