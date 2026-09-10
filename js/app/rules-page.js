function renderRulesPage() {
  return (
    '<article class="page">' +
      '<h1>Rules</h1>' +
      '<p class="lede">A two-player turn game on a 9×9 grid. Destroy all enemy nexuses, or wipe their wizards.</p>' +

      '<h2>Team</h2>' +
      '<ul>' +
        '<li>Six kits in the pool. You bring <strong>exactly three</strong>.</li>' +
        '<li>Pick them on <a href="' + routeHref('team') + '">Team</a>. That roster is saved on this device and used for every battle until you change it.</li>' +
        '<li>The enemy rolls <strong>three kits from the same pool</strong> each match. New match and rematch both roll a new enemy team.</li>' +
        '<li>The battle top bar names the enemy trio so you can read the matchup before you portal.</li>' +
        '<li>Rime is the only <strong>2-cost</strong> kit. If she is not on your team, you cannot portal on round 1 — the turn ends on its own, then you get 3 mana.</li>' +
      '</ul>' +

      '<h2>Setup</h2>' +
      '<ul>' +
        '<li>Each side has <strong>three nexuses</strong> (5 HP): two back wings and one forward center, vertically mirrored. Drop all three to win that way.</li>' +
        '<li><strong>Mountains</strong> block walk, summon, melee, cast, and push.</li>' +
        '<li><strong>Water</strong> shows up on some maps. Step, slide, or get pushed on and you die. No summoning onto it. Line spells fly over.</li>' +
        '<li><strong>Voids</strong> open when a nexus hits 0. Same kill-on-enter as water. The crystal is gone.</li>' +
        '<li>Terrain is vertically mirrored so both camps get the same layout.</li>' +
        '<li>Round 1 starts at <strong>2 mana</strong>. Max +1 each round, cap 10. Each team has its own pool. Refill to max at the start of your turn.</li>' +
      '</ul>' +

      '<h2>Wizards</h2>' +
      '<p>Melee is a punch. Casts are unique. You only have the three kits you brought.</p>' +
      '<div class="table-wrap">' +
        '<table class="rules-table">' +
          '<thead><tr><th>Wizard</th><th>Cost</th><th>Move</th><th>HP</th><th>Melee</th><th>Cast</th></tr></thead>' +
          '<tbody>' +
            '<tr><td>Pyre</td><td>3</td><td>3</td><td>10</td><td>5 / 2</td><td>Stream — line 4, 3 / 1, paints fire</td></tr>' +
            '<tr><td>Rime</td><td>2</td><td>3</td><td>12</td><td>4 / 2</td><td>Pulse — 8 neighbors, 2 / 1 out</td></tr>' +
            '<tr><td>Squall</td><td>3</td><td>4</td><td>8</td><td>3 / 2</td><td>Gust — line 3, 1 / 3, paints wind</td></tr>' +
            '<tr><td>Cairn</td><td>4</td><td>2</td><td>14</td><td>4 / 1</td><td>Raise — empty tile becomes a mountain</td></tr>' +
            '<tr><td>Volt</td><td>3</td><td>3</td><td>9</td><td>3 / 1</td><td>Bolt — line 4, silence, jumps water</td></tr>' +
            '<tr><td>Chrono</td><td>4</td><td>3</td><td>9</td><td>3 / 1</td><td>Swap — swap with a wizard, or blink</td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +

      '<h2>Unique casts</h2>' +
      '<ul>' +
        '<li><strong>Stream / gust</strong> — straight line, cardinals only. Stops on the first wizard or nexus. Mountains block. Water and voids do not.</li>' +
        '<li><strong>Pulse</strong> — hitting any highlighted neighbor fires the whole ring. Empty tiles, allies, enemies, and nexuses all count. Survivors are pushed away from Rime.</li>' +
        '<li><strong>Raise</strong> — an empty tile in range becomes a temporary mountain. Blocks walk, summon, melee, cast, and push until it crumbles.</li>' +
        '<li><strong>Bolt</strong> — line of 4. Silences the wizard it hits. Jumps along water. Grounds on a raised mountain (no jump).</li>' +
        '<li><strong>Swap</strong> — trade places with a wizard, or blink to an empty tile. Landing on water or a void still kills you.</li>' +
      '</ul>' +

      '<h2>Turn</h2>' +
      '<ol>' +
        '<li><strong>Summon</strong> — pay cost, open a portal in your back 3 rows. The wizard arrives at the start of your next turn, with no sickness. If anyone is standing on it — ally or enemy — both the incoming wizard and the one standing there die.</li>' +
        '<li><strong>Move</strong> — each onboard wizard may move once, up to its range. Other wizards, living nexuses, and mountains block. Water and voids kill if you enter.</li>' +
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
