function iconSpan(name, color) {
  return '<span style="color:' + color + '; display:flex; align-items:center; justify-content:center;">' + ICONS[name] + '</span>';
}

function renderBoard() {
  let highlightTiles = [];
  let highlightClass = '';
  const selectedWizard = state.selectedWizardId ? state.wizards[state.selectedWizardId] : null;

  if (state.placingWizardId && !state.animating) {
    highlightClass = 'summon-target';
    for (let r = SUMMON_ROW_START; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!isBlocked(r, c)) highlightTiles.push({ row: r, col: c });
      }
    }
  } else if (selectedWizard && !state.animating) {
    if (state.selectedAction === 'move') {
      highlightTiles = getMoveTiles(selectedWizard);
      highlightClass = 'move-target';
    } else if (state.selectedAction === 'melee') {
      highlightTiles = getMeleeTiles(selectedWizard);
      highlightClass = 'melee-target';
    } else if (state.selectedAction === 'cast') {
      highlightTiles = getCastTiles(selectedWizard);
      highlightClass = 'cast-target';
    }
  }

  let tiles = '';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const isAlt = (r + c) % 2 === 1;
      const occ = wizardAt(r, c);
      const nex = nexusAt(r, c);
      const isHighlighted = highlightTiles.some(t => t.row === r && t.col === c);
      let classes = 'tile' + (isAlt ? ' alt' : '');
      if (isSummonTile(r, c)) classes += ' summon-zone';
      const trail = trailAt(r, c);
      if (trail) classes += ' terrain-' + trail.element;
      if (nex) classes += ' nexus-tile';
      if (isHighlighted) classes += ' ' + highlightClass;
      if (occ && occ.id === state.selectedWizardId) classes += ' occupied-selected';

      let tokenHtml = '';
      if (occ) {
        const isSel = occ.id === state.selectedWizardId;
        const isEnemy = occ.team === 'enemy';
        tokenHtml = '<div class="wizard-token' + (isSel ? ' selected-ring' : '') + (isEnemy ? ' enemy-token' : '') + '" data-id="' + occ.id + '" data-wizard-token="1">' +
          iconSpan(occ.element, ELEMENT_COLOR[occ.element]) +
        '</div>';
      } else if (nex) {
        tokenHtml = '<div class="nexus-token" title="' + (nex === NEXUS.mine ? 'your nexus' : 'enemy nexus') + '">' +
          '<div class="nexus-hp-label">' + nex.hp + '</div>' +
        '</div>';
      }
      tiles += '<div class="' + classes + '" data-row="' + r + '" data-col="' + c + '">' + tokenHtml + '</div>';
    }
  }
  return '<div class="board-wrap"><div class="board">' + tiles + '</div></div>';
}

function renderPanel() {
  // Build a card for every wizard still alive, in roster order — summoned or on board.
  // Cards vanish only once a wizard is dead.
  const wizardCards = ROSTER.map((r, i) => {
    const type = WIZARD_TYPES.find(t => t.id === r.typeId);
    const sameType = Object.values(state.wizards)
      .filter(w => w.element === type.element && w.team === 'player')
      .sort((a, b) => parseInt(a.id.slice(1), 10) - parseInt(b.id.slice(1), 10));
    const indexAmongType = ROSTER.slice(0, i + 1).filter(x => x.typeId === r.typeId).length - 1;
    const wiz = sameType[indexAmongType];
    if (!wiz) return '';
    if (wiz.state === 'dead') return ''; // card vanishes on death

    const isPicked = wiz.id === state.placingWizardId;
    const isBoardSelected = wiz.id === state.selectedWizardId;
    const isSummoned = wiz.state === 'summoned';
    const affordable = state.mana >= wiz.cost;
    const clickable = isSummoned ? affordable : true;

    const stateLabel = isSummoned ? 'summoned' : 'on board';
    const cardClasses = 'wizard-card'
      + (isSummoned ? ' summoned' : '')
      + (isPicked ? ' placing' : '')
      + (isBoardSelected ? ' board-selected' : '');

    return (
      '<div class="' + cardClasses + '">' +
        '<button class="wizard-card-hit" data-roster-id="' + wiz.id + '" data-clickable="' + (clickable ? '1' : '0') + '" ' + (clickable ? '' : 'disabled') + '>' +
          '<div class="wizard-cost-badge ' + wiz.element + '">' + wiz.cost + '</div>' +
          '<div class="wizard-card-head">' +
            '<div class="wizard-card-icon">' + iconSpan(wiz.element, ELEMENT_COLOR[wiz.element]) + '</div>' +
            '<div>' +
              '<div class="wizard-card-name">' + wiz.name + '</div>' +
              '<div class="wizard-card-state">' + stateLabel + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="wizard-stats">' +
            '<span class="wizard-stat">' + ICONS.melee + '<span>' + wiz.meleeAttack + '/' + wiz.meleeDisplacement + '</span></span>' +
            '<span class="wizard-stat">' + ICONS.cast + '<span>' + wiz.castAttack + '/' + wiz.castDisplacement + '</span></span>' +
            '<span class="wizard-stat">' + ICONS.heart + '<span>' + wiz.hp + '/' + wiz.maxHp + '</span></span>' +
          '</div>' +
        '</button>' +
      '</div>'
    );
  }).filter(Boolean).join('');

  const placingHint = (state.placingWizardId && state.wizards[state.placingWizardId])
    ? '<div class="no-selection-hint">tap a highlighted tile in your back 3 rows to place ' + state.wizards[state.placingWizardId].name + '</div>'
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
  const moveDisabled = !usable || !selected || selected.hasMoved;
  const atkDisabled = !usable || !selected || selected.hasAttacked;

  return (
    '<div class="action-row">' +
      '<button class="action-btn move' + (usable && state.selectedAction === 'move' ? ' active' : '') + '" data-action="move" ' + (moveDisabled ? 'disabled' : '') + '>' + ICONS.move + ' move</button>' +
      '<button class="action-btn melee' + (usable && state.selectedAction === 'melee' ? ' active' : '') + '" data-action="melee" ' + (atkDisabled ? 'disabled' : '') + '>' + ICONS.melee + ' melee</button>' +
      '<button class="action-btn cast' + (usable && state.selectedAction === 'cast' ? ' active' : '') + '" data-action="cast" ' + (atkDisabled ? 'disabled' : '') + '>' + ICONS.cast + ' cast</button>' +
      '<button class="end-turn-btn" id="end-turn-btn" ' + (canAct() ? '' : 'disabled') + '>end turn</button>' +
    '</div>'
  );
}

function renderGameOverOverlay() {
  if (!state.gameOverResult) return '';
  let heading, sub;
  if (state.gameOverResult === 'draw') {
    heading = 'draw';
    sub = 'both nexuses fell at the same time';
  } else if (state.gameOverResult === 'player') {
    heading = 'you win';
    sub = 'the enemy nexus fell, or their wizards were wiped out';
  } else {
    heading = 'you lose';
    sub = 'your nexus fell, or your wizards were wiped out';
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
  document.querySelectorAll('.tile').forEach(el => {
    el.addEventListener('click', () => {
      const row = parseInt(el.getAttribute('data-row'), 10);
      const col = parseInt(el.getAttribute('data-col'), 10);
      handleTileClick(row, col);
    });
  });

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
  const app = document.getElementById('app');
  app.classList.toggle('is-animating', state.animating);
  app.classList.toggle('is-enemy-turn', state.currentTurn === 'enemy' && !state.gameOverResult);
  const turnLabel = state.gameOverResult ? 'game over' : (state.currentTurn === 'player' ? 'your turn' : 'enemy turn');
  app.innerHTML =
    '<div class="topbar">' +
      '<div class="topbar-mana">' + ICONS.mana + state.mana + '<span class="mana-max">/' + state.maxMana + '</span></div>' +
      '<div class="topbar-round">round ' + state.turnCount + ' &middot; ' + turnLabel + '</div>' +
    '</div>' +
    renderBoard() +
    renderPanel() +
    renderGameOverOverlay();

  attachHandlers();
}
