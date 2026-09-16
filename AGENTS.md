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
| Hunter AI | `js/ai.js` |
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

## Vs

Play is **Vs** only: a **7×7** deathmatch with **four** wizards a side, **all on the board**, enemy mirrored onto the far row, **three nexuses** a camp. Open arena, no generated terrain. **No summoning** — no hand, no portals, no off-field cubes. Kit `cost` is mana weight for spells, not a drop fee. **One wizard per turn** (that body may move and strike), then the other side. Melee 0, spell 1 = 1× weight, spell 2 = 2×, mana cap **6**. Team-page loadout. Wizards are **cubes**.

Do not re-add a drop / portal / hand loop unless asked. If a kit is too strong, retune damage, move, or mana — do not put bodies in reserve.

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
