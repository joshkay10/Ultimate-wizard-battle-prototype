# To-do

Empty-tile attacks are valid. You can ice / burn / wind a tile on purpose. Trails are still cosmetic until the terrain pass below.

## Next: terrain

Board tiles that are not just a flat grid.

- [x] Water — impassable lakes on some maps; spells fly over
- [ ] Voids
- [x] Mountains — impassable edge ridges; block walk, summon, and cast
- [ ] Fire, ice, and wind trails become real terrain:
  - Fire: walking onto a fire tile costs 1 damage
  - Wind: an escalator (it carries you)
  - Ice: no friction — a push over ice does not spend a displacement count

## Combat

- [x] Crash damage: wall = pushee takes 1 per tile short (max 3). Wizard = both take it. Allies included.
- [x] Friendly fire: you can hit your own wizards. Empty tiles stay valid.

## Later

- [ ] Restart / rematch without a refresh
- [ ] AI vs AI batch: win rate, average rounds, who died to nexus vs wipe
- [ ] Hook so we can swap AI brains without rewriting the rules
