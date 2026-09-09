# To-do

Shipped: six unique kits, real fire/ice/wind trails (lightning and temporal do not paint), portals, mountains, water-as-wall, flat crash (1, not leftover push), friendly fire, 2 starting mana, named casts, action log, rematch, portal arrival copy, clearer discs, magma/ice/wind trail paint, unique stream/pulse/gust/raise/bolt/swap animations, hop walks, ghosted pushes, punchier hits. This list is only what is next.

## Need from you

Canvas drawings are placeholders. If you have any of this, send it — a sprite sheet is fine if that’s easier than separate files. Say the frame size.

- [ ] **Element icons** (highest value): flame, ice/snowflake, wind, earth/mountain, bolt, clock. Transparent PNG, about 64×64, or one sheet. Replaces the doodles on cards and discs.
- [ ] **Wizard sprites** if you have them: one pose per kit is enough (Ember, Ice, Gale, Earth, Lightning, Temporal). Square, transparent. Board tokens and/or card art. Player vs enemy variants are extra, not required.
- [ ] **Terrain tiles** (optional, would read better than canvas): magma, ice frost, wind, water, mountain, and later void. 64×64 tiles that can repeat. Magma and ice frost are painted in code now; sprites can replace them.

Not blocking: the AI. That is code.

## Terrain

- [ ] **Water and voids kill on enter.** Not a crash wall — step, slide, blink, or get pushed on and you die.
- [ ] **A dead nexus becomes a void** on that tile. Dropping a crystal opens a hole in the camp.
- [ ] Lightning jumps along water, grounds / fizzles on a raised earth wall.
- [ ] Wind fans fire (spreads it along the gust).

## AI

- [ ] **Overhaul.** Hunt portals, respect voids/water, use raise as a wall, stop Temporal from teleporting into a nexus every fight, and play each kit like itself.
- [ ] Hook so we can swap AI brains without rewriting the rules.
- [ ] AI vs AI batch once the new brain is in: win rate, rounds, nexus vs wipe vs void.
