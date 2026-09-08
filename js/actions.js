function pickWizardToSummon(id) {
  if (state.animating || !canAct()) return;
  const wizard = state.wizards[id];
  if (!wizard || wizard.state !== 'summoned') return;
  if (state.mana < wizard.cost) return; // can't afford — ignore the tap
  state.selectedWizardId = null; // picking a summon clears any board selection
  state.placingWizardId = (state.placingWizardId === id) ? null : id;
  render();
}

function placeWizard(row, col) {
  if (!canAct()) return;
  if (!state.placingWizardId) return;
  if (!isSummonTile(row, col)) return;
  if (isBlocked(row, col)) return; // occupied by a wizard or the nexus
  const wizard = state.wizards[state.placingWizardId];
  if (!wizard || wizard.state !== 'summoned') return;
  if (state.mana < wizard.cost) { state.placingWizardId = null; render(); return; } // safety net, shouldn't happen
  state.mana -= wizard.cost;
  wizard.state = 'onboard';
  wizard.row = row;
  wizard.col = col;
  state.placingWizardId = null;
  render();
}

function selectWizard(id) {
  if (state.animating || !canAct()) return;
  const wizard = state.wizards[id];
  if (!wizard || wizard.state !== 'onboard' || wizard.team !== 'player') return;
  if (state.selectedWizardId === id) {
    state.selectedWizardId = null;
  } else {
    state.selectedWizardId = id;
    state.selectedAction = 'move';
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
  state.selectedAction = action;
  render();
}

async function moveWizardAnimated(wizard, path) {
  state.animating = true;
  for (const step of path) {
    render(); // ensure current position rendered
    const tokenEl = document.querySelector('.wizard-token[data-id="' + wizard.id + '"]');
    if (tokenEl) {
      tokenEl.classList.add('lifted');
      await sleep(100);
    }
    wizard.row = step.row;
    wizard.col = step.col;
    render();
    const movedEl = document.querySelector('.wizard-token[data-id="' + wizard.id + '"]');
    if (movedEl) {
      movedEl.classList.add('lifted');
      await sleep(10);
      movedEl.classList.remove('lifted');
    }
    await sleep(90);
  }
  wizard.hasMoved = true;
  state.animating = false;
  render();
}

function handleTileClick(row, col) {
  if (state.animating || !canAct()) return;

  if (state.placingWizardId) {
    placeWizard(row, col);
    return;
  }

  if (!state.selectedWizardId) {
    // clicking an occupied tile selects that wizard
    const occ = wizardAt(row, col);
    if (occ) selectWizard(occ.id);
    return;
  }
  const wizard = state.wizards[state.selectedWizardId];
  if (!wizard) return;

  // Try to act first; if the tile isn't a valid target for the current mode, fall back to
  // reselecting whatever wizard is standing there (lets you switch wizards without deselecting
  // first, no matter which action mode you're currently in).
  const reselectOrBail = () => {
    const occ = wizardAt(row, col);
    if (occ && occ.id !== wizard.id) selectWizard(occ.id);
  };

  if (state.selectedAction === 'move') {
    if (wizard.hasMoved) { reselectOrBail(); return; }
    const moveTiles = getMoveTiles(wizard);
    const isValid = moveTiles.some(t => t.row === row && t.col === col);
    if (!isValid) { reselectOrBail(); return; }
    const path = pathBFS(wizard, row, col);
    if (path) moveWizardAnimated(wizard, path);
  } else if (state.selectedAction === 'melee') {
    if (wizard.hasAttacked) { reselectOrBail(); return; }
    const tiles = getMeleeTiles(wizard);
    const isValid = tiles.some(t => t.row === row && t.col === col);
    if (!isValid) { reselectOrBail(); return; }
    resolveMeleeAttack(wizard, row, col);
  } else if (state.selectedAction === 'cast') {
    if (wizard.hasAttacked) { reselectOrBail(); return; }
    const tiles = getCastTiles(wizard);
    const isValid = tiles.some(t => t.row === row && t.col === col);
    if (!isValid) { reselectOrBail(); return; }
    resolveCastAttack(wizard, row, col);
  }
}
