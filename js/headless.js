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
  const rime = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  rime.state = 'onboard';
  rime.row = 6;
  rime.col = 3;
  const emptyHit = simAttack(rime, 5, 3, 'melee');
  assert(emptyHit.some(e => e.type === 'ground'), 'empty melee should strike the ground');
  assert(trailAt(5, 3) && trailAt(5, 3).element === 'ice', 'empty melee should ice the tile');
  assert(rime.hasAttacked, 'empty melee still spends the attack');

  resetMatch(1);
  state.fxEnabled = false;
  const ember = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  const gale = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'wind');
  ember.state = 'onboard';
  ember.row = 0;
  ember.col = 2;
  gale.state = 'onboard';
  gale.row = 0;
  gale.col = 3;
  gale.hp = 12;
  const hp0 = gale.hp;
  simAttack(ember, 0, 3, 'melee');
  assert(gale.row === 0 && gale.col === 3, 'push into a nexus should stay put');
  assert(gale.hp === hp0 - ember.meleeAttack - 2, 'blocked push should deal collision damage');

  resetMatch(1);
  state.fxEnabled = false;
  const walker = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  walker.state = 'onboard';
  walker.row = 7;
  walker.col = 4;
  const moves = getMoveTiles(walker);
  assert(moves.length > 0, 'move range should be open');
  assert(!moves.some(t => t.row === NEXUS.mine.row && t.col === NEXUS.mine.col), 'move range should not include the nexus');

  resetMatch(1);
  state.fxEnabled = false;
  state.mana = 10;
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
  assert(!mountainAt(NEXUS.mine.row, NEXUS.mine.col), 'no mountain on player nexus');
  assert(!mountainAt(NEXUS.enemy.row, NEXUS.enemy.col), 'no mountain on enemy nexus');
  for (let r = 0; r < BOARD_SIZE; r++) {
    assert(!mountainAt(r, CENTER), 'center lane must stay open');
  }
  mountainKeys.forEach(function (k) {
    const p = k.split(',');
    const r = parseInt(p[0], 10);
    const c = parseInt(p[1], 10);
    const n = [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(function (d) {
      return mountainAt(r + d[0], c + d[1]);
    }).length;
    assert(n > 0, 'mountains should not be loners (' + k + ')');
  });
  const scout = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  scout.state = 'onboard';
  scout.row = 7;
  scout.col = 4;
  const scoutMoves = getMoveTiles(scout);
  assert(!scoutMoves.some(t => mountainAt(t.row, t.col)), 'cannot walk onto mountains');
  const castsFromLane = getCastTiles(scout);
  assert(!castsFromLane.some(t => mountainAt(t.row, t.col)), 'cannot cast onto a mountain');
  const row7Hit = mountainKeys.map(function (k) {
    const p = k.split(',');
    return { row: parseInt(p[0], 10), col: parseInt(p[1], 10) };
  }).find(t => t.row === 7);
  if (row7Hit) {
    if (row7Hit.col < CENTER) {
      assert(!castsFromLane.some(t => t.row === 7 && t.col <= row7Hit.col), 'cannot cast through a mountain');
    } else {
      assert(!castsFromLane.some(t => t.row === 7 && t.col >= row7Hit.col), 'cannot cast through a mountain');
    }
  }
  const mtnA = Object.keys(state.mountains).sort().join(',');
  resetMatch(1);
  const mtnB = Object.keys(state.mountains).sort().join(',');
  assert(mtnA === mtnB, 'same seed should place the same mountains');

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
