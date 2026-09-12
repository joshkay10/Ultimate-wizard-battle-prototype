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

function renderTeamPage() {
  const selected = teamDraftList();
  const roster = selected.map(function (slot, index) {
    const kit = kitById(slot.kit);
    const spells = spellsForElement(kit.element).map(function (spell) {
      const picked = slot.spell === spell.id;
      return (
        '<button type="button" class="team-spell' + (picked ? ' selected' : '') + '" data-slot-index="' + index + '" data-spell-id="' + spell.id + '">' +
          '<span class="spell-name">' + spell.name + '</span>' +
          '<span class="spell-hint">' + spell.hint + '</span>' +
        '</button>'
      );
    }).join('');
    return (
      '<div class="team-slot ' + kit.element + ' selected">' +
        '<div class="team-kit ' + kit.element + ' selected">' +
          '<div class="wizard-card-icon ' + kit.element + '">' + iconSpan(kit.element, '#ffffff') + '</div>' +
          '<div class="team-kit-copy">' +
            '<div class="kit-name">' + kit.name + '</div>' +
            '<div class="kit-cast">' + ((spellById(slot.spell) || {}).name || slot.spell) + '</div>' +
            '<div class="kit-detail">cost ' + kit.cost + ' · ' + kit.hp + ' hp · melee ' + kit.meleeAttack + '/' + kit.meleeDisplacement + '</div>' +
          '</div>' +
          '<button type="button" class="team-slot-remove" data-slot-remove="' + index + '">remove</button>' +
        '</div>' +
        '<div class="team-spells">' + spells + '</div>' +
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
      '<p class="lede">Bring four wizards from Pyre, Rime, and Squall. Copies are allowed. Cairn, Volt, and Chrono are on the bench for now. Each body picks one spell — Brand, Lock, and Tug are the extra verbs. Saved on this device. Cost is <strong>Vs mana</strong>. Defense drops one wizard per round, any kit.</p>' +
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
        '<a class="team-reset" href="#" id="team-reset-btn">reset to Pyre, Rime, Squall, Rime</a>' +
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

function pickTeamSpell(index, spellId) {
  const draft = teamDraftList();
  const slot = draft[index];
  if (!slot) return;
  slot.spell = normalizeSpellId(slot.kit, spellId);
  persistTeamDraft();
  render();
}

function bindTeamPage() {
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
      pickTeamSpell(parseInt(el.getAttribute('data-slot-index'), 10), el.getAttribute('data-spell-id'));
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
