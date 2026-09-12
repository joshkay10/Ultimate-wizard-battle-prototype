'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console: console };
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'js/app/markdown.js'), 'utf8'),
  ctx,
  { filename: 'js/app/markdown.js' }
);

const html = ctx.renderMarkdown([
  '# Title',
  '',
  'Hello **world** and `code`.',
  '',
  '## Section',
  '',
  '| A | B |',
  '| --- | --- |',
  '| 1 | 2 |',
  '',
  '- [ ] open item',
  '- [x] done item',
  '',
  '1. first',
  '2. second'
].join('\n'));

function need(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exit(1);
  }
}

need(html.indexOf('<h1>') !== -1, 'h1');
need(html.indexOf('class="lede"') !== -1, 'lede on first paragraph');
need(html.indexOf('<strong>world</strong>') !== -1, 'bold');
need(html.indexOf('<code>code</code>') !== -1, 'inline code');
need(html.indexOf('rules-table') !== -1, 'table class');
need(html.indexOf('todo-list') !== -1, 'todo list');
need(html.indexOf('class="open"') !== -1, 'open todo');
need(html.indexOf('class="done"') !== -1, 'done todo');
need(html.indexOf('<ol>') !== -1, 'numbered list');
console.log('OK: markdown renderer');
