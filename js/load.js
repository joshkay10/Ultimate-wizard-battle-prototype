(function () {
  var t = Date.now();
  window.ASSET_Q = '?t=' + t;
  document.documentElement.style.setProperty('--el-icons', 'url("img/elements.png?t=' + t + '")');

  function appendCss(url, next) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = next;
    link.onerror = next;
    document.head.appendChild(link);
  }

  function appendJs(url, next, file) {
    var script = document.createElement('script');
    script.src = url;
    script.onload = next;
    script.onerror = function () {
      var app = document.getElementById('app');
      if (app) app.textContent = 'Failed to load ' + file;
    };
    document.body.appendChild(script);
  }

  function loadList(files, done) {
    var i = 0;
    function next() {
      if (i >= files.length) {
        if (done) done();
        return;
      }
      var file = files[i++];
      var url = file + '?t=' + t;
      if (file.slice(-4) === '.css') appendCss(url, next);
      else appendJs(url, next, file);
    }
    next();
  }

  appendJs('js/scripts.js?t=' + t, function () {
    var css = (GAME_SCRIPTS && GAME_SCRIPTS.css) || ['index.css'];
    var domain = (GAME_SCRIPTS && GAME_SCRIPTS.domain) || [];
    var browser = (GAME_SCRIPTS && GAME_SCRIPTS.browser) || [];
    loadList(css.concat(domain, browser));
  }, 'js/scripts.js');
})();
