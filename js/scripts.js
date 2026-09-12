// Single load list for the browser, Node tests, and agents.
// Domain files are the rules engine. Browser files need the DOM. Tests stay off the live page.
var GAME_SCRIPTS = {
  css: ['index.css'],
  domain: [
    'js/constants.js',
    'js/domain/kits.js',
    'js/domain/spells.js',
    'js/domain/loadout.js',
    'js/domain/geo.js',
    'js/rng.js',
    'js/state.js',
    'js/util.js',
    'js/domain/occupancy.js',
    'js/domain/nexus.js',
    'js/domain/trail.js',
    'js/domain/terrain.js',
    'js/domain/islands.js',
    'js/domain/path.js',
    'js/domain/wizard.js',
    'js/domain/mana.js',
    'js/domain/kill.js',
    'js/domain/push.js',
    'js/domain/summon.js',
    'js/domain/move.js',
    'js/domain/attack.js',
    'js/domain/turn-sim.js',
    'js/domain/defense-pawns.js',
    'js/domain/defense-spawn.js',
    'js/domain/defense-ai.js',
    'js/domain/defense-strike.js',
    'js/domain/match.js',
    'js/app/present.js',
    'js/log.js',
    'js/ai.js'
  ],
  browser: [
    'js/app/storage.js',
    'js/app/battle.js',
    'js/combat.js',
    'js/actions.js',
    'js/turn.js',
    'js/board-view.js',
    'js/fx.js',
    'js/router.js',
    'js/app/team-page.js',
    'js/app/markdown.js',
    'js/pages.js',
    'js/ui.js',
    'index.js'
  ],
  tests: [
    'test/self-tests.js'
  ]
};

if (typeof module !== 'undefined' && module.exports) module.exports = GAME_SCRIPTS;
