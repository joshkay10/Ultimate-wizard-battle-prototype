(function () {
  var t = Date.now();
  window.ASSET_Q = '?t=' + t;
  document.documentElement.style.setProperty('--el-icons', 'url("img/elements.png?t=' + t + '")');
  var files = [
    'index.css',
    'js/constants.js',
    'js/domain/kits.js',
    'js/domain/geo.js',
    'js/rng.js',
    'js/state.js',
    'js/util.js',
    'js/domain/occupancy.js',
    'js/domain/nexus.js',
    'js/domain/trail.js',
    'js/domain/terrain.js',
    'js/domain/path.js',
    'js/domain/wizard.js',
    'js/domain/mana.js',
    'js/domain/kill.js',
    'js/domain/push.js',
    'js/domain/summon.js',
    'js/domain/move.js',
    'js/domain/attack.js',
    'js/domain/turn-sim.js',
    'js/domain/match.js',
    'js/app/present.js',
    'js/app/storage.js',
    'js/app/battle.js',
    'js/log.js',
    'js/combat.js',
    'js/actions.js',
    'js/turn.js',
    'js/ai.js',
    'js/board-view.js',
    'js/fx.js',
    'js/router.js',
    'js/app/team-page.js',
    'js/pages.js',
    'js/ui.js',
    'js/headless.js',
    'index.js'
  ];
  var i = 0;
  function loadNext() {
    if (i >= files.length) return;
    var file = files[i++];
    var url = file + '?t=' + t;
    if (file.slice(-4) === '.css') {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = loadNext;
      link.onerror = loadNext;
      document.head.appendChild(link);
      return;
    }
    var script = document.createElement('script');
    script.src = url;
    script.onload = loadNext;
    script.onerror = function () {
      var app = document.getElementById('app');
      if (app) app.textContent = 'Failed to load ' + file;
    };
    document.body.appendChild(script);
  }
  loadNext();
})();
