# Wizard Battle — Rules

A two-player turn game on a 9×9 grid. Destroy the enemy nexus, or wipe their wizards.

## Setup

- Each player has a nexus (20 HP) in the center of their back row.
- Each player has the same roster: two Ember, two Rime, two Gale. All start off the board.
- Round 1 starts with 1 mana. Max mana goes up by 1 each round, cap 10. Mana refills to max at the start of your turn.

## Wizards

| Wizard | Cost | Move | HP | Melee (dmg / push) | Cast (dmg / push) |
| --- | --- | --- | --- | --- | --- |
| Ember (fire) | 3 | 3 | 10 | 5 / 2 | 3 / 1 |
| Rime (ice) | 2 | 2 | 12 | 4 / 2 | 2 / 1 |
| Gale (wind) | 2 | 4 | 8 | 3 / 2 | 2 / 1 |

## Turn

On your turn you may, in any order:

1. **Summon** — pay a wizard’s cost, place it in your back 3 rows (not on a nexus or occupied tile).
2. **Move** — each onboard wizard may move once, up to its move range. Other wizards and nexuses block the path.
3. **Attack** — each onboard wizard may attack once, melee or cast.
4. **End turn** — the other player takes their turn.

## Combat

- **Melee** hits an adjacent tile (up, down, left, right).
- **Cast** hits a straight line, range 4, and stops on the first blocker.
- A hit deals that attack’s damage, then **pushes** the target that many tiles away.
- If the push is blocked (wizard, nexus, or edge), the target takes 1 extra damage per tile they could not travel (max 3).
- HP 0 = dead, token leaves the board.
- Attacks also leave an elemental trail on tiles they travel / hit. Hitting an **empty tile is valid** — that is how you paint the ground (ice it, burn it, wind it). Trails last about one turn. Right now they are visual only; later they become terrain (fire hurts to cross, wind carries, ice is frictionless).

## Winning

Checked after each side’s turn (not on that side’s very first turn):

- You win if the enemy nexus is at 0 HP, or they have no wizards left in hand or on the board.
- Draw if both sides lose at the same time.
