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
  const route = currentRoute();
  const nav = renderSiteNav(route);
  if (!document.getElementById('site-nav')) {
    app.innerHTML = nav + '<div id="view-root"></div>';
  } else {
    document.getElementById('site-nav').outerHTML = nav;
    if (!document.getElementById('view-root')) {
      const view = document.createElement('div');
      view.id = 'view-root';
      app.appendChild(view);
    }
  }
}

function ensurePlayShell() {
  const view = document.getElementById('view-root');
  if (document.getElementById('board-canvas')) return;
  view.innerHTML =
    '<div class="topbar" id="topbar"></div>' +
    '<div class="board-wrap"><canvas id="board-canvas" class="board-canvas" width="640" height="640"></canvas></div>' +
    '<div id="panel-root"></div>' +
    '<div id="overlay-root"></div>';
  document.getElementById('board-canvas').addEventListener('pointerup', function (ev) {
    const cell = boardCanvasCellFromEvent(ev);
    if (cell) handleTileClick(cell.row, cell.col);
  });
}

function ensureMatch() {
  if (!state.rng) resetMatch((Date.now() >>> 0) || 1);
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
      const arriving = wiz.state === 'portaling';
      const isPicked = wiz.id === state.placingWizardId;
      const isBoardSelected = wiz.id === state.selectedWizardId;
      const clickable = inHand ? state.mana >= wiz.cost : wiz.state === 'onboard';
      const cardClasses = 'wizard-card ' + wiz.element
        + (inHand ? ' in-hand' : ' summoned')
        + (arriving ? ' arriving' : '')
        + (isPicked ? ' placing' : '')
        + (isBoardSelected ? ' board-selected' : '');

      return (
        '<div class="' + cardClasses + '">' +
          '<button class="wizard-card-hit" data-roster-id="' + wiz.id + '" data-clickable="' + (clickable ? '1' : '0') + '" ' + (clickable ? '' : 'disabled') + '>' +
            '<div class="wizard-card-icon ' + wiz.element + '">' + iconSpan(wiz.element, '#ffffff') + '</div>' +
            '<div class="wizard-card-top">' +
              '<div class="wizard-card-id">' +
                '<div class="wizard-card-name">' + wiz.name + (arriving ? ' <span class="arriving-tag">arriving</span>' : '') + '</div>' +
                '<div class="wizard-card-element">' + wiz.element + '</div>' +
              '</div>' +
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
    ? '<div class="no-selection-hint">tap a highlighted tile in your back 3 rows. ' + state.wizards[state.placingWizardId].name + ' arrives at the start of your next turn.</div>'
    : (state.selectedWizardId && state.wizards[state.selectedWizardId] && state.selectedAction === 'cast'
      ? '<div class="no-selection-hint"><strong>' + (state.wizards[state.selectedWizardId].castKind || 'cast') + '</strong> — ' + (CAST_HINT[state.wizards[state.selectedWizardId].castKind] || 'tap a highlighted tile') + '</div>'
      : '');

  const logLines = recentLogLines(5);
  const logHtml = logLines.length
    ? '<p class="panel-section-label">log</p><ul class="action-log">' + logLines.map(function (line) {
      return '<li>' + line + '</li>';
    }).join('') + '</ul>'
    : '';

  return (
    '<div class="panel">' +
      placingHint +
      '<div>' +
        renderActionRow() +
        (wizardCards ? '<p class="panel-section-label">wizards</p><div class="wizard-grid">' + wizardCards + '</div>' : '') +
        logHtml +
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

  const castLabel = (selected && selected.castKind) ? selected.castKind : 'cast';

  return (
    '<div class="action-row">' +
      '<button class="action-btn move' + (usable && !moveDisabled && state.selectedAction === 'move' ? ' active' : '') + '" data-action="move" ' + (moveDisabled ? 'disabled' : '') + '>' + ICONS.move + ' move</button>' +
      '<button class="action-btn melee' + (usable && !atkDisabled && state.selectedAction === 'melee' ? ' active' : '') + '" data-action="melee" ' + (atkDisabled ? 'disabled' : '') + '>' + ICONS.melee + ' melee</button>' +
      '<button class="action-btn cast' + (usable && !atkDisabled && state.selectedAction === 'cast' ? ' active' : '') + '" data-action="cast" ' + (atkDisabled ? 'disabled' : '') + '>' + ICONS.cast + ' ' + castLabel + '</button>' +
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
        '<button class="end-turn-btn rematch-btn" id="rematch-btn" type="button">new match</button>' +
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
  const rematchBtn = document.getElementById('rematch-btn');
  if (rematchBtn) {
    rematchBtn.addEventListener('click', function (ev) {
      ev.preventDefault();
      rematch();
    });
  }
  const newMatchBtn = document.getElementById('new-match-btn');
  if (newMatchBtn) {
    newMatchBtn.addEventListener('click', function (ev) {
      ev.preventDefault();
      rematch();
    });
  }
}

function render() {
  ensureShell();
  const route = currentRoute();
  document.title = routeTitle(route);
  const app = document.getElementById('app');

  if (route !== 'play') {
    app.classList.add('is-doc');
    app.classList.remove('is-animating', 'is-enemy-turn');
    document.getElementById('view-root').innerHTML = renderDocPage(route);
    return;
  }

  app.classList.remove('is-doc');
  ensureMatch();
  ensurePlayShell();
  app.classList.toggle('is-animating', state.animating);
  app.classList.toggle('is-enemy-turn', state.currentTurn === 'enemy' && !state.gameOverResult);
  const turnLabel = state.gameOverResult ? 'game over' : (state.currentTurn === 'player' ? 'your turn' : 'enemy turn');
  document.getElementById('topbar').innerHTML =
    '<div class="topbar-mana">' + ICONS.mana + state.mana + '<span class="mana-max">/' + state.maxMana + '</span></div>' +
    '<div class="topbar-round">round ' + state.turnCount + ' &middot; ' + turnLabel + '</div>' +
    '<button class="new-match-btn" id="new-match-btn" type="button">new match</button>';
  document.getElementById('panel-root').innerHTML = renderPanel();
  document.getElementById('overlay-root').innerHTML = renderGameOverOverlay();
  drawBoard();
  attachHandlers();
}
