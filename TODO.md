# To-do

Finish the **current three** (Ember / Ice / Gale) so trails, casts, and matchups are real. Then add Earth, Lightning, and Temporal. Do not grow the roster until those three feel distinct.

Sprites needed are at the bottom.

## 1. Unique casts (keep melee simple)

Melee stays adjacent punch + push. **Cast is the identity.** Stop using the same line-4 for everyone.

- [ ] **Ember — stream.** Keep the current line of fire. Paints fire on every tile it travels. Best at punching a lane and leaving it burning.
- [ ] **Ice — pulse.** Self-centered burst (around Ice, not a line). Low damage, strong freeze paint, maybe a short push outward. The “I own this pocket” spell.
- [ ] **Gale — gust.** Short line or cone, weak damage, extra push. Paints wind. The spell is the displacement, not the hit.

Later, when the new elements land:

- [ ] **Earth — raise.** Pulse on self or an adjacent tile: drop a **temporary mountain** (1 turn). Block a lane, contest a portal, blunt a push.
- [ ] **Lightning — bolt.** Line or hop. Low damage. **Silence:** target skips their next attack. Paints charged ground.
- [ ] **Temporal — swap / step.** Almost no damage. Swap with a wizard in range, or blink self a few tiles. Melee still exists so they are not helpless. The craft is the board, not the HP bar.

## 2. Trails become terrain

Empty-tile attacks stay valid — that is how you paint.

- [ ] **Fire:** walk onto it, take 1 damage. Ice walking onto fire **melts** the tile (fire goes, maybe becomes nothing or water).
- [ ] **Ice:** no friction. A push over ice does not spend a displacement count (slides farther). Fire walking onto ice **melts** it.
- [ ] **Wind:** escalator. Entering a wind tile slides you one more step in the wind’s facing (the direction it was painted). Fire on wind **spreads** one tile along that facing.
- [ ] Trails last about one turn unless a matchup extends or clears them.

## 3. Matchups (current three)

Classic triangle, expressed through **tiles**, not hidden bonus damage charts.

| | vs Fire | vs Ice | vs Wind |
| --- | --- | --- | --- |
| **Fire** | stacks / refreshes burn | melts ice, extra reason to paint over it | gets carried — wind spreads fire |
| **Ice** | melted if it sits on fire | longer slide | ice under wind **kills the escalator** (too slick to catch) |
| **Wind** | fans the flame along the gust | cannot catch on ice | overlapping gusts refresh the lane |

- [ ] Implement the three interactions above.
- [ ] No “Ember deals +2 to Ice wizard” stealth mods. If it is not on the tile, it is not a matchup.

## 4. New elements (after 1–3)

Roster today is 6 slots (2 Ember, 2 Ice, 2 Gale). Six elements cannot all be 2-ofs on a 9×9. When we add:

- [ ] **Earth** first (body, walls, anti-push). Terrain: temporary mountain, maybe rubble that blocks walk but not cast.
- [ ] **Lightning** second. Terrain: **charged** — if you act (move or attack) from a charged tile you are silenced after. Water + charged = the bolt **jumps** to an extra target. Earth **grounds** it (bolt stops, silence fizzles).
- [ ] **Temporal** third. Terrain: **echo** — the tile remembers the last wizard who left it; Temporal can swap with that echo. Weak in a brawl, nasty with portals and nexus races.

Roster options (pick when we add the first new one):

- [ ] Keep 6 cards: drop to **1 of each** of 6, or **2/2/1/1** while we only have 4 elements.
- [ ] Do not go to 8–10 wizards per side. The board cannot hold it.

## 5. Combat leftovers

- [ ] Crash damage: push into a wizard, nexus, mountain, or map edge should feel like a crash (who eats it, how much, FX).
- [ ] Voids (later than Earth). Fall off / skip a tile. Do not add until mountains, water, and temp-earth are readable.
- [ ] Friendly fire / targeting: say whether you can paint through allies and hit your own nexus.

## 6. Table and AI

- [ ] Restart / rematch without a refresh.
- [ ] Teach the AI the new casts (pulse vs stream vs gust), and that standing on an enemy portal is a kill.
- [ ] AI vs AI batch once trails are real: who dies to nexus vs wipe vs blocked portal.

---

## What I need from you (sprites)

Highest value first. PNG, transparent background, consistent silhouette. Sketch is fine.

1. **Portraits for the card badge** — Ember, Ice, Gale. Square, **256×256**. Same camera / pose language. These also become board tokens.
2. **Board tokens** — same three, **128×128**, circular or square crop. Player and enemy can share art; I can tint the enemy token dark.
3. **If you already have them:** portal glyph, nexus crystal (the 5 HP diamond), mountain, water.

When we add the next three, same deal: Earth, Lightning, Temporal portraits + tokens.

Do **not** need yet: full animation sheets, UI chrome, fonts. One still of each wizard gets us most of the epic.
