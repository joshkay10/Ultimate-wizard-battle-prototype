# Wizard Battle — Rules

A two-player turn game on a 9×9 grid. Destroy all enemy nexuses, or wipe their wizards.

## Setup

- Each player has **three nexuses** (5 HP each): two on the back line (wings) and one a step forward in the center. You must drop **all** of a side’s crystals to win that way.
- **Mountains** sit in edge ridges. They are impassable: you cannot walk onto them, summon onto them, melee them, or cast through them. A push into a mountain is blocked.
- **Water** appears on some maps (not every seed). You can walk or get pushed onto it — and you **die**. You cannot summon onto it. Line spells fly over it.
- **Voids** open when a nexus drops to 0 HP. That tile is a hole: entering it kills you, same as water. The dead crystal does not stay on the board.
- Terrain in the top 3 rows is always a vertical mirror of the bottom 3 (same columns) so both camps get an equal layout. The middle band mirrors the same way.
- Each player has the same roster of **three unique wizards**: Pyre, Rime, Squall. All start off the board.
- Round 1 starts with **2 mana**. Max mana goes up by 1 each round, cap 10. Mana refills to max at the start of your turn. Rime is the only 2-cost kit, so round 1 is one portal.

## Wizards

Melee is a simple adjacent punch for everyone. Casts are unique.

| Wizard | Cost | Move | HP | Melee (dmg / push) | Cast |
| --- | --- | --- | --- | --- | --- |
| Pyre (fire) | 3 | 3 | 10 | 5 / 2 | **Stream** — line 4, 3 dmg / 1 push, paints fire |
| Rime (ice) | 2 | 3 | 12 | 4 / 2 | **Pulse** — 8 neighbors, 2 dmg / 1 push outward |
| Squall (wind) | 3 | 4 | 8 | 3 / 2 | **Gust** — line 3, 1 dmg / 3 push, paints wind |

Rime’s extra step is so a back-row arrival can actually threaten midboard. Squall stays the skirmisher at 4. Pyre and Squall cost 3 so they are not round-1 openers.

## Unique casts

- **Stream / gust** — straight line, cardinals only. Stops on the first wizard or nexus. Mountains block. Water and voids do not.
- **Pulse** — hitting any highlighted neighbor fires the whole ring. Empty tiles, allies, enemies, and nexuses in the ring all count. Survivors are pushed away from Rime.

## Turn

On your turn you may, in any order:

1. **Summon** — pay a wizard’s cost and open a **portal** in your back 3 rows (not on a nexus, mountain, water, occupied tile, or another portal). The wizard arrives at the start of your **next** turn, ready to move and attack (no summoning sickness). If **anyone** (ally or enemy) is standing on the portal when it resolves, the incoming wizard **and** the one standing there both die. Same rules for the enemy.
2. **Move** — each onboard wizard that has not moved may move once, up to its move range. Other wizards, living nexuses, and mountains block the path. Water and voids do not block — they kill you if you enter.
3. **Attack** — each onboard wizard that has not attacked may attack once, melee or cast. Empty tiles, enemies, allies, and nexuses are all valid (except where a unique cast says otherwise).
4. **End turn** — the other player takes their turn. If you have nothing left to summon, move, or attack, the turn ends on its own.

## Combat

- **Melee** hits an adjacent tile (up, down, left, right). Mountains, water, and voids are not melee targets.
- A hit deals that attack’s damage, then **pushes** the target that many tiles away (0 push means they stay).
- **Crash:** if the push hits a wall (edge, mountain, or living nexus), the pushed wizard takes **1** damage. A crash into a **nexus** also deals 1 to the crystal. Leftover push distance does not add more. Water and voids are not walls — you are pushed on and you die.
- If they crash into **another wizard**, both take that 1. Allies count. Friendly fire is on — you can melee or cast your own wizards. Pulse hits everyone in the ring.
- HP 0 = dead, token leaves the board.
- Stream, gust, and pulse leave an elemental trail on tiles they travel / hit. Hitting an **empty tile is valid** for those kits — that is how you paint the ground. Trails last about one round (through the opponent’s turn).
  - **Fire:** walking, sliding, or arriving onto it costs 1 damage.
  - **Ice:** a push that enters ice does not spend a knockback pip, so you keep sliding.
  - **Wind:** if you finish a move or push on wind, it carries you one more tile in that direction (and chains if you land on wind again). A gust that hits fire **fans** it — fire paints forward along the gust.

## Winning

Checked after each side’s turn (not on that side’s very first turn):

- You win if **all** enemy nexuses are at 0 HP, or they have no wizards left in hand or on the board.
- Draw if both sides lose at the same time.
