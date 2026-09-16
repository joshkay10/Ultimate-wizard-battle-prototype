# Wizard Battle — Rules

A two-player turn game. **Play** is a **7×7** deathmatch.

## Vs

A 7×7 deathmatch with the four-wizard team from the Team page. All four of yours start on the board. The enemy’s four open on the mirrored far-row tiles. One wizard acts, then the other side. Open arena. Three crystals a side. No off-field cubes.

- **Three nexuses** a camp (5 HP).
- **Four** wizards a side, **all on the board**. The enemy mirrors your opening tiles onto the far row.
- **Chess pace:** one wizard acts (move and/or strike), then the other side.
- **Each round you gain 1 mana**, cap **6**.
- **Melee is free. Spell 1 costs 1× kit cost. Spell 2 costs 2× kit cost.**
- Wipe the other team, or drop all three of their crystals, to win.

## Team

- Six kits in the pool. **Pyre, Rime, and Squall are live.** Cairn, Volt, and Chrono are on the bench. Bring **exactly four** from the live three (copies allowed). Team has a **randomize** button that rolls four bodies from those three.
- Pick kits and spells on the Team page. That loadout is saved on this device.
- The enemy rolls **four kits from the same pool** each match (copies allowed), each with a random spell 1 and spell 2 of their element. New match and rematch both roll a new enemy.
- All four start on the board. **One wizard per turn.** Rime is **1**, Pyre and Squall are **2**. Round 1 has 2 mana. Each later round you gain 1 mana, cap **6**. Melee is **0**. Spell 1 costs **1×** that kit cost. Spell 2 costs **2×**.
- Your turn also ends on its own when that one wizard has nothing left to move or attack. A pending move-undo still counts as something to do, so the turn will not auto-end until you attack or undo.

## Setup

- **Three nexuses** a camp. **7×7**. Four of yours start on the board; the enemy’s four mirror them on the far row. Open arena — no generated mountains or water. Break the other camp, or wipe their wizards.
- **Mountains** are impassable: you cannot walk onto them, melee them, or cast through them. A push into a mountain is blocked.
- **Water** kills on enter. Line spells fly over it.
- **Voids** open when a nexus drops to 0 HP. That tile is a hole: entering it kills you, same as water. The dead crystal does not stay on the board.
- Round 1 starts with **2 mana**. Max mana goes up by 1 each round, cap **6**. Each team has its own pool. Mana refills to max at the start of your turn. That pool pays for **spell 1 and spell 2**. Melee is free.

## Wizards

Melee is a simple adjacent punch for everyone, and it costs **0**. Each wizard also carries **two spells**: **spell 1** at **1× kit cost**, and **spell 2** (the multi-hit payoff) at **2× kit cost**. On the board, your wizards are **cubes**.

| Wizard | Cost | Move | HP | Melee (dmg / push) | Spell 1 |
| --- | --- | --- | --- | --- | --- |
| Pyre (fire) | 2 | 2 | 4 | 2 / 1 | **Stream** — line 3, 2 dmg / 1 push, paints fire |
| Rime (ice) | 1 | 2 | 4 | 1 / 1 | **Sheet** — line 3, 1 dmg, paints ice |
| Squall (wind) | 2 | 3 | 4 | 1 / 2 | **Gust** — line 3, 1 dmg / 2 push, paints wind |
| Cairn (earth) | 3 | 2 | 5 | 2 / 1 | **Raise** — empty tile becomes a mountain |
| Volt (lightning) | 2 | 2 | 4 | 1 / 1 | **Jolt** — neighbors, 1 dmg, silence |
| Chrono (temporal) | 3 | 2 | 4 | 1 / 1 | **Swap** — swap with a wizard, or blink to an empty tile |

### Spell 2 — the third action

Melee is always free, so you always have a punch. **Spell 1** costs **1× kit cost**. **Spell 2** is the multi-hit / high-impact slot (**Lance, Inferno, Pulse, Blizzard, Draft, Gale, Quake, Spike, Bolt, Arc, Loop**) at **2× kit cost**. You equip one spell 1 and one spell 2 per wizard on the Team page.

## Spells

Each kit picks one spell from its element. Burst spells aim a tile in range; the effect is a Chebyshev square around that tile (3×3 when radius is 1, or the single tile when radius is 0). Ice freeze is ice trails — pushes keep sliding.

| Spell | Kit | Shape | What it does |
| --- | --- | --- | --- |
| Stream | Pyre | line 3 | 2 dmg / 1 push, paints fire |
| Lance | Pyre | pierce 4 | 2 dmg to **everything** in the line, paints fire, flies over crystals |
| Inferno | Pyre | 3×3 | 2 dmg, paints fire, skips nexuses |
| Cinder | Pyre | one tile | 1 dmg, paints fire |
| Pulse | Rime | neighbors | 2 dmg / 1 out, paints ice |
| Blizzard | Rime | 3×3 | 1 dmg, freezes ground, skips nexuses |
| Sheet | Rime | line 3 | 1 dmg, paints ice, no push |
| Gust | Squall | line 3 | 1 dmg / 2 push, paints wind, fans fire |
| Gale | Squall | 3×3 | 0 dmg / 1 out, paints wind |
| Draft | Squall | line 4 | 0 dmg / 3 push, paints wind |
| Raise | Cairn | empty tile | temporary mountain |
| Quake | Cairn | 3×3 | 2 dmg / 1 out, hits crystals |
| Spike | Cairn | one tile | 3 dmg, hits crystals |
| Bolt | Volt | line 4 | 2 dmg, silence, jumps water |
| Arc | Volt | 3×3 | 1 dmg, silence |
| Jolt | Volt | neighbors | 1 dmg, silence |
| Swap | Chrono | range 3 | swap or blink |
| Step | Chrono | empty range 4 | blink only |
| Loop | Chrono | range 5 | long swap or blink |

## Unique casts

- **Stream / gust / sheet / draft** — straight line, cardinals only. Stream and sheet are a line of **3**; gust is 3; draft (spell 2) is 4. Stops on the first wizard or nexus. Mountains block. Water and voids do not. Gust still fans fire.
- **Lance** — a piercing beam. Unlike stream it does **not** stop on the first body: it hits **every** wizard along the line of 4 and paints fire the whole way, so one cast can chip a whole file. Mountains block it; it flies over crystals without chipping the city.
- **Pulse / jolt** — hitting any highlighted neighbor fires the whole ring. Empty tiles, allies, enemies, and nexuses in the ring all count. Pulse survivors are pushed away from the caster.
- **Burst (inferno, blizzard, gale, quake, arc, cinder, spike)** — click an aim tile in range. The square around it is the effect. Friendly fire is on. Blizzard freeze is ice paint, not a status.
- **Raise** — an empty tile in range becomes a temporary mountain. Blocks walk, melee, cast, and push until it crumbles.
- **Bolt** — line of 4. Silences the wizard it hits. Jumps along water. Grounds on a raised mountain (no jump).
- **Swap / loop** — trade places with a wizard, or blink to an empty tile. **Step** is blink only. Landing on water or a void still kills you.

## Turn

On your turn you may, in any order, with **one** wizard:

1. **Move** — only the wizard you activate this turn may move. Other wizards, living nexuses, mountains, water, and voids block the path. You cannot walk onto water or a void. **Undo** the last move of a wizard if they have not attacked yet. After a melee or spell, that undo is gone.
2. **Attack** — only the activated wizard may strike, melee or cast. Empty tiles, enemies, allies, and nexuses are all valid (except where a unique cast says otherwise).
3. **End turn** — the other player takes their turn. The turn auto-ends when that one wizard has nothing left to do. A pending move-undo still counts as something to do, so the turn will not auto-end until you attack or undo.

## Combat

- **Melee** hits an adjacent tile (up, down, left, right). Mountains, water, and voids are not melee targets.
- A hit deals that attack’s damage, then **pushes** the target that many tiles away (0 push means they stay).
- **Crash:** if the push hits a wall (edge, mountain, or living nexus), leftover knockback **smashes**. Crash damage on a wizard is the leftover pips (at least 1). Pin them with a 3-pip gust and they take 3, not a flat 1. Hitting **another wizard** smashes both, then leftover knock transfers — a packed line can hurt everyone, and the last wizard slides. A crash into a **nexus** still deals **1** to the crystal, so leftover force does not delete the city. Water and voids are not walls — you are pushed onto the tile and you fall (the token shrinks down). Wind carry into a wall or wizard also crashes.
- A hit that deals more than remaining HP still **pushes the body**. Overflow pops as overkill. Mega damage bowls; it does not delete the slam.
- Friendly fire is on — you can melee or cast your own wizards. Pulse, jolt, and bursts hit everyone in the area.
- HP 0 = dead, token leaves the board.
- Stream, gust, sheet, draft, pulse, inferno, blizzard, gale, and cinder leave an elemental trail on tiles they travel / hit. Hitting an **empty tile is valid** for paint spells — that is how you paint the ground. Trails last about one round (through the opponent’s turn).
  - **Fire:** walking, sliding, or arriving onto it costs 1 damage.
  - **Ice:** a push that enters ice does not spend a knockback pip, so you keep sliding.
  - **Wind:** if you finish a move or push on wind, it carries you one more tile in that direction (and chains if you land on wind again). A gust that hits fire **fans** it — fire paints forward along the gust.

## Winning

Checked after each side’s turn (not on that side’s very first turn):

- You win if they have no wizards left on the board, or all three of their crystals are at 0 HP.
- Draw if both sides lose at the same time.
