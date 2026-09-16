# Agent contract

This is a static browser game. Keep it that way: global scripts, no bundler, no TypeScript, no ES modules.

## File map

Read this instead of grepping the whole tree.

| Change | File |
| --- | --- |
| Load order | `js/scripts.js` only. New domain file goes in `GAME_SCRIPTS.domain`. |
| Team size, kits, `DEFAULT_TEAM` | `js/domain/kits.js` |
| Loadouts, enemy roll | `js/domain/loadout.js` |
| Spell catalog | `js/domain/spells.js` |
| Create / place wizards, Vs opening | `js/domain/wizard.js` (`seedVsOpening`) |
| Mana spend. Melee 0, spell 1 = 1× kit cost, spell 2 = 2× kit cost | `js/domain/mana.js` (`attackManaCost`) |
| Attacks resolve | `js/domain/attack.js` |
| Match reset | `js/domain/match.js` |
| Named Defense fights | `js/domain/missions.js` |
| Defense vek AI | `js/domain/defense-ai.js` |
| Vs hunter AI | `js/ai.js` |
| HUD, selected card | `js/ui.js` |
| Canvas / tokens | `js/board-view.js` |
| Clicks | `js/actions.js` |
| Team page | `js/app/team-page.js` |
| Live rules / to-do | `RULES.md` / `TODO.md` |
| Domain tests | `test/self-tests.js` via `npm test` |

Do not copy the script list into `js/load.js`, `test/sim-node.js`, or `test/combo-check.js`.

## Docs

`RULES.md` and `TODO.md` are the only sources for those pages. Edit the markdown. The live pages fetch and render it (`js/app/markdown.js`). Do not rebuild a second HTML copy of the rules.

Team and Elements stay hand-built in `js/pages.js` / `js/app/team-page.js`.

## Missions

`js/domain/missions.js` is the four named Defense fights. Each pins `islandId`, `loadout`, `spawnBudget`, `pawnCap`, `spawnKinds`, `cityExtra`, opening kind/tile, and player-facing `goal` / `hint`. Add a mission there. The battle track reads `MISSIONS`. Do not copy the list into `js/ui.js`.

Named missions keep the remaining spawn budget after a wipe (killing the opener does not win). Clearing an island unlocks the next (`applyMissionClear`). Mission loadouts are **not** padded to four — island 1 is one wizard, then 2, 3, and a full four. Random Defense (no `missionId`) still ends on a wipe and still fields four. Play defaults to **Vs** (`playlistIdDefault`). Vs is free-play on a **7×7** with **four** wizards a side, **all on the board**, enemy mirrored onto the far row, **three nexuses** a camp. Open arena, no generated terrain. No off-field / hand cubes. **One wizard per turn** (that body may move and strike), then the other side. Mana pays for spell 1 and spell 2 (melee is free), cap **6**. Team-page loadout. Defense vek are **dark discs** (facing wedge for aim); wizards are **cubes**.

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
