'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..');
const GAME_SCRIPTS = require('../js/scripts.js');

function emptyCtx() {
  return {
    console: console,
    Math: Math,
    Date: Date,
    JSON: JSON,
    Object: Object,
    Array: Array,
    Promise: Promise,
    setTimeout: setTimeout,
    parseInt: parseInt,
    Infinity: Infinity,
    performance: { now: function () { return Date.now(); } }
  };
}

function assertManifest() {
  const live = GAME_SCRIPTS.css.concat(GAME_SCRIPTS.domain, GAME_SCRIPTS.browser);
  const all = live.concat(GAME_SCRIPTS.tests);
  all.forEach(function (file) {
    if (!fs.existsSync(path.join(root, file))) throw new Error('missing script ' + file);
  });
  live.forEach(function (file) {
    if (file.indexOf('test/') === 0 || file === 'js/headless.js') {
      throw new Error('live bundle must not include ' + file);
    }
  });
}

function runFiles(ctx, files) {
  files.forEach(function (file) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(src, ctx, { filename: file });
  });
}

function loadGame(extra) {
  assertManifest();
  const ctx = emptyCtx();
  vm.createContext(ctx);
  runFiles(ctx, GAME_SCRIPTS.domain.concat(extra || []));
  return ctx;
}

module.exports = { loadGame, runFiles, emptyCtx, assertManifest, GAME_SCRIPTS, root };
