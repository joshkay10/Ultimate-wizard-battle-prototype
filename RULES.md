# Wizard Battle — Rules

A two-player turn game on a 9×9 grid. The toolbar picks **Defense** (default) or **Vs**.

## Modes

- **Defense** — Into the Breach holdout. You defend a **cluster of three nexuses (2 HP each)**. There are no enemy crystals. Weak black-disc enemies telegraph, then after your turn they **execute**, **move**, and **telegraph** again. New bodies keep streaming in. You still bring four wizards. Drop a wizard **anywhere** on an open tile — they land **immediately** and can move and attack that turn. The map is not mirrored. You lose if the cluster falls or your wizards are wiped. Clearing a wave does not end the fight.
- **Vs** — the mirrored four-wizard match. The enemy rolls four kits and plays a full turn (summon, move, attack) with no telegraph. Destroy all enemy nexuses, or wipe their wizards.

## Defense enemies

Black discs, white icons, 2–5 HP. Each body has one trick. Red tiles show the strike they will take after your turn.

| Body | HP | Trick |
| --- | --- | --- |
| Brute | 4–5 | Melee the adjacent tile in the aimed direction |
| Charger | 3–4 | Charge up to 3 tiles that way. Hits the first body or nexus. Runs into water or a void and falls |
| Bomber | 2–3 | Fireball, line 4, first wizard or nexus |

If you push them, they still fire in the **same direction** from the new tile. Incoming marks appear in their back 3 rows and arrive after they execute.

## Team

- Six kits in the pool. You bring **exactly four**. Copies are allowed. Each body brings **one spell** from its element — two Rimes can take Pulse and Blizzard.
- Pick kits and spells on the Team page. That loadout is saved on this device and used for every battle until you change it.
- The enemy rolls **four kits from the same pool** each match (copies allowed), each with a random spell of their element. New match and rematch both roll a new enemy.
- The battle top bar names the enemy four and their spells so you can read the matchup before you summon (Vs only).
- Rime is the only **2-cost** kit. If she is not on your team, you cannot summon on round 1 — the turn ends on its own, then you get 3 mana.
- Your turn also ends on its own when you have nothing left to summon, move, or attack. End turn is still there if you want to pass with actions leftover.

## Setup

- **Defense** — only your camp. Three nexuses at **2 HP**, packed in a connected cluster (L or I, Into the Breach city-block style) in the lower-middle of the board. No enemy crystals.
- **Vs** — each player has **three nexuses** (5 HP each): two on the back line (wings) and one a step forward in the center. You must drop **all** of a side’s crystals to win that way.
- **Mountains** sit in edge ridges. They are impassable: you cannot walk onto them, summon onto them, melee them, or cast through them. A push into a mountain is blocked.
- **Water** appears on some maps (not every seed). You can walk or get pushed onto it — and you **die**. You cannot summon onto it. Line spells fly over it.
- **Voids** open when a nexus drops to 0 HP. That tile is a hole: entering it kills you, same as water. The dead crystal does not stay on the board.
- **Vs** terrain in the top 3 rows is always a vertical mirror of the bottom 3 (same columns) so both camps get an equal layout. **Defense** maps are not mirrored — ridges and water can sit on one side only.
- Round 1 starts with **2 mana**. Max mana goes up by 1 each round, cap 10. Each team has its own pool. Mana refills to max at the start of your turn.

## Wizards

Melee is a simple adjacent punch for everyone. The spell is what you configured on Team. You only have the four bodies you brought.

| Wizard | Cost | Move | HP | Melee (dmg / push) | Default spell |
| --- | --- | --- | --- | --- | --- |
| Pyre (fire) | 3 | 3 | 10 | 5 / 2 | **Stream** — line 4, 3 dmg / 1 push, paints fire |
| Rime (ice) | 2 | 3 | 12 | 4 / 2 | **Pulse** — 8 neighbors, 2 dmg / 1 push outward |
| Squall (wind) | 3 | 4 | 8 | 3 / 2 | **Gust** — line 3, 1 dmg / 3 push, paints wind |
| Cairn (earth) | 4 | 2 | 14 | 4 / 1 | **Raise** — empty tile becomes a mountain |
| Volt (lightning) | 3 | 3 | 9 | 3 / 1 | **Bolt** — line 4, silence, jumps water, fizzles on raise |
| Chrono (temporal) | 4 | 3 | 9 | 3 / 1 | **Swap** — swap with a wizard, or blink to an empty tile |

## Spells

Each kit picks one spell from its element. Burst spells aim a tile in range; the effect is a Chebyshev square around that tile (3×3 when radius is 1, or the single tile when radius is 0). Ice freeze is ice trails — pushes keep sliding.

| Spell | Kit | Shape | What it does |
| --- | --- | --- | --- |
| Stream | Pyre | line 4 | 3 dmg / 1 push, paints fire |
| Inferno | Pyre | 3×3 | 2 dmg, paints fire, skips nexuses |
| Cinder | Pyre | one tile | 2 dmg, paints fire |
| Pulse | Rime | neighbors | 2 dmg / 1 out, paints ice |
| Blizzard | Rime | 3×3 | 1 dmg, freezes ground, skips nexuses |
| Sheet | Rime | line 4 | 1 dmg, paints ice, no push |
| Gust | Squall | line 3 | 1 dmg / 3 push, paints wind, fans fire |
| Gale | Squall | 3×3 | 0 dmg / 1 out, paints wind |
| Draft | Squall | line 4 | 0 dmg / 4 push, paints wind |
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

- **Stream / gust / sheet / draft** — straight line, cardinals only. Stops on the first wizard or nexus. Mountains block. Water and voids do not. Gust still fans fire.
- **Pulse / jolt** — hitting any highlighted neighbor fires the whole ring. Empty tiles, allies, enemies, and nexuses in the ring all count. Pulse survivors are pushed away from the caster.
- **Burst (inferno, blizzard, gale, quake, arc, cinder, spike)** — click an aim tile in range. The square around it is the effect. Friendly fire is on. Blizzard freeze is ice paint, not a status.
- **Raise** — an empty tile in range becomes a temporary mountain. Blocks walk, summon, melee, cast, and push until it crumbles.
- **Bolt** — line of 4. Silences the wizard it hits. Jumps along water. Grounds on a raised mountain (no jump).
- **Swap / loop** — trade places with a wizard, or blink to an empty tile. **Step** is blink only. Landing on water or a void still kills you.

## Turn

On your turn you may, in any order:

1. **Summon** — pay a wizard’s cost.
   - **Defense:** drop them on any open tile (not a nexus, mountain, water, void, occupied tile, or incoming pawn mark). They land **immediately** and can move and attack this turn.
   - **Vs:** open a **portal** in your back 3 rows (not on a nexus, mountain, water, occupied tile, or another portal). The wizard arrives at the start of your **next** turn, ready to move and attack (no summoning sickness). If **anyone** (ally or enemy) is standing on the portal when it resolves, the incoming wizard **and** the one standing there both die. Same rules for the enemy.
2. **Move** — each onboard wizard that has not moved may move once, up to its move range. Other wizards, living nexuses, mountains, water, and voids block the path. You cannot walk onto water or a void. **Undo** the last move of a wizard if they have not attacked yet. After a melee or spell, that undo is gone.
3. **Attack** — each onboard wizard that has not attacked may attack once, melee or cast. Empty tiles, enemies, allies, and nexuses are all valid (except where a unique cast says otherwise).
4. **End turn** — the other player takes their turn. If you have nothing left to summon, move, or attack, the turn ends on its own. A pending move-undo still counts as something to do, so the turn will not auto-end until you attack or undo.

## Combat

- **Melee** hits an adjacent tile (up, down, left, right). Mountains, water, and voids are not melee targets.
- A hit deals that attack’s damage, then **pushes** the target that many tiles away (0 push means they stay).
- **Crash:** if the push hits a wall (edge, mountain, or living nexus), the pushed wizard takes **1** damage — even if they never leave their tile. A crash into a **nexus** also deals 1 to the crystal. Hitting **another wizard** deals 1 to both, then leftover knockback transfers into that wizard: they may crash the next body in line, and the last one slides. A line of five can hurt five. Water and voids are not walls — you are pushed onto the tile and you fall (the token shrinks down). Wind carry into a wall or wizard also crashes.
- Friendly fire is on — you can melee or cast your own wizards. Pulse, jolt, and bursts hit everyone in the area.
- HP 0 = dead, token leaves the board.
- Stream, gust, sheet, draft, pulse, inferno, blizzard, gale, and cinder leave an elemental trail on tiles they travel / hit. Hitting an **empty tile is valid** for paint spells — that is how you paint the ground. Trails last about one round (through the opponent’s turn).
  - **Fire:** walking, sliding, or arriving onto it costs 1 damage.
  - **Ice:** a push that enters ice does not spend a knockback pip, so you keep sliding.
  - **Wind:** if you finish a move or push on wind, it carries you one more tile in that direction (and chains if you land on wind again). A gust that hits fire **fans** it — fire paints forward along the gust.

## Winning

Checked after each side’s turn (not on that side’s very first turn):

- **Defense:** you lose if **all** of your clustered nexuses are at 0 HP, or you have no wizards left in hand or on the board. Waves do not end the fight. There is no enemy camp to knock out.
- **Vs:** you win if **all** enemy nexuses are at 0 HP, or they have no wizards left in hand or on the board.
- Draw if both sides lose at the same time (Vs).
