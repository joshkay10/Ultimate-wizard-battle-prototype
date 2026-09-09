let teamDraft = null;

function teamDraftList() {
  if (!teamDraft) teamDraft = loadPlayerTeam().slice();
  return teamDraft;
}

function kitPickerBlurb(kit) {
  return (CAST_HINT[kit.castKind] || kit.castKind) + ' · cost ' + kit.cost;
}

function renderTeamPage() {
  const selected = teamDraftList();
  const cards = WIZARD_TYPES.map(function (kit) {
    const on = selected.indexOf(kit.id) !== -1;
    return (
      '<button type="button" class="team-kit ' + kit.element + (on ? ' selected' : '') + '" data-kit-id="' + kit.id + '">' +
        '<div class="wizard-card-icon ' + kit.element + '">' + iconSpan(kit.element, '#ffffff') + '</div>' +
        '<div class="team-kit-copy">' +
          '<div class="kit-name">' + kit.name + '</div>' +
          '<div class="kit-cast">' + kit.castKind + '</div>' +
          '<div class="kit-detail">' + kitPickerBlurb(kit) + '</div>' +
        '</div>' +
        '<div class="team-kit-mark">' + (on ? 'in team' : 'tap') + '</div>' +
      '</button>'
    );
  }).join('');

  const ready = selected.length === TEAM_SIZE;
  const names = selected.map(function (id) {
    const kit = kitById(id);
    return kit ? kit.name : id;
  }).join(' · ');

  return (
    '<article class="page team-page">' +
      '<h1>Team</h1>' +
      '<p class="lede">Pick three kits. The enemy brings a different three each match. Your team is saved on this device.</p>' +
      '<p class="team-count' + (ready ? ' ready' : '') + '">' +
        (ready ? names : 'choose ' + (TEAM_SIZE - selected.length) + ' more') +
      '</p>' +
      '<div class="team-grid">' + cards + '</div>' +
      '<div class="team-actions">' +
        '<button type="button" class="end-turn-btn" id="team-fight-btn"' + (ready ? '' : ' disabled') + '>fight</button>' +
        '<a class="team-reset" href="#" id="team-reset-btn">reset to Pyre, Rime, Squall</a>' +
      '</div>' +
    '</article>'
  );
}

function toggleTeamKit(id) {
  const draft = teamDraftList();
  const at = draft.indexOf(id);
  if (at >= 0) {
    draft.splice(at, 1);
  } else if (draft.length < TEAM_SIZE) {
    draft.push(id);
  }
  if (draft.length === TEAM_SIZE) savePlayerTeam(draft);
  render();
}

function bindTeamPage() {
  document.querySelectorAll('[data-kit-id]').forEach(function (el) {
    el.addEventListener('click', function () {
      toggleTeamKit(el.getAttribute('data-kit-id'));
    });
  });
  const fight = document.getElementById('team-fight-btn');
  if (fight) {
    fight.addEventListener('click', function () {
      const draft = teamDraftList();
      if (draft.length !== TEAM_SIZE) return;
      savePlayerTeam(draft);
      location.href = routeHref('play');
    });
  }
  const reset = document.getElementById('team-reset-btn');
  if (reset) {
    reset.addEventListener('click', function (ev) {
      ev.preventDefault();
      teamDraft = DEFAULT_TEAM.slice();
      savePlayerTeam(teamDraft);
      render();
    });
  }
}
