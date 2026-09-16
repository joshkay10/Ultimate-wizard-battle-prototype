function selectWizard(id) {
  if (state.animating || !canAct()) return;
  const wizard = state.wizards[id];
  if (!wizard || wizard.state !== 'onboard') return;
  if (state.selectedWizardId === id) {
    state.selectedWizardId = null;
  } else {
    state.selectedWizardId = id;
    if (typeof setActiveSpell === 'function') setActiveSpell(wizard, 'basic');
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
  if (typeof canUseWizard === 'function' && !canUseWizard(state, wizard)) return;
  if (action === 'special') {
    if (!wizard.specialSpellId) return;
    if (typeof setActiveSpell === 'function') setActiveSpell(wizard, 'special');
    state.selectedAction = 'special';
  } else {
    if (typeof setActiveSpell === 'function') setActiveSpell(wizard, 'basic');
    state.selectedAction = action;
  }
  render();
}

function undoSelectedMove() {
  if (state.animating || !canAct()) return;
  let wizard = state.selectedWizardId ? state.wizards[state.selectedWizardId] : null;
  if (!canUndoMove(wizard) && typeof actingWizardOnTurn === 'function') {
    wizard = actingWizardOnTurn(state, 'player');
  }
  if (!canUndoMove(wizard)) return;
  present(simUndoMove(state, wizard)).then(function () {
    state.selectedWizardId = wizard.id;
    state.selectedAction = 'move';
    afterPlayerAction();
  });
}

function handleTileClick(row, col) {
  if (state.animating || !canAct()) return;

  if (!state.selectedWizardId) {
    const occ = wizardAt(state, row, col);
    if (occ) selectWizard(occ.id);
    return;
  }
  const wizard = state.wizards[state.selectedWizardId];
  if (!wizard) return;

  const reselectOrBail = function () {
    const occ = wizardAt(state, row, col);
    if (occ && occ.id !== wizard.id) selectWizard(occ.id);
  };

  if (wizard.team !== 'player') {
    reselectOrBail();
    return;
  }

  if (typeof canUseWizard === 'function' && !canUseWizard(state, wizard)) {
    reselectOrBail();
    return;
  }
  if (state.selectedAction === 'melee' && canAttack(wizard)) {
    const meleeTiles = getMeleeTiles(state, wizard);
    if (meleeTiles.some(function (t) { return t.row === row && t.col === col; })) {
      resolveMeleeAttack(wizard, row, col);
      return;
    }
    reselectOrBail();
    return;
  }
  if ((state.selectedAction === 'cast' || state.selectedAction === 'special') && canAttack(wizard)) {
    if (typeof canPayCast === 'function' && !canPayCast(state, wizard, 'player', state.selectedAction === 'special' ? 'special' : 'basic')) {
      reselectOrBail();
      return;
    }
    const castTiles = getCastTiles(state, wizard);
    if (castTiles.some(function (t) { return t.row === row && t.col === col; })) {
      resolveCastAttack(wizard, row, col);
      return;
    }
    reselectOrBail();
    return;
  }
  if (canMove(wizard)) {
    const moveTiles = getMoveTiles(state, wizard);
    const isMove = moveTiles.some(function (t) { return t.row === row && t.col === col; });
    if (isMove) {
      const path = pathBFS(state, wizard, row, col);
      if (path) present(simMove(state, wizard, path)).then(afterPlayerAction);
      return;
    }
  }
  if (canAttack(wizard)) {
    const meleeTiles = getMeleeTiles(state, wizard);
    if (meleeTiles.some(function (t) { return t.row === row && t.col === col; })) {
      resolveMeleeAttack(wizard, row, col);
      return;
    }
    if (typeof canPayCast !== 'function' || canPayCast(state, wizard, 'player')) {
      const castTiles = getCastTiles(state, wizard);
      if (castTiles.some(function (t) { return t.row === row && t.col === col; })) {
        resolveCastAttack(wizard, row, col);
        return;
      }
    }
  }
  reselectOrBail();
}
