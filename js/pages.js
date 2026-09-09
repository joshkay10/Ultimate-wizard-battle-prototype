function renderSiteNav(route) {
  const links = [
    { id: 'play', label: 'Battle' },
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

function renderRulesPage() {
  return (
    '<article class="page">' +
      '<h1>Rules</h1>' +
      '<p class="lede">A two-player turn game on a 9×9 grid. Destroy all enemy nexuses, or wipe their wizards.</p>' +

      '<h2>Setup</h2>' +
      '<ul>' +
        '<li>Each side has <strong>three nexuses</strong> (5 HP). Drop all three to win that way.</li>' +
        '<li><strong>Mountains</strong> block walk, summon, melee, cast, and push.</li>' +
        '<li><strong>Water</strong> shows up on some maps. Step, slide, or get pushed on and you die. No summoning onto it. Line spells fly over.</li>' +
        '<li><strong>Voids</strong> open when a nexus hits 0. Same kill-on-enter as water. The crystal is gone.</li>' +
        '<li>Terrain is vertically mirrored so both camps get the same layout.</li>' +
        '<li>Same roster of three: Pyre, Rime, Squall.</li>' +
        '<li>Round 1 starts at <strong>2 mana</strong>. Max +1 each round, cap 10. Rime is the only 2-cost kit, so the first portal is one body.</li>' +
      '</ul>' +

      '<h2>Wizards</h2>' +
      '<p>Melee is a punch. Casts are unique.</p>' +
      '<div class="table-wrap">' +
        '<table class="rules-table">' +
          '<thead><tr><th>Wizard</th><th>Cost</th><th>Move</th><th>HP</th><th>Melee</th><th>Cast</th></tr></thead>' +
          '<tbody>' +
            '<tr><td>Pyre</td><td>3</td><td>3</td><td>10</td><td>5 / 2</td><td>Stream — line 4, 3 / 1, paints fire</td></tr>' +
            '<tr><td>Rime</td><td>2</td><td>3</td><td>12</td><td>4 / 2</td><td>Pulse — 8 neighbors, 2 / 1 out</td></tr>' +
            '<tr><td>Squall</td><td>3</td><td>4</td><td>8</td><td>3 / 2</td><td>Gust — line 3, 1 / 3, paints wind</td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +

      '<h2>Turn</h2>' +
      '<ol>' +
        '<li><strong>Summon</strong> — pay cost, open a portal in your back 3 rows. The wizard arrives at the start of your next turn. If anyone is standing on it — ally or enemy — both the incoming wizard and the one standing there die.</li>' +
        '<li><strong>Move</strong> — each onboard wizard may move once, up to its range.</li>' +
        '<li><strong>Attack</strong> — each onboard wizard may melee or cast once. Empty tiles, allies, enemies, and nexuses are valid unless the kit says otherwise.</li>' +
        '<li><strong>End turn</strong> — or it ends on its own when you have nothing left.</li>' +
      '</ol>' +

      '<h2>Combat</h2>' +
      '<ul>' +
        '<li>Melee is adjacent (cardinals). Mountains, water, and voids are not melee targets.</li>' +
        '<li>Hit, then push. 0 push means they stay.</li>' +
        '<li><strong>Crash:</strong> into a wall (edge, mountain, living nexus) = 1 damage, not more for leftover push. Into a wizard = both take 1. Into a nexus = the crystal also takes 1. Water and voids are not walls — you are pushed on and you die.</li>' +
        '<li>Friendly fire is on. Rime’s pulse hits everyone in the ring.</li>' +
        '<li>See <a href="' + routeHref('elements') + '">Elements</a> for trails and matchups.</li>' +
      '</ul>' +

      '<h2>Winning</h2>' +
      '<p>Checked after each side’s turn (not on that side’s very first turn). All enemy nexuses at 0, or no wizards left in hand or on the board. Draw if both sides lose at once.</p>' +
    '</article>'
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
        item('<strong>Wizard sprites</strong> if you have them: one pose per kit is enough (Pyre, Rime, Squall). Square, transparent. Board tokens and/or card art. Player vs enemy variants are extra, not required.', 'need') +
        item('<strong>Terrain tiles</strong> (optional): magma, ice frost, wind, water, mountain, void. 64×64 tiles that can repeat. Magma, ice frost, and voids are painted in code now; sprites can replace them.', 'need') +
      '</ul>' +
      '<p class="need-note">Not blocking: send sprites when you have them. Code items on this list are done.</p>' +
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
        kitCard('fire', 'Pyre', 'Stream', 'Line 4 · paints fire') +
        kitCard('ice', 'Rime', 'Pulse', '8 neighbors · paints ice') +
        kitCard('wind', 'Squall', 'Gust', 'Line 3 · 3 push · paints wind · fans fire') +
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
  if (route === 'rules') return renderRulesPage();
  if (route === 'elements') return renderElementsPage();
  if (route === 'todo') return renderTodoPage();
  return '';
}
