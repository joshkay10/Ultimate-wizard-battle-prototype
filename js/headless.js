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
  assert(gale.hp === hp0 - ember.meleeAttack - 2, 'blocked 2-pip push smashes for leftover 2');
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
  assert(shoved.hp === 12 - batter.meleeAttack - 2, 'crashed wizard takes hit plus leftover smash');
  assert(wallWiz.hp === 8 - 2, 'the wizard they hit takes the same smash');
  assert(wallWiz.row === 4 && wallWiz.col === 6, 'leftover knock slides the last wizard');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const chainAtk = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  const chainA = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  const chainB = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  const chainC = spawnShelved('player', 'earth', { row: 4, col: 4, hp: 14, maxHp: 14 });
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
  simAttack(state, chainAtk, 4, 2, 'melee');
  assert(chainA.row === 4 && chainA.col === 2, 'packed first wizard stays');
  assert(chainB.row === 4 && chainB.col === 3, 'packed middle wizard stays');
  assert(chainC.row === 4 && chainC.col === 6, 'last wizard in the pile slides leftover pips');
  assert(chainA.hp === 12 - chainAtk.meleeAttack - 2, 'first collision smashes leftover 2 into the lead wizard');
  assert(chainB.hp === 8 - 2 - 2, 'middle wizard is smashed by both collisions');
  assert(chainC.hp === 14 - 2, 'final wizard takes the last smash');

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
  assert(edgeHit.hp === 12 - edgeAtk.meleeAttack - 2, 'hitting the arena edge smashes leftover pips');

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
  assert(pinned.hp === 12 - gustCrash.castAttack - 3, 'leftover gust pips smash instead of a flat 1');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = { '4,5': true };
  state.water = {};
  const bumpAtk = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  const bumpHit = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'ice');
  bumpAtk.state = 'onboard';
  bumpAtk.row = 4;
  bumpAtk.col = 2;
  bumpHit.state = 'onboard';
  bumpHit.row = 4;
  bumpHit.col = 3;
  bumpHit.hp = 12;
  simAttack(state, bumpAtk, 4, 3, 'melee');
  assert(bumpHit.row === 4 && bumpHit.col === 4, 'one free tile still slides');
  assert(bumpHit.hp === 12 - bumpAtk.meleeAttack - 1, 'a one-pip leftover crash stays 1');

  resetMatch(state, 1, { gameMode: 'defense' });
  state.fxEnabled = false;
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
  state.nexuses.player = [
    makeNexus({ id: 'player-cluster-0', row: 8, col: 0 }, 'player', DEFENSE_NEXUS_HP),
    makeNexus({ id: 'player-cluster-1', row: 8, col: 1 }, 'player', DEFENSE_NEXUS_HP),
    makeNexus({ id: 'player-cluster-2', row: 7, col: 0 }, 'player', DEFENSE_NEXUS_HP)
  ];
  state.nexuses.enemy = [];
  const overkillPyre = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  overkillPyre.state = 'onboard';
  overkillPyre.row = 4;
  overkillPyre.col = 2;
  overkillPyre.hasMoved = true;
  const overkillPawn = createDefensePawn(state, 'melee', {
    state: 'onboard', row: 4, col: 3, hp: 3, maxHp: 3, intent: null
  });
  const overkillHit = simAttack(state, overkillPyre, 4, 3, 'melee');
  const overkillDmg = overkillHit.find(function (e) { return e.type === 'damage' && e.targetId === overkillPawn.id && e.cause === 'melee'; });
  assert(overkillDmg && overkillDmg.overkill === 2, '5 into 3 pops 2 overkill');
  assert(overkillPawn.state === 'dead', 'overkill still kills');
  assert(overkillHit.some(function (e) { return e.type === 'push' && e.wizardId === overkillPawn.id && e.path && e.path.length === 2; }), 'overkill still slams the body');

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
  assert(DEFAULT_TEAM.join(',') === 'fire,ice,wind,ice', 'default team is Pyre Rime Squall Rime');
  assert(normalizeTeam(['fire']).join(',') === 'fire,ice,wind,ice', 'short teams fill from the default');
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
  await runTeamAi('enemy');
  simEndEnemyTurn(state);
  assert(arriving.state === 'onboard', 'wizard arrives at the start of the next turn');
  assert(!portalAt(state, 7, 3), 'portal closes on arrival');
  assert(arriving.summoningSickness, 'arrived wizard has summoning sickness');
  assert(!canMove(arriving) && !canAttack(arriving), 'sickness blocks move and attack');
  simEndPlayerTurn(state);
  simEndEnemyTurn(state);
  assert(!arriving.summoningSickness, 'sickness clears on the following player turn');
  assert(canMove(arriving) && canAttack(arriving), 'after sickness they can act');

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
  assert(playerEls.join(',') === 'fire,ice,ice,wind', 'roster is Pyre Rime Rime Squall');
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
  assert(fromIds.map(s => s.kit).join(',') === 'fire,ice,wind,ice', 'old three-kit arrays pad to four');
  assert(fromIds.map(s => s.spell).join(',') === 'stream,pulse,gust,pulse', 'old team arrays keep default spells');
  const rolledPlayable = pickEnemyTeam(createRng(3), DEFAULT_TEAM);
  assert(rolledPlayable.every(function (id) { return kitPlayable(id); }), 'enemy rolls only from the live kits');
  const mixed = randomPlayableLoadout(createRng(9));
  assert(mixed.length === TEAM_SIZE && mixed.every(function (s) { return kitPlayable(s.kit); }), 'randomize stays in Pyre Rime Squall');
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
  assert(defensePawns(state, ['onboard']).length >= 1 && defensePawns(state, ['onboard']).length <= 2, 'defense opens with 1-2 pawns on the board');
  assert(defensePawns(state, ['emerging']).length === 0, 'turn 1 has no incoming spawn marks');
  assert(defensePawns(state, ['onboard']).every(w => !w.intent), 'opening pawns have no telegraph yet');
  simDefenseEnemyPhase(state);
  assert(defensePawns(state, ['emerging']).length <= 1, 'first incoming is at most one hole');
  assert(defensePawns(state, ['onboard', 'emerging']).length <= DEFENSE_PAWN_CAP, 'the board never opens at the old five-body crush');
  defensePawns(state, ['onboard']).forEach(function (w) {
    if (!w.intent) return;
    assert(defenseShotScore(state, w, w.row, w.col, w.intent.dr, w.intent.dc) > 0, 'opening telegraphs hit a wizard or the city');
  });
  assert(state.nexuses.enemy.length === 0, 'defense has no enemy nexuses');
  assert(state.nexuses.player.length >= DEFENSE_NEXUS_MIN && state.nexuses.player.length <= DEFENSE_NEXUS_MAX, 'defense city size varies');
  assert(state.nexuses.player.every(n => n.hp === 2 && n.maxHp === 2), 'defense nexuses have 2 HP');
  assert(state.nexuses.player.every(n => n.row >= 3 && n.row <= 7), 'cluster stays off the far spawn edge');
  assert(!state.nexuses.player.some(n => n.row === 8 && (n.col === 1 || n.col === 7)), 'cluster is not the old back-wing spread');
  function packedBlobs(list) {
    if (list.length <= 1) return true;
    const keys = {};
    list.forEach(function (n) { keys[tileKey(n.row, n.col)] = true; });
    return list.every(function (n) {
      return CARDINALS.some(function (d) {
        return keys[tileKey(n.row + d[0], n.col + d[1])];
      });
    });
  }
  assert(packedBlobs(state.nexuses.player), 'defense nexuses sit in packed city blobs');
  assert(state.mapId && state.mapName, 'defense names the island');

  const islandIds = {};
  let waterTouchesCity = 0;
  let islandSeed;
  for (islandSeed = 1; islandSeed <= 48; islandSeed++) {
    resetMatch(state, islandSeed, { gameMode: 'defense' });
    assert(state.mapId && state.mapName, 'every seed names the island');
    islandIds[state.mapId] = true;
    assert(packedBlobs(state.nexuses.player), 'island city stays packed on seed ' + islandSeed);
    assert(campsConnected(state, state.mountains, state.water), 'island stays walkable on seed ' + islandSeed);
    assert(state.nexuses.player.every(function (n) {
      return n.row >= 3 && n.row <= 7;
    }), 'island city stays off the far spawn edge');
    state.nexuses.player.forEach(function (n) {
      CARDINALS.forEach(function (d) {
        if (waterAt(state, n.row + d[0], n.col + d[1])) waterTouchesCity += 1;
      });
    });
  }
  assert(Object.keys(islandIds).length >= 4, 'islands vary across seeds (' + Object.keys(islandIds).join(',') + ')');
  assert(waterTouchesCity >= 1, 'some islands put water against the city');
  assert(!teamNexusesFallen(state, 'enemy'), 'an empty enemy camp is not a fallen camp');
  assert(checkWinLoss(state) === null, 'defense does not win just because there are no enemy crystals');
  assert(defensePawns(state, ['onboard']).length > 0, 'opening pawns still keep the fight going');

  const citySizes = {};
  const openOnboard = {};
  let flankIncoming = false;
  let seed;
  for (seed = 1; seed <= 36; seed++) {
    resetMatch(state, seed, { gameMode: 'defense' });
    citySizes[state.nexuses.player.length] = true;
    openOnboard[defensePawns(state, ['onboard']).length] = true;
    assert(defensePawns(state, ['emerging']).length === 0, 'no seed opens with incoming marks');
    simDefenseEnemyPhase(state);
    state.turnCount += 1;
    simDefenseEnemyPhase(state);
    if (defensePawns(state, ['emerging']).some(function (w) {
      return w.col === 0 || w.col === BOARD_SIZE - 1 || w.row >= ENEMY_ROW_END;
    })) flankIncoming = true;
  }
  assert(Object.keys(citySizes).length >= 2, 'nexus count varies across maps');
  assert(Object.keys(openOnboard).length >= 2, 'opening onboard count varies');
  assert(Object.keys(openOnboard).every(function (n) { return n === '1' || n === '2'; }), 'opening onboard is only 1 or 2');
  assert(flankIncoming, 'incoming after the first enemy loop can use edges');

  let asym = false;
  for (seed = 1; seed <= 40 && !asym; seed++) {
    resetMatch(state, seed, { gameMode: 'defense' });
    [state.mountains, state.water].forEach(function (map) {
      Object.keys(map).forEach(function (k) {
        const p = k.split(',');
        const r = parseInt(p[0], 10);
        const c = parseInt(p[1], 10);
        if (!map[(BOARD_SIZE - 1 - r) + ',' + c]) asym = true;
      });
    });
  }
  assert(asym, 'defense terrain is not forced to a vertical mirror');

  resetMatch(state, 1, { gameMode: 'defense' });
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.voids = {};
  simDefenseEnemyPhase(state);
  if (!defensePawns(state, ['emerging']).length) {
    state.turnCount += 1;
    simDefenseEnemyPhase(state);
  }
  const incoming = defensePawns(state, ['emerging'])[0];
  assert(incoming && incoming.row != null, 'incoming marker has a tile after an enemy loop');
  assert(!canSummonAt(state, incoming.row, incoming.col, 'player'), 'cannot drop on an emerging pawn');
  const midTiles = getPlayerSummonTiles(state).filter(function (t) { return t.row < SUMMON_ROW_START; });
  assert(midTiles.length > 0, 'defense can drop outside the back 3 rows');
  const frontTiles = getPlayerSummonTiles(state).filter(function (t) { return t.row < ENEMY_ROW_END; });
  assert(frontTiles.length > 0, 'defense can drop in the enemy spawn rows');
  Object.values(state.wizards).forEach(function (w) {
    if (w.team === 'enemy') {
      w.state = 'dead';
      w.row = null;
      w.col = null;
      w.intent = null;
    }
  });
  state.nexuses.player = [
    makeNexus({ id: 'player-cluster-0', row: 8, col: 0 }, 'player', DEFENSE_NEXUS_HP),
    makeNexus({ id: 'player-cluster-1', row: 8, col: 1 }, 'player', DEFENSE_NEXUS_HP),
    makeNexus({ id: 'player-cluster-2', row: 7, col: 0 }, 'player', DEFENSE_NEXUS_HP)
  ];
  state.nexuses.enemy = [];
  const dropper = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  const burstTarget = createDefensePawn(state, 'melee', { state: 'onboard', row: 3, col: 5, hp: 5, maxHp: 5 });
  const drop = simSummon(state, dropper, 3, 4, 'player');
  assert(drop.some(e => e.type === 'summon'), 'defense summon emits summon, not a portal');
  assert(!drop.some(e => e.type === 'portal'), 'defense summon skips the portal delay');
  assert(drop.some(e => e.castKind === 'summonBurst' && e.damage === 0), 'landing fires a damage-free burst');
  assert(dropper.state === 'onboard' && dropper.row === 3 && dropper.col === 4, 'wizard lands immediately');
  assert(dropper.summoningSickness, 'dropped wizard has summoning sickness');
  assert(!canMove(dropper) && !canAttack(dropper), 'sickness blocks the rest of the turn');
  assert(!portalAt(state, 3, 4), 'no portal token on an instant drop');
  assert(burstTarget.col === 6, 'burst pushes a neighbor away with no damage (' + burstTarget.col + ')');
  assert(burstTarget.hp === 5, 'burst does not deal damage');
  assert(!canSummonAt(state, 8, 0, 'player'), 'still cannot drop on a nexus');

  state.nexuses.player.forEach(function (n) { n.hp = 0; });
  assert(checkWinLoss(state) === 'enemy', 'defense loses when the cluster falls');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  assert(!canSummonAt(state, 3, 4, 'player'), 'vs still cannot summon mid-board');

  resetMatch(state, 1, {
    gameMode: 'defense',
    playerLoadout: [
      { kit: 'fire', spell: 'stream' },
      { kit: 'fire', spell: 'inferno' },
      { kit: 'wind', spell: 'gust' },
      { kit: 'wind', spell: 'draft' }
    ]
  });
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.voids = {};
  const enemyNear = {};
  Object.values(state.wizards).forEach(function (w) {
    if (w.team !== 'enemy' || w.row == null) return;
    let dr;
    let dc;
    for (dr = -1; dr <= 1; dr++) {
      for (dc = -1; dc <= 1; dc++) enemyNear[(w.row + dr) + ',' + (w.col + dc)] = true;
    }
  });
  const dropTiles = getPlayerSummonTiles(state).filter(function (t) {
    return !enemyNear[t.row + ',' + t.col];
  });
  assert(dropTiles.length >= 2, 'defense has open drop tiles away from pawns');
  const pyres = Object.values(state.wizards).filter(function (x) {
    return x.team === 'player' && x.element === 'fire' && x.state === 'summoned';
  });
  assert(pyres.length === 2, 'loadout has two Pyres in hand');
  assert(pyres[0].cost === 3 && state.mana === 2, 'round 1 mana is still 2, Pyre still costs 3');
  assert(canPaySummon(state, pyres[0], 'player'), 'defense round 1 can drop a 3-cost Pyre');
  assert(playerHasLegalAction(state), 'defense round 1 without Rime still has a drop');
  const firstDrop = simSummon(state, pyres[0], dropTiles[0].row, dropTiles[0].col, 'player');
  assert(firstDrop.some(function (e) { return e.type === 'summon'; }), 'first defense drop lands');
  assert(state.playerSummonedThisTurn, 'defense marks the drop as spent');
  assert(state.mana === 2, 'defense drop does not spend mana');
  assert(!canPaySummon(state, pyres[1], 'player'), 'second drop is blocked the same turn');
  const blockedDrop = simSummon(state, pyres[1], dropTiles[1].row, dropTiles[1].col, 'player');
  assert(!blockedDrop.length, 'simSummon refuses a second defense drop');
  assert(pyres[1].state === 'summoned', 'second wizard stays in hand');
  simEndPlayerTurn(state);
  simEndEnemyTurn(state);
  assert(!state.playerSummonedThisTurn, 'a new player turn restores the drop');
  assert(state.mana === 2, 'defense does not grow a mana pool');
  assert(canPaySummon(state, pyres[1], 'player'), 'next round can drop the next body');

  resetMatch(state, 1);
  state.fxEnabled = false;
  const vsPyre = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  const vsTile = getPlayerSummonTiles(state)[0];
  assert(vsTile, 'vs has a portal tile');
  const vsBlocked = simSummon(state, vsPyre, vsTile.row, vsTile.col, 'player');
  assert(!vsBlocked.length && vsPyre.state === 'summoned', 'vs still cannot portal a 3-cost on 2 mana');

  resetMatch(state, 1, { gameMode: 'defense' });
  state.fxEnabled = false;
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
  state.nexuses.player = [
    makeNexus({ id: 'player-cluster-0', row: 8, col: 0 }, 'player', DEFENSE_NEXUS_HP),
    makeNexus({ id: 'player-cluster-1', row: 8, col: 1 }, 'player', DEFENSE_NEXUS_HP),
    makeNexus({ id: 'player-cluster-2', row: 7, col: 0 }, 'player', DEFENSE_NEXUS_HP)
  ];
  state.nexuses.enemy = [];
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
  assert(pyre.hp === 9, 'fireball hits 4 range for 1 in the aimed direction (' + pyre.hp + ')');

  resetMatch(state, 1, { gameMode: 'defense' });
  state.fxEnabled = false;
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
  state.nexuses.player = [
    makeNexus({ id: 'player-cluster-0', row: 8, col: 0 }, 'player', DEFENSE_NEXUS_HP),
    makeNexus({ id: 'player-cluster-1', row: 8, col: 1 }, 'player', DEFENSE_NEXUS_HP),
    makeNexus({ id: 'player-cluster-2', row: 7, col: 0 }, 'player', DEFENSE_NEXUS_HP)
  ];
  state.nexuses.enemy = [];
  const prey = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  prey.state = 'onboard';
  prey.row = 5;
  prey.col = 4;
  prey.hp = 1;
  const firstSwing = createDefensePawn(state, 'melee', { state: 'onboard', row: 4, col: 4, hp: 5, maxHp: 5, intent: { kind: 'melee', dr: 1, dc: 0 } });
  const secondSwing = createDefensePawn(state, 'melee', { state: 'onboard', row: 5, col: 5, hp: 5, maxHp: 5, intent: { kind: 'melee', dr: 0, dc: -1 } });
  const killHit = simDefenseExecutePawn(state, firstSwing);
  assert(prey.state === 'dead', 'first melee fully resolves the kill before the next pawn acts');
  assert(killHit.some(e => e.type === 'death' && e.wizardId === prey.id), 'first strike emits the death');
  const emptySwing = simDefenseExecutePawn(state, secondSwing);
  assert(emptySwing.some(e => e.type === 'attack' && e.hit === 'none'), 'second melee finds the corpse gone');
  assert(!emptySwing.some(e => e.type === 'damage'), 'second strike deals no leftover damage');

  const lanePrey = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  lanePrey.state = 'onboard';
  lanePrey.row = 5;
  lanePrey.col = 2;
  lanePrey.hp = 1;
  state.water = { '5,3': true };
  const laneBrute = createDefensePawn(state, 'melee', { state: 'onboard', row: 4, col: 2, hp: 5, maxHp: 5, intent: { kind: 'melee', dr: 1, dc: 0 } });
  const laneCharge = createDefensePawn(state, 'charge', { state: 'onboard', row: 5, col: 0, hp: 4, maxHp: 4, intent: { kind: 'charge', dr: 0, dc: 1 } });
  simDefenseExecutePawn(state, laneBrute);
  assert(lanePrey.state === 'dead', 'opening strike clears the charge lane');
  simDefenseExecutePawn(state, laneCharge);
  assert(laneCharge.state === 'dead', 'charger then runs the empty lane into water');
  assert((laneCharge.row == null), 'fallen charger leaves the board after the kill resolved');

  resetMatch(state, 2, { gameMode: 'defense' });
  state.fxEnabled = false;
  simDefenseEnemyPhase(state);
  defensePawns(state, ['onboard']).forEach(function (w) {
    if (!w.intent) return;
    assert(defenseShotScore(state, w, w.row, w.col, w.intent.dr, w.intent.dc) > 0, 'a telegraph is a real shot, not empty air');
  });
  let wave;
  let sawIncoming = false;
  let overCapWaves = 0;
  let doubleHole = 0;
  for (wave = 0; wave < 8; wave++) {
    simDefenseEnemyPhase(state);
    state.turnCount += 1;
    const incoming = defensePawns(state, ['emerging']).length;
    const livingNow = defensePawns(state, ['onboard', 'emerging']).length;
    if (incoming >= 1) sawIncoming = true;
    if (incoming > 1) doubleHole += 1;
    if (livingNow > DEFENSE_PAWN_CAP) overCapWaves += 1;
  }
  assert(sawIncoming, 'waves keep streaming after execute-move-telegraph');
  assert(doubleHole === 0, 'a wave never opens two holes at once');
  assert(overCapWaves === 0, 'living plus incoming never exceed 3');

  resetMatch(state, 1, { gameMode: 'defense' });
  state.fxEnabled = false;
  state.water = {};
  state.mountains = {};
  state.voids = {};
  const openCount = defenseEverSpawned(state);
  assert(openCount === 1 || openCount === 2, 'opening counts toward the match budget');
  assert(defenseBudgetLeft(state) === DEFENSE_SPAWN_BUDGET - openCount, 'budget leftover after opening');
  state.turnCount = 2;
  let fillGuard = 0;
  while (defenseBudgetLeft(state) > 0 && fillGuard++ < 24) {
    const livingNow = defensePawns(state, ['onboard', 'emerging']).length;
    if (livingNow >= DEFENSE_PAWN_CAP) {
      const extra = defensePawns(state, ['onboard', 'emerging'])[0];
      extra.state = 'dead';
      extra.row = null;
      extra.col = null;
      extra.intent = null;
    }
    const n = defenseSpawnCount(state);
    if (n <= 0) break;
    markDefenseSpawns(state, n);
    simDefenseEmerge(state);
    state.turnCount += 1;
  }
  assert(defenseEverSpawned(state) === DEFENSE_SPAWN_BUDGET, 'a match never queues more than 10 invaders');
  assert(defenseBudgetLeft(state) === 0, 'budget is spent after 10');
  assert(defenseSpawnCount(state) === 0, 'no further marks once the 10 are out');

  resetMatch(state, 1, { gameMode: 'defense' });
  state.fxEnabled = false;
  Object.values(state.wizards).forEach(function (w) {
    if (w.team === 'enemy') {
      w.state = 'dead';
      w.row = null;
      w.col = null;
      w.intent = null;
    }
  });
  const southStriker = createDefensePawn(state, 'melee', {
    state: 'onboard', row: 4, col: 4, hp: 5, maxHp: 5, intent: { kind: 'melee', dr: 1, dc: 0 }
  });
  const eastStriker = createDefensePawn(state, 'charge', {
    state: 'onboard', row: 1, col: 6, hp: 4, maxHp: 4, intent: { kind: 'charge', dr: 1, dc: 0 }
  });
  const northStriker = createDefensePawn(state, 'fireball', {
    state: 'onboard', row: 1, col: 2, hp: 3, maxHp: 3, intent: { kind: 'fireball', dr: 1, dc: 0 }
  });
  const strikeQueue = defenseStrikeQueue(state);
  assert(strikeQueue[0].id === northStriker.id, 'north-west strikes first');
  assert(strikeQueue[1].id === eastStriker.id, 'same row, west before east');
  assert(strikeQueue[2].id === southStriker.id, 'south strikes last');
  assert(defenseStrikeIndex(state, northStriker) === 0, 'north is 1st on the telegraph');
  const executed = simDefenseExecute(state);
  assert(executed.filter(function (e) { return e.type === 'attack'; }).map(function (e) { return e.attackerId; }).join(',') ===
    [northStriker.id, eastStriker.id, southStriker.id].join(','), 'execute uses the numbered order');

  let splitOpen = 0;
  let multiSector = 0;
  let midFieldSpawn = 0;
  let campSpawn = 0;
  let overCap = 0;
  let spreadSeed;
  for (spreadSeed = 1; spreadSeed <= 36; spreadSeed++) {
    resetMatch(state, spreadSeed, { gameMode: 'defense' });
    const openPawns = defensePawns(state, ['onboard']);
    const openSectors = {};
    openPawns.forEach(function (p) {
      openSectors[defenseSpawnSector(p.row, p.col)] = true;
      if (p.row >= BOARD_SIZE - 2) campSpawn += 1;
      if (p.row >= 3 && p.row <= 6) midFieldSpawn += 1;
    });
    if (openPawns.length >= 2 && Object.keys(openSectors).length >= 2) splitOpen += 1;
    simDefenseEnemyPhase(state);
    const after = {};
    defensePawns(state, ['onboard', 'emerging']).forEach(function (p) {
      if (p.row == null) return;
      after[defenseSpawnSector(p.row, p.col)] = true;
    });
    defensePawns(state, ['emerging']).forEach(function (p) {
      if (p.row == null) return;
      if (p.row >= BOARD_SIZE - 2) campSpawn += 1;
      if (p.row >= 3 && p.row <= 6) midFieldSpawn += 1;
    });
    if (Object.keys(after).length >= 2) multiSector += 1;
    if (defensePawns(state, ['onboard', 'emerging']).length > DEFENSE_PAWN_CAP) overCap += 1;
  }
  assert(splitOpen >= 6, 'two-pawn openings often land in different sectors (' + splitOpen + ')');
  assert(multiSector >= 24, 'the first wave is not all piled on one edge (' + multiSector + ')');
  assert(campSpawn === 0, 'holes never open on the last two rows');
  assert(midFieldSpawn >= 8, 'holes can sit on open mid-field ground (' + midFieldSpawn + ')');
  assert(overCap === 0, 'living plus incoming never exceed 3');

  resetMatch(state, 1, { gameMode: 'defense' });
  state.fxEnabled = false;
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
  state.nexuses.player = [
    makeNexus({ id: 'player-cluster-0', row: 5, col: 4 }, 'player', DEFENSE_NEXUS_HP),
    makeNexus({ id: 'player-cluster-1', row: 5, col: 5 }, 'player', DEFENSE_NEXUS_HP),
    makeNexus({ id: 'player-cluster-2', row: 6, col: 4 }, 'player', DEFENSE_NEXUS_HP)
  ];
  state.nexuses.enemy = [];
  const cityBait = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  cityBait.state = 'onboard';
  cityBait.row = 4;
  cityBait.col = 3;
  cityBait.hp = 8;
  const cityBrute = createDefensePawn(state, 'melee', { state: 'onboard', row: 4, col: 4, hp: 3, maxHp: 3, hasMoved: true });
  cityBrute.intent = pickDefenseIntent(state, cityBrute);
  assert(
    defenseShotScore(state, cityBrute, 4, 4, 1, 0) === defenseShotScore(state, cityBrute, 4, 4, 0, -1),
    'a wizard and a nexus are worth the same strike'
  );
  assert(
    (cityBrute.intent.dr === 1 && cityBrute.intent.dc === 0) ||
    (cityBrute.intent.dr === 0 && cityBrute.intent.dc === -1),
    'adjacent brute aims at the city or the wizard, not empty air'
  );
  const cityWalker = createDefensePawn(state, 'melee', { state: 'onboard', row: 1, col: 4, hp: 3, maxHp: 3, hasMoved: false, intent: null });
  simDefenseMove(state);
  assert(cityWalker.row > 1, 'brute marches toward the nearest prey instead of sitting on the spawn line');
  cityBrute.state = 'dead';
  cityBrute.row = null;
  cityBrute.col = null;
  cityWalker.state = 'dead';
  cityWalker.row = null;
  cityWalker.col = null;
  cityBait.state = 'dead';
  cityBait.row = null;
  cityBait.col = null;
  const cityBomber = createDefensePawn(state, 'fireball', { state: 'onboard', row: 1, col: 4, hp: 3, maxHp: 3, hasMoved: true });
  cityBomber.intent = pickDefenseIntent(state, cityBomber);
  assert(cityBomber.intent && cityBomber.intent.dr === 1 && cityBomber.intent.dc === 0, 'bomber lines up the city when that is the only shot');

  resetMatch(state, 1, { gameMode: 'defense' });
  state.fxEnabled = false;
  Object.values(state.wizards).forEach(function (w) {
    if (w.team === 'enemy') {
      w.state = 'dead';
      w.row = null;
      w.col = null;
      w.intent = null;
    }
  });
  state.mountains = {};
  state.water = { '4,4': true };
  state.voids = {};
  state.nexuses.player = [
    makeNexus({ id: 'player-cluster-0', row: 6, col: 4 }, 'player', DEFENSE_NEXUS_HP),
    makeNexus({ id: 'player-cluster-1', row: 6, col: 5 }, 'player', DEFENSE_NEXUS_HP),
    makeNexus({ id: 'player-cluster-2', row: 7, col: 4 }, 'player', DEFENSE_NEXUS_HP)
  ];
  state.nexuses.enemy = [];
  const wetPrey = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  wetPrey.state = 'onboard';
  wetPrey.row = 3;
  wetPrey.col = 6;
  wetPrey.hp = 12;
  const wetCharger = createDefensePawn(state, 'charge', { state: 'onboard', row: 3, col: 4, hp: 4, maxHp: 4, hasMoved: true });
  wetCharger.intent = pickDefenseIntent(state, wetCharger);
  assert(wetCharger.intent, 'charger still aims if a wizard is in range to the side');
  assert(wetCharger.intent.dr !== 1 || wetCharger.intent.dc !== 0, 'charger does not aim south into water toward the city');
  assert(!defenseChargeWouldFall(state, wetCharger.row, wetCharger.col, wetCharger.intent.dr, wetCharger.intent.dc), 'picked charge path does not fall in a hazard');
  assert(defenseShotScore(state, wetCharger, 3, 4, wetCharger.intent.dr, wetCharger.intent.dc) > 0, 'charge telegraph hits someone');
  const shovedCharger = createDefensePawn(state, 'charge', { state: 'onboard', row: 3, col: 2, hp: 4, maxHp: 4, intent: { kind: 'charge', dr: 0, dc: 1 } });
  state.water['3,3'] = true;
  simDefenseExecutePawn(state, shovedCharger);
  assert(shovedCharger.state === 'dead', 'an already-aimed charge into water still falls');

  state.water = {};
  state.voids = {};
  const rammed = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  rammed.state = 'onboard';
  rammed.row = 4;
  rammed.col = 5;
  rammed.hp = 10;
  const beetle = createDefensePawn(state, 'charge', { state: 'onboard', row: 4, col: 2, hp: 4, maxHp: 4, intent: { kind: 'charge', dr: 0, dc: 1 } });
  simDefenseExecutePawn(state, beetle);
  assert(rammed.hp === 9, 'charger deals 1 like a Beetle ram (' + rammed.hp + ')');
  assert(rammed.state === 'onboard' && rammed.col === 6, 'charger then pushes the living wizard one tile');

  rammed.state = 'dead';
  rammed.row = null;
  rammed.col = null;
  const claimedStand = createDefensePawn(state, 'melee', { state: 'onboard', row: 2, col: 2, hp: 3, maxHp: 3, intent: null });
  const claimedWalker = createDefensePawn(state, 'melee', { state: 'onboard', row: 2, col: 6, hp: 3, maxHp: 3, hasMoved: false, intent: null });
  const freeStand = scoreDefenseTile(state, claimedWalker, 3, 2);
  claimedStand.intent = { kind: 'melee', dr: 1, dc: 0 };
  const busyStand = scoreDefenseTile(state, claimedWalker, 3, 2);
  assert(defenseClaimedTiles(state, claimedWalker.id)[tileKey(3, 2)], 'an earlier melee claims the tile it aims at');
  assert(busyStand.score === freeStand.score - 120, 'later pawns pay 120 to stand on that telegraph');
  claimedStand.state = 'dead';
  claimedStand.row = null;
  claimedStand.col = null;
  claimedStand.intent = null;
  claimedWalker.state = 'dead';
  claimedWalker.row = null;
  claimedWalker.col = null;

  const firstPrey = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  firstPrey.state = 'onboard';
  firstPrey.row = 1;
  firstPrey.col = 3;
  firstPrey.hp = 12;
  const firstAim = createDefensePawn(state, 'melee', { state: 'onboard', row: 1, col: 2, hp: 5, maxHp: 5, hasMoved: false, intent: null });
  const laterAim = createDefensePawn(state, 'melee', { state: 'onboard', row: 1, col: 6, hp: 5, maxHp: 5, hasMoved: false, intent: null });
  simDefenseMovePawn(state, firstAim);
  assignDefenseIntent(state, firstAim);
  assert(firstAim.intent && firstAim.intent.dr != null, 'first walker telegraphs as soon as it moves');
  assert(defenseShotScore(state, firstAim, firstAim.row, firstAim.col, firstAim.intent.dr, firstAim.intent.dc) > 0, 'that telegraph hits the adjacent wizard');
  assert(!laterAim.intent, 'later walker has no telegraph until it moves');
  firstPrey.state = 'dead';
  firstPrey.row = null;
  firstPrey.col = null;
  firstAim.state = 'dead';
  firstAim.row = null;
  firstAim.col = null;
  laterAim.state = 'dead';
  laterAim.row = null;
  laterAim.col = null;

  const planner = createDefensePawn(state, 'melee', { state: 'onboard', row: 0, col: 0, hp: 3, maxHp: 3, hasMoved: false, intent: null });
  const plan = pickDefenseMove(state, planner);
  assert(plan && plan.row != null, 'pickDefenseMove returns a tile');
  assert(!planner.hasMoved && planner.row === 0 && planner.col === 0, 'picking a walk does not move the pawn');

  planner.state = 'dead';
  planner.row = null;
  planner.col = null;

  const dashPrey = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  dashPrey.state = 'onboard';
  dashPrey.row = 0;
  dashPrey.col = 4;
  dashPrey.hp = 10;
  const dasher = createDefensePawn(state, 'charge', {
    state: 'onboard', row: 0, col: 1, hp: 4, maxHp: 4, intent: { kind: 'charge', dr: 0, dc: 1 }
  });
  const dashHit = simDefenseExecutePawn(state, dasher);
  const dashAtk = dashHit.find(function (e) { return e.type === 'attack'; });
  assert(dashAtk && dashAtk.path && dashAtk.path.length >= 1, 'charge records its own path on the attack');
  assert(!dashHit.some(function (e) { return e.type === 'push' && e.wizardId === dasher.id; }), 'charge no longer fakes a self-push');
  assert(dashHit.some(function (e) { return e.type === 'push' && e.wizardId === dashPrey.id; }), 'beetle shove is still a real push');
  assert(typeof dashAtk.strikeOrder === 'number', 'strike carries its number');
  assert(dashAtk.tiles && dashAtk.tiles.length >= 1, 'charge attack keeps the aimed tiles for FX');

  const shotPrey = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  shotPrey.state = 'onboard';
  shotPrey.row = 2;
  shotPrey.col = 6;
  shotPrey.hp = 10;
  const lineBomber = createDefensePawn(state, 'fireball', {
    state: 'onboard', row: 2, col: 2, hp: 3, maxHp: 3, intent: { kind: 'fireball', dr: 0, dc: 1 }
  });
  const shotHit = simDefenseExecutePawn(state, lineBomber);
  const shotAtks = shotHit.filter(function (e) { return e.type === 'attack'; });
  assert(shotAtks.length === 1, 'bomber emits one attack event');
  assert(shotAtks[0].tiles && shotAtks[0].tiles.length === 4, 'bomber attack lists the whole shot line');
  assert(shotPrey.hp === 9, 'bomber still deals 1');

  const punchPrey = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  punchPrey.state = 'onboard';
  punchPrey.row = 8;
  punchPrey.col = 1;
  punchPrey.hp = 10;
  const puncher = createDefensePawn(state, 'melee', {
    state: 'onboard', row: 8, col: 0, hp: 3, maxHp: 3, intent: { kind: 'melee', dr: 0, dc: 1 }
  });
  const punchHit = simDefenseExecutePawn(state, puncher);
  const punchAtk = punchHit.find(function (e) { return e.type === 'attack'; });
  assert(punchAtk && punchAtk.tiles && punchAtk.tiles.length === 1, 'melee attack keeps its one tile');
  assert(punchAtk.kind === 'melee', 'melee stays a melee event');

  const aimer = createDefensePawn(state, 'melee', { state: 'onboard', row: 0, col: 7, hp: 3, maxHp: 3, hasMoved: true, intent: null });
  const bait = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  bait.state = 'onboard';
  bait.row = 1;
  bait.col = 7;
  bait.hp = 8;
  const aimed = assignDefenseIntent(state, aimer);
  assert(aimed && aimed.type === 'intent' && aimer.intent, 'telegraph is an intent event when a target is adjacent');
  assert(aimer.intent.dr === 1 && aimer.intent.dc === 0, 'adjacent brute aims at the wizard');
  bait.state = 'dead';
  bait.row = null;
  bait.col = null;
  const airSwing = createDefensePawn(state, 'melee', { state: 'onboard', row: 0, col: 0, hp: 3, maxHp: 3, hasMoved: true, intent: null });
  assert(!pickDefenseIntent(state, airSwing), 'brute does not melee into empty air');

  resetMatch(state, 1);
  state.fxEnabled = false;
  assert(state.gameMode === 'vs', 'resetMatch without a mode stays vs for tests');
  assert(Object.values(state.wizards).filter(w => w.team === 'enemy' && !w.pawnKind).length === 4, 'vs still rolls four enemy wizards');

  resetMatch(state, 1, { gameMode: 'defense' });
  state.fxEnabled = false;
  Object.values(state.wizards).forEach(function (w) {
    if (w.team === 'enemy') {
      w.state = 'dead';
      w.row = null;
      w.col = null;
      w.intent = null;
    }
  });
  assert(defenseFieldClear(state), 'killing every pawn clears the field');
  assert(defenseSpawnCount(state) === 0, 'a clear field does not queue a new wave');
  assert(checkWinLoss(state) === 'player', 'defense wins when the field is clear');
  const wipePhase = simDefenseEnemyPhase(state);
  assert(!wipePhase.some(function (e) { return e.type === 'emergeMark'; }), 'enemy phase does not spawn after a wipe');
  assert(defensePawns(state, ['emerging']).length === 0, 'no incoming marks after a wipe');
  assert(checkWinLoss(state) === 'player', 'wipe still wins after the empty enemy phase');
  const wipeEnd = simEndPlayerTurn(state);
  assert(wipeEnd.some(function (e) { return e.type === 'gameOver' && e.result === 'player'; }), 'ending the turn after a wipe emits you win');
  assert(state.gameOverResult === 'player', 'match records a player win');

  resetMatch(state, 1, { gameMode: 'defense' });
  state.fxEnabled = false;
  const leftover = defensePawns(state, ['onboard'])[0];
  leftover.state = 'dead';
  leftover.row = null;
  leftover.col = null;
  leftover.intent = null;
  if (defensePawns(state, ['onboard']).length === 0) {
    createDefensePawn(state, 'melee', { state: 'onboard', row: 1, col: 4, hp: 5, maxHp: 5 });
  }
  assert(checkWinLoss(state) === null, 'one living pawn keeps the fight going');
  assert(defenseSpawnCount(state) > 0, 'a living pawn still draws reinforcements');

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
