const boardFx = {
  flash: null,
  projectile: null,
  popup: null,
  liftedId: null
};

const BOARD_COLORS = {
  tile: '#ffffff',
  tileAlt: '#edefeb',
  summon: '#f6f4e9',
  summonAlt: '#eeebdb',
  fireBg: '#fbe9e2',
  iceBg: '#e5f2fa',
  windBg: '#e6f5ee',
  move: '#dcecff',
  melee: '#ffdddb',
  cast: '#ffe9c2',
  selected: '#fff4c2',
  grid: '#c2c5be',
  fire: '#d1481f',
  ice: '#1f7fb8',
  wind: '#2f9e6b',
  token: '#b9bcb5',
  enemy: '#1c1e1b',
  text: '#1c1e1b',
  selectedBorder: '#d9b527',
  moveBorder: '#7fb0e8',
  meleeBorder: '#e2685f',
  castBorder: '#d99a2b'
};

function getBoardCanvas() {
  return document.getElementById('board-canvas');
}

function boardLayout() {
  const canvas = getBoardCanvas();
  if (!canvas) return null;
  const css = canvas.clientWidth;
  if (!css) return null;
  const dpr = window.devicePixelRatio || 1;
  const gap = Math.max(2, css / 200);
  const pad = 1;
  const inner = css - pad * 2;
  const cell = (inner - gap * (BOARD_SIZE - 1)) / BOARD_SIZE;
  return { canvas, css, dpr, gap, pad, cell };
}

function cellRect(layout, row, col) {
  return {
    x: layout.pad + col * (layout.cell + layout.gap),
    y: layout.pad + row * (layout.cell + layout.gap),
    s: layout.cell
  };
}

function boardCanvasCellFromEvent(ev) {
  const layout = boardLayout();
  if (!layout) return null;
  const rect = layout.canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const box = cellRect(layout, r, c);
      if (x >= box.x && x < box.x + box.s && y >= box.y && y < box.y + box.s) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

function highlightSet() {
  const tiles = [];
  let kind = '';
  const selectedWizard = state.selectedWizardId ? state.wizards[state.selectedWizardId] : null;

  if (state.placingWizardId && !state.animating) {
    kind = 'summon';
    for (let r = SUMMON_ROW_START; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!isBlocked(r, c)) tiles.push({ row: r, col: c });
      }
    }
  } else if (selectedWizard && !state.animating) {
    if (state.selectedAction === 'move') {
      kind = 'move';
      return { tiles: getMoveTiles(selectedWizard), kind };
    }
    if (state.selectedAction === 'melee') {
      kind = 'melee';
      return { tiles: getMeleeTiles(selectedWizard), kind };
    }
    if (state.selectedAction === 'cast') {
      kind = 'cast';
      return { tiles: getCastTiles(selectedWizard), kind };
    }
  }
  return { tiles, kind };
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function tileFill(row, col, highlight, kind) {
  const isAlt = (row + col) % 2 === 1;
  const trail = trailAt(row, col);
  if (highlight) {
    if (kind === 'melee') return BOARD_COLORS.melee;
    if (kind === 'cast') return BOARD_COLORS.cast;
    return BOARD_COLORS.move;
  }
  if (trail) {
    if (trail.element === 'fire') return isAlt ? '#f4ddd6' : BOARD_COLORS.fireBg;
    if (trail.element === 'ice') return isAlt ? '#d7e8f3' : BOARD_COLORS.iceBg;
    return isAlt ? '#d8ebe1' : BOARD_COLORS.windBg;
  }
  if (isSummonTile(row, col)) return isAlt ? BOARD_COLORS.summonAlt : BOARD_COLORS.summon;
  return isAlt ? BOARD_COLORS.tileAlt : BOARD_COLORS.tile;
}

function drawElementIcon(ctx, element, cx, cy, size) {
  const color = BOARD_COLORS[element] || BOARD_COLORS.text;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (element === 'ice') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx, cy + size);
    ctx.moveTo(cx - size, cy);
    ctx.lineTo(cx + size, cy);
    ctx.moveTo(cx - size * 0.7, cy - size * 0.7);
    ctx.lineTo(cx + size * 0.7, cy + size * 0.7);
    ctx.moveTo(cx + size * 0.7, cy - size * 0.7);
    ctx.lineTo(cx - size * 0.7, cy + size * 0.7);
    ctx.stroke();
  } else if (element === 'wind') {
    ctx.beginPath();
    ctx.moveTo(cx - size, cy - size * 0.45);
    ctx.lineTo(cx + size * 0.2, cy - size * 0.45);
    ctx.moveTo(cx - size, cy);
    ctx.lineTo(cx + size * 0.55, cy);
    ctx.moveTo(cx - size, cy + size * 0.45);
    ctx.lineTo(cx + size * 0.15, cy + size * 0.45);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.85);
    ctx.quadraticCurveTo(cx - size, cy + size * 0.1, cx - size * 0.15, cy - size * 0.55);
    ctx.quadraticCurveTo(cx, cy - size * 0.05, cx + size * 0.35, cy - size * 0.2);
    ctx.quadraticCurveTo(cx + size * 0.15, cy + size * 0.35, cx, cy + size * 0.85);
    ctx.fill();
  }
  ctx.restore();
}

function drawNexus(ctx, box, hp, flash) {
  const cx = box.x + box.s / 2;
  const cy = box.y + box.s / 2;
  const size = box.s * 0.32;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.lineWidth = Math.max(2, box.s * 0.06);
  ctx.strokeStyle = flash ? '#ffffff' : BOARD_COLORS.text;
  ctx.fillStyle = flash ? '#ffffff' : 'transparent';
  ctx.beginPath();
  ctx.rect(-size, -size, size * 2, size * 2);
  if (flash) ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = flash ? '#1c1e1b' : BOARD_COLORS.text;
  ctx.font = '700 ' + Math.max(10, box.s * 0.22) + 'px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(hp), cx, cy);
}

function drawToken(ctx, box, wizard, selected, lifted, flash) {
  const cx = box.x + box.s / 2;
  const cy = box.y + box.s / 2 - (lifted ? box.s * 0.12 : 0);
  const radius = box.s * 0.36;
  ctx.save();
  if (lifted) {
    ctx.shadowColor = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = flash ? '#ffffff' : (wizard.team === 'enemy' ? BOARD_COLORS.enemy : BOARD_COLORS.token);
  ctx.fill();
  if (selected && !flash) {
    ctx.lineWidth = Math.max(2, box.s * 0.05);
    ctx.strokeStyle = BOARD_COLORS.selectedBorder;
    ctx.stroke();
  }
  ctx.restore();
  if (!flash) drawElementIcon(ctx, wizard.element, cx, cy - radius * 0.08, radius * 0.42);
  ctx.fillStyle = flash ? '#1c1e1b' : (wizard.team === 'enemy' ? '#ffffff' : BOARD_COLORS.text);
  ctx.font = '700 ' + Math.max(8, box.s * 0.18) + 'px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(wizard.hp), cx, cy + radius * 0.52);
}

function drawBoard() {
  const layout = boardLayout();
  if (!layout) return;
  const { canvas, css, dpr } = layout;
  const pixel = Math.round(css * dpr);
  if (canvas.width !== pixel) {
    canvas.width = pixel;
    canvas.height = pixel;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, css, css);

  roundRect(ctx, 0, 0, css, css, 10);
  ctx.fillStyle = BOARD_COLORS.grid;
  ctx.fill();

  const marks = highlightSet();
  const highlightKey = {};
  marks.tiles.forEach(t => { highlightKey[t.row + ',' + t.col] = true; });

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const box = cellRect(layout, r, c);
      const key = r + ',' + c;
      const highlighted = !!highlightKey[key];
      const occ = wizardAt(r, c);
      const nex = nexusAt(r, c);
      const flashHere = boardFx.flash && boardFx.flash.row === r && boardFx.flash.col === c;
      let fill = tileFill(r, c, highlighted, marks.kind);
      if (occ && occ.id === state.selectedWizardId) fill = BOARD_COLORS.selected;
      if (flashHere) fill = '#ffffff';

      roundRect(ctx, box.x, box.y, box.s, box.s, 2);
      ctx.fillStyle = fill;
      ctx.fill();

      if (highlighted) {
        ctx.save();
        ctx.strokeStyle = marks.kind === 'melee' ? BOARD_COLORS.meleeBorder
          : marks.kind === 'cast' ? BOARD_COLORS.castBorder
          : BOARD_COLORS.moveBorder;
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        roundRect(ctx, box.x + 3, box.y + 3, box.s - 6, box.s - 6, 3);
        ctx.stroke();
        ctx.restore();
      }

      if (occ) {
        drawToken(ctx, box, occ, occ.id === state.selectedWizardId, boardFx.liftedId === occ.id, flashHere);
      } else if (nex) {
        drawNexus(ctx, box, nex.hp, flashHere);
      }

      if (boardFx.projectile && boardFx.projectile.row === r && boardFx.projectile.col === c) {
        const color = BOARD_COLORS[boardFx.projectile.element] || BOARD_COLORS.text;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.28;
        roundRect(ctx, box.x, box.y, box.s, box.s, 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        drawElementIcon(ctx, boardFx.projectile.element, box.x + box.s / 2, box.y + box.s / 2, box.s * 0.18);
      }

      if (boardFx.popup && boardFx.popup.row === r && boardFx.popup.col === c) {
        ctx.fillStyle = BOARD_COLORS.fire;
        ctx.font = '800 ' + Math.max(12, box.s * 0.28) + 'px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(boardFx.popup.text, box.x + box.s / 2, box.y + 4);
      }
    }
  }
}

let popupSeq = 0;

function showDamagePopup(row, col, amount) {
  if (!amount) return;
  const id = ++popupSeq;
  boardFx.popup = { row, col, text: '-' + amount, id };
  drawBoard();
  setTimeout(function () {
    if (boardFx.popup && boardFx.popup.id === id) {
      boardFx.popup = null;
      drawBoard();
    }
  }, 500);
}

async function flashImpact(row, col) {
  boardFx.flash = { row, col };
  drawBoard();
  await sleep(180);
  boardFx.flash = null;
  drawBoard();
}

async function animateProjectile(attacker, pathTiles) {
  for (let i = 0; i < pathTiles.length; i++) {
    const tile = pathTiles[i];
    boardFx.projectile = { row: tile.row, col: tile.col, element: attacker.element };
    drawBoard();
    await sleep(70);
  }
  boardFx.projectile = null;
  drawBoard();
}

window.addEventListener('resize', function () {
  drawBoard();
});
