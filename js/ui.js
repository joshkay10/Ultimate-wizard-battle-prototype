function iconSpan(name, color) {
  return '<span style="color:' + color + '; display:flex; align-items:center; justify-content:center;">' + ICONS[name] + '</span>';
}

function castStatText(wiz) {
  if (wiz.castKind === 'raise') return 'raise';
  if (wiz.castKind === 'swap') return 'swap';
  if (wiz.castKind === 'bolt') return wiz.castAttack + '/sil';
  return wiz.castAttack + '/' + wiz.castDisplacement;
}

function ensureShell() {
  const app = document.getElementById('app');
  if (document.getElementById('board-canvas')) return;
  app.innerHTML =
    '<div class="topbar" id="topbar"></div>' +
    '<div class="board-wrap"><canvas id="board-canvas" class="board-canvas" width="640" height="640"></canvas></div>' +
    '<div id="panel-root"></div>' +
    '<div id="overlay-root"></div>';
  document.getElementById('board-canvas').addEventListener('pointerup', function (ev) {
    const cell = boardCanvasCellFromEvent(ev);
    if (cell) handleTileClick(cell.row, cell.col);
  });
}

function renderPanel() {
  const wizardCards = Object.values(state.wizards)
    .filter(w => w.team === 'player' && w.state !== 'dead')
    .sort((a, b) => {
      const aUsed = a.state === 'summoned' ? 0 : 1;
      const bUsed = b.state === 'summoned' ? 0 : 1;
      if (aUsed !== bUsed) return aUsed - bUsed;
      return parseInt(a.id.slice(1), 10) - parseInt(b.id.slice(1), 10);
    })
    .map(wiz => {
      const inHand = wiz.state === 'summoned';
      const isPicked = wiz.id === state.placingWizardId;
      const isBoardSelected = wiz.id === state.selectedWizardId;
      const clickable = inHand ? state.mana >= wiz.cost : wiz.state === 'onboard';
      const cardClasses = 'wizard-card ' + wiz.element
        + (inHand ? ' in-hand' : ' summoned')
        + (isPicked ? ' placing' : '')
        + (isBoardSelected ? ' board-selected' : '');

      return (
        '<div class="' + cardClasses + '">' +
          '<button class="wizard-card-hit" data-roster-id="' + wiz.id + '" data-clickable="' + (clickable ? '1' : '0') + '" ' + (clickable ? '' : 'disabled') + '>' +
            '<div class="wizard-card-icon ' + wiz.element + '">' + iconSpan(wiz.element, ELEMENT_COLOR[wiz.element]) + '</div>' +
            '<div class="wizard-card-top">' +
              '<div class="wizard-card-name">' + wiz.name + '</div>' +
              '<div class="wizard-cost-badge ' + wiz.element + '">' + wiz.cost + '</div>' +
            '</div>' +
            '<div class="wizard-stats">' +
              '<span class="wizard-stat">' + ICONS.melee + '<span>' + wiz.meleeAttack + '/' + wiz.meleeDisplacement + '</span></span>' +
              '<span class="wizard-stat">' + ICONS.cast + '<span>' + castStatText(wiz) + '</span></span>' +
              '<span class="wizard-stat">' + ICONS.heart + '<span>' + wiz.hp + '</span></span>' +
            '</div>' +
          '</button>' +
        '</div>'
      );
    })
    .join('');

  const placingHint = (state.placingWizardId && state.wizards[state.placingWizardId])
    ? '<div class="no-selection-hint">tap a highlighted tile in your back 3 rows to open a portal for ' + state.wizards[state.placingWizardId].name + '</div>'
    : '';

  return (
    '<div class="panel">' +
      placingHint +
      '<div>' +
        renderActionRow() +
        (wizardCards ? '<p class="panel-section-label">wizards</p><div class="wizard-grid">' + wizardCards + '</div>' : '') +
      '</div>' +
    '</div>'
  );
}

function renderActionRow() {
  const selected = state.selectedWizardId ? state.wizards[state.selectedWizardId] : null;
  const usable = !!(
    selected &&
    selected.state === 'onboard' &&
    selected.team === 'player' &&
    !state.placingWizardId &&
    !state.animating &&
    canAct()
  );
  const moveDisabled = !usable || !selected || !canMove(selected);
  const atkDisabled = !usable || !selected || !canAttack(selected);

  return (
    '<div class="action-row">' +
      '<button class="action-btn move' + (usable && !moveDisabled && state.selectedAction === 'move' ? ' active' : '') + '" data-action="move" ' + (moveDisabled ? 'disabled' : '') + '>' + ICONS.move + ' move</button>' +
      '<button class="action-btn melee' + (usable && !atkDisabled && state.selectedAction === 'melee' ? ' active' : '') + '" data-action="melee" ' + (atkDisabled ? 'disabled' : '') + '>' + ICONS.melee + ' melee</button>' +
      '<button class="action-btn cast' + (usable && !atkDisabled && state.selectedAction === 'cast' ? ' active' : '') + '" data-action="cast" ' + (atkDisabled ? 'disabled' : '') + '>' + ICONS.cast + ' cast</button>' +
      '<button class="end-turn-btn" id="end-turn-btn" ' + (canAct() ? '' : 'disabled') + '>end turn</button>' +
    '</div>'
  );
}

function renderGameOverOverlay() {
  if (!state.gameOverResult) return '';
  let heading, sub;
  if (state.gameOverResult === 'draw') {
    heading = 'draw';
    sub = 'all nexuses on both sides fell at the same time';
  } else if (state.gameOverResult === 'player') {
    heading = 'you win';
    sub = 'all enemy nexuses fell, or their wizards were wiped out';
  } else {
    heading = 'you lose';
    sub = 'all of your nexuses fell, or your wizards were wiped out';
  }
  return (
    '<div class="game-over-overlay">' +
      '<div class="game-over-card">' +
        '<div class="game-over-heading">' + heading + '</div>' +
        '<div class="game-over-sub">' + sub + '</div>' +
      '</div>' +
    '</div>'
  );
}

function attachHandlers() {
  document.querySelectorAll('[data-roster-id]').forEach(el => {
    el.addEventListener('click', () => {
      if (el.getAttribute('data-clickable') !== '1') return;
      const id = el.getAttribute('data-roster-id');
      const w = state.wizards[id];
      if (!w) return;
      if (w.state === 'summoned') pickWizardToSummon(id);
      else if (w.state === 'onboard') selectWizard(id);
    });
  });

  document.querySelectorAll('.action-btn').forEach(el => {
    el.addEventListener('click', () => {
      setAction(el.getAttribute('data-action'));
    });
  });

  const endTurnBtn = document.getElementById('end-turn-btn');
  if (endTurnBtn) endTurnBtn.addEventListener('click', endTurn);
}

function render() {
  ensureShell();
  const app = document.getElementById('app');
  app.classList.toggle('is-animating', state.animating);
  app.classList.toggle('is-enemy-turn', state.currentTurn === 'enemy' && !state.gameOverResult);
  const turnLabel = state.gameOverResult ? 'game over' : (state.currentTurn === 'player' ? 'your turn' : 'enemy turn');
  document.getElementById('topbar').innerHTML =
    '<div class="topbar-mana">' + ICONS.mana + state.mana + '<span class="mana-max">/' + state.maxMana + '</span></div>' +
    '<div class="topbar-round">round ' + state.turnCount + ' &middot; ' + turnLabel + '</div>';
  document.getElementById('panel-root').innerHTML = renderPanel();
  document.getElementById('overlay-root').innerHTML = renderGameOverOverlay();
  drawBoard();
  attachHandlers();
}
