# To-do

Work through this in order unless a playtest says otherwise. Keep the engine separable from the UI so we can later run AI vs AI with no browser.

## Combat that you can actually see

Damage is applied in code, but it is easy to miss.

- [x] Show HP on board tokens (not only on player cards)
- [x] Show damage numbers / HP flash when a hit lands
- [x] Confirm melee, cast, push, and collision damage against wizards and nexuses
- [x] Dead wizards vanish and their roster card goes away
- [ ] Attacks on empty tiles still leave trails, but should not feel like a “miss bug”

## FX

- [ ] Melee: short lunge / slash, not only a tile tint
- [x] Cast: clearer projectile, impact pop, element-colored trail
- [x] Hit: white flash, then knockback that matches the push
- [ ] Movement: slide between tiles instead of teleport + hop
- [ ] Summon: place pop so a new unit is obvious

## AI

Current AI: spend mana, summon into the back 3 rows, then attack if something is in range, else walk toward the nearest threat.

- [ ] Summon with a plan (save for Ember vs dump cheap units)
- [ ] Prefer lethal hits and nexus damage
- [ ] Do not walk into obvious death for no gain
- [ ] Use melee vs cast on purpose (range, push direction, collision)
- [ ] Act with more than one wizard in a sensible order

## Engine gaps (needed before it is a real game)

Split “what happened” from “how it looks”. UI should play events. The sim should not need the DOM.

- [ ] Seeded RNG (replays and tests stay stable)
- [ ] Event log: summon, move, attack, push, death, trail, turn end, game over
- [ ] Headless match runner (no `document`, no timers)
- [ ] Same rules for player, AI, and sim
- [ ] Trails do something (slow, damage, element clash) or stay marked as cosmetic
- [ ] Friendly fire / targeting rules made explicit
- [ ] Same-turn summon then act: keep or ban, then lock it in
- [ ] Restart / rematch without a refresh
- [ ] Basic tests for move range, line of cast, push, win/loss

## Balance sims (later)

- [ ] AI vs AI matches from a fixed seed
- [ ] Batch runner: N games, win rate, average rounds, who died to nexus vs wipe
- [ ] Log enough to see if Ember / Rime / Gale is stomping
- [ ] Hook so we can swap AI brains without rewriting the rules
