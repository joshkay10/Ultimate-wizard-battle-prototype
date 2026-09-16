# Wizard Battle — Rules

A two-player **7×7** deathmatch. All eight wizards start on the board. There is **no summoning**.

## How a match starts

Both sides bring **four** wizards from the Team page. Yours open on your back rows. Theirs mirror those tiles onto the far row. **Three crystals** a camp (5 HP): two back wings and one forward center, tucked on rows 1 and 5 so the camps are not staring across a single empty file.

The arena is empty — no generated mountains or water. Voids only open when a crystal dies.

**Nobody waits in hand.** Kit cost is not a drop fee. It is the mana weight of that body’s spells.

## Why no summoning

Chess pace already gives you **one body per turn**. A drop economy on a 7×7 with eight cubes and six crystals would empty the opening or add a second HUD (hand racks, portals, sickness). Those were tried. They are gone.

If a wizard dies, they stay dead. You play the four you brought.

## Turn

**One wizard acts, then the other side.** That body may **move** and **strike** (melee or one spell), in either order.

- **Move** — other wizards, living crystals, mountains, water, and voids block the path. You cannot walk onto water or a void. **Undo** the last move if that wizard has not attacked yet. After a melee or spell, undo is gone.
- **Attack** — melee is adjacent (cardinals). A spell aims a highlighted tile. Empty tiles, enemies, allies, and crystals are all valid unless a unique cast says otherwise.
- **End turn** — the other player goes. The turn auto-ends when that one wizard has nothing left. A pending undo still counts as something to do.

Selecting a second wizard after you have moved or struck shows **wait**. That is the lock.

## Mana

Each side has its own pool. Round 1 starts at **2**. Each later round the max goes up by 1, cap **6**, and the pool refills to max.

| Action | Cost |
| --- | --- |
| Melee | **0** |
| Spell 1 | **1×** that kit’s mana weight |
| Spell 2 | **2×** that kit’s mana weight |

Round 1, every live kit can fire spell 1 (Rime 1, Pyre and Squall 2). Rime’s spell 2 (Pulse, 2) is also on the table. Pyre Lance / Inferno costs 4, so that is round 3.

## Team

**Pyre, Rime, and Squall are live.** Cairn, Volt, and Chrono are on the bench. Bring exactly four from the live three (copies allowed). The Team page has a randomize button. The loadout is saved on this device.

The enemy rolls four kits from the same pool each match (copies allowed), each with a random spell 1 and spell 2 of their element. New match and rematch both roll a new enemy.

Default team: Pyre (Stream + Lance), Rime (Sheet + Pulse), Squall (Gust + Draft), Pyre (Cinder + Inferno).

## Kits

Wizards are **cubes**. Mana weight used to be a summon cost; it now only scales spells.

| Wizard | Weight | Move | HP | Melee (dmg / push) | Role |
| --- | --- | --- | --- | --- | --- |
| Pyre (fire) | 2 | 2 | 4 | 2 / 1 | Chip and paint. Stream is 2 dmg, not a delete |
| Rime (ice) | 1 | 2 | 4 | 1 / 1 | Cheap paint and control. The round-1 specialist |
| Squall (wind) | 2 | 3 | 4 | 1 / 2 | Tempo. The only live kit that reaches the center in one walk from the back |
| Cairn (earth) | 3 | 2 | 5 | 2 / 1 | Bench. Walls and crystal-breaking |
| Volt (lightning) | 2 | 2 | 4 | 1 / 1 | Bench. Silence |
| Chrono (temporal) | 3 | 2 | 4 | 1 / 1 | Bench. Swap / blink |

A full-HP body lives through one Stream (2 into 4). Pyre melee (2) also does not one-shot. Two hits, or a crash, are the delete.

## Spells

Each kit equips **one spell 1** and **one spell 2** on the Team page. Burst spells aim a tile in range; the effect is a Chebyshev square around that tile (3×3 when radius is 1, or the single tile when radius is 0). Ice freeze is ice trails — pushes keep sliding.

### Spell 1 — 1× weight

| Spell | Kit | Shape | What it does |
| --- | --- | --- | --- |
| Stream | Pyre | line 3 | 2 dmg / 1 push, paints fire |
| Cinder | Pyre | one tile | 1 dmg, paints fire |
| Brand | Pyre | line 3 | 1 dmg now, 2 burn when they next act, paints fire |
| Sheet | Rime | line 3 | 1 dmg, paints ice, no push |
| Lock | Rime | line 3 | 1 dmg, skip their next strike, paints ice |
| Gust | Squall | line 3 | 1 dmg / 2 push, paints wind, fans fire |
| Tug | Squall | line 3 | 1 dmg, yank 2 toward you, paints wind |
| Raise | Cairn | empty tile | temporary mountain |
| Jolt | Volt | neighbors | 1 dmg, silence |
| Swap | Chrono | range 3 | swap with a wizard, or blink to an empty tile |
| Step | Chrono | empty range 4 | blink only |

### Spell 2 — 2× weight

| Spell | Kit | Shape | What it does |
| --- | --- | --- | --- |
| Lance | Pyre | pierce 4 | 2 dmg to **everything** in the line, paints fire, flies over crystals |
| Inferno | Pyre | 3×3 | 2 dmg, paints fire, skips crystals |
| Pulse | Rime | neighbors | 2 dmg / 1 out, paints ice |
| Blizzard | Rime | 3×3 | 1 dmg, freezes ground, skips crystals |
| Draft | Squall | line 4 | 0 dmg / 3 push, paints wind |
| Gale | Squall | 3×3 | 0 dmg / 1 out, paints wind |
| Quake | Cairn | 3×3 | 2 dmg / 1 out, hits crystals |
| Spike | Cairn | one tile | 3 dmg, hits crystals |
| Bolt | Volt | line 4 | 2 dmg, silence, jumps water |
| Arc | Volt | 3×3 | 1 dmg, silence |
| Loop | Chrono | range 5 | long swap or blink |

## Unique casts

- **Stream / gust / sheet / draft / brand / lock / tug** — straight line, cardinals only. Stops on the first wizard or crystal. Mountains block. Water and voids do not. Gust still fans fire.
- **Lance** — a piercing beam. It does **not** stop on the first body: it hits every wizard along the line of 4 and paints fire the whole way. Mountains block it; it flies over crystals without chipping them.
- **Pulse / jolt** — hitting any highlighted neighbor fires the whole ring. Empty tiles, allies, enemies, and crystals in the ring all count. Pulse survivors are pushed away from the caster.
- **Burst (inferno, blizzard, gale, quake, arc, cinder, spike)** — click an aim tile in range. The square around it is the effect. Friendly fire is on. Blizzard freeze is ice paint, not a status.
- **Raise** — an empty tile in range becomes a temporary mountain. Blocks walk, melee, cast, and push until it crumbles.
- **Bolt** — line of 4. Silences the wizard it hits. Jumps along water. Grounds on a raised mountain (no jump).
- **Swap / loop** — trade places with a wizard, or blink to an empty tile. **Step** is blink only. Landing on water or a void still kills you.

## Combat

- **Melee** hits an adjacent tile (up, down, left, right). Mountains, water, and voids are not melee targets.
- A hit deals that attack’s damage, then **pushes** the target that many tiles away (0 push means they stay).
- **Crash:** if the push hits a wall (edge, mountain, or living crystal), leftover knockback **smashes**. Crash damage on a wizard is the leftover pips (at least 1). Pin them with a 3-pip gust and they take 3, not a flat 1. Hitting **another wizard** smashes both, then leftover knock transfers — a packed line can hurt everyone, and the last wizard slides. A crash into a **crystal** still deals **1**, so leftover force does not delete the camp. Water and voids are not walls — you are pushed onto the tile and you fall. Wind carry into a wall or wizard also crashes.
- A hit that deals more than remaining HP still **pushes the body**. Overflow pops as overkill. Mega damage bowls; it does not delete the slam.
- Friendly fire is on. Pulse, jolt, and bursts hit everyone in the area.
- HP 0 = dead. That body does not come back.
- Stream, gust, sheet, draft, pulse, inferno, blizzard, gale, cinder, brand, lock, and tug leave an elemental trail on tiles they travel / hit. Hitting an **empty tile is valid** for paint spells. Trails last about one round (through the opponent’s turn).
  - **Fire:** walking, sliding, or arriving onto it costs 1 damage.
  - **Ice:** a push that enters ice does not spend a knockback pip, so you keep sliding.
  - **Wind:** if you finish a move or push on wind, it carries you one more tile in that direction (and chains if you land on wind again). A gust that hits fire **fans** it — fire paints forward along the gust.

## Terrain

- **Mountains** are impassable: no walk, no melee, no cast through. A push into a mountain is blocked (and crashes).
- **Water** kills on enter. Line spells fly over it.
- **Voids** open when a crystal drops to 0 HP. Entering a void kills you, same as water. The dead crystal does not stay on the board.

## Winning

Checked after each side’s turn (not on that side’s very first turn):

- You win if they have no wizards left on the board, **or** all three of their crystals are at 0 HP.
- Draw if both sides lose at the same time.

Wiping wizards is the faster clock. Crystals are 5 HP and a crash into one is only 1, so the camp is the late win — not the opening plan.

## Balance

These numbers are the live contract. Change them in `js/domain/kits.js` / `js/domain/spells.js` / `js/domain/mana.js`, then edit this page.

- **Start on the field** so round 1 is a real chess move, not a drop.
- **4 HP / Stream 2 / Pyre melee 2** so one trade never deletes a full body. You need two hits, a crash, or a special.
- **Squall walks 3, everyone else 2** so wind is tempo, not a second Pyre.
- **Mana 2 → 6** so spell 1 is the round-1 verb and spell 2 is the payoff you grow into.
- **Melee 0** so an adjacent body always has a punch if the pool is empty.
- **Crystals 5 HP, crash 1** so you cannot gust-delete a camp. Hunter still prefers a wounded wizard (score 90) to a crystal chip (85) unless the crystal would die.

If a kit feels like a delete button, cut damage or range — do not add a hand.
