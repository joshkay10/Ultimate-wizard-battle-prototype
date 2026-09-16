function vsRoster(match, team, st) {
  return Object.values(match.wizards).filter(function (wizard) {
    return wizard.team === team && wizard.state === st && !wizard.pawnKind;
  }).sort(function (a, b) {
    return parseInt(a.id.slice(1), 10) - parseInt(b.id.slice(1), 10);
  });
}

function vsOnboardCount(match, team) {
  return vsRoster(match, team, 'onboard').length;
}

function vsHandCount(match, team) {
  return vsRoster(match, team, 'summoned').length;
}

function vsDeckCount(match, team) {
  return vsRoster(match, team, 'deck').length;
}

function vsBoardFull(match, team) {
  const cap = typeof VS_BOARD_CAP === 'number' ? VS_BOARD_CAP : 2;
  return vsOnboardCount(match, team) >= cap;
}

function drawVsHand(match, team) {
  if (!match || match.gameMode === 'defense') return;
  const want = typeof VS_HAND_SIZE === 'number' ? VS_HAND_SIZE : 1;
  while (vsHandCount(match, team) < want) {
    const deck = vsRoster(match, team, 'deck');
    if (!deck.length) break;
    deck[0].state = 'summoned';
  }
}

function pickVsOpeningTile(match, team) {
  const preferred = (typeof VS_OPENING_TILE === 'object' && VS_OPENING_TILE[team]) || null;
  function ok(row, col) {
    return inBounds(row, col) && canOpenPortalAt(match, row, col);
  }
  if (preferred && ok(preferred.row, preferred.col)) return { row: preferred.row, col: preferred.col };
  const seeds = [];
  if (preferred) seeds.push(preferred);
  seeds.push(team === 'player' ? { row: 5, col: 4 } : { row: 3, col: 4 });
  const seen = {};
  const queue = seeds.slice();
  let i;
  for (i = 0; i < queue.length; i++) {
    const cur = queue[i];
    const key = tileKey(cur.row, cur.col);
    if (seen[key]) continue;
    seen[key] = true;
    if (ok(cur.row, cur.col)) return { row: cur.row, col: cur.col };
    CARDINALS.forEach(function (d) {
      const nr = cur.row + d[0];
      const nc = cur.col + d[1];
      if (!inBounds(nr, nc) || seen[tileKey(nr, nc)]) return;
      if (team === 'player' && nr < 3) return;
      if (team === 'enemy' && nr > 5) return;
      queue.push({ row: nr, col: nc });
    });
  }
  return null;
}

function seedVsOpening(match) {
  if (!match || match.gameMode === 'defense') return;
  ['player', 'enemy'].forEach(function (team) {
    const roster = vsRoster(match, team, 'summoned');
    if (!roster.length) return;
    const opener = roster[0];
    const tile = pickVsOpeningTile(match, team);
    if (tile) {
      opener.state = 'onboard';
      opener.row = tile.row;
      opener.col = tile.col;
      opener.hasMoved = false;
      opener.hasAttacked = false;
      opener.summoningSickness = false;
    }
    roster.forEach(function (wizard) {
      if (wizard.id === opener.id) return;
      wizard.state = 'deck';
      wizard.row = null;
      wizard.col = null;
    });
    drawVsHand(match, team);
  });
}
