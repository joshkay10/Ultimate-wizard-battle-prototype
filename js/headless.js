function classifyMatchResult(match) {
  if (!match || match.result === 'draw' || !match.result) return 'draw';
  const loser = match.result === 'player' ? 'enemy' : 'player';
  if (teamNexusesFallen(loser)) return 'nexus';
  const hazardDeath = (match.log || []).some(function (e) {
    return e.type === 'death' && e.team === loser && (e.cause === 'void' || e.cause === 'water');
  });
  if (hazardDeath) return 'void';
  return 'wipe';
}

async function runAiVsAiBatch(opts) {
  opts = opts || {};
  const games = opts.games || 20;
  const startSeed = opts.startSeed || 1;
  const maxRounds = opts.maxRounds || 30;
  const brain = opts.brain || 'hunter';
  const prevBrain = state.aiBrain;
  const prevFx = state.fxEnabled;
  state.aiBrain = brain;
  state.fxEnabled = false;
  const stats = {
    games: 0,
    player: 0,
    enemy: 0,
    draw: 0,
    nexus: 0,
    wipe: 0,
    void: 0,
    rounds: 0,
    waterDeaths: 0,
    voidDeaths: 0,
    brain: brain
  };
  for (let i = 0; i < games; i++) {
    const m = await runHeadlessMatch(startSeed + i, maxRounds);
    stats.games += 1;
    stats.rounds += m.rounds;
    if (m.result === 'player') stats.player += 1;
    else if (m.result === 'enemy') stats.enemy += 1;
    else stats.draw += 1;
    const kind = classifyMatchResult(m);
    if (kind === 'nexus') stats.nexus += 1;
    else if (kind === 'wipe') stats.wipe += 1;
    else if (kind === 'void') stats.void += 1;
    (m.log || []).forEach(function (e) {
      if (e.type === 'death' && e.cause === 'water') stats.waterDeaths += 1;
      if (e.type === 'death' && e.cause === 'void') stats.voidDeaths += 1;
    });
  }
  stats.avgRounds = stats.games ? Math.round((stats.rounds / stats.games) * 10) / 10 : 0;
  stats.playerWinRate = stats.games ? Math.round((stats.player / stats.games) * 1000) / 1000 : 0;
  // Player always takes the first turn.
  stats.firstPlayer = stats.player;
  stats.firstPlayerWinRate = stats.playerWinRate;
  state.aiBrain = prevBrain;
  state.fxEnabled = prevFx;
  return stats;
}

function spawnShelved(team, kind, extra) {
  const kits = {
    earth: { name: 'Earth', element: 'earth', castKind: 'raise', moveRange: 2, hp: 14, cost: 4, meleeAttack: 4, meleeDisplacement: 1, castAttack: 0, castDisplacement: 0, castRange: 2 },
    lightning: { name: 'Lightning', element: 'lightning', castKind: 'bolt', moveRange: 3, hp: 9, cost: 3, meleeAttack: 3, meleeDisplacement: 1, castAttack: 2, castDisplacement: 0, castRange: 4 },
    temporal: { name: 'Temporal', element: 'temporal', castKind: 'swap', moveRange: 3, hp: 9, cost: 4, meleeAttack: 3, meleeDisplacement: 1, castAttack: 0, castDisplacement: 0, castRange: 3 }
  };
  const spec = kits[kind];
  const id = 'w' + (state.nextId++);
  const w = {
    id: id,
    name: spec.name,
    element: spec.element,
    castKind: spec.castKind,
    castRange: spec.castRange,
    moveRange: spec.moveRange,
    hp: spec.hp,
    maxHp: spec.hp,
    cost: spec.cost,
    meleeAttack: spec.meleeAttack,
    meleeDisplacement: spec.meleeDisplacement,
    castAttack: spec.castAttack,
    castDisplacement: spec.castDisplacement,
    team: team,
    state: 'onboard',
    row: 4,
    col: 4,
    hasMoved: false,
    hasAttacked: false,
    summoningSickness: false,
    silenced: false
  };
  if (extra) Object.keys(extra).forEach(function (k) { w[k] = extra[k]; });
  state.wizards[id] = w;
  return w;
}

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
  assert(gale.hp === hp0 - ember.meleeAttack - CRASH_DAMAGE, 'blocked push should deal flat crash damage');
  const slammed = nexusAt(0, 7);
  assert(slammed && slammed.hp === NEXUS_HP - CRASH_DAMAGE, 'pushing into a nexus damages the nexus');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const batter = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  const shoved = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  const wallWiz = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'wind');
  batter.state = 'onboard';
  batter.row = 4;
  batter.col = 2;
  shoved.state = 'onboard';
  shoved.row = 4;
  shoved.col = 3;
  shoved.hp = 12;
  wallWiz.state = 'onboard';
  wallWiz.row = 4;
  wallWiz.col = 4;
  wallWiz.hp = 8;
  simAttack(batter, 4, 3, 'melee');
  assert(shoved.row === 4 && shoved.col === 3, 'crash into a wizard should stop the push');
  assert(shoved.hp === 12 - batter.meleeAttack - CRASH_DAMAGE, 'crashed wizard takes hit plus flat crash');
  assert(wallWiz.hp === 8 - CRASH_DAMAGE, 'the wizard they hit takes the same flat crash');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = { '4,4': true };
  state.water = {};
  const gustCrash = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  const pinned = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'ice');
  gustCrash.state = 'onboard';
  gustCrash.row = 4;
  gustCrash.col = 2;
  pinned.state = 'onboard';
  pinned.row = 4;
  pinned.col = 3;
  pinned.hp = 12;
  simAttack(gustCrash, 4, 3, 'cast');
  assert(pinned.row === 4 && pinned.col === 3, 'gust crash does not move the target');
  assert(pinned.hp === 12 - gustCrash.castAttack - CRASH_DAMAGE, 'crash is 1 even when three pips are leftover');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const allyAtk = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  const allyHit = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  allyAtk.state = 'onboard';
  allyAtk.row = 5;
  allyAtk.col = 4;
  allyHit.state = 'onboard';
  allyHit.row = 4;
  allyHit.col = 4;
  allyHit.hp = 8;
  simAttack(allyAtk, 4, 4, 'melee');
  assert(allyHit.hp < 8, 'friendly fire is allowed');

  resetMatch(1);
  state.fxEnabled = false;
  assert(state.mana === 2 && state.maxMana === 2, 'round 1 starts with 2 mana');
  assert(playerHasLegalAction(), 'round 1 with 2 mana can open a 2-cost portal');
  const round1Kits = WIZARD_TYPES.filter(t => t.cost <= STARTING_MANA).map(t => t.id);
  assert(round1Kits.length === 1 && round1Kits[0] === 'ice', 'Rime is the only round-1 drop');
  assert(WIZARD_TYPES.find(t => t.id === 'wind').cost === 3, 'Squall costs 3');
  assert(WIZARD_TYPES.find(t => t.id === 'fire').cost === 3, 'Pyre costs 3');
  assert(WIZARD_TYPES.length === 3, 'roster is three kits');

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
  assert(NEXUS.player.length === 3 && NEXUS.enemy.length === 3, 'each side has three nexuses');
  assert(NEXUS.player.every(n => n.maxHp === 5), 'nexuses have 5 HP');
  assert(NEXUS.enemy.some(n => n.row === 0 && n.col === 1), 'enemy back-west nexus');
  assert(NEXUS.enemy.some(n => n.row === 2 && n.col === 4), 'enemy front-center nexus');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const stepper = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  stepper.state = 'onboard';
  stepper.row = 7;
  stepper.col = 3;
  assert(stepper.moveRange === 3, 'rime should move 3');
  assert(getMoveTiles(stepper).some(t => t.row === 4 && t.col === 3), 'rime move 3 reaches midboard from the back');

  resetMatch(1);
  state.fxEnabled = false;
  NEXUS.enemy.forEach((n, i) => { if (i < 2) n.hp = 0; });
  assert(checkWinLoss() === null, 'one living enemy nexus should keep the game going');
  NEXUS.enemy[2].hp = 0;
  assert(checkWinLoss() === 'player', 'all enemy nexuses down is a win');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const hunter = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  hunter.state = 'onboard';
  hunter.row = 3;
  hunter.col = 4;
  const wounded = NEXUS.enemy.find(n => n.row === 2 && n.col === 4);
  const healthy = NEXUS.enemy.find(n => n.row === 0 && n.col === 7);
  wounded.hp = 1;
  healthy.hp = 5;
  const snipe = pickAttack(hunter, 'player');
  assert(snipe && snipe.row === 2 && snipe.col === 4, 'AI should snipe the wounded nexus');

  resetMatch(1);
  state.fxEnabled = false;
  state.mana = 10;
  state.mountains = {};
  state.water = {};
  const arriving = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  const opened = simSummon(arriving, 7, 3, 'player');
  assert(opened.length === 1 && opened[0].type === 'portal', 'summon should open a portal');
  assert(arriving.state === 'portaling', 'wizard waits in the portal');
  assert(!!portalAt(7, 3), 'portal occupies the tile');
  assert(simMove(arriving, [{ row: 6, col: 3 }]).length === 0, 'portaling wizard cannot move');
  simEndPlayerTurn();
  assert(arriving.state === 'portaling', 'portal does not resolve until the owner\'s next turn');
  simEndEnemyTurn();
  assert(arriving.state === 'onboard', 'wizard arrives at the start of the next turn');
  assert(!portalAt(7, 3), 'portal closes on arrival');
  assert(canMove(arriving) && canAttack(arriving), 'arrived wizard has no sickness');

  resetMatch(1);
  state.fxEnabled = false;
  state.mana = 10;
  state.mountains = {};
  state.water = {};
  const doomed = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  const blocker = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'wind');
  simSummon(doomed, 7, 4, 'player');
  blocker.state = 'onboard';
  blocker.row = 7;
  blocker.col = 4;
  blocker.hp = 8;
  const blocked = simResolvePortals('player');
  assert(doomed.state === 'dead', 'blocked summon dies');
  assert(blocker.state === 'dead', 'enemy standing on the portal dies');
  assert(blocked.some(e => e.type === 'portalBlocked'), 'blocked portal emits an event');
  assert(blocked.filter(e => e.type === 'death' && e.cause === 'portal').length === 2, 'both deaths are portal kills');

  resetMatch(1);
  state.fxEnabled = false;
  state.mana = 10;
  state.mountains = {};
  state.water = {};
  const allyIn = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  const allyOn = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  simSummon(allyIn, 7, 3, 'player');
  allyOn.state = 'onboard';
  allyOn.row = 7;
  allyOn.col = 3;
  const allyBlock = simResolvePortals('player');
  assert(allyIn.state === 'dead', 'incoming dies if an ally stands on the portal');
  assert(allyOn.state === 'dead', 'ally standing on the portal dies too');
  assert(allyBlock.some(e => e.type === 'portalBlocked'), 'ally contest still emits portalBlocked');

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
  assert(getMoveTiles(flyer).some(t => t.row === 7 && t.col === 5), 'can step onto water');
  const drown = simMove(flyer, [{ row: 7, col: 5 }]);
  assert(flyer.state === 'dead', 'water kills on enter');
  assert(drown.some(e => e.type === 'death' && e.cause === 'water'), 'water death is logged');

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

  resetMatch(1);
  state.fxEnabled = false;
  const playerEls = Object.values(state.wizards).filter(w => w.team === 'player').map(w => w.element).sort();
  assert(playerEls.join(',') === 'fire,ice,wind', 'roster is fire ice wind');
  assert(Object.values(state.wizards).filter(w => w.team === 'enemy').length === 3, 'enemy has three wizards');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.tempMountains = {};
  const pulseMage = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  const n1 = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'fire');
  const n2 = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'wind');
  pulseMage.state = 'onboard';
  pulseMage.row = 4;
  pulseMage.col = 3;
  n1.state = 'onboard';
  n1.row = 3;
  n1.col = 3;
  n1.hp = 12;
  n2.state = 'onboard';
  n2.row = 4;
  n2.col = 4;
  n2.hp = 8;
  const pulse = simAttack(pulseMage, 3, 3, 'cast');
  assert(pulse.some(e => e.type === 'attack' && e.castKind === 'pulse'), 'ice cast is a pulse');
  assert(n1.hp === 10, 'pulse hits the north neighbor');
  assert(n2.hp === 6, 'pulse hits every neighbor, not just the clicked tile');
  assert(n1.row === 2 && n1.col === 3, 'pulse pushes outward');
  assert(n2.row === 4 && n2.col === 5, 'pulse pushes the east neighbor east');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.tempMountains = {};
  const earth = spawnShelved('player', 'earth', { row: 4, col: 4 });
  const walker2 = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  walker2.state = 'onboard';
  walker2.row = 4;
  walker2.col = 5;
  const raised = simAttack(earth, 4, 6, 'cast');
  assert(raised.some(e => e.type === 'raise'), 'earth cast raises a mountain');
  assert(mountainAt(4, 6), 'raised tile is a mountain');
  assert(!getMoveTiles(walker2).some(t => t.row === 4 && t.col === 6), 'cannot walk onto a raised mountain');
  assert(!getCastTiles(walker2).some(t => t.row === 4 && t.col === 6), 'gust cannot shoot into a raised mountain');
  tickTempMountains();
  assert(mountainAt(4, 6), 'raised mountain lasts through the next tick');
  tickTempMountains();
  assert(!mountainAt(4, 6), 'raised mountain crumbles after a turn');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const bolt = spawnShelved('player', 'lightning', { row: 4, col: 4 });
  const victim = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'ice');
  bolt.state = 'onboard';
  bolt.row = 4;
  bolt.col = 4;
  victim.state = 'onboard';
  victim.row = 4;
  victim.col = 6;
  victim.hp = 12;
  const zapped = simAttack(bolt, 4, 6, 'cast');
  assert(zapped.some(e => e.type === 'silence'), 'bolt silences');
  assert(victim.hp === 10, 'bolt deals 2');
  assert(victim.row === 4 && victim.col === 6, 'bolt does not push');
  assert(victim.silenced, 'victim is silenced until their next attack phase');
  resetActionFlagsFor('enemy');
  assert(!canAttack(victim), 'silenced wizard skips their next attack');
  assert(!victim.silenced, 'silence is consumed after that skip');
  resetActionFlagsFor('enemy');
  assert(canAttack(victim), 'the attack after that is free');
  assert(!zapped.some(e => e.type === 'trail'), 'bolt does not paint a trail');
  assert(!trailAt(4, 5) && !trailAt(4, 6), 'bolt path has no trail');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const boltMelee = spawnShelved('player', 'lightning', { row: 5, col: 4 });
  simAttack(boltMelee, 4, 4, 'melee');
  assert(!trailAt(4, 4), 'lightning melee does not paint');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const chronoMelee = spawnShelved('player', 'temporal', { row: 5, col: 4 });
  simAttack(chronoMelee, 4, 4, 'melee');
  assert(!trailAt(4, 4), 'temporal melee does not paint');
  assert(paintsTrail('fire') && paintsTrail('ice') && paintsTrail('wind'), 'fire ice wind paint');
  assert(!paintsTrail('lightning') && !paintsTrail('temporal') && !paintsTrail('earth'), 'bolt swap raise do not paint');

  resetMatch(1);
  state.fxEnabled = false;
  const iceLog = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  const portalLine = describeEvent({ type: 'portal', wizardId: iceLog.id, row: 8, col: 4 });
  assert(portalLine.indexOf('Rime opens a portal') !== -1 && portalLine.indexOf('arrives next turn') !== -1, 'portal log names the wizard and next turn');
  assert(describeEvent({ type: 'summon', wizardId: iceLog.id, row: 8, col: 4 }) === 'Rime arrives', 'summon log says arrives');
  const streamLine = describeEvent({
    type: 'attack',
    kind: 'cast',
    castKind: 'stream',
    attackerId: Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire').id,
    from: { row: 8, col: 4 },
    row: 5,
    col: 4
  });
  assert(streamLine.indexOf('streams') !== -1 && streamLine.indexOf('north') !== -1, 'stream log names direction');
  const blinkLine = describeEvent({
    type: 'swap',
    aId: spawnShelved('player', 'temporal').id,
    fromA: { row: 4, col: 4 },
    toA: { row: 4, col: 7 }
  });
  assert(blinkLine.indexOf('blinks') !== -1, 'empty swap log is a blink');
  assert(CAST_HINT.stream && CAST_HINT.swap && CAST_HINT.bolt, 'cast hints exist');
  const beforeId = state.matchId;
  resetMatch(2);
  assert(state.matchId === beforeId + 1, 'resetMatch bumps matchId');
  assert(!state.gameOverResult && state.turnCount === 1, 'resetMatch starts a fresh fight');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const chrono = spawnShelved('player', 'temporal', { row: 4, col: 4 });
  const swapped = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'fire');
  chrono.state = 'onboard';
  chrono.row = 4;
  chrono.col = 4;
  swapped.state = 'onboard';
  swapped.row = 4;
  swapped.col = 6;
  simAttack(chrono, 4, 6, 'cast');
  assert(chrono.row === 4 && chrono.col === 6, 'temporal swaps onto the target');
  assert(swapped.row === 4 && swapped.col === 4, 'the other wizard takes the old tile');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const blinker = spawnShelved('player', 'temporal', { row: 4, col: 4 });
  blinker.state = 'onboard';
  blinker.row = 4;
  blinker.col = 4;
  const blinked = simAttack(blinker, 4, 7, 'cast');
  assert(blinked.some(e => e.type === 'swap' && !e.bId), 'empty temporal cast is a blink');
  assert(blinker.row === 4 && blinker.col === 7, 'blink lands on the empty tile');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const gust = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  gust.state = 'onboard';
  gust.row = 7;
  gust.col = 4;
  const gustTiles = getCastTiles(gust);
  assert(gustTiles.some(t => t.row === 7 && t.col === 7), 'gust reaches range 3');
  assert(!gustTiles.some(t => t.row === 7 && t.col === 0), 'gust does not reach range 4');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.tempMountains = {};
  layTrail(4, 4, 'fire');
  tickTrails();
  assert(trailAt(4, 4) && trailAt(4, 4).element === 'fire', 'trails last through the opponent turn');
  tickTrails();
  assert(!trailAt(4, 4), 'trails crumble after a round');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const burned = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  burned.state = 'onboard';
  burned.row = 4;
  burned.col = 3;
  burned.hp = 12;
  layTrail(4, 4, 'fire');
  simMove(burned, [{ row: 4, col: 4 }]);
  assert(burned.hp === 11, 'walking onto fire costs 1');
  assert(burned.row === 4 && burned.col === 4, 'fire does not block the step');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const batterIce = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  const slider = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  batterIce.state = 'onboard';
  batterIce.row = 4;
  batterIce.col = 3;
  slider.state = 'onboard';
  slider.row = 4;
  slider.col = 4;
  slider.hp = 12;
  layTrail(4, 5, 'ice');
  simAttack(batterIce, 4, 4, 'melee');
  assert(slider.row === 4 && slider.col === 7, 'push over ice does not spend a pip');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const rider = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  rider.state = 'onboard';
  rider.row = 4;
  rider.col = 4;
  layTrail(4, 5, 'wind');
  simMove(rider, [{ row: 4, col: 5 }]);
  assert(rider.row === 4 && rider.col === 6, 'wind carries you one more tile');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = { '4,5': true };
  const lane = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  lane.state = 'onboard';
  lane.row = 4;
  lane.col = 4;
  const laneMoves = getMoveTiles(lane);
  assert(laneMoves.some(t => t.row === 4 && t.col === 5), 'water is a legal last step');
  assert(!laneMoves.some(t => t.row === 4 && t.col === 6), 'cannot path through water');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const chronoAi = spawnShelved('player', 'temporal', { row: 5, col: 4 });
  const nexBlink = swapScore(chronoAi, { row: 2, col: 4 }, 'player');
  assert(nexBlink < 80, 'temporal does not greed a nexus-adjacent blink (' + nexBlink + ')');
  state.water = { '4,4': true };
  chronoAi.row = 5;
  chronoAi.col = 4;
  assert(swapScore(chronoAi, { row: 4, col: 4 }, 'player') === 0, 'temporal will not blink onto water');

  assert(AI_BRAINS.hunter && AI_BRAINS.noop, 'AI brains can be swapped by name');
  const prevBrain = state.aiBrain;
  state.aiBrain = 'noop';
  resetMatch(3);
  state.fxEnabled = false;
  await runTeamAi('player');
  const portaled = Object.values(state.wizards).some(w => w.team === 'player' && w.state === 'portaling');
  assert(!portaled, 'noop brain does not summon');
  state.aiBrain = prevBrain;

  const batch = await runAiVsAiBatch({ games: 8, startSeed: 20, maxRounds: 20, brain: 'hunter' });
  assert(batch.games === 8, 'batch runs the asked number of games');
  assert(batch.player + batch.enemy + batch.draw === 8, 'batch results add up');
  assert(batch.firstPlayer === batch.player, 'player is the first-turn side');
  assert(batch.nexus + batch.wipe + batch.void + batch.draw === 8, 'batch classifies each game');
  assert(typeof batch.playerWinRate === 'number', 'batch reports a win rate');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.voids = {};
  const pusher = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  const doomedPush = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'ice');
  pusher.state = 'onboard';
  pusher.row = 4;
  pusher.col = 3;
  doomedPush.state = 'onboard';
  doomedPush.row = 4;
  doomedPush.col = 4;
  doomedPush.hp = 12;
  state.water = { '4,5': true, '4,6': true };
  simAttack(pusher, 4, 4, 'cast');
  assert(doomedPush.state === 'dead', 'push onto water kills');
  assert(doomedPush.row == null, 'pushed wizard leaves the water tile');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.voids = {};
  const voidShove = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  const voidVictim = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'ice');
  voidShove.state = 'onboard';
  voidShove.row = 4;
  voidShove.col = 3;
  voidVictim.state = 'onboard';
  voidVictim.row = 4;
  voidVictim.col = 4;
  voidVictim.hp = 12;
  openVoid(4, 5);
  simAttack(voidShove, 4, 4, 'melee');
  assert(voidVictim.state === 'dead', 'push onto a void kills');
  assert(voidAt(4, 5), 'void is still there after the fall');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.voids = {};
  const drownBlink = spawnShelved('player', 'temporal', { row: 4, col: 4 });
  state.water = { '4,6': true };
  const blink = simAttack(drownBlink, 4, 6, 'cast');
  assert(drownBlink.state === 'dead', 'blink onto water kills');
  assert(blink.some(e => e.type === 'death' && e.cause === 'water'), 'blink water death is logged');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.voids = {};
  const crystal = NEXUS.enemy[0];
  crystal.hp = 1;
  const emberDrop = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  emberDrop.state = 'onboard';
  emberDrop.row = crystal.row + 1;
  emberDrop.col = crystal.col;
  if (emberDrop.row > 8) emberDrop.row = crystal.row - 1;
  simAttack(emberDrop, crystal.row, crystal.col, 'melee');
  assert(crystal.hp === 0, 'last nexus hit drops it');
  assert(voidAt(crystal.row, crystal.col), 'dead nexus becomes a void');
  assert(!nexusAt(crystal.row, crystal.col), 'dead nexus no longer occupies the tile');
  const holeWalker = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  holeWalker.state = 'onboard';
  holeWalker.row = crystal.row;
  holeWalker.col = crystal.col === 0 ? 1 : crystal.col - 1;
  if (wizardAt(holeWalker.row, holeWalker.col) && wizardAt(holeWalker.row, holeWalker.col).id !== holeWalker.id) {
    holeWalker.col = crystal.col + 1;
  }
  holeWalker.hasMoved = false;
  const fall = simMove(holeWalker, [{ row: crystal.row, col: crystal.col }]);
  assert(holeWalker.state === 'dead', 'void kills on enter');
  assert(fall.some(e => e.type === 'death' && e.cause === 'void'), 'void death is logged');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.tempMountains = {};
  const boltWall = spawnShelved('player', 'lightning', { row: 4, col: 4 });
  const earthWall = spawnShelved('player', 'earth', { row: 5, col: 6 });
  simAttack(earthWall, 4, 6, 'cast');
  const grounded = simAttack(boltWall, 4, 6, 'cast');
  assert(grounded.some(e => e.type === 'fizzle'), 'bolt fizzles on a raised wall');
  assert(grounded.every(e => e.type !== 'jump'), 'grounded bolt does not jump');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = { '4,5': true, '4,6': true };
  const jumper = spawnShelved('player', 'lightning', { row: 4, col: 4 });
  const soaked = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'ice');
  jumper.state = 'onboard';
  jumper.row = 4;
  jumper.col = 4;
  soaked.state = 'onboard';
  soaked.row = 3;
  soaked.col = 6;
  soaked.hp = 12;
  const jumped = simAttack(jumper, 4, 7, 'cast');
  assert(jumped.some(e => e.type === 'jump'), 'bolt jumps along water');
  assert(soaked.hp === 10, 'jump hits a wizard next to the water');
  assert(soaked.silenced, 'jump silence applies');

  resetMatch(1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const fanner = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  fanner.state = 'onboard';
  fanner.row = 4;
  fanner.col = 4;
  layTrail(4, 5, 'fire');
  simAttack(fanner, 4, 7, 'cast');
  assert(trailAt(4, 5) && trailAt(4, 5).element === 'fire', 'gust keeps fire it fans through');
  assert(trailAt(4, 6) && trailAt(4, 6).element === 'fire', 'gust spreads fire along the line');
  assert(trailAt(4, 7) && trailAt(4, 7).element === 'fire', 'gust fire reaches the end of the gust');

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
