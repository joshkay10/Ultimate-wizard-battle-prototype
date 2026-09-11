function canAct() {
  return !state.gameOverResult && state.currentTurn === 'player';
}

async function maybeAutoEndTurn() {
  if (state.gameOverResult || state.animating) return;
  if (state.currentTurn !== 'player') return;
  if (teamHasMoveUndo(state, 'player')) return;
  if (playerHasLegalAction(state)) return;
  await endTurn();
}

async function afterPlayerAction() {
  if (typeof render === 'function') render();
  await maybeAutoEndTurn();
}

function rematch() {
  endingTurn = false;
  state.animating = false;
  if (typeof resetBoardFx === 'function') resetBoardFx();
  startBattle();
  render();
  maybeAutoEndTurn();
}

function setGameMode(mode) {
  saveGameMode(mode);
  rematch();
}

let endingTurn = false;

async function presentDefenseEnemyPhase() {
  const strikers = defensePawns(state, ['onboard']).slice().sort(function (a, b) {
    return a.id < b.id ? -1 : 1;
  });
  let i;
  for (i = 0; i < strikers.length; i++) {
    const pawn = strikers[i];
    if (typeof holdDiscAt === 'function') holdDiscAt(pawn, pawn.row, pawn.col);
    const strike = simDefenseExecutePawn(state, pawn);
    if (!strike.length) {
      if (typeof releaseDisc === 'function') releaseDisc(pawn);
      continue;
    }
    await present(strike);
    await maybeWait(280);
  }
  const emerged = simDefenseEmerge(state);
  if (emerged.length) {
    await present(emerged);
    await maybeWait(220);
  }
  const movers = defensePawns(state, ['onboard']).slice().sort(function (a, b) {
    return a.id < b.id ? -1 : 1;
  });
  for (i = 0; i < movers.length; i++) {
    const pawn = movers[i];
    if (pawn.state !== 'onboard') continue;
    if (typeof holdDiscAt === 'function') holdDiscAt(pawn, pawn.row, pawn.col);
    const walk = simDefenseMovePawn(state, pawn);
    if (walk.length) await present(walk);
    else if (typeof releaseDisc === 'function') releaseDisc(pawn);
    assignDefenseIntent(state, pawn);
    if (typeof render === 'function') render();
    await maybeWait(300);
  }
  const marks = markDefenseSpawns(state, defenseSpawnCount(state));
  if (marks.length) await present(marks);
}

async function endTurn() {
  if (endingTurn || state.animating || state.gameOverResult) return;
  if (!canAct()) return;
  endingTurn = true;
  const matchId = state.matchId;
  try {
    await present(simEndPlayerTurn(state));
    if (state.matchId !== matchId) return;
    if (typeof render === 'function') render();
    if (state.gameOverResult) return;

    await maybeWait(280);
    if (state.matchId !== matchId) return;
    if (state.gameMode === 'defense') {
      await presentDefenseEnemyPhase();
    } else {
      await runTeamAi('enemy');
    }
    if (state.matchId !== matchId) return;
    await present(simEndEnemyTurn(state));
    if (state.matchId !== matchId) return;
    if (typeof render === 'function') render();
  } finally {
    if (state.matchId === matchId) endingTurn = false;
  }
  if (state.matchId === matchId) await maybeAutoEndTurn();
}
