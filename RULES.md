# Wizard Battle — Rules

A two-player turn game on a 9×9 grid. Destroy all enemy nexuses, or wipe their wizards.

## Setup

- Each player has **four nexuses** (5 HP each) spread through their back 3 rows: two on the back line (wings) and two a step forward (inner). You must drop **all** of a side’s crystals to win that way. Multiple targets keep the fight from collapsing into one lane.
- **Mountains** sit in edge ridges. They are impassable: you cannot walk onto them, summon onto them, melee them, or cast through them. A push into a mountain is blocked.
- **Water** appears on some maps (not every seed). You can walk, blink, or get pushed onto it — and you **die**. You cannot summon onto it. Line spells fly over it. Lightning **jumps** along a water body (zaps wizards and nexuses next to it). A bolt that hits a raised earth wall **fizzles** and does not jump.
- **Voids** open when a nexus drops to 0 HP. That tile is a hole: entering it kills you, same as water. The dead crystal does not stay on the board.
- Terrain in the top 3 rows is always a vertical mirror of the bottom 3 (same columns) so both camps get an equal layout. The middle band mirrors the same way.
- Each player has the same roster of **six unique wizards**: Ember, Ice, Gale, Earth, Lightning, Temporal. All start off the board.
- Round 1 starts with **2 mana**. Max mana goes up by 1 each round, cap 10. Mana refills to max at the start of your turn.

## Wizards

Melee is a simple adjacent punch for everyone. Casts are unique.

| Wizard | Cost | Move | HP | Melee (dmg / push) | Cast |
| --- | --- | --- | --- | --- | --- |
| Ember (fire) | 3 | 3 | 10 | 5 / 2 | **Stream** — line 4, 3 dmg / 1 push, paints fire |
| Ice | 2 | 3 | 12 | 4 / 2 | **Pulse** — 8 neighbors, 2 dmg / 1 push outward |
| Gale (wind) | 2 | 4 | 8 | 3 / 2 | **Gust** — line 3, 1 dmg / 3 push, paints wind |
| Earth | 3 | 2 | 14 | 4 / 1 | **Raise** — drop a temporary mountain, manhattan 1–2 |
| Lightning | 2 | 3 | 9 | 3 / 1 | **Bolt** — line 4, 2 dmg, no push, **silence** |
| Temporal | 3 | 3 | 9 | 3 / 1 | **Swap / blink** — manhattan 1–3, no damage |

Ice’s extra step is so a back-row arrival can actually threaten midboard. Gale stays the skirmisher at 4. Earth is the slow wall.

## Unique casts

- **Stream / gust / bolt** — straight line, cardinals only. Stops on the first wizard or nexus. Mountains block stream and gust. Water and voids do not. Bolt can shoot a raised earth wall and fizzles there. If a bolt’s path touches water, it jumps the whole connected pool.
- **Pulse** — hitting any highlighted neighbor fires the whole ring. Empty tiles, allies, enemies, and nexuses in the ring all count. Survivors are pushed away from Ice.
- **Raise** — empty walkable tile, not a portal, water, or void. The mountain lasts about one round (through the opponent’s turn), then crumbles. Raised mountains are real walls: they block walk, summon, melee, cast, and push. They are not mirrored to the other camp.
- **Bolt silence** — the victim skips their next attack. No push.
- **Swap / blink** — target a wizard to swap places (line of sight not required; you can hop a mountain). Target an empty unblocked tile to blink there. Portals are legal blink landings. Blinking onto water or a void kills you. You cannot blink onto mountains or living nexuses.

## Turn

On your turn you may, in any order:

1. **Summon** — pay a wizard’s cost and open a **portal** in your back 3 rows (not on a nexus, mountain, water, occupied tile, or another portal). The wizard arrives at the start of your **next** turn, ready to move and attack (no summoning sickness). If an enemy is standing on the portal when it resolves, the summoning wizard dies and the blocker takes 2 damage. Same rules for the enemy.
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
  - **Fire:** walking, sliding, blinking, or arriving onto it costs 1 damage.
  - **Ice:** a push that enters ice does not spend a knockback pip, so you keep sliding.
  - **Wind:** if you finish a move or push on wind, it carries you one more tile in that direction (and chains if you land on wind again). A gust that hits fire **fans** it — fire paints forward along the gust.
  - Bolt, swap, and raise do not paint. Raise builds a wall instead.

## Winning

Checked after each side’s turn (not on that side’s very first turn):

- You win if **all** enemy nexuses are at 0 HP, or they have no wizards left in hand or on the board.
- Draw if both sides lose at the same time.
