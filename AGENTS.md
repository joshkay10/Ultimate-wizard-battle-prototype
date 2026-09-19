# Agent contract

This is a static browser game. Keep it that way: global scripts, no bundler, no TypeScript, no ES modules.

## File map

Read this instead of grepping the whole tree.

| Change | File |
| --- | --- |
| Load order | `js/scripts.js` only. New domain file goes in `GAME_SCRIPTS.domain`. |
| Team size, kits, `DEFAULT_TEAM` | `js/domain/kits.js` |
| Loadouts | `js/domain/loadout.js` |
| Spell catalog | `js/domain/spells.js` |
| Create / place wizards | `js/domain/wizard.js` |
| Mana spend. Stock 0, summon 1, spell 1 = 1× kit cost, spell 2 = 2× kit cost | `js/domain/mana.js` (`attackManaCost`, `summonManaCost`, `wizardSpellTier`) |
| Attacks resolve | `js/domain/attack.js` |
| Match reset | `js/domain/match.js` |
| Named Defense fights | `js/domain/missions.js` |
| Defense vek AI | `js/domain/defense-ai.js` |
| Summon spell | `js/domain/summon.js` |
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

Named missions keep the remaining spawn budget after a wipe (killing the opener does not win). Clearing an island unlocks the next (`applyMissionClear`). Play is **Defense only**. Four wizards start **off the field** and come in with a **summon spell** (1 mana). Each onboard wizard gets **1 move and 1 attack** per turn. Stock is 1 dmg / 1 push / range 1 (free). Spell 1 unlocks after a kill, spell 2 after two. Spells cost mana, cap **6**. Mission loadouts pad to four. Defense vek are **dark discs** (facing wedge for aim); wizards are **cubes**.

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
- Re-add Vs / chess pace / on-board opening.

## Defense (must keep)

- Open with **1** vek on the board, no telegraph, no incoming marks on round 1.
- Beeline the nearest city nexus. Wizard shot only if the city is out of reach this turn.
- `pickDefenseIntent` never aims empty air.
- Cap **3** vek on the board. **10** invaders total. **One** incoming hole per enemy phase.
- **Four** off-field. Summon is a **spell** (1 mana), any open tile, lands ready to act. Mana start 2, +1/round, cap 6.
- Mites are 1 HP fodder and may stack (still 1 HP, hit ×2). Golems are heavies you shove into hazards.
- Charge: body walks the path; the attack event has `path`, `spellName: 'Charge'`, `castKind: 'gust'`, 1 dmg + push 1.
- Smash leftover knockback. City crash stays 1.
