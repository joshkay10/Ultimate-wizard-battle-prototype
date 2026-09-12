function escapeDocHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatDocInline(s) {
  s = escapeDocHtml(s);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}

function isTableSep(line) {
  return /^\s*\|?\s*:?-{3,}/.test(line);
}

function parseTable(rows) {
  const cells = rows.map(function (row) {
    return row.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) {
      return c.trim();
    });
  });
  const head = cells[0];
  const body = cells.slice(2);
  let html = '<div class="table-wrap"><table class="rules-table"><thead><tr>';
  head.forEach(function (c) { html += '<th>' + formatDocInline(c) + '</th>'; });
  html += '</tr></thead><tbody>';
  body.forEach(function (row) {
    html += '<tr>';
    row.forEach(function (c) { html += '<td>' + formatDocInline(c) + '</td>'; });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

function renderMarkdown(md, opts) {
  opts = opts || {};
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  let section = '';
  let para = [];
  let ledeNext = false;

  function flushPara() {
    if (!para.length) return;
    const cls = ledeNext ? ' class="lede"' : '';
    ledeNext = false;
    out.push('<p' + cls + '>' + formatDocInline(para.join(' ')) + '</p>');
    para = [];
  }

  function listKind(line) {
    if (/^\s*- \[[ xX]\] /.test(line)) return 'todo';
    if (/^\s*- /.test(line)) return 'ul';
    if (/^\s*\d+\. /.test(line)) return 'ol';
    return '';
  }

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.replace(/\s+$/, '');
    if (!line) {
      flushPara();
      i += 1;
      continue;
    }
    if (line.charAt(0) === '#') {
      flushPara();
      const m = line.match(/^(#{1,3})\s+(.*)$/);
      if (m) {
        const level = m[1].length;
        const title = m[2];
        section = title.toLowerCase();
        if (level === 1) {
          out.push('<h1>' + formatDocInline(title) + '</h1>');
          ledeNext = true;
        } else {
          ledeNext = false;
          if (level === 2) out.push('<h2>' + formatDocInline(title) + '</h2>');
          else out.push('<h3>' + formatDocInline(title) + '</h3>');
        }
        i += 1;
        continue;
      }
    }
    if (line.indexOf('|') !== -1 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushPara();
      ledeNext = false;
      const rows = [line];
      i += 1;
      while (i < lines.length && lines[i].indexOf('|') !== -1) {
        rows.push(lines[i].replace(/\s+$/, ''));
        i += 1;
      }
      out.push(parseTable(rows));
      continue;
    }
    const kind = listKind(line);
    if (kind) {
      flushPara();
      ledeNext = false;
      const items = [];
      while (i < lines.length && listKind(lines[i].replace(/\s+$/, '')) === kind) {
        items.push(lines[i].replace(/\s+$/, ''));
        i += 1;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !listKind(lines[i].replace(/\s+$/, ''))) {
          items[items.length - 1] += ' ' + lines[i].trim();
          i += 1;
        }
      }
      if (kind === 'todo') {
        out.push('<ul class="todo-list">');
        items.forEach(function (item) {
          const done = /^\s*- \[[xX]\] /.test(item);
          const text = item.replace(/^\s*- \[[ xX]\] /, '');
          let cls = done ? 'done' : 'open';
          if (!done && section.indexOf('need from you') >= 0) cls = 'need';
          out.push('<li class="' + cls + '"><span class="todo-mark"></span>' + formatDocInline(text) + '</li>');
        });
        out.push('</ul>');
      } else {
        const tag = kind === 'ol' ? 'ol' : 'ul';
        out.push('<' + tag + '>');
        items.forEach(function (item) {
          const text = item.replace(/^\s*(?:- |\d+\. )/, '');
          out.push('<li>' + formatDocInline(text) + '</li>');
        });
        out.push('</' + tag + '>');
      }
      continue;
    }
    para.push(line);
    i += 1;
  }
  flushPara();
  const inner = out.join('\n');
  if (opts.wrap === false) return inner;
  return '<article class="page" id="doc-md">' + inner + '</article>';
}

function fillMarkdownPage(route) {
  const file = route === 'rules' ? 'RULES.md' : 'TODO.md';
  const q = typeof ASSET_Q === 'string' ? ASSET_Q : '';
  const expected = route;
  fetch(file + q).then(function (res) {
    if (!res.ok) throw new Error(file);
    return res.text();
  }).then(function (md) {
    if (typeof currentRoute === 'function' && currentRoute() !== expected) return;
    const root = document.getElementById('doc-md');
    if (!root) return;
    const html = renderMarkdown(md);
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    const article = wrap.firstChild;
    if (article) root.replaceWith(article);
  }).catch(function () {
    if (typeof currentRoute === 'function' && currentRoute() !== expected) return;
    const root = document.getElementById('doc-md');
    if (root) root.innerHTML = '<h1>Missing</h1><p class="lede">Could not load ' + file + '.</p>';
  });
}
