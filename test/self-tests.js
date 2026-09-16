// Headless asserts. Loaded by test/sim-node.js only — never the live page.
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
    cost: 0,
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

function unlockTeam(team) {
  team = team || 'player';
  Object.values(state.wizards).forEach(function (w) {
    if (w.team !== team) return;
    w.hasMoved = false;
    w.hasAttacked = false;
    w.silenceSkip = false;
    w.moveUndo = null;
  });
}

function benchOtherWizards() {
  const keep = {};
  let i;
  for (i = 0; i < arguments.length; i++) {
    if (arguments[i] && arguments[i].id) keep[arguments[i].id] = true;
  }
  Object.values(state.wizards).forEach(function (w) {
    if (keep[w.id]) return;
    if (w.state === 'onboard') {
      w.state = 'summoned';
      w.row = null;
      w.col = null;
      w.summoningSickness = false;
    }
  });
}

function pinMelee(wizard, dmg, push) {
  wizard.meleeAttack = dmg;
  wizard.meleeDisplacement = push;
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
  ember.col = BOARD_SIZE - 3;
  pinMelee(ember, 5, 2);
  gale.state = 'onboard';
  gale.row = 0;
  gale.col = BOARD_SIZE - 2;
  gale.hp = 12;
  benchOtherWizards(ember, gale);
  state.nexuses.enemy = [makeNexus({ id: 'crash-crystal', row: 0, col: BOARD_SIZE - 1 }, 'enemy', NEXUS_HP)];
  const hp0 = gale.hp;
  simAttack(state, ember, 0, BOARD_SIZE - 2, 'melee');
  assert(gale.row === 0 && gale.col === BOARD_SIZE - 2, 'push into a nexus should stay put');
  assert(gale.hp === hp0 - ember.meleeAttack - 2, 'blocked 2-pip push smashes for leftover 2');
  const slammed = nexusAt(state, 0, BOARD_SIZE - 1);
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
  pinMelee(batter, 5, 2);
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
  pinMelee(chainAtk, 5, 2);
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
  pinMelee(edgeAtk, 5, 2);
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
  gustCrash.castDisplacement = 3;
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
  pinMelee(bumpAtk, 5, 2);
  bumpHit.state = 'onboard';
  bumpHit.row = 4;
  bumpHit.col = 3;
  bumpHit.hp = 12;
  simAttack(state, bumpAtk, 4, 3, 'melee');
  assert(bumpHit.row === 4 && bumpHit.col === 4, 'one free tile still slides');
  assert(bumpHit.hp === 12 - bumpAtk.meleeAttack - 1, 'a one-pip leftover crash stays 1');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.voids = {};
  const overkillPyre = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  overkillPyre.state = 'onboard';
  overkillPyre.row = 4;
  overkillPyre.col = 2;
  overkillPyre.hasMoved = true;
  pinMelee(overkillPyre, 5, 2);
  const overkillFoe = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'ice');
  overkillFoe.state = 'onboard';
  overkillFoe.row = 4;
  overkillFoe.col = 3;
  overkillFoe.hp = 3;
  overkillFoe.maxHp = 3;
  const overkillHit = simAttack(state, overkillPyre, 4, 3, 'melee');
  const overkillDmg = overkillHit.find(function (e) { return e.type === 'damage' && e.targetId === overkillFoe.id && e.cause === 'melee'; });
  assert(overkillDmg && overkillDmg.overkill === 2, '5 into 3 pops 2 overkill');
  assert(overkillFoe.state === 'dead', 'overkill still kills');
  assert(overkillHit.some(function (e) { return e.type === 'push' && e.wizardId === overkillFoe.id && e.path && e.path.length === 2; }), 'overkill still slams the body');

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
  const openers = Object.values(state.wizards).filter(function (w) {
    return w.team === 'player' && w.state === 'onboard';
  });
  const waiting = Object.values(state.wizards).filter(function (w) {
    return w.team === 'player' && w.state === 'summoned';
  });
  const benched = Object.values(state.wizards).filter(function (w) {
    return w.team === 'player' && w.state === 'bench';
  });
  assert(openers.length === TEAM_SIZE, 'Vs starts with four wizards on the board');
  assert(waiting.length === 0, 'nobody waits in hand');
  assert(benched.length === 0, 'nobody waits on the bench at the opening');
  assert(openers.every(function (w) { return w.row >= SUMMON_ROW_START; }), 'your four open on your back rows');
  const enemyHand = Object.values(state.wizards).filter(function (w) {
    return w.team === 'enemy' && w.state === 'summoned';
  });
  const enemyBench = Object.values(state.wizards).filter(function (w) {
    return w.team === 'enemy' && w.state === 'bench';
  });
  const enemyField = Object.values(state.wizards).filter(function (w) {
    return w.team === 'enemy' && w.state === 'onboard';
  });
  assert(enemyField.length === TEAM_SIZE, 'the enemy starts on the board');
  assert(enemyField.every(function (w) { return w.row < ENEMY_ROW_END; }), 'the enemy opens on their back rows');
  assert(enemyHand.length === 0 && enemyBench.length === 0, 'the enemy has no leftover hand');
  const byId = function (a, b) {
    return parseInt(a.id.slice(1), 10) - parseInt(b.id.slice(1), 10);
  };
  const mineSorted = openers.slice().sort(byId);
  const foeSorted = enemyField.slice().sort(byId);
  const last = BOARD_SIZE - 1;
  let mirrorI;
  for (mirrorI = 0; mirrorI < mineSorted.length; mirrorI++) {
    assert(foeSorted[mirrorI].row === last - mineSorted[mirrorI].row && foeSorted[mirrorI].col === mineSorted[mirrorI].col, 'enemy opener ' + mirrorI + ' mirrors the player tile');
  }
  assert(playerHasLegalAction(state), 'round 1 can move a starting body');
  const actor = mineSorted[0];
  const other = mineSorted[1];
  const step = getMoveTiles(state, actor)[0];
  assert(step, 'the first wizard has a walk');
  const walked = simMove(state, actor, pathBFS(state, actor, step.row, step.col));
  assert(walked.length > 0 && actor.hasMoved, 'the first wizard can walk');
  assert(canUseWizard(state, actor) && !canUseWizard(state, other), 'Vs locks to the wizard that moved');
  const otherStep = getMoveTiles(state, other)[0];
  assert(otherStep, 'the second wizard still has tiles, but cannot use them');
  assert(simMove(state, other, pathBFS(state, other, otherStep.row, otherStep.col) || []).length === 0, 'a second wizard cannot move on the same Vs turn');
  simUndoMove(state, actor);
  assert(canUseWizard(state, other), 'undoing the only move lets you pick a different wizard');
  assert(kitById('fire').moveRange === 2 && kitById('ice').moveRange === 2 && kitById('wind').moveRange === 3, 'Pyre and Rime walk 2, Squall walks 3');
  assert(kitById('fire').meleeAttack === 2 && kitById('fire').hp === 4, 'Pyre melee chips, it does not one-shot');
  assert(kitById('ice').meleeAttack === 1 && kitById('wind').meleeAttack === 1, 'Rime and Squall punches are 1 dmg');
  assert(spellById('stream').castRange === 3 && spellById('stream').castAttack === 2, 'Stream is a line of 3 for 2 dmg');
  assert(spellById('sheet').castRange === 3 && spellById('gust').castDisplacement === 2, 'Sheet is short; Gust pushes 2');
  assert(spellById('cinder').castAttack === 1 && spellById('draft').castDisplacement === 3, 'Cinder pokes 1; Draft shoves 3');
  assert(spellById('stream').castAttack < kitById('ice').hp, 'a full-HP Rime lives through Stream');
  const round1Kits = WIZARD_TYPES.filter(t => t.cost <= STARTING_MANA).map(t => t.id);
  assert(round1Kits.indexOf('ice') !== -1, 'Rime costs 1, so it is affordable on round 1');
  assert(kitById('ice').cost === 1, 'Rime costs 1 after the cost cut');
  assert(WIZARD_TYPES.find(t => t.id === 'wind').cost === 2, 'Squall costs 2');
  assert(WIZARD_TYPES.find(t => t.id === 'fire').cost === 2, 'Pyre costs 2');
  assert(WIZARD_TYPES.find(t => t.id === 'earth').cost === 3, 'Cairn costs 3');
  assert(WIZARD_TYPES.length === 6, 'kit pool is six');
  assert(DEFAULT_TEAM.join(',') === 'fire,ice,wind,fire', 'default team is four cycling Pyre Rime Squall');
  assert(normalizeTeam(['fire']).join(',') === 'fire,ice,wind,fire', 'short teams fill from the default');
  assert(normalizeTeam(['earth', 'lightning', 'temporal', 'fire']).join(',') === 'earth,lightning,temporal,fire', 'four-kit custom teams stay four');
  assert(normalizeTeam(['fire', 'fire', 'fire', 'fire']).join(',') === 'fire,fire,fire,fire', 'duplicate kits are allowed');
  assert(TEAM_SIZE === 4 && VS_TEAM_SIZE === 4, 'Vs team size is four');
  resetMatch(state, 1);
  state.fxEnabled = false;
  const handBefore = Object.values(state.wizards).filter(function (w) {
    return w.team === 'player' && w.state === 'summoned';
  }).length;
  simEndPlayerTurn(state);
  const enemyAfter = Object.values(state.wizards).filter(function (w) {
    return w.team === 'enemy' && w.state === 'summoned';
  }).length;
  assert(enemyAfter === 0, 'the enemy has no bench to pick up from');
  simEndEnemyTurn(state);
  const handAfter = Object.values(state.wizards).filter(function (w) {
    return w.team === 'player' && w.state === 'summoned';
  }).length;
  assert(handAfter === 0, 'Vs has no hand to draw into');
  assert(state.mana === 3 && state.maxMana === 3, 'each round still grants 1 mana');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  assert(state.boardSize === VS_BOARD_SIZE && BOARD_SIZE === VS_BOARD_SIZE, 'Vs is 7×7');
  assert(state.nexuses.player.length === 3 && state.nexuses.enemy.length === 3, 'Vs has three nexuses a side');
  assert(state.nexuses.player.every(function (n) { return n.hp === NEXUS_HP; }), 'Vs crystals have 5 HP');
  assert(state.nexuses.player.every(function (n) { return isSummonTile(n.row, n.col); }), 'player crystals sit in the back three rows');
  assert(state.nexuses.enemy.every(function (n) { return isEnemySummonTile(n.row, n.col); }), 'enemy crystals sit in the far three rows');
  const playerFront = state.nexuses.player.find(function (n) { return n.id === 'player-front'; });
  const enemyFront = state.nexuses.enemy.find(function (n) { return n.id === 'enemy-front'; });
  assert(playerFront && playerFront.row === BOARD_SIZE - 2, 'the forward crystal sits one row in, not on the camp lip');
  assert(enemyFront && enemyFront.row === 1, 'the enemy forward crystal mirrors that');
  assert(Math.abs(playerFront.row - enemyFront.row) >= 3, 'the two forward crystals do not stare across one empty row');
  const walker = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  walker.state = 'onboard';
  walker.row = 5;
  walker.col = 2;
  const moves = getMoveTiles(state, walker);
  assert(moves.length > 0, 'move range should be open');
  assert(!moves.some(t => nexusAt(state, t.row, t.col)), 'move range should not include a nexus');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const stepper = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  stepper.state = 'onboard';
  stepper.row = 5;
  stepper.col = 2;
  assert(stepper.moveRange === 2, 'rime should move 2');
  assert(getMoveTiles(state, stepper).some(t => t.row === 3 && t.col === 2), 'rime move 2 reaches the center file');
  assert(!getMoveTiles(state, stepper).some(t => t.row <= 1), 'one walk cannot reach the far camp');

  resetMatch(state, 1);
  state.fxEnabled = false;
  assert(checkWinLoss(state) === null, 'starting wizards keep Vs going');
  const oneDown = state.nexuses.enemy[0];
  oneDown.hp = 0;
  assert(checkWinLoss(state) === null, 'one fallen crystal does not win Vs');
  state.nexuses.enemy.forEach(function (n) { n.hp = 0; });
  assert(checkWinLoss(state) === 'player', 'dropping all three enemy crystals wins Vs');
  resetMatch(state, 1);
  state.fxEnabled = false;
  Object.values(state.wizards).forEach(function (w) {
    if (w.team === 'enemy') {
      w.state = 'dead';
      w.row = null;
      w.col = null;
    }
  });
  assert(checkWinLoss(state) === 'player', 'wiping the enemy team is a Vs win');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const hunter = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  hunter.state = 'onboard';
  hunter.row = 3;
  hunter.col = 2;
  const wounded = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'ice');
  const healthy = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'fire');
  wounded.state = 'onboard';
  wounded.row = 2;
  wounded.col = 2;
  wounded.hp = 1;
  healthy.state = 'onboard';
  healthy.row = 3;
  healthy.col = 4;
  healthy.hp = 10;
  const snipe = pickAttack(hunter, 'player');
  assert(snipe && snipe.row === 2 && snipe.col === 2, 'AI should snipe the wounded wizard');

  resetMatch(state, 1);
  state.fxEnabled = false;
  const mountainKeys = Object.keys(state.mountains);
  assert(mountainKeys.length === 0, 'Vs opens on an empty arena');
  assert(Object.keys(state.water).length === 0, 'Vs opens with no water');
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
  scout.row = 5;
  scout.col = 3;
  if (mountainAt(state, scout.row, scout.col) || waterAt(state, scout.row, scout.col)) scout.col = 2;
  if (mountainAt(state, scout.row, scout.col) || waterAt(state, scout.row, scout.col)) scout.col = 4;
  const scoutMoves = getMoveTiles(state, scout);
  assert(!scoutMoves.some(t => mountainAt(state, t.row, t.col)), 'cannot walk onto mountains');
  const castsFromLane = getCastTiles(state, scout);
  assert(!castsFromLane.some(t => mountainAt(state, t.row, t.col)), 'cannot cast onto a mountain');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = { '5,4': true, '5,5': true };
  const flyer = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  flyer.state = 'onboard';
  flyer.row = 5;
  flyer.col = 3;
  const waterCast = getCastTiles(state, flyer);
  assert(waterCast.some(t => t.row === 5 && t.col === 4), 'cast can target water');
  assert(waterCast.some(t => t.row === 5 && t.col === 6), 'cast continues past water');
  assert(getMeleeTiles(state, flyer).every(t => !waterAt(state, t.row, t.col)), 'melee cannot target water');
  assert(!getMoveTiles(state, flyer).some(t => t.row === 5 && t.col === 4), 'cannot walk onto water');
  const drown = simMove(state, flyer, [{ row: 5, col: 4 }]);
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
    assert(Object.keys(state.mountains).length === 0, 'Vs stays an open arena on seed ' + s);
  }
  assert(waterMaps === 0, 'the simplified Vs map has no water');
  assert(dryMaps === 40, 'every Vs seed is a dry open board');

  resetMatch(state, 1);
  const mtnA = Object.keys(state.mountains).sort().join(',') + '|' + Object.keys(state.water).sort().join(',');
  resetMatch(state, 1);
  const mtnB = Object.keys(state.mountains).sort().join(',') + '|' + Object.keys(state.water).sort().join(',');
  assert(mtnA === mtnB, 'same seed should place the same terrain');

  resetMatch(state, 1);
  state.fxEnabled = false;
  const playerEls = Object.values(state.wizards).filter(w => w.team === 'player').map(w => w.element).sort();
  assert(playerEls.join(',') === 'fire,fire,ice,wind', 'roster is two Pyre, one Rime, one Squall');
  assert(Object.values(state.wizards).filter(w => w.team === 'enemy').length === 4, 'enemy has four wizards');

  resetMatch(state, 1, { playerTeam: ['earth', 'lightning', 'temporal', 'fire'], enemyTeam: ['fire', 'ice', 'wind', 'earth'] });
  state.fxEnabled = false;
  const customEls = Object.values(state.wizards).filter(w => w.team === 'player').map(w => w.element).sort();
  assert(customEls.join(',') === 'earth,fire,lightning,temporal', 'resetMatch keeps a four-kit custom player team');
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
  assert(fromIds.map(s => s.kit).join(',') === 'fire,ice,wind,fire', 'old three-kit arrays pad to four');
  assert(fromIds.map(s => s.spell).join(',') === 'stream,sheet,gust,cinder', 'old team arrays fill spell 1');
  assert(fromIds.map(s => s.special).join(',') === 'inferno,pulse,gale,inferno', 'padding also fills spell 2');
  const rolledPlayable = pickEnemyTeam(createRng(3), DEFAULT_TEAM);
  assert(rolledPlayable.every(function (id) { return kitPlayable(id); }), 'enemy rolls only from the live kits');
  const mixed = randomPlayableLoadout(createRng(9));
  assert(mixed.length === TEAM_SIZE && mixed.every(function (s) { return kitPlayable(s.kit); }), 'randomize stays in Pyre Rime Squall');
  assert(SPELLS.length === 22, 'spell catalog is twenty-two');
  assert(spellsForElement('ice').some(s => s.id === 'blizzard'), 'ice can take blizzard');
  assert(spellsForElement('fire').some(s => s.id === 'lance'), 'fire can take lance');
  assert(CAST_HINT.blizzard && CAST_HINT.inferno && CAST_HINT.tug && CAST_HINT.lock && CAST_HINT.brand && CAST_HINT.lance, 'new spell hints exist');

  resetMatch(state, 1);
  state.fxEnabled = false;
  const defaultIce = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  assert(defaultIce.spellId === 'sheet' && defaultIce.castKind === 'stream', 'default Rime spell 1 is Sheet');
  assert(defaultIce.specialSpellId === 'pulse' && defaultIce.specialCost === 2, 'default Rime spell 2 is Pulse (2 mana)');
  assert(defaultIce.activeSpell === 'basic', 'wizards start on spell 1');
  const defaultFires = Object.values(state.wizards).filter(x => x.team === 'player' && x.element === 'fire');
  assert(defaultFires.map(w => w.spellId).sort().join(',') === 'cinder,stream', 'default Pyres spell 1 are Stream and Cinder');
  assert(defaultFires.map(w => w.specialSpellId).sort().join(',') === 'inferno,lance', 'default Pyres pack Lance and Inferno as spell 2');
  const defaultLancer = defaultFires.find(w => w.specialSpellId === 'lance');
  setActiveSpell(defaultLancer, 'special');
  assert(defaultLancer.castKind === 'pierce', 'switching to spell 2 arms the piercing Lance');
  setActiveSpell(defaultLancer, 'basic');
  assert(defaultLancer.castKind !== 'pierce', 'switching back restores spell 1');
  const foeCaster = Object.values(state.wizards).find(x => x.team === 'enemy' && x.specialSpellId);
  assert(foeCaster && foeCaster.specialSpellId, 'enemy wizards also carry a spell 2');

  resetMatch(state, 1);
  state.fxEnabled = false;
  let vsCapGuard;
  for (vsCapGuard = 0; vsCapGuard < 12; vsCapGuard++) refillManaPools(state);
  assert(state.maxMana === MANA_CAP && MANA_CAP === 6, 'Vs mana grows and caps at 6');
  assert(state.enemyMaxMana === MANA_CAP, 'enemy mana caps at 6 too');

  resetMatch(state, 1, {
    playerLoadout: [
      { kit: 'fire', spell: 'stream', special: 'lance' },
      { kit: 'ice', spell: 'sheet', special: 'blizzard' },
      { kit: 'wind', spell: 'gust', special: 'draft' },
      { kit: 'earth', spell: 'raise', special: 'quake' }
    ],
    enemyTeam: ['earth', 'lightning', 'temporal', 'fire']
  });
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.trails = {};
  const blizzardMage = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  assert(blizzardMage.specialSpellId === 'blizzard', 'loadout can give Rime blizzard as its special');
  applySpellToWizard(blizzardMage, spellById('blizzard'));
  assert(blizzardMage.castKind === 'burst', 'blizzard is a burst');
  blizzardMage.state = 'onboard';
  blizzardMage.row = 3;
  blizzardMage.col = 3;
  const quakeDummy = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'earth');
  quakeDummy.state = 'onboard';
  quakeDummy.row = 4;
  quakeDummy.col = 4;
  quakeDummy.hp = 14;
  const blizzardAim = getCastTiles(state, blizzardMage);
  assert(blizzardAim.some(t => t.row === 3 && t.col === 5), 'blizzard can aim two tiles east');
  const storm = simAttack(state, blizzardMage, 3, 5, 'cast');
  assert(storm.some(e => e.type === 'attack' && e.castKind === 'burst' && e.spellId === 'blizzard'), 'blizzard is a burst');
  assert(quakeDummy.hp === 13, 'blizzard deals 1 in the 3x3');
  const frozen = [];
  let rr;
  let cc;
  for (rr = 2; rr <= 4; rr++) {
    for (cc = 4; cc <= 6; cc++) {
      const trail = trailAt(state, rr, cc);
      if (trail && trail.element === 'ice') frozen.push(rr + ',' + cc);
    }
  }
  assert(frozen.length === 9, 'blizzard freezes the whole 3x3 (' + frozen.length + ')');
  assert(!trailAt(state, 3, 3) || trailAt(state, 3, 3).element !== 'ice', 'blizzard does not freeze the caster tile outside the square');
  state.nexuses.enemy = [makeNexus({ id: 'blizzard-crystal', row: 3, col: 4 }, 'enemy', NEXUS_HP)];
  const frontNexus = state.nexuses.enemy[0];
  const nexusHp = frontNexus.hp;
  blizzardMage.hasAttacked = false;
  simAttack(state, blizzardMage, 3, 5, 'cast');
  assert(frontNexus.hp === nexusHp, 'blizzard does not chip nexuses');

  resetMatch(state, 1, {
    playerLoadout: [
      { kit: 'fire', spell: 'stream', special: 'lance' },
      { kit: 'ice', spell: 'sheet', special: 'pulse' },
      { kit: 'wind', spell: 'gust', special: 'draft' },
      { kit: 'fire', spell: 'cinder', special: 'inferno' }
    ],
    enemyTeam: ['fire', 'ice', 'wind', 'earth']
  });
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.voids = {};
  const lanceMage = Object.values(state.wizards).find(x => x.team === 'player' && x.specialSpellId === 'lance');
  assert(lanceMage && specialManaCost(lanceMage) === 4, 'lance equips as spell 2 (2× Pyre cost)');
  applySpellToWizard(lanceMage, spellById('lance'));
  assert(lanceMage.castKind === 'pierce', 'lance is a piercing cast');
  lanceMage.state = 'onboard';
  lanceMage.row = 4;
  lanceMage.col = 1;
  const lineFoes = Object.values(state.wizards).filter(function (w) { return w.team === 'enemy'; });
  lineFoes[0].state = 'onboard'; lineFoes[0].row = 4; lineFoes[0].col = 2; lineFoes[0].hp = 1; lineFoes[0].maxHp = 1;
  lineFoes[1].state = 'onboard'; lineFoes[1].row = 4; lineFoes[1].col = 3; lineFoes[1].hp = 1; lineFoes[1].maxHp = 1;
  lineFoes[2].state = 'onboard'; lineFoes[2].row = 4; lineFoes[2].col = 4; lineFoes[2].hp = 3; lineFoes[2].maxHp = 3;
  const lanceTiles = getCastTiles(state, lanceMage);
  assert(lanceTiles.some(t => t.row === 4 && t.col === 4), 'lance can aim past the front bodies (it pierces)');
  const lanced = simAttack(state, lanceMage, 4, 4, 'cast');
  assert(lanced.some(e => e.type === 'attack' && e.castKind === 'pierce'), 'lance is a piercing cast');
  assert(lineFoes[0].state === 'dead' && lineFoes[1].state === 'dead', 'one lance wipes a row of 1 HP wizards');
  assert(lineFoes[2].hp === 1, 'the same beam also chips the tougher body behind them (' + lineFoes[2].hp + ')');
  assert(lanced.filter(e => e.type === 'death').length === 2, 'one lance, two kills');
  assert(trailAt(state, 4, 2) && trailAt(state, 4, 2).element === 'fire', 'lance paints fire along the beam');
  lanceMage.hasAttacked = false;
  state.nexuses.player = [makeNexus({ id: 'p-flame-0', row: 4, col: 3 }, 'player', NEXUS_HP)];
  simAttack(state, lanceMage, 4, 4, 'cast');
  assert(state.nexuses.player[0].hp === NEXUS_HP, 'lance flies over crystals without chipping the city');

  resetMatch(state, 7, { playerTeam: DEFAULT_TEAM, rollEnemy: true });
  assert(state.enemyLoadout.length === 4, 'rolled enemies also have spells');
  assert(state.enemyLoadout.every(s => spellById(s.spell) && spellById(s.spell).element === kitById(s.kit).element), 'enemy spells match their element');
  assert(state.enemyLoadout.every(s => s.special && isSpecialSpell(spellById(s.special))), 'rolled enemies also pack a spell 2');

  resetMatch(state, 1, {
    playerLoadout: [
      { kit: 'ice', spell: 'sheet', special: 'pulse' },
      { kit: 'ice', spell: 'lock', special: 'blizzard' },
      { kit: 'ice', spell: 'sheet', special: 'blizzard' },
      { kit: 'ice', spell: 'lock', special: 'pulse' }
    ],
    enemyTeam: ['fire', 'fire', 'wind', 'earth']
  });
  state.fxEnabled = false;
  const rimes = Object.values(state.wizards).filter(w => w.team === 'player' && w.element === 'ice');
  assert(rimes.length === 4, 'four Rimes is a legal team');
  assert(rimes.map(w => w.spellId).sort().join(',') === 'lock,lock,sheet,sheet', 'duplicate kits keep their own free casts');
  assert(rimes.map(w => w.specialSpellId).sort().join(',') === 'blizzard,blizzard,pulse,pulse', 'duplicate kits keep their own specials');
  const enemyFires = Object.values(state.wizards).filter(w => w.team === 'enemy' && w.element === 'fire');
  assert(enemyFires.length === 2, 'enemy can roll duplicate kits');

  resetMatch(state, 1, {
    playerLoadout: [
      { kit: 'wind', spell: 'tug' },
      { kit: 'ice', spell: 'lock' },
      { kit: 'fire', spell: 'brand' },
      { kit: 'ice', spell: 'sheet', special: 'pulse' }
    ],
    enemyTeam: ['fire', 'fire', 'wind', 'earth']
  });
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.voids = {};
  const tugger = Object.values(state.wizards).find(x => x.team === 'player' && x.spellId === 'tug');
  const locker = Object.values(state.wizards).find(x => x.team === 'player' && x.spellId === 'lock');
  const brander = Object.values(state.wizards).find(x => x.team === 'player' && x.spellId === 'brand');
  assert(tugger && tugger.castKind === 'pull', 'Tug is a pull');
  assert(locker && locker.spellRoot, 'Lock roots');
  assert(brander && brander.spellBurn === 2, 'Brand burns 2');

  tugger.state = 'onboard';
  tugger.row = 4;
  tugger.col = 1;
  tugger.hasAttacked = false;
  const yanked = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'earth');
  yanked.state = 'onboard';
  yanked.row = 4;
  yanked.col = 4;
  yanked.hp = 5;
  yanked.maxHp = 5;
  state.water = { '4,3': true };
  const tugHit = simAttack(state, tugger, 4, 4, 'cast');
  assert(tugHit.some(e => e.type === 'attack' && e.castKind === 'pull' && e.spellId === 'tug'), 'tug attack is a pull');
  assert(yanked.state === 'dead', 'tug yanks a wizard into water');
  assert(describeEvent(tugHit[0]).indexOf('tugs') !== -1, 'tug log says tugs');

  locker.state = 'onboard';
  locker.row = 2;
  locker.col = 2;
  locker.hasAttacked = false;
  const lockFoe = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'wind');
  lockFoe.state = 'onboard';
  lockFoe.row = 2;
  lockFoe.col = 5;
  lockFoe.hp = 4;
  lockFoe.maxHp = 4;
  const lockHit = simAttack(state, locker, 2, 5, 'cast');
  assert(lockHit.some(e => e.type === 'root' && e.targetId === lockFoe.id), 'lock emits a root');
  assert(lockFoe.rooted, 'lock marks the wizard rooted');
  assert(!canMove(lockFoe) && !canAttack(lockFoe), 'rooted wizard cannot act');

  brander.state = 'onboard';
  brander.row = 6;
  brander.col = 2;
  brander.hasAttacked = false;
  const brandFoe = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'fire');
  brandFoe.state = 'onboard';
  brandFoe.row = 6;
  brandFoe.col = 4;
  brandFoe.hp = 2;
  brandFoe.maxHp = 2;
  const brandHit = simAttack(state, brander, 6, 4, 'cast');
  assert(brandFoe.hp === 1, 'brand chips 1 now');
  assert(brandFoe.burn === 2, 'brand leaves 2 burn');
  const brandTick = tickBurnsForTeam(state, 'enemy');
  assert(brandFoe.state === 'dead', 'burn kills the 2 HP wizard');
  assert(brandTick.some(e => e.type === 'damage' && e.cause === 'burn'), 'burn ticks');

  resetMatch(state, 1, { playerTeam: ['earth', 'temporal', 'earth', 'temporal'], enemyTeam: DEFAULT_TEAM });
  state.fxEnabled = false;
  const expensiveWait = Object.values(state.wizards).filter(function (w) {
    return w.team === 'player' && w.state === 'summoned';
  });
  const expensiveField = Object.values(state.wizards).filter(function (w) {
    return w.team === 'player' && w.state === 'onboard';
  });
  assert(expensiveField.length === TEAM_SIZE, 'four 3-cost kits still start on the board');
  assert(expensiveWait.length === 0, 'Vs has no leftover hand');
  assert(playerHasLegalAction(state), 'the four on the board can still move');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  state.tempMountains = {};
  const pulseMage = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  applySpellToWizard(pulseMage, spellById('pulse'));
  const n1 = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'fire');
  const n2 = Object.values(state.wizards).find(x => x.team === 'enemy' && x.element === 'wind');
  pulseMage.state = 'onboard';
  pulseMage.row = 4;
  pulseMage.col = 2;
  n1.state = 'onboard';
  n1.row = 3;
  n1.col = 2;
  n1.hp = 12;
  n2.state = 'onboard';
  n2.row = 4;
  n2.col = 1;
  n2.hp = 8;
  const pulse = simAttack(state, pulseMage, 3, 2, 'cast');
  assert(pulse.some(e => e.type === 'attack' && e.castKind === 'pulse'), 'ice cast is a pulse');
  assert(n1.hp === 10, 'pulse hits the north neighbor');
  assert(n2.hp === 6, 'pulse hits every neighbor, not just the clicked tile');
  assert(n1.row === 2 && n1.col === 2, 'pulse pushes outward');
  assert(n2.row === 4 && n2.col === 0, 'pulse pushes the west neighbor west');

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
  const streamLine = describeEvent({
    type: 'attack',
    kind: 'cast',
    castKind: 'stream',
    attackerId: Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire').id,
    from: { row: 6, col: 3 },
    row: 3,
    col: 3
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
  const blinked = simAttack(state, blinker, 4, 6, 'cast');
  assert(blinked.some(e => e.type === 'swap' && !e.bId), 'empty temporal cast is a blink');
  assert(blinker.row === 4 && blinker.col === 6, 'blink lands on the empty tile');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const gust = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'wind');
  gust.state = 'onboard';
  gust.row = 4;
  gust.col = 4;
  const gustTiles = getCastTiles(state, gust);
  assert(gustTiles.some(t => t.row === 4 && t.col === 1), 'gust reaches range 3');
  assert(!gustTiles.some(t => t.row === 4 && t.col === 0), 'gust does not reach range 4');

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
  burned.row = 3;
  burned.col = 3;
  burned.hp = 12;
  layTrail(state, 3, 4, 'fire');
  simMove(state, burned, [{ row: 3, col: 4 }]);
  assert(burned.hp === 11, 'walking onto fire costs 1');
  assert(burned.row === 3 && burned.col === 4, 'fire does not block the step');

  resetMatch(state, 1);
  state.fxEnabled = false;
  state.mountains = {};
  state.water = {};
  const batterIce = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  const slider = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  batterIce.state = 'onboard';
  batterIce.row = 3;
  batterIce.col = 1;
  pinMelee(batterIce, 5, 2);
  slider.state = 'onboard';
  slider.row = 3;
  slider.col = 2;
  slider.hp = 12;
  layTrail(state, 3, 3, 'ice');
  simAttack(state, batterIce, 3, 2, 'melee');
  assert(slider.row === 3 && slider.col === 5, 'push over ice does not spend a pip');

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
  const acted = Object.values(state.wizards).some(w => w.team === 'player' && (w.hasMoved || w.hasAttacked));
  assert(!acted, 'noop brain does not act');
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
  const crystal = makeNexus({ id: 'vs-void-crystal', row: 2, col: 3 }, 'enemy', NEXUS_HP);
  state.nexuses.enemy = [crystal];
  crystal.hp = 1;
  const emberDrop = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'fire');
  emberDrop.state = 'onboard';
  emberDrop.row = crystal.row + 1;
  emberDrop.col = crystal.col;
  if (emberDrop.row > BOARD_SIZE - 1) emberDrop.row = crystal.row - 1;
  simAttack(state, emberDrop, crystal.row, crystal.col, 'melee');
  assert(crystal.hp === 0, 'last nexus hit drops it');
  assert(voidAt(state, crystal.row, crystal.col), 'dead nexus becomes a void');
  assert(!nexusAt(state, crystal.row, crystal.col), 'dead nexus no longer occupies the tile');
  unlockTeam('player');
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
  unlockTeam('player');
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
  const jumped = simAttack(state, jumper, 4, BOARD_SIZE - 1, 'cast');
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
  fanner.col = 3;
  layTrail(state, 4, 4, 'fire');
  simAttack(state, fanner, 4, 6, 'cast');
  assert(trailAt(state, 4, 4) && trailAt(state, 4, 4).element === 'fire', 'gust keeps fire it fans through');
  assert(trailAt(state, 4, 5) && trailAt(state, 4, 5).element === 'fire', 'gust spreads fire along the line');
  assert(trailAt(state, 4, 6) && trailAt(state, 4, 6).element === 'fire', 'gust fire reaches the end of the gust');

  resetMatch(state, 1);
  state.fxEnabled = false;
  const vsRime = Object.values(state.wizards).find(x => x.team === 'player' && x.element === 'ice');
  vsRime.hasMoved = true;
  vsRime.hasAttacked = false;
  state.mountains = {};
  state.water = {};
  const rimeFoe = Object.values(state.wizards).find(x => x.team === 'enemy');
  rimeFoe.row = vsRime.row - 1;
  rimeFoe.col = vsRime.col;
  rimeFoe.state = 'onboard';
  rimeFoe.hp = 8;
  assert(basicManaCost(vsRime) === 1 && specialManaCost(vsRime) === 2, 'Rime spell 1 is 1× cost, spell 2 is 2×');
  setActiveSpell(vsRime, 'basic');
  const vsBasic = simAttack(state, vsRime, rimeFoe.row, rimeFoe.col, 'cast');
  assert(vsBasic.length > 0, 'Vs spell 1 resolves');
  assert(state.mana === 1, 'Vs spell 1 spends 1× kit cost');
  vsRime.hasAttacked = false;
  setActiveSpell(vsRime, 'special');
  const vsSpecialBroke = simAttack(state, vsRime, rimeFoe.row, rimeFoe.col, 'cast');
  assert(vsSpecialBroke.length === 0, 'Vs spell 2 refuses when 1 mana cannot cover 2× cost');
  state.mana = 2;
  const vsSpecial = simAttack(state, vsRime, rimeFoe.row, rimeFoe.col, 'cast');
  assert(vsSpecial.length > 0, 'Vs spell 2 resolves when paid');
  assert(state.mana === 0, 'Vs spell 2 spends 2× kit cost');
  vsRime.hasAttacked = false;
  rimeFoe.state = 'onboard';
  rimeFoe.row = vsRime.row - 1;
  rimeFoe.col = vsRime.col;
  setActiveSpell(vsRime, 'basic');
  const vsMelee = simAttack(state, vsRime, rimeFoe.row, rimeFoe.col, 'melee');
  assert(vsMelee.length > 0, 'Vs melee still hits');
  assert(state.mana === 0, 'Vs melee costs 0');

  resetMatch(state, 1);
  state.fxEnabled = false;
  const waitingVs = Object.values(state.wizards).filter(function (w) {
    return w.state === 'summoned' || w.state === 'bench';
  });
  assert(waitingVs.length === 0, 'Vs has no off-field wizards');
  assert(isSummonTile(BOARD_SIZE - 1, 0), 'vs still has home-row tiles');

  resetMatch(state, 1);
  state.fxEnabled = false;
  assert(state.gameMode === 'vs', 'resetMatch without a mode stays vs for tests');
  assert(Object.values(state.wizards).filter(w => w.team === 'enemy').length === 4, 'vs still rolls four enemy wizards');

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
