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
  if (!document.getElementById('view-root')) {
    app.innerHTML = '<div id="view-root"></div>' + nav;
  } else if (document.getElementById('site-nav')) {
    document.getElementById('site-nav').outerHTML = nav;
  } else {
    app.insertAdjacentHTML('beforeend', nav);
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

function maybeRecordResult() {
  if (!state.gameOverResult || state.resultRecorded) return;
  state.resultRecorded = true;
  const rec = typeof recordMatchStats === 'function'
    ? recordMatchStats('vs', state.gameOverResult, false)
    : { stats: { streak: 0, best: 0, flawless: 0, wins: 0 }, prevStreak: 0 };
  const playerNex = state.nexuses && state.nexuses.player ? state.nexuses.player : [];
  state.matchSummary = {
    result: state.gameOverResult,
    mode: 'vs',
    rounds: state.turnCount,
    crystals: playerNex.filter(function (n) { return n.hp > 0; }).length,
    crystalsTotal: playerNex.length,
    flawless: false,
    dunks: state.matchDunks || 0,
    bestCombo: state.matchBestCombo || 0,
    stats: rec.stats,
    prevStreak: rec.prevStreak
  };
}

function renderPanel() {
  const selected = state.selectedWizardId ? state.wizards[state.selectedWizardId] : null;
  return (
    '<div class="panel is-vs-hud">' +
      renderSelectedCard(selected) +
      renderVsPassRow() +
    '</div>'
  );
}

function wizardStatusBits(wiz) {
  const bits = [];
  if (wiz.rooted) bits.push('locked');
  if (wiz.burn) bits.push('burn ' + wiz.burn);
  if (wiz.summoningSickness) {
    bits.push('summoning sickness');
    bits.push('burst spent');
    return bits;
  }
  else if (wiz.silenced) bits.push('silenced');
  if (typeof canUseWizard === 'function' && state && wiz.team === 'player' && !canUseWizard(state, wiz)) {
    bits.push('wait');
    return bits;
  }
  if (wiz.hasMoved) bits.push('moved');
  else bits.push('can move');
  if (wiz.hasAttacked && !wiz.silenceSkip) bits.push('attacked');
  else if (!wiz.hasAttacked) bits.push('can attack');
  return bits;
}

function manaCostBadge(amount) {
  return '<span class="special-cost">' + ICONS.mana + amount + '</span>';
}

function vsUndoWizard() {
  const selected = state.selectedWizardId ? state.wizards[state.selectedWizardId] : null;
  if (canUndoMove(selected)) return selected;
  const actor = typeof actingWizardOnTurn === 'function' ? actingWizardOnTurn(state, 'player') : null;
  return canUndoMove(actor) ? actor : null;
}

function renderVsPassRow() {
  const undoOk = !state.animating && canAct() && !!vsUndoWizard();
  return (
    '<div class="action-row is-pass">' +
      '<button class="action-btn undo" id="undo-move-btn" ' + (undoOk ? '' : 'disabled') + '>undo</button>' +
      '<button class="end-turn-btn" id="end-turn-btn" ' + (canAct() ? '' : 'disabled') + '>end turn</button>' +
    '</div>'
  );
}

function renderSelectedCard(wiz) {
  if (!wiz || wiz.state !== 'onboard') {
    return '<div class="no-selection-hint">tap a wizard</div>';
  }
  const bits = wizardStatusBits(wiz);
  const basic = spellById(wiz.basicSpellId || wiz.spellId);
  const special = wiz.specialSpellId ? spellById(wiz.specialSpellId) : null;
  const basicCost = typeof basicManaCost === 'function' ? basicManaCost(wiz) : (wiz.cost || 0);
  const specialCost = typeof specialManaCost === 'function' ? specialManaCost(wiz) : (wiz.specialCost || 0);
  const mine = wiz.team === 'player';
  const usable = mine && !state.animating && canAct() && !wiz.summoningSickness && (typeof canUseWizard !== 'function' || canUseWizard(state, wiz));
  const atkOk = usable && canAttack(wiz);
  const affordBasic = atkOk && (typeof canPayCast !== 'function' || canPayCast(state, wiz, 'player', 'basic'));
  const affordSpecial = atkOk && !!special && (typeof canCastSpecial !== 'function' || canCastSpecial(state, wiz, 'player'));
  const enemyTag = mine ? '' : ' <span class="arriving-tag">enemy</span>';
  const basicName = basic ? basic.name : 'spell 1';
  const specialName = special ? special.name : 'spell 2';
  const meleeOn = usable && atkOk && state.selectedAction === 'melee';
  const basicOn = usable && atkOk && state.selectedAction === 'cast';
  const specialOn = usable && atkOk && state.selectedAction === 'special';
  const attacks = mine
    ? (
      '<div class="profile-actions">' +
        '<button class="action-btn melee' + (meleeOn ? ' active' : '') + (wiz.hasAttacked ? ' spent' : '') + '" data-action="melee" ' + (atkOk ? '' : 'disabled') + '>' +
          ICONS.melee + ' melee' + manaCostBadge(0) +
        '</button>' +
        '<button class="action-btn cast' + (basicOn ? ' active' : '') + (wiz.hasAttacked ? ' spent' : '') + '" data-action="cast" ' + (affordBasic ? '' : 'disabled') + '>' +
          ICONS.cast + ' ' + basicName.toLowerCase() + manaCostBadge(basicCost) +
        '</button>' +
        (special
          ? '<button class="action-btn special' + (specialOn ? ' active' : '') + (wiz.hasAttacked ? ' spent' : '') + '" data-action="special" ' + (affordSpecial ? '' : 'disabled') + '>' +
              ICONS.cast + ' ' + specialName.toLowerCase() + manaCostBadge(specialCost) +
            '</button>'
          : '') +
      '</div>'
    )
    : (
      '<div class="profile-costs">' +
        '<span>melee ' + manaCostBadge(0) + '</span>' +
        '<span>' + basicName.toLowerCase() + ' ' + manaCostBadge(basicCost) + '</span>' +
        (special ? '<span>' + specialName.toLowerCase() + ' ' + manaCostBadge(specialCost) + '</span>' : '') +
      '</div>'
    );
  const hint = (state.selectedAction === 'cast' || state.selectedAction === 'special') && mine
    ? '<div class="inspect-hint"><strong>' + spellLabel(wiz) + '</strong> — ' + castHintFor(wiz) + '</div>'
    : '';
  return (
    '<div class="wizard-card selected-profile ' + wiz.element + '">' +
      '<div class="wizard-card-hit is-static">' +
        '<div class="wizard-card-icon ' + wiz.element + '">' + iconSpan(wiz.element, '#ffffff') + '</div>' +
        '<div class="wizard-card-top">' +
          '<div class="wizard-card-id">' +
            '<div class="wizard-card-name">' + wiz.name + enemyTag + '</div>' +
            '<div class="wizard-card-element">' + (wiz.spellName || wiz.element) + '</div>' +
          '</div>' +
          '<div class="wizard-cost-badge ' + wiz.element + '">' + wiz.hp + '/' + wiz.maxHp + '</div>' +
        '</div>' +
        '<div class="wizard-stats">' +
          '<span class="wizard-stat">' + ICONS.melee + '<span>' + wiz.meleeAttack + '/' + wiz.meleeDisplacement + '</span></span>' +
          '<span class="wizard-stat">' + ICONS.cast + '<span>' + castStatText(wiz) + '</span></span>' +
          '<span class="wizard-stat">' + ICONS.heart + '<span>' + wiz.hp + '</span></span>' +
        '</div>' +
        (bits.length ? '<div class="inspect-status">' + bits.join(' · ') + '</div>' : '') +
      '</div>' +
      attacks +
      hint +
    '</div>'
  );
}

function renderInspect(selected) {
  if (!selected || selected.state !== 'onboard') {
    if (state.selectedWizardId && state.wizards[state.selectedWizardId] && (state.selectedAction === 'cast' || state.selectedAction === 'special')) {
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
        '<div class="inspect-spell">' + (selected.spellName || selected.element) + ' · ' + selected.hp + '/' + selected.maxHp + ' hp</div>' +
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
  const specialCost = selected ? (typeof specialManaCost === 'function' ? specialManaCost(selected) : (selected.specialCost || 0)) : 0;
  const affordSpecial = !!(usable && specialSpell && !atkDisabled && typeof canCastSpecial === 'function' && canCastSpecial(state, selected, 'player'));
  const moveLabel = sick ? 'sick' : (moved ? 'moved' : 'move');
  const meleeLabel = sick ? 'sick' : (attacked ? 'spent' : 'melee');
  const spentCast = sick ? 'sick' : (attacked ? 'spent' : basicLabel);
  const specialLabel = specialSpell ? specialSpell.name.toLowerCase() : 'special';
  const specialSpent = sick ? 'sick' : (attacked ? 'spent' : specialLabel);
  const specialBtn = specialSpell
    ? '<button class="action-btn special' + (usable && !atkDisabled && state.selectedAction === 'special' ? ' active' : '') + (attacked ? ' spent' : '') + '" data-action="special" ' + (affordSpecial ? '' : 'disabled') + '>' + ICONS.cast + ' ' + specialSpent + '<span class="special-cost">' + ICONS.mana + specialCost + '</span></button>'
    : '';

  if (!usable) {
    return (
      '<div class="action-row is-pass">' +
        '<button class="end-turn-btn" id="end-turn-btn" ' + (canAct() ? '' : 'disabled') + '>end turn</button>' +
      '</div>'
    );
  }

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
  const win = s.result === 'player';
  chips.push(statChip('rounds', s.rounds));
  if (s.dunks >= 1) chips.push(statChip('dunks', s.dunks, 'hot'));
  if (s.bestCombo >= 2) chips.push(statChip('best combo', '\u00d7' + s.bestCombo, 'hot'));
  chips.push(statChip(win ? 'win streak' : 'best streak', win ? s.stats.streak : s.stats.best, win && s.stats.streak >= 2 ? 'good' : ''));
  const banner = !win && s.prevStreak >= 2
    ? '<div class="game-over-streak-break">streak of ' + s.prevStreak + ' broken</div>'
    : '';
  return banner + '<div class="game-over-stats">' + chips.join('') + '</div>';
}

function renderGameOverOverlay() {
  if (!state.gameOverResult) return '';
  const win = state.gameOverResult === 'player';
  let heading;
  let sub;
  if (state.gameOverResult === 'draw') {
    heading = 'draw';
    sub = 'both teams were wiped at the same time';
  } else if (win) {
    heading = 'you win';
    sub = 'their crystals fell, or their wizards are gone';
  } else {
    heading = 'you lose';
    sub = 'your crystals fell, or your wizards are gone';
  }
  return (
    '<div class="game-over-overlay">' +
      '<div class="game-over-card' + (win ? ' is-win' : '') + '">' +
        '<div class="game-over-heading">' + heading + '</div>' +
        '<div class="game-over-sub">' + sub + '</div>' +
        renderGameOverStats() +
        '<div class="game-over-actions">' +
          '<button class="end-turn-btn rematch-btn" id="rematch-btn" type="button">new match</button>' +
        '</div>' +
        '<a class="game-over-team" href="' + routeHref('team') + '">edit loadout</a>' +
      '</div>' +
    '</div>'
  );
}

function attachHandlers() {
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
}

function render() {
  ensureShell();
  const route = currentRoute();
  document.title = routeTitle(route);
  const app = document.getElementById('app');
  const extra = document.getElementById('site-nav-extra');

  if (route !== 'play') {
    app.classList.add('is-doc');
    app.classList.remove('is-play', 'is-vs', 'is-animating', 'is-enemy-turn');
    if (extra) extra.innerHTML = '';
    document.getElementById('view-root').innerHTML = renderDocPage(route);
    if (route === 'team') bindTeamPage();
    if ((route === 'rules' || route === 'todo') && typeof fillMarkdownPage === 'function') {
      fillMarkdownPage(route);
    }
    return;
  }

  app.classList.remove('is-doc');
  app.classList.add('is-play', 'is-vs');
  ensureMatch();
  maybeRecordResult();
  ensurePlayShell();
  app.classList.toggle('is-animating', state.animating);
  app.classList.toggle('is-enemy-turn', state.currentTurn === 'enemy' && !state.gameOverResult);
  const turnLabel = state.gameOverResult ? 'game over' : (state.currentTurn === 'player' ? 'your turn' : 'enemy turn');
  document.getElementById('topbar').innerHTML =
    '<div class="topbar-mana">' + ICONS.mana + state.mana + '<span class="mana-max">/' + state.maxMana + '</span></div>' +
    '<div class="topbar-round">round ' + state.turnCount + ' &middot; ' + turnLabel + '</div>' +
    '<button class="new-match-btn" id="new-match-btn" type="button">new match</button>';
  if (extra) extra.innerHTML = '';
  document.getElementById('panel-root').innerHTML = renderPanel();
  document.getElementById('overlay-root').innerHTML = renderGameOverOverlay();
  drawBoard();
  attachHandlers();
}
