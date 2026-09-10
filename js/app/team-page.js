let teamDraft = null;

function teamDraftList() {
  if (!teamDraft) teamDraft = normalizeLoadout(loadPlayerLoadout());
  return teamDraft;
}

function persistTeamDraft() {
  const draft = teamDraftList();
  if (draft.length === TEAM_SIZE) savePlayerLoadout(draft);
}

function kitSlot(draft, kitId) {
  let i;
  for (i = 0; i < draft.length; i++) {
    if (draft[i].kit === kitId) return draft[i];
  }
  return null;
}

function renderTeamPage() {
  const selected = teamDraftList();
  const cards = WIZARD_TYPES.map(function (kit) {
    const slot = kitSlot(selected, kit.id);
    const on = !!slot;
    const spells = spellsForElement(kit.element).map(function (spell) {
      const picked = on && slot.spell === spell.id;
      return (
        '<button type="button" class="team-spell' + (picked ? ' selected' : '') + '" data-kit-id="' + kit.id + '" data-spell-id="' + spell.id + '"' + (on || selected.length < TEAM_SIZE ? '' : ' disabled') + '>' +
          '<span class="spell-name">' + spell.name + '</span>' +
          '<span class="spell-hint">' + spell.hint + '</span>' +
        '</button>'
      );
    }).join('');
    return (
      '<div class="team-slot ' + kit.element + (on ? ' selected' : '') + '">' +
        '<button type="button" class="team-kit ' + kit.element + (on ? ' selected' : '') + '" data-kit-toggle="' + kit.id + '">' +
          '<div class="wizard-card-icon ' + kit.element + '">' + iconSpan(kit.element, '#ffffff') + '</div>' +
          '<div class="team-kit-copy">' +
            '<div class="kit-name">' + kit.name + '</div>' +
            '<div class="kit-cast">' + (on ? ((spellById(slot.spell) || {}).name || slot.spell) : 'pick a spell') + '</div>' +
            '<div class="kit-detail">cost ' + kit.cost + ' · ' + kit.hp + ' hp · melee ' + kit.meleeAttack + '/' + kit.meleeDisplacement + '</div>' +
          '</div>' +
          '<div class="team-kit-mark">' + (on ? 'in team' : 'tap') + '</div>' +
        '</button>' +
        '<div class="team-spells">' + spells + '</div>' +
      '</div>'
    );
  }).join('');

  const ready = selected.length === TEAM_SIZE;
  const names = loadoutNamed(selected).join(' · ');

  return (
    '<article class="page team-page">' +
      '<h1>Team</h1>' +
      '<p class="lede">Pick three kits and one spell each. Kits are bodies. Spells are the verbs. The enemy rolls a different three each match. Saved on this device.</p>' +
      '<p class="team-count' + (ready ? ' ready' : '') + '">' +
        (ready ? names : 'choose ' + (TEAM_SIZE - selected.length) + ' more') +
      '</p>' +
      '<div class="team-grid">' + cards + '</div>' +
      '<div class="team-actions">' +
        '<button type="button" class="end-turn-btn" id="team-fight-btn"' + (ready ? '' : ' disabled') + '>fight</button>' +
        '<a class="team-reset" href="#" id="team-reset-btn">reset to Pyre Stream, Rime Pulse, Squall Gust</a>' +
      '</div>' +
    '</article>'
  );
}

function toggleTeamKit(id) {
  const draft = teamDraftList();
  let at = -1;
  let i;
  for (i = 0; i < draft.length; i++) {
    if (draft[i].kit === id) { at = i; break; }
  }
  if (at >= 0) {
    draft.splice(at, 1);
  } else if (draft.length < TEAM_SIZE) {
    draft.push(emptyLoadoutSlot(id));
  }
  persistTeamDraft();
  render();
}

function pickTeamSpell(kitId, spellId) {
  const draft = teamDraftList();
  let slot = kitSlot(draft, kitId);
  if (!slot) {
    if (draft.length >= TEAM_SIZE) return;
    slot = emptyLoadoutSlot(kitId);
    draft.push(slot);
  }
  slot.spell = normalizeSpellId(kitId, spellId);
  persistTeamDraft();
  render();
}

function bindTeamPage() {
  document.querySelectorAll('[data-kit-toggle]').forEach(function (el) {
    el.addEventListener('click', function () {
      toggleTeamKit(el.getAttribute('data-kit-toggle'));
    });
  });
  document.querySelectorAll('[data-spell-id]').forEach(function (el) {
    el.addEventListener('click', function () {
      pickTeamSpell(el.getAttribute('data-kit-id'), el.getAttribute('data-spell-id'));
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
  const reset = document.getElementById('team-reset-btn');
  if (reset) {
    reset.addEventListener('click', function (ev) {
      ev.preventDefault();
      teamDraft = normalizeLoadout(DEFAULT_LOADOUT);
      savePlayerLoadout(teamDraft);
      render();
    });
  }
}
