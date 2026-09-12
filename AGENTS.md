# Agent contract

This is a static browser game. Keep it that way: global scripts, no bundler, no TypeScript, no ES modules.

## Load list

`js/scripts.js` is the only script list.

- `domain` — rules engine. Node tests load this.
- `browser` — DOM, canvas, FX, pages. GitHub Pages loads `css + domain + browser`.
- `tests` — `test/` only. Never add `test/` files to `browser`.

New domain file: add it to `GAME_SCRIPTS.domain` in load order. Do not copy the list into `js/load.js`, `test/sim-node.js`, or `test/combo-check.js`.

## Docs

`RULES.md` and `TODO.md` are the only sources for those pages. Edit the markdown. The live pages fetch and render it (`js/app/markdown.js`). Do not rebuild a second HTML copy of the rules.

Team and Elements stay hand-built in `js/pages.js` / `js/app/team-page.js`.

## Missions

`js/domain/missions.js` is the four named Defense fights. Each pins `islandId`, `loadout`, `spawnBudget`, `pawnCap`, `spawnKinds`, `cityExtra`, and opening kind/tile. Add a mission there. The battle dropdown reads `MISSIONS`. Do not copy the list into `js/ui.js`.

Named missions keep the remaining spawn budget after a wipe (killing the opener does not win). Random Defense (no `missionId`) still ends on a wipe. Vs is free-play with the Team-page loadout. Mission fours are locked.

## Tests

```
npm test
```

That runs `test/sim-node.js`, `test/combo-check.js`, and `test/markdown-check.js`. Open the game over HTTP (`npm start` or any static server). `file://` cannot fetch the markdown.

## Do not

- Delete `afterPlayerAction` in `js/turn.js`.
- Add sounds.
- Add video to the game unless asked.
- Put tests on the live page.

## Defense (must keep)

- Open with **1** vek on the board, no telegraph, no incoming marks on round 1.
- Beeline the nearest city nexus. Wizard shot only if the city is out of reach this turn.
- `pickDefenseIntent` never aims empty air.
- Cap **3** vek on the board. **10** invaders total. **One** incoming hole per enemy phase.
- **One drop per round**, land immediately. Defense mana (start 2, +1/round, cap 6) is **specials only**.
- Mites are 1 HP fodder and may stack (still 1 HP, hit ×2). Golems are heavies you shove into hazards.
- Charge: body walks the path; the attack event has `path`, `spellName: 'Charge'`, `castKind: 'gust'`, 1 dmg + push 1.
- Smash leftover knockback. City crash stays 1.
