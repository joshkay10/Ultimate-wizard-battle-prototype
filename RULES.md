# Wizard Battle — Rules

A two-player turn game on a 9×9 grid. Destroy all enemy nexuses, or wipe their wizards.

## Setup

- Each player has **four nexuses** (5 HP each) spread through their back 3 rows: two on the back line (wings) and two a step forward (inner). You must drop **all** of a side’s crystals to win that way. Multiple targets keep the fight from collapsing into one lane.
- **Mountains** sit in edge ridges. They are impassable: you cannot walk onto them, summon onto them, melee them, or cast through them. A push into a mountain is blocked.
- **Water** appears on some maps (not every seed). You cannot walk, summon, or push onto it, but spells fly over it.
- Terrain in the top 3 rows is always a vertical mirror of the bottom 3 (same columns) so both camps get an equal layout. The middle band mirrors the same way.
- Each player has the same roster: two Ember, two Rime, two Gale. All start off the board.
- Round 1 starts with 1 mana. Max mana goes up by 1 each round, cap 10. Mana refills to max at the start of your turn.

## Wizards

| Wizard | Cost | Move | HP | Melee (dmg / push) | Cast (dmg / push) |
| --- | --- | --- | --- | --- | --- |
| Ember (fire) | 3 | 3 | 10 | 5 / 2 | 3 / 1 |
| Rime (ice) | 2 | 3 | 12 | 4 / 2 | 2 / 1 |
| Gale (wind) | 2 | 4 | 8 | 3 / 2 | 2 / 1 |

Rime’s extra step is so a back-row arrival can actually threaten midboard. Gale stays the skirmisher at 4.

## Turn

On your turn you may, in any order:

1. **Summon** — pay a wizard’s cost and open a **portal** in your back 3 rows (not on a nexus, mountain, water, occupied tile, or another portal). The wizard arrives at the start of your **next** turn, ready to move and attack (no summoning sickness). If an enemy is standing on the portal when it resolves, the summoning wizard dies and the blocker takes 2 damage. Same rules for the enemy.
2. **Move** — each onboard wizard that is not sick and has not moved may move once, up to its move range. Other wizards, nexuses, mountains, and water block the path.
3. **Attack** — each onboard wizard that is not sick and has not attacked may attack once, melee or cast.
4. **End turn** — the other player takes their turn.

## Combat

- **Melee** hits an adjacent tile (up, down, left, right). Mountains and water are not melee targets.
- **Cast** hits a straight line, range 4, and stops on the first wizard or nexus. Mountains block the line entirely (you cannot target them or shoot through them). Water does not.
- A hit deals that attack’s damage, then **pushes** the target that many tiles away.
- If the push is blocked (wizard, nexus, mountain, water, or edge), the target takes 1 extra damage per tile they could not travel (max 3).
- HP 0 = dead, token leaves the board.
- Attacks also leave an elemental trail on tiles they travel / hit. Hitting an **empty tile is valid** — that is how you paint the ground (ice it, burn it, wind it). Trails last about one turn. Right now they are visual only; later they become terrain (fire hurts to cross, wind carries, ice is frictionless).

## Winning

Checked after each side’s turn (not on that side’s very first turn):

- You win if **all** enemy nexuses are at 0 HP, or they have no wizards left in hand or on the board.
- Draw if both sides lose at the same time.
