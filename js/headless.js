function classifyMatchResult(match) {
  if (!match || match.result === 'draw' || !match.result) return 'draw';
  const loser = match.result === 'player' ? 'enemy' : 'player';
  if (teamNexusesFallen(state, loser)) return 'nexus';
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
    silenced: false,
    silenceSkip: false,
    moveUndo: null
  };
  if (extra) Object.keys(extra).forEach(function (k) { w[k] = extra[k]; });
  state.wizards[id] = w;
  return w;
}

async function runHeadlessMatch(seed, maxRounds) {
  const prev = state.fxEnabled;
  state.fxEnabled = false;
  resetMatch(state, seed);
  maxRounds = maxRounds || 40;
  let guard = 0;
  while (!state.gameOverResult && state.turnCount <= maxRounds && guard++ < 90) {
    if (state.currentTurn === 'player') {
      await runTeamAi('player');
      simEndPlayerTurn(state).forEach(function (e) { state.log.push(e); });
      if (state.gameOverResult) break;
    }
    if (state.currentTurn === 'enemy' && !state.gameOverResult) {
      await runTeamAi('enemy');
      simEndEnemyTurn(state).forEach(function (e) { state.log.push(e); });
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

  resetMatch(state, 1);
  state.mountains = {};
  state.water = {};
  const rime = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  rime.state = 'onboard';
  rime.row = 5;
  rime.col = 4;
  const emptyHit = simAttack(state, rime, 4, 4, 'melee');
  assert(emptyHit.some(e => e.type === 'ground'), 'empty melee should strike the ground');
  assert(trailAt(state, 4, 4) && trailAt(state, 4, 4).element === 'ice', 'empty melee should ice the tile');
  assert(rime.hasAttacked, 'empty melee still spends the attack');

  resetMatch(state, 1);
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
  simAttack(state, ember, 0, 6, 'melee');
  assert(gale.row === 0 && gale.col === 6, 'push into a nexus should stay put');
  assert(gale.hp === hp0 - ember.meleeAttack - CRASH_DAMAGE, 'blocked push should deal flat crash damage');
  const slammed = nexusAt(state, 0, 7);
  assert(slammed && slammed.hp === NEXUS_HP - CRASH_DAMAGE, 'pushing into a nexus damages the nexus');

  resetMatch(state, 1);
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
  simAttack(state, batter, 4, 3, 'melee');
  assert(shoved.row === 4 && shoved.col === 3, 'first wizard stops on the wizard they hit');
  assert(shoved.hp === 12 - batter.meleeAttack - CRASH_DAMAGE, 'crashed wizard takes hit plus flat crash');
  assert(wallWiz.hp === 8 - CRASH_DAMAGE, 'the wizard they hit takes the same flat crash');
  assert(wallWiz.row === 4 && wallWiz.col === 6, 'leftover knock slides the last wizard');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const chainAtk = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  const chainA = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  const chainB = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  const chainC = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'earth');
  chainAtk.state = 'onboard';
  chainAtk.row = 4;
  chainAtk.col = 1;
  chainA.state = 'onboard';
  chainA.row = 4;
  chainA.col = 2;
  chainA.hp = 12;
  chainB.state = 'onboard';
  chainB.row = 4;
  chainB.col = 3;
  chainB.hp = 8;
  chainC.state = 'onboard';
  chainC.row = 4;
  chainC.col = 4;
  chainC.hp = 14;
  simAttack(state, chainAtk, 4, 2, 'melee');
  assert(chainA.row === 4 && chainA.col === 2, 'packed first wizard stays');
  assert(chainB.row === 4 && chainB.col === 3, 'packed middle wizard stays');
  assert(chainC.row === 4 && chainC.col === 6, 'last wizard in the pile slides leftover pips');
  assert(chainA.hp === 12 - chainAtk.meleeAttack - CRASH_DAMAGE, 'first collision hurts the lead wizard');
  assert(chainB.hp === 8 - CRASH_DAMAGE - CRASH_DAMAGE, 'middle wizard is hurt by both collisions');
  assert(chainC.hp === 14 - CRASH_DAMAGE, 'final wizard takes the last crash');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const edgeAtk = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  const edgeHit = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'ice');
  edgeAtk.state = 'onboard';
  edgeAtk.row = 4;
  edgeAtk.col = BOARD_SIZE - 2;
  edgeHit.state = 'onboard';
  edgeHit.row = 4;
  edgeHit.col = BOARD_SIZE - 1;
  edgeHit.hp = 12;
  simAttack(state, edgeAtk, 4, BOARD_SIZE - 1, 'melee');
  assert(edgeHit.row === 4 && edgeHit.col === BOARD_SIZE - 1, 'arena edge does not knock them off the board');
  assert(edgeHit.hp === 12 - edgeAtk.meleeAttack - CRASH_DAMAGE, 'hitting the arena edge still deals crash');

  resetMatch(state, 1);
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
  simAttack(state, gustCrash, 4, 3, 'cast');
  assert(pinned.row === 4 && pinned.col === 3, 'gust crash does not move the target');
  assert(pinned.hp === 12 - gustCrash.castAttack - CRASH_DAMAGE, 'crash is 1 even when three pips are leftover');

  resetMatch(state, 1);
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
  simAttack(state, allyAtk, 4, 4, 'melee');
  assert(allyHit.hp < 8, 'friendly fire is allowed');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const walkerUndo = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  walkerUndo.state = 'onboard';
  walkerUndo.row = 5;
  walkerUndo.col = 4;
  walkerUndo.hasMoved = false;
  walkerUndo.hasAttacked = false;
  const undoPath = [{ row: 5, col: 5 }];
  simMove(state, walkerUndo, undoPath);
  assert(walkerUndo.row === 5 && walkerUndo.col === 5, 'move lands on the dest tile');
  assert(walkerUndo.hasMoved, 'move spends the move');
  assert(canUndoMove(walkerUndo), 'can undo a move before attacking');
  assert(teamHasMoveUndo(state, 'player'), 'team still has a pending move undo');
  simUndoMove(state, walkerUndo);
  assert(walkerUndo.row === 5 && walkerUndo.col === 4, 'undo restores the tile');
  assert(!walkerUndo.hasMoved, 'undo restores the move');
  assert(!canUndoMove(walkerUndo), 'undo is spent after undoing');

  simMove(state, walkerUndo, undoPath);
  simAttack(state, walkerUndo, 5, 6, 'cast');
  assert(!canUndoMove(walkerUndo), 'cannot undo a move after a spell');

  resetMatch(state, 1);
  state.fxEnabled = false;
  assert(state.mana === 2 && state.maxMana === 2, 'round 1 starts with 2 mana');
  assert(playerHasLegalAction(state), 'round 1 with 2 mana can open a 2-cost portal');
  const round1Kits = WIZARD_TYPES.filter(t => t.cost <= STARTING_MANA).map(t => t.id);
  assert(round1Kits.length === 1 && round1Kits[0] === 'ice', 'Rime is the only round-1 drop');
  assert(WIZARD_TYPES.find(t => t.id === 'wind').cost === 3, 'Squall costs 3');
  assert(WIZARD_TYPES.find(t => t.id === 'fire').cost === 3, 'Pyre costs 3');
  assert(WIZARD_TYPES.length === 6, 'kit pool is six');
  assert(DEFAULT_TEAM.join(',') === 'fire,ice,wind,earth', 'default team is Pyre Rime Squall Cairn');
  assert(normalizeTeam(['fire']).join(',') === 'fire,ice,wind,earth', 'short teams fill from the default');
  assert(normalizeTeam(['earth', 'lightning', 'temporal', 'fire']).join(',') === 'earth,lightning,temporal,fire', 'teams stay at four kits');
  assert(normalizeTeam(['fire', 'fire', 'fire', 'fire']).join(',') === 'fire,fire,fire,fire', 'duplicate kits are allowed');
  assert(TEAM_SIZE === 4, 'team size is four');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const walker = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  walker.state = 'onboard';
  walker.row = 7;
  walker.col = 4;
  const moves = getMoveTiles(state, walker);
  assert(moves.length > 0, 'move range should be open');
  assert(!moves.some(t => nexusAt(state, t.row, t.col)), 'move range should not include a nexus');
  assert(state.nexuses.player.length === 3 && state.nexuses.enemy.length === 3, 'each side has three nexuses');
  assert(state.nexuses.player.every(n => n.maxHp === 5), 'nexuses have 5 HP');
  assert(state.nexuses.enemy.some(n => n.row === 0 && n.col === 1), 'enemy back-west nexus');
  assert(state.nexuses.enemy.some(n => n.row === 2 && n.col === 4), 'enemy front-center nexus');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const stepper = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  stepper.state = 'onboard';
  stepper.row = 7;
  stepper.col = 3;
  assert(stepper.moveRange === 3, 'rime should move 3');
  assert(getMoveTiles(state, stepper).some(t => t.row === 4 && t.col === 3), 'rime move 3 reaches midboard from the back');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.nexuses.enemy.forEach((n, i) => { if (i < 2) n.hp = 0; });
  assert(checkWinLoss(state) === null, 'one living enemy nexus should keep the game going');
  state.nexuses.enemy[2].hp = 0;
  assert(checkWinLoss(state) === 'player', 'all enemy nexuses down is a win');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const hunter = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  hunter.state = 'onboard';
  hunter.row = 3;
  hunter.col = 4;
  const wounded = state.nexuses.enemy.find(n => n.row === 2 && n.col === 4);
  const healthy = state.nexuses.enemy.find(n => n.row === 0 && n.col === 7);
  wounded.hp = 1;
  healthy.hp = 5;
  const snipe = pickAttack(hunter, 'player');
  assert(snipe && snipe.row === 2 && snipe.col === 4, 'AI should snipe the wounded nexus');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mana = 10;
  state.mountains = {};
  state.water = {};
  const arriving = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  const opened = simSummon(state, arriving, 7, 3, 'player');
  assert(opened.length === 1 && opened[0].type === 'portal', 'summon should open a portal');
  assert(arriving.state === 'portaling', 'wizard waits in the portal');
  assert(!!portalAt(state, 7, 3), 'portal occupies the tile');
  assert(simMove(state, arriving, [{ row: 6, col: 3 }]).length === 0, 'portaling wizard cannot move');
  simEndPlayerTurn(state);
  assert(arriving.state === 'portaling', 'portal does not resolve until the owner\'s next turn');
  simEndEnemyTurn(state);
  assert(arriving.state === 'onboard', 'wizard arrives at the start of the next turn');
  assert(!portalAt(state, 7, 3), 'portal closes on arrival');
  assert(canMove(arriving) && canAttack(arriving), 'arrived wizard has no sickness');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mana = 10;
  state.mountains = {};
  state.water = {};
  const doomed = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  const blocker = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'wind');
  simSummon(state, doomed, 7, 4, 'player');
  blocker.state = 'onboard';
  blocker.row = 7;
  blocker.col = 4;
  blocker.hp = 8;
  const blocked = simResolvePortals(state, 'player');
  assert(doomed.state === 'dead', 'blocked summon dies');
  assert(blocker.state === 'dead', 'enemy standing on the portal dies');
  assert(blocked.some(e => e.type === 'portalBlocked'), 'blocked portal emits an event');
  assert(blocked.filter(e => e.type === 'death' && e.cause === 'portal').length === 2, 'both deaths are portal kills');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mana = 10;
  state.mountains = {};
  state.water = {};
  const allyIn = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  const allyOn = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  simSummon(state, allyIn, 7, 3, 'player');
  allyOn.state = 'onboard';
  allyOn.row = 7;
  allyOn.col = 3;
  const allyBlock = simResolvePortals(state, 'player');
  assert(allyIn.state === 'dead', 'incoming dies if an ally stands on the portal');
  assert(allyOn.state === 'dead', 'ally standing on the portal dies too');
  assert(allyBlock.some(e => e.type === 'portalBlocked'), 'ally contest still emits portalBlocked');

  resetMatch(state, 1);
  state.fxEnabled = false;
  const mountainKeys = Object.keys(state.mountains);
  assert(mountainKeys.length >= 4, 'mountains should generate in groups');
  state.nexuses.player.concat(state.nexuses.enemy).forEach(function (n) {
    assert(!mountainAt(state, n.row, n.col), 'no mountain on a nexus');
    assert(!waterAt(state, n.row, n.col), 'no water on a nexus');
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
      return mountainAt(state, r + d[0], c + d[1]);
    }).length;
    assert(n > 0, 'mountains should not be loners (' + k + ')');
  });
  Object.keys(state.water).forEach(function (k) {
    const p = k.split(',');
    const r = parseInt(p[0], 10);
    const c = parseInt(p[1], 10);
    const n = [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(function (d) {
      return waterAt(state, r + d[0], c + d[1]);
    }).length;
    assert(n > 0, 'water should not be loners (' + k + ')');
  });
  const scout = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  scout.state = 'onboard';
  scout.row = 7;
  scout.col = 4;
  if (mountainAt(state, scout.row, scout.col) || waterAt(state, scout.row, scout.col)) scout.col = 3;
  if (mountainAt(state, scout.row, scout.col) || waterAt(state, scout.row, scout.col)) scout.col = 5;
  const scoutMoves = getMoveTiles(state, scout);
  assert(!scoutMoves.some(t => mountainAt(state, t.row, t.col)), 'cannot walk onto mountains');
  const castsFromLane = getCastTiles(state, scout);
  assert(!castsFromLane.some(t => mountainAt(state, t.row, t.col)), 'cannot cast onto a mountain');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = { '7,5': true, '7,6': true };
  const flyer = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  flyer.state = 'onboard';
  flyer.row = 7;
  flyer.col = 4;
  const waterCast = getCastTiles(state, flyer);
  assert(waterCast.some(t => t.row === 7 && t.col === 5), 'cast can target water');
  assert(waterCast.some(t => t.row === 7 && t.col === 7), 'cast continues past water');
  assert(getMeleeTiles(state, flyer).every(t => !waterAt(state, t.row, t.col)), 'melee cannot target water');
  assert(!getMoveTiles(state, flyer).some(t => t.row === 7 && t.col === 5), 'cannot walk onto water');
  const drown = simMove(state, flyer, [{ row: 7, col: 5 }]);
  assert(flyer.state === 'dead', 'water still kills if you are forced onto it');
  assert(drown.some(e => e.type === 'death' && e.cause === 'water'), 'water death is logged');

  let waterMaps = 0;
  let dryMaps = 0;
  for (let s = 1; s <= 40; s++) {
    resetMatch(state, s);
    assertVerticalMirror(state.mountains, 'mountain seed ' + s);
    assertVerticalMirror(state.water, 'water seed ' + s);
    if (Object.keys(state.water).length) waterMaps++;
    else dryMaps++;
    assert(campsConnected(state, state.mountains, state.water), 'camps should stay connected on seed ' + s);
  }
  assert(waterMaps > 0, 'some maps should have water');
  assert(dryMaps > 0, 'some maps should be dry');

  resetMatch(state, 1);
  const mtnA = Object.keys(state.mountains).sort().join(',') + '|' + Object.keys(state.water).sort().join(',');
  resetMatch(state, 1);
  const mtnB = Object.keys(state.mountains).sort().join(',') + '|' + Object.keys(state.water).sort().join(',');
  assert(mtnA === mtnB, 'same seed should place the same terrain');

  resetMatch(state, 1);
  state.fxEnabled = false;
  const playerEls = Object.values(state.wizards).filter(w => w.team === 'player').map(w => w.element).sort();
  assert(playerEls.join(',') === 'earth,fire,ice,wind', 'roster is fire ice wind earth');
  assert(Object.values(state.wizards).filter(w => w.team === 'enemy').length === 4, 'enemy has four wizards');

  resetMatch(state, 1, { playerTeam: ['earth', 'lightning', 'temporal', 'fire'], enemyTeam: ['fire', 'ice', 'wind', 'earth'] });
  state.fxEnabled = false;
  const customEls = Object.values(state.wizards).filter(w => w.team === 'player').map(w => w.element).sort();
  assert(customEls.join(',') === 'earth,fire,lightning,temporal', 'resetMatch honors a custom player team');
  const rolledA = pickEnemyTeam(createRng(11), DEFAULT_TEAM);
  const rolledB = pickEnemyTeam(createRng(11), DEFAULT_TEAM);
  assert(rolledA.join(',') === rolledB.join(','), 'enemy team roll is seeded');
  assert(rolledA.length === TEAM_SIZE, 'enemy team is four kits');
  resetMatch(state, 4, { playerTeam: DEFAULT_TEAM, rollEnemy: true });
  assert(state.enemyTeam.length === 4, 'rolling an enemy team still fields four kits');
  const seenEnemy = {};
  let variety = 0;
  for (let s = 1; s <= 12; s++) {
    resetMatch(state, s, { playerTeam: DEFAULT_TEAM, rollEnemy: true });
    const key = state.enemyTeam.slice().sort().join(',');
    if (!seenEnemy[key]) {
      seenEnemy[key] = true;
      variety += 1;
    }
  }
  assert(variety >= 3, 'enemy teams vary across seeds');

  const fromIds = normalizeLoadout(['fire', 'ice', 'wind']);
  assert(fromIds.map(s => s.kit).join(',') === 'fire,ice,wind,earth', 'old three-kit arrays pad to four');
  assert(fromIds.map(s => s.spell).join(',') === 'stream,pulse,gust,raise', 'old team arrays keep default spells');
  assert(SPELLS.length === 18, 'spell catalog is eighteen');
  assert(spellsForElement('ice').some(s => s.id === 'blizzard'), 'ice can take blizzard');
  assert(CAST_HINT.blizzard && CAST_HINT.inferno, 'new spell hints exist');

  resetMatch(state, 1);
  state.fxEnabled = false;
  const defaultIce = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  assert(defaultIce.spellId === 'pulse' && defaultIce.castKind === 'pulse', 'default Rime still pulses');
  assert(Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire').spellId === 'stream', 'default Pyre still streams');

  resetMatch(state, 1, {
    playerLoadout: [
      { kit: 'fire', spell: 'stream' },
      { kit: 'ice', spell: 'blizzard' },
      { kit: 'wind', spell: 'gust' },
      { kit: 'earth', spell: 'raise' }
    ],
    enemyTeam: ['earth', 'lightning', 'temporal', 'fire']
  });
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.trails = {};
  const blizzardMage = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  assert(blizzardMage.spellId === 'blizzard' && blizzardMage.castKind === 'burst', 'loadout can give Rime blizzard');
  blizzardMage.state = 'onboard';
  blizzardMage.row = 4;
  blizzardMage.col = 4;
  const quakeDummy = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'earth');
  quakeDummy.state = 'onboard';
  quakeDummy.row = 4;
  quakeDummy.col = 7;
  quakeDummy.hp = 14;
  const blizzardAim = getCastTiles(state, blizzardMage);
  assert(blizzardAim.some(t => t.row === 4 && t.col === 6), 'blizzard can aim two tiles east');
  const storm = simAttack(state, blizzardMage, 4, 6, 'cast');
  assert(storm.some(e => e.type === 'attack' && e.castKind === 'burst' && e.spellId === 'blizzard'), 'blizzard is a burst');
  assert(quakeDummy.hp === 13, 'blizzard deals 1 in the 3x3');
  const frozen = [];
  let rr;
  let cc;
  for (rr = 3; rr <= 5; rr++) {
    for (cc = 5; cc <= 7; cc++) {
      const trail = trailAt(state, rr, cc);
      if (trail && trail.element === 'ice') frozen.push(rr + ',' + cc);
    }
  }
  assert(frozen.length === 9, 'blizzard freezes the whole 3x3 (' + frozen.length + ')');
  assert(!trailAt(state, 4, 4) || trailAt(state, 4, 4).element !== 'ice', 'blizzard does not freeze the caster tile outside the square');
  const frontNexus = state.nexuses.enemy.find(n => n.row === 2 && n.col === 4);
  const nexusHp = frontNexus.hp;
  blizzardMage.hasAttacked = false;
  simAttack(state, blizzardMage, 3, 4, 'cast');
  assert(frontNexus.hp === nexusHp, 'blizzard does not chip nexuses');

  resetMatch(state, 7, { playerTeam: DEFAULT_TEAM, rollEnemy: true });
  assert(state.enemyLoadout.length === 4, 'rolled enemies also have spells');
  assert(state.enemyLoadout.every(s => spellById(s.spell) && spellById(s.spell).element === kitById(s.kit).element), 'enemy spells match their element');

  resetMatch(state, 1, {
    playerLoadout: [
      { kit: 'ice', spell: 'pulse' },
      { kit: 'ice', spell: 'blizzard' },
      { kit: 'ice', spell: 'sheet' },
      { kit: 'ice', spell: 'pulse' }
    ],
    enemyTeam: ['fire', 'fire', 'wind', 'earth']
  });
  state.fxEnabled = false;
  const rimes = Object.values(state.wizards).filter(w => w.team === 'player' && w.element === 'ice');
  assert(rimes.length === 4, 'four Rimes is a legal team');
  assert(rimes.map(w => w.spellId).sort().join(',') === 'blizzard,pulse,pulse,sheet', 'duplicate kits keep their own spells');
  const enemyFires = Object.values(state.wizards).filter(w => w.team === 'enemy' && w.element === 'fire');
  assert(enemyFires.length === 2, 'enemy can roll duplicate kits');

  resetMatch(state, 1, { playerTeam: ['earth', 'lightning', 'temporal', 'fire'], enemyTeam: DEFAULT_TEAM });
  state.fxEnabled = false;
  assert(!playerHasLegalAction(state), 'round 1 with no Rime has nothing legal and auto-ends');

  resetMatch(state, 1);
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
  const pulse = simAttack(state, pulseMage, 3, 3, 'cast');
  assert(pulse.some(e => e.type === 'attack' && e.castKind === 'pulse'), 'ice cast is a pulse');
  assert(n1.hp === 10, 'pulse hits the north neighbor');
  assert(n2.hp === 6, 'pulse hits every neighbor, not just the clicked tile');
  assert(n1.row === 2 && n1.col === 3, 'pulse pushes outward');
  assert(n2.row === 4 && n2.col === 5, 'pulse pushes the east neighbor east');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.tempMountains = {};
  const earth = spawnShelved('player', 'earth', { row: 4, col: 4 });
  const walker2 = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  walker2.state = 'onboard';
  walker2.row = 4;
  walker2.col = 5;
  const raised = simAttack(state, earth, 4, 6, 'cast');
  assert(raised.some(e => e.type === 'raise'), 'earth cast raises a mountain');
  assert(mountainAt(state, 4, 6), 'raised tile is a mountain');
  assert(!getMoveTiles(state, walker2).some(t => t.row === 4 && t.col === 6), 'cannot walk onto a raised mountain');
  assert(!getCastTiles(state, walker2).some(t => t.row === 4 && t.col === 6), 'gust cannot shoot into a raised mountain');
  tickTempMountains(state);
  assert(mountainAt(state, 4, 6), 'raised mountain lasts through the next tick');
  tickTempMountains(state);
  assert(!mountainAt(state, 4, 6), 'raised mountain crumbles after a turn');

  resetMatch(state, 1);
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
  const zapped = simAttack(state, bolt, 4, 6, 'cast');
  assert(zapped.some(e => e.type === 'silence'), 'bolt silences');
  assert(victim.hp === 10, 'bolt deals 2');
  assert(victim.row === 4 && victim.col === 6, 'bolt does not push');
  assert(victim.silenced, 'victim is silenced until their next attack phase');
  resetActionFlagsFor(state, 'enemy');
  assert(!canAttack(victim), 'silenced wizard skips their next attack');
  assert(!victim.silenced, 'silence is consumed after that skip');
  resetActionFlagsFor(state, 'enemy');
  assert(canAttack(victim), 'the attack after that is free');
  assert(!zapped.some(e => e.type === 'trail'), 'bolt does not paint a trail');
  assert(!trailAt(state, 4, 5) && !trailAt(state, 4, 6), 'bolt path has no trail');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const boltMelee = spawnShelved('player', 'lightning', { row: 5, col: 4 });
  simAttack(state, boltMelee, 4, 4, 'melee');
  assert(!trailAt(state, 4, 4), 'lightning melee does not paint');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const chronoMelee = spawnShelved('player', 'temporal', { row: 5, col: 4 });
  simAttack(state, chronoMelee, 4, 4, 'melee');
  assert(!trailAt(state, 4, 4), 'temporal melee does not paint');
  assert(paintsTrail('fire') && paintsTrail('ice') && paintsTrail('wind'), 'fire ice wind paint');
  assert(!paintsTrail('lightning') && !paintsTrail('temporal') && !paintsTrail('earth'), 'bolt swap raise do not paint');

  resetMatch(state, 1);
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
  resetMatch(state, 2);
  assert(state.matchId === beforeId + 1, 'resetMatch bumps matchId');
  assert(!state.gameOverResult && state.turnCount === 1, 'resetMatch starts a fresh fight');

  resetMatch(state, 1);
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
  simAttack(state, chrono, 4, 6, 'cast');
  assert(chrono.row === 4 && chrono.col === 6, 'temporal swaps onto the target');
  assert(swapped.row === 4 && swapped.col === 4, 'the other wizard takes the old tile');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const blinker = spawnShelved('player', 'temporal', { row: 4, col: 4 });
  blinker.state = 'onboard';
  blinker.row = 4;
  blinker.col = 4;
  const blinked = simAttack(state, blinker, 4, 7, 'cast');
  assert(blinked.some(e => e.type === 'swap' && !e.bId), 'empty temporal cast is a blink');
  assert(blinker.row === 4 && blinker.col === 7, 'blink lands on the empty tile');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const gust = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  gust.state = 'onboard';
  gust.row = 7;
  gust.col = 4;
  const gustTiles = getCastTiles(state, gust);
  assert(gustTiles.some(t => t.row === 7 && t.col === 7), 'gust reaches range 3');
  assert(!gustTiles.some(t => t.row === 7 && t.col === 0), 'gust does not reach range 4');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.tempMountains = {};
  layTrail(state, 4, 4, 'fire');
  tickTrails(state);
  assert(trailAt(state, 4, 4) && trailAt(state, 4, 4).element === 'fire', 'trails last through the opponent turn');
  tickTrails(state);
  assert(!trailAt(state, 4, 4), 'trails crumble after a round');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const burned = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  burned.state = 'onboard';
  burned.row = 4;
  burned.col = 3;
  burned.hp = 12;
  layTrail(state, 4, 4, 'fire');
  simMove(state, burned, [{ row: 4, col: 4 }]);
  assert(burned.hp === 11, 'walking onto fire costs 1');
  assert(burned.row === 4 && burned.col === 4, 'fire does not block the step');

  resetMatch(state, 1);
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
  layTrail(state, 4, 5, 'ice');
  simAttack(state, batterIce, 4, 4, 'melee');
  assert(slider.row === 4 && slider.col === 7, 'push over ice does not spend a pip');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const rider = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  rider.state = 'onboard';
  rider.row = 4;
  rider.col = 4;
  layTrail(state, 4, 5, 'wind');
  simMove(state, rider, [{ row: 4, col: 5 }]);
  assert(rider.row === 4 && rider.col === 6, 'wind carries you one more tile');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = { '4,5': true };
  const lane = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  lane.state = 'onboard';
  lane.row = 4;
  lane.col = 4;
  const laneMoves = getMoveTiles(state, lane);
  assert(!laneMoves.some(t => t.row === 4 && t.col === 5), 'cannot walk onto water');
  assert(!laneMoves.some(t => t.row === 4 && t.col === 6), 'cannot path through water');

  resetMatch(state, 1);
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
  resetMatch(state, 3);
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

  resetMatch(state, 1);
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
  simAttack(state, pusher, 4, 4, 'cast');
  assert(doomedPush.state === 'dead', 'push onto water kills');
  assert(doomedPush.row == null, 'pushed wizard leaves the water tile');

  resetMatch(state, 1);
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
  openVoid(state, 4, 5);
  simAttack(state, voidShove, 4, 4, 'melee');
  assert(voidVictim.state === 'dead', 'push onto a void kills');
  assert(voidAt(state, 4, 5), 'void is still there after the fall');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.voids = {};
  const drownBlink = spawnShelved('player', 'temporal', { row: 4, col: 4 });
  state.water = { '4,6': true };
  const blink = simAttack(state, drownBlink, 4, 6, 'cast');
  assert(drownBlink.state === 'dead', 'blink onto water kills');
  assert(blink.some(e => e.type === 'death' && e.cause === 'water'), 'blink water death is logged');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.voids = {};
  const crystal = state.nexuses.enemy[0];
  crystal.hp = 1;
  const emberDrop = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  emberDrop.state = 'onboard';
  emberDrop.row = crystal.row + 1;
  emberDrop.col = crystal.col;
  if (emberDrop.row > 8) emberDrop.row = crystal.row - 1;
  simAttack(state, emberDrop, crystal.row, crystal.col, 'melee');
  assert(crystal.hp === 0, 'last nexus hit drops it');
  assert(voidAt(state, crystal.row, crystal.col), 'dead nexus becomes a void');
  assert(!nexusAt(state, crystal.row, crystal.col), 'dead nexus no longer occupies the tile');
  const holeWalker = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  holeWalker.state = 'onboard';
  holeWalker.row = crystal.row;
  holeWalker.col = crystal.col === 0 ? 1 : crystal.col - 1;
  if (wizardAt(state, holeWalker.row, holeWalker.col) && wizardAt(state, holeWalker.row, holeWalker.col).id !== holeWalker.id) {
    holeWalker.col = crystal.col + 1;
  }
  holeWalker.hasMoved = false;
  assert(!getMoveTiles(state, holeWalker).some(t => t.row === crystal.row && t.col === crystal.col), 'cannot walk onto a void');
  const fall = simMove(state, holeWalker, [{ row: crystal.row, col: crystal.col }]);
  assert(holeWalker.state === 'dead', 'void kills on enter');
  assert(fall.some(e => e.type === 'death' && e.cause === 'void'), 'void death is logged');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.tempMountains = {};
  const boltWall = spawnShelved('player', 'lightning', { row: 4, col: 4 });
  const earthWall = spawnShelved('player', 'earth', { row: 5, col: 6 });
  simAttack(state, earthWall, 4, 6, 'cast');
  const grounded = simAttack(state, boltWall, 4, 6, 'cast');
  assert(grounded.some(e => e.type === 'fizzle'), 'bolt fizzles on a raised wall');
  assert(grounded.every(e => e.type !== 'jump'), 'grounded bolt does not jump');

  resetMatch(state, 1);
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
  const jumped = simAttack(state, jumper, 4, 7, 'cast');
  assert(jumped.some(e => e.type === 'jump'), 'bolt jumps along water');
  assert(soaked.hp === 10, 'jump hits a wizard next to the water');
  assert(soaked.silenced, 'jump silence applies');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const fanner = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  fanner.state = 'onboard';
  fanner.row = 4;
  fanner.col = 4;
  layTrail(state, 4, 5, 'fire');
  simAttack(state, fanner, 4, 7, 'cast');
  assert(trailAt(state, 4, 5) && trailAt(state, 4, 5).element === 'fire', 'gust keeps fire it fans through');
  assert(trailAt(state, 4, 6) && trailAt(state, 4, 6).element === 'fire', 'gust spreads fire along the line');
  assert(trailAt(state, 4, 7) && trailAt(state, 4, 7).element === 'fire', 'gust fire reaches the end of the gust');

  resetMatch(state, 1, { gameMode: 'defense' });
  state.fxEnabled = false;
  assert(state.gameMode === 'defense', 'defense mode is explicit');
  assert(Object.values(state.wizards).filter(w => w.team === 'player').length === 4, 'defense still fields four player wizards');
  assert(Object.values(state.wizards).every(w => w.team !== 'enemy' || w.pawnKind), 'defense enemies are pawns');
  assert(defensePawns(state, ['onboard']).length >= 1, 'defense opens with pawns on the board');
  assert(defensePawns(state, ['emerging']).length >= 1, 'defense marks at least one incoming');
  assert(defensePawns(state, ['onboard']).every(w => w.intent && w.intent.dr != null), 'onboard pawns telegraph before you act');

  Object.values(state.wizards).forEach(function (w) {
    if (w.team === 'enemy') {
      w.state = 'dead';
      w.row = null;
      w.col = null;
      w.intent = null;
    }
  });
  state.mountains = {};
  state.water = {};
  state.voids = {};
  const pyre = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  pyre.state = 'onboard';
  pyre.row = 5;
  pyre.col = 4;
  pyre.hp = 10;
  const brute = createDefensePawn(state, 'melee', { state: 'onboard', row: 3, col: 4, hp: 5, maxHp: 5, intent: { kind: 'melee', dr: 1, dc: 0 } });
  simPush(state, brute, 0, 1, 1);
  assert(brute.row === 3 && brute.col === 5, 'pushing a pawn moves them');
  assert(brute.intent && brute.intent.dr === 1 && brute.intent.dc === 0, 'push keeps the telegraphed direction');
  simDefenseExecute(state);
  assert(pyre.hp === 10, 'melee still swings south from the new tile and misses');
  assert(brute.intent == null, 'intent is spent after execute');

  const charger = createDefensePawn(state, 'charge', { state: 'onboard', row: 4, col: 2, hp: 4, maxHp: 4, intent: { kind: 'charge', dr: 0, dc: 1 } });
  state.water = { '4,4': true };
  simDefenseExecute(state);
  assert(charger.state === 'dead', 'charge into water kills the pawn');
  assert((charger.row == null), 'fallen charger leaves the tile');

  state.water = {};
  state.voids = {};
  const bomber = createDefensePawn(state, 'fireball', { state: 'onboard', row: 1, col: 3, hp: 2, maxHp: 2, intent: { kind: 'fireball', dr: 1, dc: 0 } });
  pyre.hp = 10;
  pyre.row = 5;
  pyre.col = 3;
  simDefenseExecute(state);
  assert(pyre.hp === 8, 'fireball hits 4 range in the aimed direction (' + pyre.hp + ')');

  resetMatch(state, 2, { gameMode: 'defense' });
  state.fxEnabled = false;
  const before = defensePawns(state, ['emerging']).length;
  simDefenseEnemyPhase(state);
  assert(defensePawns(state, ['onboard']).every(w => w.intent), 'after the enemy loop every pawn telegraphs');
  assert(defensePawns(state, ['emerging']).length >= 1, 'waves keep streaming after execute-move-telegraph');
  assert(before >= 0, 'spawn markers existed or were placed');

  resetMatch(state, 1);
  state.fxEnabled = false;
  assert(state.gameMode === 'vs', 'resetMatch without a mode stays vs for tests');
  assert(Object.values(state.wizards).filter(w => w.team === 'enemy' && !w.pawnKind).length === 4, 'vs still rolls four enemy wizards');

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
