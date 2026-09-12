let teamDraft = null;

function teamDraftList() {
  if (!teamDraft) teamDraft = loadStoredLoadoutSlots();
  return teamDraft;
}

function persistTeamDraft() {
  const draft = teamDraftList();
  if (draft.length === TEAM_SIZE) savePlayerLoadout(draft);
}

function kitCount(draft, kitId) {
  let n = 0;
  let i;
  for (i = 0; i < draft.length; i++) {
    if (draft[i].kit === kitId) n += 1;
  }
  return n;
}

function teamSpellButtons(slot, index, pool, slotKind) {
  return pool.map(function (spell) {
    const active = (slotKind === 'special' ? slot.special : slot.spell) === spell.id;
    const costTag = slotKind === 'special'
      ? ' <span class="spell-cost">' + spell.special + ' mana</span>'
      : '';
    return (
      '<button type="button" class="team-spell' + (active ? ' selected' : '') + '" data-slot-index="' + index + '" data-spell-slot="' + slotKind + '" data-spell-id="' + spell.id + '">' +
        '<span class="spell-name">' + spell.name + costTag + '</span>' +
        '<span class="spell-hint">' + spell.hint + '</span>' +
      '</button>'
    );
  }).join('');
}

function renderLockedMissionTeam(mission) {
  const slots = cloneLoadout(mission.loadout);
  const roster = slots.map(function (slot) {
    const kit = kitById(slot.kit);
    const basic = spellById(slot.spell);
    const special = spellById(slot.special);
    return (
      '<div class="team-slot ' + kit.element + ' selected is-locked">' +
        '<div class="team-kit ' + kit.element + ' selected">' +
          '<div class="wizard-card-icon ' + kit.element + '">' + iconSpan(kit.element, '#ffffff') + '</div>' +
          '<div class="team-kit-copy">' +
            '<div class="kit-name">' + kit.name + '</div>' +
            '<div class="kit-cast">' + (basic ? basic.name : slot.spell) + ' + ' + (special ? special.name : slot.special) + '</div>' +
            '<div class="kit-detail">' + (basic ? basic.hint : '') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }).join('');
  const names = slots.map(function (slot) {
    const kit = kitById(slot.kit);
    const spell = spellById(slot.spell);
    return (kit ? kit.name : slot.kit) + ' (' + (spell ? spell.name : slot.spell) + ')';
  }).join(' · ');
  return (
    '<article class="page team-page is-locked">' +
      '<h1>' + mission.title + '</h1>' +
      '<p class="lede">' + mission.blurb + ' This four starts on the board, ready on round 1. Switch the battle dropdown to <strong>Vs</strong> to edit your own team.</p>' +
      '<p class="team-count ready">' + names + '</p>' +
      '<h2 class="team-sub">Mission four</h2>' +
      '<div class="team-grid team-roster">' + roster + '</div>' +
      '<div class="team-actions">' +
        '<a class="end-turn-btn" id="team-fight-btn" href="' + routeHref('play') + '">fight</a>' +
      '</div>' +
    '</article>'
  );
}

function renderTeamPage() {
  const playlist = typeof loadPlaylistId === 'function' ? loadPlaylistId() : '';
  const mission = typeof missionById === 'function' ? missionById(playlist) : null;
  if (mission) return renderLockedMissionTeam(mission);
  const selected = teamDraftList();
  const roster = selected.map(function (slot, index) {
    const kit = kitById(slot.kit);
    const basics = teamSpellButtons(slot, index, basicsForElement(kit.element), 'basic');
    const specials = teamSpellButtons(slot, index, specialsForElement(kit.element), 'special');
    const basicName = (spellById(slot.spell) || {}).name || slot.spell;
    const specialName = (spellById(slot.special) || {}).name || slot.special;
    return (
      '<div class="team-slot ' + kit.element + ' selected">' +
        '<div class="team-kit ' + kit.element + ' selected">' +
          '<div class="wizard-card-icon ' + kit.element + '">' + iconSpan(kit.element, '#ffffff') + '</div>' +
          '<div class="team-kit-copy">' +
            '<div class="kit-name">' + kit.name + '</div>' +
            '<div class="kit-cast">' + basicName + ' + ' + specialName + '</div>' +
            '<div class="kit-detail">cost ' + kit.cost + ' · ' + kit.hp + ' hp · melee ' + kit.meleeAttack + '/' + kit.meleeDisplacement + '</div>' +
          '</div>' +
          '<button type="button" class="team-slot-remove" data-slot-remove="' + index + '">remove</button>' +
        '</div>' +
        '<div class="team-spells">' +
          '<p class="team-spell-label">basic cast · free</p>' + basics +
          '<p class="team-spell-label">special · costs mana</p>' + specials +
        '</div>' +
      '</div>'
    );
  }).join('');

  let empty = '';
  let e;
  for (e = selected.length; e < TEAM_SIZE; e++) {
    empty += '<div class="team-slot empty"><div class="team-empty">empty slot — add a kit</div></div>';
  }

  const adders = playableKits().map(function (kit) {
    const n = kitCount(selected, kit.id);
    const full = selected.length >= TEAM_SIZE;
    return (
      '<button type="button" class="team-kit ' + kit.element + (n ? ' selected' : '') + '" data-kit-add="' + kit.id + '"' + (full ? ' disabled' : '') + '>' +
        '<div class="wizard-card-icon ' + kit.element + '">' + iconSpan(kit.element, '#ffffff') + '</div>' +
        '<div class="team-kit-copy">' +
          '<div class="kit-name">' + kit.name + '</div>' +
          '<div class="kit-cast">' + (n ? ('×' + n + ' on team') : 'add another') + '</div>' +
          '<div class="kit-detail">cost ' + kit.cost + ' · copies allowed</div>' +
        '</div>' +
        '<div class="team-kit-mark">' + (full ? 'full' : 'add') + '</div>' +
      '</button>'
    );
  }).join('');

  const ready = selected.length === TEAM_SIZE;
  const names = selected.map(function (slot) {
    const kit = kitById(slot.kit);
    const spell = spellById(slot.spell);
    return (kit ? kit.name : slot.kit) + ' (' + (spell ? spell.name : slot.spell) + ')';
  }).join(' · ');

  return (
    '<article class="page team-page">' +
      '<h1>Team</h1>' +
      '<p class="lede">Bring four wizards from Pyre, Rime, and Squall. Copies are allowed. Cairn, Volt, and Chrono are on the bench for now. Each body equips a <strong>free basic cast</strong> and a <strong>special</strong> — the multi-hit payoff spells that <strong>cost mana</strong>. Saved on this device. Summon cost is <strong>Vs mana</strong>; Defense drops one wizard per round, any kit, and has a small mana pool for specials.</p>' +
      '<p class="team-count' + (ready ? ' ready' : '') + '">' +
        (ready ? names : 'choose ' + (TEAM_SIZE - selected.length) + ' more') +
      '</p>' +
      '<h2 class="team-sub">Your four</h2>' +
      '<div class="team-grid team-roster">' + roster + empty + '</div>' +
      '<h2 class="team-sub">Add</h2>' +
      '<div class="team-grid">' + adders + '</div>' +
      '<div class="team-actions">' +
        '<button type="button" class="end-turn-btn" id="team-fight-btn"' + (ready ? '' : ' disabled') + '>fight</button>' +
        '<button type="button" class="team-random-btn" id="team-random-btn">randomize from Pyre, Rime, Squall</button>' +
        '<a class="team-reset" href="#" id="team-reset-btn">reset to the default team</a>' +
      '</div>' +
    '</article>'
  );
}

function addTeamKit(id) {
  const draft = teamDraftList();
  if (draft.length >= TEAM_SIZE) return;
  if (!kitPlayable(id) || !kitById(id)) return;
  draft.push(emptyLoadoutSlot(id));
  persistTeamDraft();
  render();
}

function removeTeamSlot(index) {
  const draft = teamDraftList();
  if (index < 0 || index >= draft.length) return;
  draft.splice(index, 1);
  persistTeamDraft();
  render();
}

function pickTeamSpell(index, spellId, slotKind) {
  const draft = teamDraftList();
  const slot = draft[index];
  if (!slot) return;
  if (slotKind === 'special') slot.special = normalizeSpecialSpellId(slot.kit, spellId);
  else slot.spell = normalizeBasicSpellId(slot.kit, spellId);
  persistTeamDraft();
  render();
}

function bindTeamPage() {
  const playlist = typeof loadPlaylistId === 'function' ? loadPlaylistId() : '';
  if (typeof missionById === 'function' && missionById(playlist)) {
    return;
  }
  document.querySelectorAll('[data-kit-add]').forEach(function (el) {
    el.addEventListener('click', function () {
      addTeamKit(el.getAttribute('data-kit-add'));
    });
  });
  document.querySelectorAll('[data-slot-remove]').forEach(function (el) {
    el.addEventListener('click', function () {
      removeTeamSlot(parseInt(el.getAttribute('data-slot-remove'), 10));
    });
  });
  document.querySelectorAll('[data-spell-id]').forEach(function (el) {
    el.addEventListener('click', function () {
      pickTeamSpell(parseInt(el.getAttribute('data-slot-index'), 10), el.getAttribute('data-spell-id'), el.getAttribute('data-spell-slot'));
    });
  });
  const fight = document.getElementById('team-fight-btn');
  if (fight) {
    fight.addEventListener('click', function () {
      const draft = teamDraftList();
      if (draft.length !== TEAM_SIZE) return;
      savePlayerLoadout(draft);
      location.href = routeHref('play');
    });
  }
  const randomize = document.getElementById('team-random-btn');
  if (randomize) {
    randomize.addEventListener('click', function () {
      teamDraft = randomPlayableLoadout(createRng((Date.now() >>> 0) || 1));
      savePlayerLoadout(teamDraft);
      render();
    });
  }
  const reset = document.getElementById('team-reset-btn');
  if (reset) {
    reset.addEventListener('click', function (ev) {
      ev.preventDefault();
      teamDraft = cloneLoadout(DEFAULT_LOADOUT);
      savePlayerLoadout(teamDraft);
      render();
    });
  }
}
