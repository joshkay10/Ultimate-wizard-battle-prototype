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
    const strike = simDefenseExecutePawn(state, strikers[i]);
    if (!strike.length) continue;
    await present(strike);
    if (typeof render === 'function') render();
    await maybeWait(820);
  }
  const emerged = simDefenseEmerge(state);
  if (emerged.length) {
    await present(emerged);
    await maybeWait(480);
  }
  const movers = defensePawns(state, ['onboard']).slice().sort(function (a, b) {
    return a.id < b.id ? -1 : 1;
  });
  for (i = 0; i < movers.length; i++) {
    const walk = simDefenseMovePawn(state, movers[i]);
    if (!walk.length) continue;
    await present(walk);
    if (typeof render === 'function') render();
    await maybeWait(900);
  }
  assignDefenseIntents(state);
  if (typeof render === 'function') render();
  await maybeWait(500);
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

    await maybeWait(500);
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
