function iconSpan(name, color) {
  if (ELEMENT_ICON_ORDER.indexOf(name) >= 0) {
    return '<span class="el-icon el-icon-' + name + '" aria-hidden="true"></span>';
  }
  return '<span style="color:' + color + '; display:flex; align-items:center; justify-content:center;">' + ICONS[name] + '</span>';
}

function castStatText(wiz) {
  if (wiz.castKind === 'raise' || wiz.castKind === 'swap' || wiz.castKind === 'blink') {
    return (wiz.spellName || wiz.castKind).toLowerCase();
  }
  if (wiz.spellSilence || wiz.castKind === 'bolt') return wiz.castAttack + '/sil';
  if (wiz.spellName && !wiz.castAttack && !wiz.castDisplacement) return wiz.spellName.toLowerCase();
  return wiz.castAttack + '/' + wiz.castDisplacement;
}

function castHintFor(wiz) {
  if (!wiz) return 'tap a highlighted tile';
  return CAST_HINT[wiz.spellId] || CAST_HINT[wiz.castKind] || 'tap a highlighted tile';
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
  if (!state.rng) startBattle();
}

function defenseCityFlawless() {
  const list = state.nexuses && state.nexuses.player ? state.nexuses.player : [];
  if (!list.length) return false;
  return list.every(function (n) { return n.hp >= n.maxHp; });
}

function maybeRecordResult() {
  if (!state.gameOverResult || state.resultRecorded) return;
  state.resultRecorded = true;
  const mode = state.gameMode === 'vs' ? 'vs' : 'defense';
  const flawless = mode === 'defense' && state.gameOverResult === 'player' && defenseCityFlawless();
  const rec = typeof recordMatchStats === 'function'
    ? recordMatchStats(mode, state.gameOverResult, flawless)
    : { stats: { streak: 0, best: 0, flawless: 0, wins: 0 }, prevStreak: 0 };
  const playerNex = state.nexuses && state.nexuses.player ? state.nexuses.player : [];
  state.matchSummary = {
    result: state.gameOverResult,
    mode: mode,
    rounds: state.turnCount,
    invaders: typeof defenseEverSpawned === 'function' ? defenseEverSpawned(state) : 0,
    invadersTotal: typeof defenseSpawnBudget === 'function' ? defenseSpawnBudget(state) : DEFENSE_SPAWN_BUDGET,
    missionTitle: state.missionTitle || '',
    crystals: playerNex.filter(function (n) { return n.hp > 0; }).length,
    crystalsTotal: playerNex.length,
    flawless: flawless,
    bestCombo: state.matchBestCombo || 0,
    stats: rec.stats,
    prevStreak: rec.prevStreak
  };
}

function renderPanel() {
  const wizardCards = Object.values(state.wizards)
    .filter(w => w.team === 'player' && (w.state === 'summoned' || w.state === 'portaling'))
    .sort((a, b) => parseInt(a.id.slice(1), 10) - parseInt(b.id.slice(1), 10))
    .map(wiz => {
      const inHand = wiz.state === 'summoned';
      const arriving = wiz.state === 'portaling';
      const isPicked = wiz.id === state.placingWizardId;
      const clickable = inHand && canPaySummon(state, wiz, 'player');
      const cardClasses = 'wizard-card ' + wiz.element
        + (inHand ? ' in-hand' : ' summoned')
        + (arriving ? ' arriving' : '')
        + (isPicked ? ' placing' : '');
      const costBadge = state.gameMode === 'defense'
        ? ''
        : '<div class="wizard-cost-badge ' + wiz.element + '">' + wiz.cost + '</div>';

      return (
        '<div class="' + cardClasses + '">' +
          '<button class="wizard-card-hit" data-roster-id="' + wiz.id + '" data-clickable="' + (clickable ? '1' : '0') + '" ' + (clickable ? '' : 'disabled') + '>' +
            '<div class="wizard-card-icon ' + wiz.element + '">' + iconSpan(wiz.element, '#ffffff') + '</div>' +
            '<div class="wizard-card-top">' +
              '<div class="wizard-card-id">' +
                '<div class="wizard-card-name">' + wiz.name + (arriving ? ' <span class="arriving-tag">arriving</span>' : '') + '</div>' +
                '<div class="wizard-card-element">' + (wiz.spellName || wiz.element) + '</div>' +
              '</div>' +
              costBadge +
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

  const selected = state.selectedWizardId ? state.wizards[state.selectedWizardId] : null;
  const placingHint = (state.placingWizardId && state.wizards[state.placingWizardId])
    ? '<div class="no-selection-hint">tap a highlighted tile. ' + state.wizards[state.placingWizardId].name + (state.gameMode === 'defense' ? ' lands with a burst, then is spent this turn.' : ' arrives next turn with a burst, then is spent.') + '</div>'
    : '';

  const logLines = recentLogLines(5);
  const logHtml = logLines.length
    ? '<p class="panel-section-label">log</p><ul class="action-log">' + logLines.map(function (line) {
      return '<li>' + line + '</li>';
    }).join('') + '</ul>'
    : '';

  const handNote = state.gameMode === 'defense'
    ? (state.playerSummonedThisTurn ? 'already dropped' : '1 drop this turn')
    : '';
  const handLabel = wizardCards
    ? '<p class="panel-section-label">in hand' + (handNote ? ' · ' + handNote : '') + '</p><div class="wizard-grid">' + wizardCards + '</div>'
    : '';

  return (
    '<div class="panel">' +
      placingHint +
      '<div>' +
        renderInspect(selected) +
        renderActionRow(selected) +
        handLabel +
        logHtml +
      '</div>' +
    '</div>'
  );
}

function wizardStatusBits(wiz) {
  const bits = [];
  if (wiz.pawnKind) {
    if ((wiz.stack || 1) >= 2) {
      bits.push('stacked \u00d7' + wiz.stack);
      bits.push('hits for ' + (wiz.meleeAttack * wiz.stack));
    }
    if (wiz.rooted) bits.push('locked');
    if (wiz.burn) bits.push('burn ' + wiz.burn);
    if (wiz.intent) {
      const dir = compassWord(0, 0, wiz.intent.dr, wiz.intent.dc);
      const strikeAt = defenseStrikeIndex(state, wiz);
      if (strikeAt >= 0) bits.push(defenseOrdinal(strikeAt + 1) + ' to strike');
      bits.push(defenseKindLabel(wiz.pawnKind) + (dir ? ' ' + dir : ''));
    } else {
      bits.push('no telegraph');
    }
    return bits;
  }
  if (wiz.rooted) bits.push('locked');
  if (wiz.burn) bits.push('burn ' + wiz.burn);
  if (wiz.summoningSickness) {
    bits.push('summoning sickness');
    bits.push('burst spent');
    return bits;
  }
  else if (wiz.silenced) bits.push('silenced');
  if (wiz.hasMoved) bits.push('moved');
  else bits.push('can move');
  if (wiz.hasAttacked && !wiz.silenceSkip) bits.push('attacked');
  else if (!wiz.hasAttacked) bits.push('can attack');
  return bits;
}

function renderInspect(selected) {
  if (!selected || selected.state !== 'onboard' || state.placingWizardId) {
    if (state.selectedWizardId && state.wizards[state.selectedWizardId] && (state.selectedAction === 'cast' || state.selectedAction === 'special') && !state.placingWizardId) {
      const wiz = state.wizards[state.selectedWizardId];
      return '<div class="no-selection-hint"><strong>' + spellLabel(wiz) + '</strong> — ' + castHintFor(wiz) + '</div>';
    }
    return '';
  }
  const bits = wizardStatusBits(selected);
  const hint = (state.selectedAction === 'cast' || state.selectedAction === 'special') && selected.team === 'player'
    ? '<div class="inspect-hint"><strong>' + spellLabel(selected) + '</strong> — ' + castHintFor(selected) + '</div>'
    : '';
  const enemyTag = selected.team === 'enemy' ? ' <span class="arriving-tag">enemy</span>' : '';
  return (
    '<div class="inspect ' + selected.element + '">' +
      '<div class="inspect-icon ' + selected.element + '">' + iconSpan(selected.element, '#ffffff') + '</div>' +
      '<div class="inspect-copy">' +
        '<div class="inspect-name">' + selected.name + enemyTag + '</div>' +
        '<div class="inspect-spell">' + (selected.pawnKind ? defenseKindLabel(selected.pawnKind) + ' ' + (selected.castRange || 1) + ' · ' : (selected.spellName || selected.element) + ' · ') + selected.hp + '/' + selected.maxHp + ' hp</div>' +
        '<div class="inspect-status">' + bits.join(' · ') + '</div>' +
      '</div>' +
      hint +
    '</div>'
  );
}

function renderActionRow(selected) {
  selected = selected || (state.selectedWizardId ? state.wizards[state.selectedWizardId] : null);
  const usable = !!(
    selected &&
    selected.state === 'onboard' &&
    selected.team === 'player' &&
    !state.placingWizardId &&
    !state.animating &&
    canAct()
  );
  const sick = !!(selected && selected.summoningSickness);
  const moved = !!(selected && (selected.hasMoved || sick));
  const attacked = !!(selected && (selected.hasAttacked || sick));
  const moveDisabled = !usable || !selected || !canMove(selected);
  const atkDisabled = !usable || !selected || !canAttack(selected);
  const undoOk = usable && canUndoMove(selected);
  const basicSpell = selected ? spellById(selected.basicSpellId || selected.spellId) : null;
  const basicLabel = basicSpell ? basicSpell.name.toLowerCase() : 'cast';
  const specialSpell = selected && selected.specialSpellId ? spellById(selected.specialSpellId) : null;
  const specialCost = selected ? (selected.specialCost || 0) : 0;
  const affordSpecial = !!(usable && specialSpell && !atkDisabled && typeof canCastSpecial === 'function' && canCastSpecial(state, selected, 'player'));
  const moveLabel = sick ? 'sick' : (moved ? 'moved' : 'move');
  const meleeLabel = sick ? 'sick' : (attacked ? 'spent' : 'melee');
  const spentCast = sick ? 'sick' : (attacked ? 'spent' : basicLabel);
  const specialLabel = specialSpell ? specialSpell.name.toLowerCase() : 'special';
  const specialSpent = sick ? 'sick' : (attacked ? 'spent' : specialLabel);
  const specialBtn = specialSpell
    ? '<button class="action-btn special' + (usable && !atkDisabled && state.selectedAction === 'special' ? ' active' : '') + (attacked ? ' spent' : '') + '" data-action="special" ' + (affordSpecial ? '' : 'disabled') + '>' + ICONS.cast + ' ' + specialSpent + '<span class="special-cost">' + ICONS.mana + specialCost + '</span></button>'
    : '';

  return (
    '<div class="action-row">' +
      '<button class="action-btn move' + (usable && !moveDisabled && state.selectedAction === 'move' ? ' active' : '') + (moved ? ' spent' : '') + '" data-action="move" ' + (moveDisabled ? 'disabled' : '') + '>' + ICONS.move + ' ' + moveLabel + '</button>' +
      '<button class="action-btn melee' + (usable && !atkDisabled && state.selectedAction === 'melee' ? ' active' : '') + (attacked ? ' spent' : '') + '" data-action="melee" ' + (atkDisabled ? 'disabled' : '') + '>' + ICONS.melee + ' ' + meleeLabel + '</button>' +
      '<button class="action-btn cast' + (usable && !atkDisabled && state.selectedAction === 'cast' ? ' active' : '') + (attacked ? ' spent' : '') + '" data-action="cast" ' + (atkDisabled ? 'disabled' : '') + '>' + ICONS.cast + ' ' + spentCast + '</button>' +
      specialBtn +
      '<button class="action-btn undo" id="undo-move-btn" ' + (undoOk ? '' : 'disabled') + '>undo</button>' +
      '<button class="end-turn-btn" id="end-turn-btn" ' + (canAct() ? '' : 'disabled') + '>end turn</button>' +
    '</div>'
  );
}

function statChip(label, value, cls) {
  return '<div class="stat-chip' + (cls ? ' ' + cls : '') + '">' +
    '<span class="stat-chip-value">' + value + '</span>' +
    '<span class="stat-chip-label">' + label + '</span>' +
  '</div>';
}

function renderGameOverStats() {
  const s = state.matchSummary;
  if (!s) return '';
  const chips = [];
  const isDefense = s.mode === 'defense';
  const win = s.result === 'player';

  if (win && isDefense) {
    chips.push(statChip('invaders wiped', s.invaders + '/' + (s.invadersTotal || DEFENSE_SPAWN_BUDGET)));
  }
  chips.push(statChip('rounds', s.rounds));
  if (isDefense && win) {
    chips.push(statChip('crystals held', s.crystals + '/' + s.crystalsTotal, s.flawless ? 'good' : ''));
  }
  if (s.bestCombo >= 2) {
    chips.push(statChip('best combo', '\u00d7' + s.bestCombo, 'hot'));
  }
  chips.push(statChip(win ? 'win streak' : 'best streak', win ? s.stats.streak : s.stats.best, win && s.stats.streak >= 2 ? 'good' : ''));

  const banner = s.flawless
    ? '<div class="game-over-flawless">FLAWLESS DEFENSE</div>'
    : (!win && s.prevStreak >= 2 ? '<div class="game-over-streak-break">streak of ' + s.prevStreak + ' broken</div>' : '');

  return banner + '<div class="game-over-stats">' + chips.join('') + '</div>';
}

function renderGameOverOverlay() {
  if (!state.gameOverResult) return '';
  let heading, sub;
  if (state.gameOverResult === 'draw') {
    heading = 'draw';
    sub = 'all nexuses on both sides fell at the same time';
  } else if (state.gameOverResult === 'player') {
    heading = 'you win';
    sub = state.gameMode === 'defense'
      ? ((state.missionTitle || 'the island') + ' is clear')
      : 'all enemy nexuses fell, or their wizards were wiped out';
  } else {
    heading = 'you lose';
    sub = state.gameMode === 'defense'
      ? 'your nexuses fell, or your wizards were wiped out'
      : 'all of your nexuses fell, or your wizards were wiped out';
  }
  return (
    '<div class="game-over-overlay">' +
      '<div class="game-over-card' + (state.gameOverResult === 'player' ? ' is-win' : '') + '">' +
        '<div class="game-over-heading">' + heading + '</div>' +
        '<div class="game-over-sub">' + sub + '</div>' +
        renderGameOverStats() +
        '<button class="end-turn-btn rematch-btn" id="rematch-btn" type="button">new match</button>' +
        (state.missionId
          ? '<a class="game-over-team" href="' + routeHref('team') + '">mission team</a>'
          : '<a class="game-over-team" href="' + routeHref('team') + '">edit loadout</a>') +
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
      if (el.id === 'undo-move-btn') return;
      setAction(el.getAttribute('data-action'));
    });
  });

  const undoBtn = document.getElementById('undo-move-btn');
  if (undoBtn) undoBtn.addEventListener('click', undoSelectedMove);

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
  const modeSelect = document.getElementById('game-mode');
  if (modeSelect) {
    modeSelect.addEventListener('change', function () {
      setGameMode(modeSelect.value);
    });
  }
}

function defenseDropHud() {
  const inHand = Object.values(state.wizards).some(function (w) {
    return w.team === 'player' && w.state === 'summoned';
  });
  if (!inHand) return '<div class="topbar-mana topbar-drop is-empty" aria-hidden="true"></div>';
  if (state.playerSummonedThisTurn) {
    return '<div class="topbar-mana topbar-drop is-spent">dropped</div>';
  }
  return '<div class="topbar-mana topbar-drop">1 drop</div>';
}

function playlistSelectValue() {
  if (state.gameMode === 'vs') return 'vs';
  if (state.missionId) return state.missionId;
  return typeof loadPlaylistId === 'function' ? loadPlaylistId() : 'mission-1';
}

function renderPlaylistSelect() {
  const selected = playlistSelectValue();
  const missions = typeof MISSIONS !== 'undefined' ? MISSIONS : [];
  let html = '<label class="mode-select"><select id="game-mode" aria-label="mission">';
  missions.forEach(function (m) {
    html += '<option value="' + m.id + '"' + (selected === m.id ? ' selected' : '') + '>' + m.title + '</option>';
  });
  html += '<option value="vs"' + (selected === 'vs' ? ' selected' : '') + '>Vs</option>';
  html += '</select></label>';
  return html;
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
    if (route === 'team') bindTeamPage();
    if ((route === 'rules' || route === 'todo') && typeof fillMarkdownPage === 'function') {
      fillMarkdownPage(route);
    }
    return;
  }

  app.classList.remove('is-doc');
  ensureMatch();
  maybeRecordResult();
  ensurePlayShell();
  app.classList.toggle('is-animating', state.animating);
  app.classList.toggle('is-enemy-turn', state.currentTurn === 'enemy' && !state.gameOverResult);
  const turnLabel = state.gameOverResult ? 'game over' : (state.currentTurn === 'player' ? 'your turn' : 'enemy turn');
  const vs = state.gameMode === 'vs'
    ? loadoutNamed(state.enemyLoadout && state.enemyLoadout.length ? state.enemyLoadout : (state.enemyTeam || [])).join(' · ')
    : '';
  const mode = state.gameMode === 'vs' ? 'vs' : 'defense';
  const island = state.gameMode === 'defense' && (state.missionTitle || state.mapName)
    ? '<span class="topbar-map">' + (state.missionTitle || state.mapName) + '</span>'
    : '';
  const invaders = state.gameMode === 'defense'
    ? '<span class="topbar-invaders">' + defenseEverSpawned(state) + '/' + defenseSpawnBudget(state) + ' invaders</span>'
    : '';
  const streakStats = typeof loadModeStats === 'function' ? loadModeStats(mode) : null;
  const streakHud = streakStats && (streakStats.streak > 0 || streakStats.best > 0)
    ? '<span class="topbar-streak" title="win streak · best">streak ' + streakStats.streak + (streakStats.best > streakStats.streak ? ' · best ' + streakStats.best : '') + '</span>'
    : '';
  const manaHud = '<div class="topbar-mana">' + ICONS.mana + state.mana + '<span class="mana-max">/' + state.maxMana + '</span></div>';
  const leftHud = state.gameMode === 'defense'
    ? (defenseDropHud() + manaHud)
    : manaHud;
  document.getElementById('topbar').innerHTML =
    leftHud +
    '<div class="topbar-round">round ' + state.turnCount + ' &middot; ' + turnLabel + (island ? ' &middot; ' + island : '') + (invaders ? ' &middot; ' + invaders : '') + (streakHud ? ' &middot; ' + streakHud : '') + (vs ? '<span class="topbar-vs"> vs ' + vs + '</span>' : '') + '</div>' +
    renderPlaylistSelect() +
    '<button class="new-match-btn" id="new-match-btn" type="button">new match</button>';
  document.getElementById('panel-root').innerHTML = renderPanel();
  document.getElementById('overlay-root').innerHTML = renderGameOverOverlay();
  drawBoard();
  attachHandlers();
}
