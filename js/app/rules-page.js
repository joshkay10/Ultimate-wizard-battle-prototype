function renderRulesPage() {
  return (
    '<article class="page">' +
      '<h1>Rules</h1>' +
      '<p class="lede">A two-player turn game on a 9×9 grid. The toolbar picks <strong>Defense</strong> (default) or <strong>Vs</strong>.</p>' +

      '<h2>Modes</h2>' +
      '<ul>' +
        '<li><strong>Defense</strong> — Into the Breach holdout. Defend a city of 3–6 nexuses (2 HP each), packed in one or two clusters. No enemy crystals. Enemies telegraph, then after your turn they execute every strike <strong>north to south, then west to east</strong> (numbered on the telegraph), then move and telegraph one body at a time. Each strike finishes (damage, death, voids) before the next pawn winds up. A wizard shot and a city shot are worth the same. They will not aim a charge into water or a void; you can still shove them into one. Black discs: Brute melee 1 (3 HP), Charger ram 1 then push 1 (4 HP), Bomber line 4 for 1 (3 HP) — telegraphs say MELEE, CHARGE, or SHOT. Pushing them does not change the aimed direction. Charge into water or a void still falls. A match has <strong>10 invaders</strong> total (opening counts). At most <strong>5</strong> on the board at once. Opening puts 1–2 pawns on the board with no telegraph and no incoming marks. Incoming holes open after the first enemy phase on open field ground — not the last two rows, not city, water, or mountains. Drop a wizard anywhere on an open tile — they land immediately, burst (push, no damage), then are spent that turn. The map is not mirrored. You win if you wipe every pawn (on the board and incoming). New bodies only stream in if someone is still standing and the 10 are not all out. You lose if the cluster falls or your wizards are wiped.</li>' +
        '<li><strong>Vs</strong> — four enemy kits, full turn, no telegraph. Wipe or crystals both count. Terrain is mirrored. Portals in the back 3 rows arrive next turn.</li>' +
      '</ul>' +

      '<h2>Defense enemies</h2>' +
      '<p>Black discs. Each body is one Into the Breach archetype, 1 damage. A wizard and a nexus are worth the same shot.</p>' +
      '<div class="table-wrap">' +
        '<table class="rules-table">' +
          '<thead><tr><th>Body</th><th>HP</th><th>Move</th><th>Trick</th></tr></thead>' +
          '<tbody>' +
            '<tr><td>Brute</td><td>3</td><td>3</td><td>Melee the adjacent tile (Scorpion)</td></tr>' +
            '<tr><td>Charger</td><td>4</td><td>3</td><td>Charge 3, 1 dmg, then push 1 if they live. Dies in water (Beetle)</td></tr>' +
            '<tr><td>Bomber</td><td>3</td><td>2</td><td>Line 4, 1 dmg, first wizard or nexus (Firefly)</td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +

      '<h2>Team</h2>' +
      '<ul>' +
        '<li>Six kits in the pool. <strong>Pyre, Rime, and Squall are live</strong>. Cairn, Volt, and Chrono are on the bench. You bring <strong>exactly four</strong> from the live three (copies allowed). Team can randomize from those three.</li>' +
        '<li>Pick kits and spells on <a href="' + routeHref('team') + '">Team</a>. That loadout is saved on this device and used for every battle until you change it.</li>' +
        '<li>The enemy rolls <strong>four kits from the same pool</strong> each match (copies allowed), each with a random spell of their element. New match and rematch both roll a new enemy.</li>' +
        '<li>The battle top bar names the enemy four and their spells so you can read the matchup before you summon (Vs only).</li>' +
        '<li>Rime is the only <strong>2-cost</strong> kit. If she is not on your team, you cannot summon on round 1 — the turn ends on its own, then you get 3 mana.</li>' +
        '<li>Your turn also ends on its own when you have nothing left to summon, move, or attack. End turn is still there if you want to pass with actions leftover.</li>' +
      '</ul>' +

      '<h2>Setup</h2>' +
      '<ul>' +
        '<li><strong>Defense</strong> — only your camp. <strong>3–6 nexuses</strong> at <strong>2 HP</strong>, packed in one or two city blobs. No enemy crystals. Opening: 1–2 pawns on the board with no telegraph and no incoming marks. Incoming holes show after the first enemy phase on open field ground, not the last two rows. <strong>10 invaders</strong> in a match, <strong>5</strong> on the board at once.</li>' +
        '<li><strong>Vs</strong> — each side has <strong>three nexuses</strong> (5 HP): two back wings and one forward center, vertically mirrored. Drop all three to win that way.</li>' +
        '<li><strong>Mountains</strong> block walk, summon, melee, cast, and push.</li>' +
        '<li><strong>Water</strong> shows up on some maps. Step, slide, or get pushed on and you die. No summoning onto it. Line spells fly over.</li>' +
        '<li><strong>Voids</strong> open when a nexus hits 0. Same kill-on-enter as water. The crystal is gone.</li>' +
        '<li>Vs terrain is vertically mirrored so both camps get the same layout. Defense maps are not mirrored.</li>' +
        '<li>Round 1 starts at <strong>2 mana</strong>. Max +1 each round, cap 10. Each team has its own pool. Refill to max at the start of your turn.</li>' +
      '</ul>' +

      '<h2>Wizards</h2>' +
      '<p>Melee is a punch. The spell is what you configured on Team. You only have the four bodies you brought.</p>' +
      '<div class="table-wrap">' +
        '<table class="rules-table">' +
          '<thead><tr><th>Wizard</th><th>Cost</th><th>Move</th><th>HP</th><th>Melee</th><th>Default spell</th></tr></thead>' +
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

      '<h2>Spells</h2>' +
      '<p>Each kit picks one spell from its element. Burst spells aim a tile in range; the effect is a Chebyshev square around that tile (3×3 when radius is 1, or the single tile when radius is 0). Ice freeze is ice trails — pushes keep sliding.</p>' +
      '<div class="table-wrap">' +
        '<table class="rules-table">' +
          '<thead><tr><th>Spell</th><th>Kit</th><th>Shape</th><th>What it does</th></tr></thead>' +
          '<tbody>' +
            '<tr><td>Stream</td><td>Pyre</td><td>line 4</td><td>3 dmg / 1 push, paints fire</td></tr>' +
            '<tr><td>Inferno</td><td>Pyre</td><td>3×3</td><td>2 dmg, paints fire, skips nexuses</td></tr>' +
            '<tr><td>Cinder</td><td>Pyre</td><td>one tile</td><td>2 dmg, paints fire</td></tr>' +
            '<tr><td>Pulse</td><td>Rime</td><td>neighbors</td><td>2 dmg / 1 out, paints ice</td></tr>' +
            '<tr><td>Blizzard</td><td>Rime</td><td>3×3</td><td>1 dmg, freezes ground, skips nexuses</td></tr>' +
            '<tr><td>Sheet</td><td>Rime</td><td>line 4</td><td>1 dmg, paints ice, no push</td></tr>' +
            '<tr><td>Gust</td><td>Squall</td><td>line 3</td><td>1 dmg / 3 push, paints wind, fans fire</td></tr>' +
            '<tr><td>Gale</td><td>Squall</td><td>3×3</td><td>0 dmg / 1 out, paints wind</td></tr>' +
            '<tr><td>Draft</td><td>Squall</td><td>line 4</td><td>0 dmg / 4 push, paints wind</td></tr>' +
            '<tr><td>Raise</td><td>Cairn</td><td>empty tile</td><td>temporary mountain</td></tr>' +
            '<tr><td>Quake</td><td>Cairn</td><td>3×3</td><td>2 dmg / 1 out, hits crystals</td></tr>' +
            '<tr><td>Spike</td><td>Cairn</td><td>one tile</td><td>3 dmg, hits crystals</td></tr>' +
            '<tr><td>Bolt</td><td>Volt</td><td>line 4</td><td>2 dmg, silence, jumps water</td></tr>' +
            '<tr><td>Arc</td><td>Volt</td><td>3×3</td><td>1 dmg, silence</td></tr>' +
            '<tr><td>Jolt</td><td>Volt</td><td>neighbors</td><td>1 dmg, silence</td></tr>' +
            '<tr><td>Swap</td><td>Chrono</td><td>range 3</td><td>swap or blink</td></tr>' +
            '<tr><td>Step</td><td>Chrono</td><td>empty range 4</td><td>blink only</td></tr>' +
            '<tr><td>Loop</td><td>Chrono</td><td>range 5</td><td>long swap or blink</td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +

      '<h2>Unique casts</h2>' +
      '<ul>' +
        '<li><strong>Stream / gust / sheet / draft</strong> — straight line, cardinals only. Stops on the first wizard or nexus. Mountains block. Water and voids do not. Gust still fans fire.</li>' +
        '<li><strong>Pulse / jolt</strong> — hitting any highlighted neighbor fires the whole ring. Empty tiles, allies, enemies, and nexuses all count. Pulse survivors are pushed away from the caster.</li>' +
        '<li><strong>Burst (inferno, blizzard, gale, quake, arc, cinder, spike)</strong> — click an aim tile in range. The square around it is the effect. Friendly fire is on. Blizzard freeze is ice paint, not a status.</li>' +
        '<li><strong>Raise</strong> — an empty tile in range becomes a temporary mountain. Blocks walk, summon, melee, cast, and push until it crumbles.</li>' +
        '<li><strong>Bolt</strong> — line of 4. Silences the wizard it hits. Jumps along water. Grounds on a raised mountain (no jump).</li>' +
        '<li><strong>Swap / loop</strong> — trade places with a wizard, or blink to an empty tile. <strong>Step</strong> is blink only. Landing on water or a void still kills you.</li>' +
      '</ul>' +

      '<h2>Turn</h2>' +
      '<ol>' +
        '<li><strong>Summon</strong> — pay cost. In Defense, drop anywhere on an open tile; they land immediately, burst (pulse shape, push only), then have summoning sickness this turn. In Vs, open a portal in your back 3 rows. The wizard arrives at the start of your next turn, also bursts, then is sick. If anyone is standing on it — ally or enemy — both the incoming wizard and the one standing there die.</li>' +
        '<li><strong>Move</strong> — each onboard wizard may move once, up to its range. Other wizards, living nexuses, mountains, water, and voids block. You cannot walk onto water or a void. Undo a move if that wizard has not attacked yet.</li>' +
        '<li><strong>Attack</strong> — each onboard wizard may melee or cast once. Empty tiles, allies, enemies, and nexuses are valid unless the spell says otherwise.</li>' +
        '<li><strong>End turn</strong> — or it ends on its own when you have nothing left. A pending move-undo still counts, so the turn waits until you attack or undo.</li>' +
      '</ol>' +

      '<h2>Combat</h2>' +
      '<ul>' +
        '<li>Melee is adjacent (cardinals). Mountains, water, and voids are not melee targets.</li>' +
        '<li>Hit, then push. 0 push means they stay.</li>' +
        '<li><strong>Crash:</strong> into a wall (edge, mountain, living nexus) = 1, even if you do not move. Into a wizard = both take 1, then leftover knock transfers — a packed line can hurt everyone, and the last wizard slides. Into a nexus = the crystal also takes 1. Water and voids are not walls — you slide onto the tile and fall.</li>' +
        '<li>Friendly fire is on. Pulse, jolt, and bursts hit everyone in the area, including you.</li>' +
        '<li>See <a href="' + routeHref('elements') + '">Elements</a> for trails and matchups.</li>' +
      '</ul>' +

      '<h2>Winning</h2>' +
      '<p>Checked after each side’s turn (Defense wipe also checks as soon as the last pawn dies). Defense: you win if no enemies are on the board or incoming; you lose if the cluster falls or your wizards are wiped. New bodies only stream in if someone is still standing and the 10 invaders are not all out. Vs: all enemy nexuses at 0, or no wizards left. Draw if both sides lose at once.</p>' +
    '</article>'
  );
}
