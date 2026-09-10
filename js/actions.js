function pickWizardToSummon(id) {
  if (state.animating || !canAct()) return;
  const wizard = state.wizards[id];
  if (!wizard || wizard.state !== 'summoned') return;
  if (state.mana < wizard.cost) return;
  state.selectedWizardId = null;
  state.placingWizardId = (state.placingWizardId === id) ? null : id;
  render();
}

function placeWizard(row, col) {
  if (!canAct() || state.animating) return;
  if (!state.placingWizardId) return;
  const wizard = state.wizards[state.placingWizardId];
  if (!wizard) return;
  const events = simSummon(state, wizard, row, col, 'player');
  if (events.length) {
    state.placingWizardId = null;
    if (wizard.state === 'onboard') {
      state.selectedWizardId = wizard.id;
      state.selectedAction = wizard.summoningSickness ? null : 'move';
    }
  }
  present(events).then(afterPlayerAction);
}

function selectWizard(id) {
  if (state.animating || !canAct()) return;
  const wizard = state.wizards[id];
  if (!wizard || wizard.state !== 'onboard') return;
  if (state.selectedWizardId === id) {
    state.selectedWizardId = null;
  } else {
    state.selectedWizardId = id;
    state.selectedAction = wizard.team === 'player' && !wizard.summoningSickness ? 'move' : null;
  }
  render();
}

function deselect() {
  state.selectedWizardId = null;
  state.placingWizardId = null;
  render();
}

function setAction(action) {
  if (!state.selectedWizardId || state.animating || !canAct()) return;
  const wizard = state.wizards[state.selectedWizardId];
  if (!wizard || wizard.team !== 'player') return;
  state.selectedAction = action;
  render();
}

function undoSelectedMove() {
  if (state.animating || !canAct()) return;
  const wizard = state.selectedWizardId ? state.wizards[state.selectedWizardId] : null;
  if (!canUndoMove(wizard)) return;
  present(simUndoMove(state, wizard)).then(function () {
    state.selectedAction = 'move';
    afterPlayerAction();
  });
}

function handleTileClick(row, col) {
  if (state.animating || !canAct()) return;

  if (state.placingWizardId) {
    placeWizard(row, col);
    return;
  }

  if (!state.selectedWizardId) {
    const occ = wizardAt(state, row, col);
    if (occ) selectWizard(occ.id);
    return;
  }
  const wizard = state.wizards[state.selectedWizardId];
  if (!wizard) return;

  const reselectOrBail = () => {
    const occ = wizardAt(state, row, col);
    if (occ && occ.id !== wizard.id) selectWizard(occ.id);
  };

  if (wizard.team !== 'player') {
    reselectOrBail();
    return;
  }

  if (state.selectedAction === 'move') {
    if (!canMove(wizard)) { reselectOrBail(); return; }
    const moveTiles = getMoveTiles(state, wizard);
    const isValid = moveTiles.some(t => t.row === row && t.col === col);
    if (!isValid) { reselectOrBail(); return; }
    const path = pathBFS(state, wizard, row, col);
    if (path) present(simMove(state, wizard, path)).then(afterPlayerAction);
  } else if (state.selectedAction === 'melee') {
    if (!canAttack(wizard)) { reselectOrBail(); return; }
    const tiles = getMeleeTiles(state, wizard);
    const isValid = tiles.some(t => t.row === row && t.col === col);
    if (!isValid) { reselectOrBail(); return; }
    resolveMeleeAttack(wizard, row, col);
  } else if (state.selectedAction === 'cast') {
    if (!canAttack(wizard)) { reselectOrBail(); return; }
    const tiles = getCastTiles(state, wizard);
    const isValid = tiles.some(t => t.row === row && t.col === col);
    if (!isValid) { reselectOrBail(); return; }
    resolveCastAttack(wizard, row, col);
  }
}
