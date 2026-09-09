(function () {
  var t = Date.now();
  var files = [
    'index.css',
    'js/constants.js',
    'js/rng.js',
    'js/state.js',
    'js/util.js',
    'js/board.js',
    'js/units.js',
    'js/sim.js',
    'js/log.js',
    'js/combat.js',
    'js/actions.js',
    'js/turn.js',
    'js/ai.js',
    'js/board-view.js',
    'js/fx.js',
    'js/ui.js',
    'js/router.js',
    'js/pages.js',
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
