function renderSiteNav(route) {
  const links = [
    { id: 'play', label: 'Play' },
    { id: 'team', label: 'Team' },
    { id: 'rules', label: 'Rules' },
    { id: 'elements', label: 'Elements' },
    { id: 'todo', label: 'To-do' }
  ];
  return (
    '<nav class="site-nav" id="site-nav">' +
      '<a class="site-brand" href="' + routeHref('play') + '">Wizard Battle</a>' +
      '<div class="site-links">' +
        links.map(function (link) {
          return '<a class="site-link' + (route === link.id ? ' active' : '') + '" href="' + routeHref(link.id) + '">' + link.label + '</a>';
        }).join('') +
      '</div>' +
    '</nav>'
  );
}

function matrixHead(labels) {
  return '<thead><tr><th></th>' + labels.map(function (l) { return '<th>' + l + '</th>'; }).join('') + '</tr></thead>';
}

function matrixRow(label, cells, kinds) {
  return '<tr><th>' + label + '</th>' + cells.map(function (cell, i) {
    const kind = (kinds && kinds[i]) || (cell === '—' ? 'none' : 'live');
    return '<td class="' + kind + '">' + cell + '</td>';
  }).join('') + '</tr>';
}

function renderElementsPage() {
  const tiles = ['Fire', 'Ice', 'Wind', 'Water', 'Void'];
  return (
    '<article class="page">' +
      '<h1>Elements</h1>' +
      '<p class="lede">No hidden type chart. What you paint is what the tile does. Last trail wins.</p>' +

      '<h2>Kits</h2>' +
      '<div class="kit-grid">' +
        kitCard('fire', 'Pyre', 'Stream · Inferno · Cinder · Brand', 'Line, 3×3 fire, one-tile cinder, or burn for later') +
        kitCard('ice', 'Rime', 'Pulse · Blizzard · Sheet · Lock', 'Neighbors, 3×3 freeze, ice line, or skip their next strike') +
        kitCard('wind', 'Squall', 'Gust · Gale · Draft · Tug', 'Line shove, 3×3 shove, long shove, or yank toward you') +
        kitCard('earth', 'Cairn', 'Raise · Quake · Spike', 'On the bench for now') +
        kitCard('lightning', 'Volt', 'Bolt · Arc · Jolt', 'On the bench for now') +
        kitCard('temporal', 'Chrono', 'Swap · Step · Loop', 'On the bench for now') +
      '</div>' +

      '<h2>Tile reactions</h2>' +
      '<p>What happens when you <em>enter</em> that tile, or try to shoot it.</p>' +
      '<div class="table-wrap">' +
        '<table class="matrix">' +
          matrixHead(tiles) +
          '<tbody>' +
            matrixRow('Walk', ['1 dmg', 'normal', 'then carry', 'die', 'die']) +
            matrixRow('Push onto', ['1 dmg', 'free pip', 'then carry', 'die', 'die']) +
            matrixRow('Line cast', ['open', 'open', 'open', 'flies over', 'flies over']) +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<p class="note">Water and voids kill on enter. Portals are walkable — but if anyone is standing on a portal when it resolves, the incoming wizard and the one standing there both die. Living nexuses block walk and eat a cast. A dead nexus is a void.</p>' +

      '<h2>Trail on trail</h2>' +
      '<p>Painting a tile replaces whatever was there. You cannot paint a mountain, water, void, or nexus. A gust that hits fire spreads fire along the rest of the gust.</p>' +
      '<div class="table-wrap">' +
        '<table class="matrix">' +
          matrixHead(['on Fire', 'on Ice', 'on Wind']) +
          '<tbody>' +
            matrixRow('Paint fire', ['fire', 'fire', 'fire']) +
            matrixRow('Paint ice', ['ice', 'ice', 'ice']) +
            matrixRow('Paint wind', ['wind', 'wind', 'wind']) +
            matrixRow('Gust through fire', ['fire spreads', 'wind', 'wind']) +
          '</tbody>' +
        '</table>' +
      '</div>' +
    '</article>'
  );
}

function kitCard(element, name, cast, detail) {
  return (
    '<div class="kit-card ' + element + '">' +
      '<div class="wizard-card-icon ' + element + '">' + iconSpan(element, '#ffffff') + '</div>' +
      '<div>' +
        '<div class="kit-name">' + name + '</div>' +
        '<div class="kit-cast">' + cast + '</div>' +
        '<div class="kit-detail">' + detail + '</div>' +
      '</div>' +
    '</div>'
  );
}

function renderDocPage(route) {
  if (route === 'team') return renderTeamPage();
  if (route === 'elements') return renderElementsPage();
  if (route === 'rules' || route === 'todo') {
    return '<article class="page" id="doc-md"><p class="lede">Loading…</p></article>';
  }
  return '';
}
