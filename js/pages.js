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
        '<li>Each side has <strong>four nexuses</strong> (5 HP). Drop all four to win that way.</li>' +
        '<li><strong>Mountains</strong> block walk, summon, melee, cast, and push.</li>' +
        '<li><strong>Water</strong> shows up on some maps. No walk, summon, or push — line spells fly over it.</li>' +
        '<li>Terrain is vertically mirrored so both camps get the same layout.</li>' +
        '<li>Same roster of six: Ember, Ice, Gale, Earth, Lightning, Temporal.</li>' +
        '<li>Round 1 starts at <strong>2 mana</strong>. Max +1 each round, cap 10.</li>' +
      '</ul>' +

      '<h2>Wizards</h2>' +
      '<p>Melee is a punch. Casts are unique.</p>' +
      '<div class="table-wrap">' +
        '<table class="rules-table">' +
          '<thead><tr><th>Wizard</th><th>Cost</th><th>Move</th><th>HP</th><th>Melee</th><th>Cast</th></tr></thead>' +
          '<tbody>' +
            '<tr><td>Ember</td><td>3</td><td>3</td><td>10</td><td>5 / 2</td><td>Stream — line 4, 3 / 1, paints fire</td></tr>' +
            '<tr><td>Ice</td><td>2</td><td>3</td><td>12</td><td>4 / 2</td><td>Pulse — 8 neighbors, 2 / 1 out</td></tr>' +
            '<tr><td>Gale</td><td>2</td><td>4</td><td>8</td><td>3 / 2</td><td>Gust — line 3, 1 / 3, paints wind</td></tr>' +
            '<tr><td>Earth</td><td>3</td><td>2</td><td>14</td><td>4 / 1</td><td>Raise — temp mountain, range 1–2</td></tr>' +
            '<tr><td>Lightning</td><td>2</td><td>3</td><td>9</td><td>3 / 1</td><td>Bolt — line 4, 2 dmg, silence</td></tr>' +
            '<tr><td>Temporal</td><td>3</td><td>3</td><td>9</td><td>3 / 1</td><td>Swap or blink, range 1–3</td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +

      '<h2>Turn</h2>' +
      '<ol>' +
        '<li><strong>Summon</strong> — pay cost, open a portal in your back 3 rows. The wizard arrives at the start of your next turn. If someone is standing on it, the summoner dies and the blocker takes 2.</li>' +
        '<li><strong>Move</strong> — each onboard wizard may move once, up to its range.</li>' +
        '<li><strong>Attack</strong> — each onboard wizard may melee or cast once. Empty tiles, allies, enemies, and nexuses are valid unless the kit says otherwise.</li>' +
        '<li><strong>End turn</strong> — or it ends on its own when you have nothing left.</li>' +
      '</ol>' +

      '<h2>Combat</h2>' +
      '<ul>' +
        '<li>Melee is adjacent (cardinals). Mountains and water are not melee targets.</li>' +
        '<li>Hit, then push. 0 push means they stay.</li>' +
        '<li><strong>Crash:</strong> into a wall (edge, mountain, water, nexus) = 1 per tile short, max 3. Into a wizard = both take it, allies included.</li>' +
        '<li>Friendly fire is on. Ice pulse hits everyone in the ring.</li>' +
        '<li>See <a href="' + routeHref('elements') + '">Elements</a> for trails and matchups.</li>' +
      '</ul>' +

      '<h2>Winning</h2>' +
      '<p>Checked after each side’s turn (not on that side’s very first turn). All enemy nexuses at 0, or no wizards left in hand or on the board. Draw if both sides lose at once.</p>' +
    '</article>'
  );
}

function renderTodoPage() {
  function item(text) {
    return '<li class="open"><span class="todo-mark"></span>' + text + '</li>';
  }
  return (
    '<article class="page">' +
      '<h1>To-do</h1>' +
      '<p class="lede">What still makes a fight mean more. Done work is gone from this list.</p>' +

      '<h2>Play</h2>' +
      '<ul class="todo-list">' +
        item('<strong>Casts still look too similar in motion.</strong> The button, hint, and tile tint name the spell. Stream / pulse / gust / raise / bolt / swap still need obviously different animations.') +
      '</ul>' +

      '<h2>Look</h2>' +
      '<ul class="todo-list">' +
        item('Sprite icons for the six elements (card badge and board).') +
        item('Better walks, pushes, blinks, and hit animations.') +
      '</ul>' +

      '<h2>Terrain</h2>' +
      '<ul class="todo-list">' +
        item('<strong>Water and voids kill on enter</strong> — step, slide, blink, or get pushed on and you die.') +
        item('<strong>A dead nexus becomes a void</strong> on that tile.') +
        item('Lightning jumps along water, grounds on a raised earth wall.') +
        item('Wind fans fire (spreads it along the gust).') +
      '</ul>' +

      '<h2>AI</h2>' +
      '<ul class="todo-list">' +
        item('<strong>Overhaul.</strong> Hunt portals, respect voids and water, use raise as a wall, stop Temporal from teleporting onto a nexus every fight, play each kit like itself.') +
        item('Hook so we can swap AI brains without rewriting the rules.') +
        item('AI vs AI batch once the new brain is in: win rate, rounds, nexus vs wipe vs void.') +
      '</ul>' +
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
  const tiles = ['Fire', 'Ice', 'Wind', 'Earth wall', 'Water', 'Mountain'];
  return (
    '<article class="page">' +
      '<h1>Elements</h1>' +
      '<p class="lede">No hidden type chart. What you paint is what the tile does. Last trail wins. Solid cells are live; faded cells are next.</p>' +

      '<h2>Kits</h2>' +
      '<div class="kit-grid">' +
        kitCard('fire', 'Ember', 'Stream', 'Line 4 · paints fire') +
        kitCard('ice', 'Ice', 'Pulse', '8 neighbors · paints ice') +
        kitCard('wind', 'Gale', 'Gust', 'Line 3 · 3 push · paints wind') +
        kitCard('earth', 'Earth', 'Raise', 'Temp mountain · no paint') +
        kitCard('lightning', 'Lightning', 'Bolt', 'Silence · no paint') +
        kitCard('temporal', 'Temporal', 'Swap', 'Swap or blink · no paint') +
      '</div>' +

      '<h2>Tile reactions</h2>' +
      '<p>What happens when you <em>enter</em> that tile, or try to shoot it.</p>' +
      '<div class="table-wrap">' +
        '<table class="matrix">' +
          matrixHead(tiles) +
          '<tbody>' +
            matrixRow('Walk', ['1 dmg', 'normal', 'then carry', 'blocked', 'blocked', 'blocked']) +
            matrixRow('Push onto', ['1 dmg', 'free pip', 'then carry', 'crash', 'crash', 'crash']) +
            matrixRow('Line cast', ['open', 'open', 'open', 'blocked', 'flies over', 'blocked']) +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<p class="note">Earth raise is a real wall: it clears a trail and blocks walk, summon, melee, cast, and push. Portals are walkable. Nexuses block walk and eat a cast. Bolt and swap do not paint a trail.</p>' +

      '<h2>Trail on trail</h2>' +
      '<p>Painting a tile replaces whatever was there. You cannot paint a mountain, water, or nexus. Earth raise clears the trail and puts a wall there instead.</p>' +
      '<div class="table-wrap">' +
        '<table class="matrix">' +
          matrixHead(['on Fire', 'on Ice', 'on Wind']) +
          '<tbody>' +
            matrixRow('Paint fire', ['fire', 'fire', 'fire']) +
            matrixRow('Paint ice', ['ice', 'ice', 'ice']) +
            matrixRow('Paint wind', ['wind', 'wind', 'wind']) +
          '</tbody>' +
        '</table>' +
      '</div>' +

      '<h2>Soon</h2>' +
      '<p>Not in the sim yet — these are the next matchups.</p>' +
      '<div class="table-wrap">' +
        '<table class="matrix">' +
          matrixHead(['Water', 'Earth wall', 'Fire trail']) +
          '<tbody>' +
            matrixRow('Lightning', ['jumps', 'grounds / fizzles', '—'], ['soon', 'soon', 'none']) +
            matrixRow('Gale wind', ['—', 'crash', 'fans / spreads fire'], ['none', 'live', 'soon']) +
          '</tbody>' +
        '</table>' +
      '</div>' +
    '</article>'
  );
}

function kitCard(element, name, cast, detail) {
  return (
    '<div class="kit-card ' + element + '">' +
      '<div class="wizard-card-icon ' + element + '">' + iconSpan(element, ELEMENT_COLOR[element]) + '</div>' +
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
