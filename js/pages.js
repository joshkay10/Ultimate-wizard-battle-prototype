function renderSiteNav(route) {
  const links = [
    { id: 'play', label: 'Battle' },
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

function renderTodoPage() {
  function item(text, cls) {
    return '<li class="' + (cls || 'open') + '"><span class="todo-mark"></span>' + text + '</li>';
  }
  return (
    '<article class="page">' +
      '<h1>To-do</h1>' +
      '<p class="lede">What still makes a fight mean more. Done work is gone from this list.</p>' +

      '<h2>Need from you</h2>' +
      '<p class="need-note">Element icons are in. Wizard poses and terrain tiles still help if you have them.</p>' +
      '<ul class="todo-list">' +
        item('<strong>Wizard sprites</strong> if you have them: one pose per kit is enough (Pyre, Rime, Squall, Cairn, Volt, Chrono). Square, transparent. Board tokens and/or card art. Player vs enemy variants are extra, not required.', 'need') +
        item('<strong>Terrain tiles</strong> (optional): magma, ice frost, wind, water, mountain, void. 64×64 tiles that can repeat.', 'need') +
      '</ul>' +

      '<h2>Loop</h2>' +
      '<ul class="todo-list">' +
        item('<strong>Badges and bosses</strong> — named missions. Stamp a badge when you clear. A boss at the end of a track.') +
        item('<strong>Power spikes</strong> — unlock a spell, a kit, or a big stat bump between badges. Not a relic shop, not a roguelike run.') +
        item('<strong>Seeded daily / share seed</strong> — one board + enemy roll to race and send.') +
        item('<strong>First-fight tutorial</strong> — one scripted board for portal, crash chain, ice slide, undo.') +
      '</ul>' +

      '<h2>Combat</h2>' +
      '<ul class="todo-list">' +
        item('<strong>Pull / grab spells</strong> — Tug yanks toward you. Done.', 'done') +
        item('<strong>Unit statuses</strong> — Lock skips the next strike. Brand burns when they next act. Wet / rooted-on-the-body beyond that still open.') +
        item('<strong>Overwatch</strong> — a spell that fires when someone steps a painted line.') +
        item('<strong>More bodies</strong> — new kits, not just more spells on the six.') +
        item('<strong>Hazard paint</strong> — drop a one-tile water or pit.') +
      '</ul>' +

      '<h2>Board / feel</h2>' +
      '<ul class="todo-list">' +
        item('<strong>Speed toggle</strong> — slow / normal / skip FX.') +
        item('<strong>Turn recap</strong> — tap the log to replay the last push chain.') +
        item('<strong>Mobile hit targets</strong> — bigger tokens and a fatter action row.') +
        item('<strong>Colorblind trails</strong> — pattern overlay on fire / ice / wind.') +
      '</ul>' +

      '<h2>Meta</h2>' +
      '<ul class="todo-list">' +
        item('<strong>Hotseat</strong> — pass the same browser, no net.') +
        item('<strong>Best-of vs a locked AI seed</strong> — for tuning hunter.') +
        item('<strong>Rules examples</strong> — one still per unique cast on the Rules page.') +
      '</ul>' +
      '<p class="need-note">Not blocking: send sprites when you have them.</p>' +
    '</article>'
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
  if (route === 'rules') return renderRulesPage();
  if (route === 'elements') return renderElementsPage();
  if (route === 'todo') return renderTodoPage();
  return '';
}
