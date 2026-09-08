const boardFx = {
  flash: null,
  projectile: null,
  popups: [],
  override: {},
  ghosts: [],
  slash: null,
  rings: [],
  particles: [],
  shake: 0,
  screenFlash: 0,
  popScale: {},
  fade: {},
  lungeReturn: null,
  stream: null,
  charge: null
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

function boxToOv(box) {
  return { x: box.x, y: box.y, s: box.s };
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
    if (state.selectedAction === 'move' && canMove(selectedWizard)) {
      return { tiles: getMoveTiles(selectedWizard), kind: 'move' };
    }
    if (state.selectedAction === 'melee' && canAttack(selectedWizard)) {
      return { tiles: getMeleeTiles(selectedWizard), kind: 'melee' };
    }
    if (state.selectedAction === 'cast' && canAttack(selectedWizard)) {
      return { tiles: getCastTiles(selectedWizard), kind: 'cast' };
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

function drawTokenAt(ctx, box, wizard, selected, flash, scale) {
  const cx = box.x + box.s / 2;
  const cy = box.y + box.s / 2;
  const radius = box.s * 0.36 * (scale || 1);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale || 1, scale || 1);
  ctx.translate(-cx, -cy);
  ctx.beginPath();
  ctx.arc(cx, cy, box.s * 0.36, 0, Math.PI * 2);
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

function drawStream(ctx) {
  const s = boardFx.stream;
  if (!s) return;
  const fade = s.fade != null ? 1 - s.fade : 1;
  const t = s.head;
  const x = s.x0 + (s.x1 - s.x0) * t;
  const y = s.y0 + (s.y1 - s.y0) * t;
  const color = BOARD_COLORS[s.element] || '#fff';
  const now = performance.now() / 90;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.22 * fade;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(s.x0, s.y0);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.globalAlpha = 0.55 * fade;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(s.x0, s.y0);
  const dx = s.x1 - s.x0;
  const dy = s.y1 - s.y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    const u = (i / steps) * t;
    const wobble = Math.sin(u * 18 + now) * 3.5 * (0.4 + u);
    ctx.lineTo(s.x0 + dx * u + nx * wobble, s.y0 + dy * u + ny * wobble);
  }
  ctx.stroke();

  ctx.globalAlpha = 0.95 * fade;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(s.x0, s.y0);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.globalAlpha = fade;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawChargeGlow(ctx, box, element, t) {
  const cx = box.x + box.s / 2;
  const cy = box.y + box.s / 2;
  const color = BOARD_COLORS[element] || '#fff';
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.25 + t * 0.55;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, box.s * (0.32 + t * 0.18), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.globalAlpha = t * 0.18;
  ctx.fill();
  ctx.restore();
}

function spawnBurst(cx, cy, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const sp = speed * (0.35 + Math.random());
    boardFx.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 1,
      color: color,
      size: 1.8 + Math.random() * 2.4
    });
  }
}

function tickFx(dt) {
  const k = dt / 16.6;
  boardFx.shake *= Math.pow(0.86, k);
  if (boardFx.shake < 0.15) boardFx.shake = 0;
  boardFx.screenFlash *= Math.pow(0.82, k);
  if (boardFx.screenFlash < 0.02) boardFx.screenFlash = 0;
  boardFx.particles.forEach(p => {
    p.x += p.vx * k;
    p.y += p.vy * k;
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.life -= 0.045 * k;
  });
  boardFx.particles = boardFx.particles.filter(p => p.life > 0);
  boardFx.rings.forEach(r => { r.t += 0.06 * k; });
  boardFx.rings = boardFx.rings.filter(r => r.t < 1);
  boardFx.popups.forEach(p => { p.t += 0.045 * k; });
  boardFx.popups = boardFx.popups.filter(p => p.t < 1);
}

let fxLooping = false;
let fxLast = 0;

function ensureFxLoop() {
  if (fxLooping) return;
  fxLooping = true;
  fxLast = performance.now();
  function loop(now) {
    const dt = Math.min(40, now - fxLast);
    fxLast = now;
    tickFx(dt);
    drawBoard();
    const busy = boardFx.shake > 0 || boardFx.screenFlash > 0.02 || boardFx.particles.length || boardFx.rings.length || boardFx.popups.length;
    if (busy) requestAnimationFrame(loop);
    else fxLooping = false;
  }
  requestAnimationFrame(loop);
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
  ctx.save();
  roundRect(ctx, 0, 0, css, css, 10);
  ctx.clip();

  if (boardFx.shake > 0) {
    const t = performance.now();
    ctx.translate(
      Math.sin(t * 0.063) * boardFx.shake,
      Math.cos(t * 0.081) * boardFx.shake
    );
  }

  const marks = highlightSet();
  const highlightKey = {};
  marks.tiles.forEach(t => { highlightKey[t.row + ',' + t.col] = true; });

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const box = cellRect(layout, r, c);
      const highlighted = !!highlightKey[r + ',' + c];
      const nex = nexusAt(r, c);
      const flashHere = boardFx.flash && boardFx.flash.row === r && boardFx.flash.col === c;
      let fill = tileFill(r, c, highlighted, marks.kind);
      const occHere = wizardAt(r, c);
      if (occHere && occHere.id === state.selectedWizardId && !boardFx.override[occHere.id]) fill = BOARD_COLORS.selected;
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

      if (nex) drawNexus(ctx, box, nex.hp, flashHere);
    }
  }

  Object.values(state.wizards).forEach(wizard => {
    if (wizard.state !== 'onboard') return;
    const ov = boardFx.override[wizard.id];
    const box = ov || cellRect(layout, wizard.row, wizard.col);
    const scale = boardFx.popScale[wizard.id] || 1;
    const flashBox = boardFx.flash ? cellRect(layout, boardFx.flash.row, boardFx.flash.col) : null;
    const flashHere = !!(flashBox && Math.abs(box.x - flashBox.x) < 1 && Math.abs(box.y - flashBox.y) < 1);
    if (boardFx.charge && boardFx.charge.id === wizard.id) {
      drawChargeGlow(ctx, box, boardFx.charge.element, boardFx.charge.t);
    }
    ctx.save();
    if (boardFx.fade[wizard.id] != null) ctx.globalAlpha = boardFx.fade[wizard.id];
    drawTokenAt(ctx, box, wizard, wizard.id === state.selectedWizardId, flashHere, scale);
    ctx.restore();
  });

  boardFx.ghosts.forEach(g => {
    ctx.save();
    ctx.globalAlpha = g.alpha;
    drawTokenAt(ctx, g.box, g.wizard, false, false, g.scale || 1);
    ctx.restore();
  });

  boardFx.rings.forEach(ring => {
    const b = cellRect(layout, ring.row, ring.col);
    const cx = b.x + b.s / 2;
    const cy = b.y + b.s / 2;
    ctx.save();
    ctx.strokeStyle = BOARD_COLORS[ring.element] || '#fff';
    ctx.globalAlpha = (1 - ring.t) * 0.9;
    ctx.lineWidth = 3.2 * (1 - ring.t * 0.4);
    ctx.beginPath();
    ctx.arc(cx, cy, b.s * 0.18 + ring.t * b.s * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  if (boardFx.stream) drawStream(ctx);
  if (boardFx.projectile) {
    const p = boardFx.projectile;
    ctx.save();
    ctx.fillStyle = BOARD_COLORS[p.element] || BOARD_COLORS.text;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawElementIcon(ctx, p.element, p.x, p.y, 8);
  }

  if (boardFx.slash) {
    const s = boardFx.slash;
    const t = s.t;
    const mx = (s.x0 + s.x1) / 2;
    const my = (s.y0 + s.y1) / 2;
    const dx = s.x1 - s.x0;
    const dy = s.y1 - s.y0;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len * 26;
    const py = dx / len * 26;
    const grow = 0.25 + t * 1.05;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8 * (1 - t * 0.55);
    ctx.globalAlpha = 0.85 * (1 - t);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mx - px * grow, my - py * grow);
    ctx.lineTo(mx + px * grow, my + py * grow);
    ctx.stroke();
    ctx.strokeStyle = BOARD_COLORS[s.element] || '#fff';
    ctx.lineWidth = 4 * (1 - t * 0.4);
    ctx.stroke();
    ctx.restore();
  }

  boardFx.particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  boardFx.popups.forEach(p => {
    const b = cellRect(layout, p.row, p.col);
    const punch = 1 + (1 - p.t) * 0.28;
    ctx.save();
    ctx.globalAlpha = 1 - p.t;
    ctx.fillStyle = BOARD_COLORS.fire;
    ctx.font = '800 ' + Math.max(14, b.s * 0.32 * punch) + 'px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, b.x + b.s / 2, b.y + b.s * 0.18 - p.t * 18);
    ctx.restore();
  });

  if (boardFx.screenFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (boardFx.screenFlash * 0.55) + ')';
    ctx.fillRect(0, 0, css, css);
  }

  ctx.restore();
}

window.addEventListener('resize', function () {
  drawBoard();
});
