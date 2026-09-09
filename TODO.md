# To-do

Six unique wizards are in: Ember stream, Ice pulse, Gale gust, Earth raise, Lightning bolt, Temporal swap/blink. Trails are still cosmetic except Earth’s raised mountains, which are real walls.

## Next: terrain

Board tiles that are not just a flat grid.

- [x] Water — impassable lakes on some maps; spells fly over
- [ ] Voids
- [x] Mountains — impassable edge ridges; block walk, summon, and cast
- [x] Earth raise — temporary mountain, about one round
- [ ] Fire, ice, and wind trails become real terrain:
  - Fire: walking onto a fire tile costs 1 damage
  - Wind: an escalator (it carries you)
  - Ice: no friction — a push over ice does not spend a displacement count
- [ ] Lightning / earth matchups later: bolt jumps on water, grounds on raised earth

## Combat

- [x] Crash damage: wall = pushee takes 1 per tile short (max 3). Wizard = both take it. Allies included.
- [x] Friendly fire: you can hit your own wizards. Empty tiles stay valid.
- [x] Unique casts per wizard

## Later

- [ ] Restart / rematch without a refresh
- [ ] AI vs AI batch: win rate, average rounds, who died to nexus vs wipe
- [ ] Hook so we can swap AI brains without rewriting the rules
- [ ] Portrait art for the six wizards
