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
  gust: null,
  bolt: null,
  pulseWave: null,
  raiseSpike: null,
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
  earthBg: '#f3ead8',
  lightningBg: '#fbf3d5',
  temporalBg: '#efe8f7',
  move: '#dcecff',
  melee: '#ffdddb',
  cast: '#ffe9c2',
  selected: '#fff4c2',
  grid: '#c2c5be',
  fire: '#d1481f',
  ice: '#1f7fb8',
  wind: '#2f9e6b',
  earth: '#7a6238',
  lightning: '#c9a227',
  temporal: '#6b4c9a',
  mountain: '#d5cfc0',
  mountainAlt: '#c8c1b0',
  mountainBody: '#5a554a',
  mountainBody2: '#6b6558',
  mountainSnow: '#f3efe6',
  water: '#c5e4f0',
  waterAlt: '#b3d9ea',
  waterWave: 'rgba(255,255,255,0.55)',
  waterLine: '#6ea9c4',
  void: '#1c1d1a',
  voidAlt: '#141512',
  voidRim: '#3d4038',
  voidHole: '#070806',
  magma: '#4a2214',
  magmaAlt: '#5c2c18',
  magmaCrack: '#ff8a3a',
  magmaHot: '#ffd36a',
  iceRim: 'rgba(255,255,255,0.92)',
  iceInner: 'rgba(130, 190, 220, 0.7)',
  token: '#b9bcb5',
  puckPlayer: '#2e302c',
  puckPlayerSide: '#161815',
  puckEnemy: '#d6d8d2',
  puckEnemySide: '#9a9d96',
  enemy: '#1c1e1b',
  text: '#1c1e1b',
  selectedBorder: '#d9b527',
  moveBorder: '#7fb0e8',
  meleeBorder: '#e2685f',
  castBorder: '#d99a2b',
  portalRing: '#7a5cff',
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
        if (canOpenPortalAt(r, c)) tiles.push({ row: r, col: c });
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
      return { tiles: getCastTiles(selectedWizard), kind: 'cast', castKind: selectedWizard.castKind || 'stream' };
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

function tileFill(row, col, highlight, kind, castKind) {
  const isAlt = (row + col) % 2 === 1;
  if (voidAt(row, col)) return isAlt ? BOARD_COLORS.voidAlt : BOARD_COLORS.void;
  if (mountainAt(row, col)) return isAlt ? BOARD_COLORS.mountainAlt : BOARD_COLORS.mountain;
  if (waterAt(row, col)) return isAlt ? BOARD_COLORS.waterAlt : BOARD_COLORS.water;
  if (highlight) {
    if (kind === 'melee') return BOARD_COLORS.melee;
    if (kind === 'cast') {
      if (castKind === 'pulse') return '#d7e8f3';
      if (castKind === 'gust') return '#d8ebe1';
      if (castKind === 'raise') return '#e8ddc8';
      if (castKind === 'bolt') return '#f3e9c4';
      if (castKind === 'swap') return '#eadff3';
      if (castKind === 'stream') return '#f4ddd6';
      return BOARD_COLORS.cast;
    }
    return BOARD_COLORS.move;
  }
  const trail = trailAt(row, col);
  if (trail) {
    if (trail.element === 'fire') return isAlt ? BOARD_COLORS.magmaAlt : BOARD_COLORS.magma;
    if (trail.element === 'ice') return isAlt ? '#c5e6f6' : '#d7eef9';
    if (trail.element === 'wind') return isAlt ? '#d8ebe1' : BOARD_COLORS.windBg;
    if (trail.element === 'earth') return isAlt ? '#e8ddc8' : BOARD_COLORS.earthBg;
    if (trail.element === 'lightning') return isAlt ? '#f3e9c4' : BOARD_COLORS.lightningBg;
    if (trail.element === 'temporal') return isAlt ? '#e4d8ef' : BOARD_COLORS.temporalBg;
    return isAlt ? '#d8ebe1' : BOARD_COLORS.windBg;
  }
  if (isSummonTile(row, col)) return isAlt ? BOARD_COLORS.summonAlt : BOARD_COLORS.summon;
  return isAlt ? BOARD_COLORS.tileAlt : BOARD_COLORS.tile;
}

function clampPositive(n, fallback) {
  n = Number(n);
  if (!isFinite(n) || n <= 0) return fallback;
  return n;
}

function tokenPopScale(scale) {
  if (scale == null || !isFinite(scale)) return 1;
  return Math.max(0.05, scale);
}

function canvasArc(ctx, x, y, r) {
  r = clampPositive(r, 0);
  if (r <= 0) return;
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function drawElementIcon(ctx, element, cx, cy, size, color) {
  size = clampPositive(size, 0.5);
  color = color || BOARD_COLORS[element] || BOARD_COLORS.text;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.6, size * 0.14);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (element === 'ice') {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      const x2 = cx + Math.cos(a) * size;
      const y2 = cy + Math.sin(a) * size;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const tx = Math.cos(a) * size * 0.28;
      const ty = Math.sin(a) * size * 0.28;
      const px = -Math.sin(a) * size * 0.22;
      const py = Math.cos(a) * size * 0.22;
      ctx.beginPath();
      ctx.moveTo(x2 - tx + px, y2 - ty + py);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2 - tx - px, y2 - ty - py);
      ctx.stroke();
    }
  } else if (element === 'wind') {
    for (let i = 0; i < 3; i++) {
      const y = cy + (i - 1) * size * 0.44;
      ctx.beginPath();
      ctx.moveTo(cx - size, y);
      ctx.quadraticCurveTo(cx - size * 0.1, y - size * 0.38, cx + size * 0.45, y);
      ctx.quadraticCurveTo(cx + size * 0.82, y + size * 0.16, cx + size, y - size * 0.1);
      ctx.stroke();
    }
  } else if (element === 'earth') {
    ctx.beginPath();
    ctx.moveTo(cx - size, cy + size * 0.78);
    ctx.lineTo(cx - size * 0.28, cy - size * 0.05);
    ctx.lineTo(cx + size * 0.05, cy + size * 0.38);
    ctx.lineTo(cx + size * 0.28, cy - size * 0.42);
    ctx.lineTo(cx + size, cy + size * 0.78);
    ctx.closePath();
    ctx.fill();
  } else if (element === 'lightning') {
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.18, cy - size);
    ctx.lineTo(cx - size * 0.5, cy + size * 0.08);
    ctx.lineTo(cx + size * 0.08, cy + size * 0.08);
    ctx.lineTo(cx - size * 0.18, cy + size);
    ctx.lineTo(cx + size * 0.52, cy - size * 0.08);
    ctx.lineTo(cx - size * 0.08, cy - size * 0.08);
    ctx.closePath();
    ctx.fill();
  } else if (element === 'temporal') {
    ctx.beginPath();
    canvasArc(ctx, cx, cy, size * 0.9);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * size * 0.7, cy + Math.sin(a) * size * 0.7);
      ctx.lineTo(cx + Math.cos(a) * size * 0.9, cy + Math.sin(a) * size * 0.9);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - size * 0.48);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + size * 0.42, cy + size * 0.18);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.9);
    ctx.quadraticCurveTo(cx - size * 1.05, cy + size * 0.15, cx - size * 0.2, cy - size * 0.7);
    ctx.quadraticCurveTo(cx + size * 0.05, cy - size * 0.05, cx + size * 0.42, cy - size * 0.28);
    ctx.quadraticCurveTo(cx + size * 0.18, cy + size * 0.4, cx, cy + size * 0.9);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.08, cy + size * 0.55);
    ctx.quadraticCurveTo(cx - size * 0.45, cy + size * 0.1, cx - size * 0.12, cy - size * 0.15);
    ctx.quadraticCurveTo(cx - size * 0.02, cy + size * 0.2, cx - size * 0.08, cy + size * 0.55);
    ctx.fill();
  }
  ctx.restore();
}

function drawMountain(ctx, box, row, col) {
  const x = box.x;
  const y = box.y;
  const s = box.s;
  const variant = (row * 3 + col * 7) % 3;
  const baseY = y + s * 0.88;

  function peak(px, w, h, body, snow) {
    ctx.beginPath();
    ctx.moveTo(px - w / 2, baseY);
    ctx.lineTo(px, baseY - h);
    ctx.lineTo(px + w / 2, baseY);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px - w * 0.2, baseY - h * 0.58);
    ctx.lineTo(px, baseY - h);
    ctx.lineTo(px + w * 0.24, baseY - h * 0.52);
    ctx.closePath();
    ctx.fillStyle = snow;
    ctx.fill();
  }

  ctx.save();
  ctx.fillStyle = 'rgba(80, 74, 62, 0.18)';
  ctx.beginPath();
  ctx.ellipse(x + s / 2, y + s * 0.82, s * 0.34, s * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  if (variant === 0) {
    peak(x + s * 0.36, s * 0.5, s * 0.52, BOARD_COLORS.mountainBody2, '#e7e2d6');
    peak(x + s * 0.62, s * 0.56, s * 0.7, BOARD_COLORS.mountainBody, BOARD_COLORS.mountainSnow);
  } else if (variant === 1) {
    peak(x + s * 0.66, s * 0.48, s * 0.5, BOARD_COLORS.mountainBody2, '#e7e2d6');
    peak(x + s * 0.4, s * 0.6, s * 0.74, BOARD_COLORS.mountainBody, BOARD_COLORS.mountainSnow);
  } else {
    peak(x + s * 0.3, s * 0.44, s * 0.46, BOARD_COLORS.mountainBody2, '#e7e2d6');
    peak(x + s * 0.72, s * 0.42, s * 0.54, '#615c52', '#ece8df');
    peak(x + s * 0.5, s * 0.52, s * 0.68, BOARD_COLORS.mountainBody, BOARD_COLORS.mountainSnow);
  }
  ctx.restore();
}

function drawVoid(ctx, box) {
  const x = box.x;
  const y = box.y;
  const s = box.s;
  ctx.save();
  roundRect(ctx, x, y, s, s, 2);
  ctx.clip();
  ctx.fillStyle = BOARD_COLORS.voidHole;
  ctx.beginPath();
  ctx.ellipse(x + s / 2, y + s / 2, s * 0.36, s * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = BOARD_COLORS.voidRim;
  ctx.lineWidth = Math.max(1.4, s * 0.05);
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(x + s / 2, y + s * 0.48, s * 0.34, s * 0.22, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(x + s / 2, y + s * 0.42, s * 0.22, s * 0.12, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawWater(ctx, box, row, col) {
  const x = box.x;
  const y = box.y;
  const s = box.s;
  ctx.save();
  ctx.strokeStyle = BOARD_COLORS.waterLine;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1.2, s * 0.045);
  ctx.lineCap = 'round';
  const shift = ((row * 3 + col * 5) % 3) * 0.03;
  for (let i = 0; i < 3; i++) {
    const wy = y + s * (0.32 + i * 0.2 + shift);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.16, wy);
    ctx.quadraticCurveTo(x + s * 0.34, wy - s * 0.07, x + s * 0.5, wy);
    ctx.quadraticCurveTo(x + s * 0.66, wy + s * 0.07, x + s * 0.84, wy);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = BOARD_COLORS.waterWave;
  ctx.lineWidth = Math.max(1, s * 0.03);
  const wy2 = y + s * 0.5;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.22, wy2);
  ctx.quadraticCurveTo(x + s * 0.4, wy2 + s * 0.05, x + s * 0.78, wy2 - s * 0.02);
  ctx.stroke();
  ctx.restore();
}

function drawMagma(ctx, box, row, col) {
  const x = box.x;
  const y = box.y;
  const s = box.s;
  const variant = (row * 5 + col * 11) % 3;
  ctx.save();
  roundRect(ctx, x, y, s, s, 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(18, 6, 2, 0.35)';
  ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = BOARD_COLORS.magmaCrack;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2.2, s * 0.07);
  ctx.beginPath();
  if (variant === 0) {
    ctx.moveTo(x + s * 0.12, y + s * 0.22);
    ctx.lineTo(x + s * 0.42, y + s * 0.48);
    ctx.lineTo(x + s * 0.34, y + s * 0.88);
    ctx.moveTo(x + s * 0.48, y + s * 0.1);
    ctx.lineTo(x + s * 0.72, y + s * 0.58);
    ctx.lineTo(x + s * 0.9, y + s * 0.7);
  } else if (variant === 1) {
    ctx.moveTo(x + s * 0.18, y + s * 0.82);
    ctx.lineTo(x + s * 0.5, y + s * 0.4);
    ctx.lineTo(x + s * 0.86, y + s * 0.28);
    ctx.moveTo(x + s * 0.08, y + s * 0.38);
    ctx.lineTo(x + s * 0.38, y + s * 0.52);
  } else {
    ctx.moveTo(x + s * 0.1, y + s * 0.55);
    ctx.lineTo(x + s * 0.46, y + s * 0.3);
    ctx.lineTo(x + s * 0.7, y + s * 0.72);
    ctx.lineTo(x + s * 0.92, y + s * 0.5);
  }
  ctx.stroke();
  ctx.strokeStyle = BOARD_COLORS.magmaHot;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.stroke();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = BOARD_COLORS.magmaHot;
  const pools = variant === 1
    ? [[0.4, 0.46], [0.7, 0.32]]
    : variant === 2
      ? [[0.48, 0.34], [0.72, 0.7]]
      : [[0.42, 0.48], [0.72, 0.58]];
  pools.forEach(function (p) {
    ctx.beginPath();
    ctx.ellipse(x + s * p[0], y + s * p[1], s * 0.07, s * 0.045, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawIceFrost(ctx, box, row, col) {
  const x = box.x;
  const y = box.y;
  const s = box.s;
  const inset = Math.max(2.4, s * 0.08);
  ctx.save();
  roundRect(ctx, x, y, s, s, 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + s * 0.62, y);
  ctx.lineTo(x, y + s * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 170, 210, 0.85)';
  ctx.lineWidth = Math.max(2, s * 0.055);
  roundRect(ctx, x + 1.2, y + 1.2, s - 2.4, s - 2.4, 2);
  ctx.stroke();
  ctx.strokeStyle = BOARD_COLORS.iceRim;
  ctx.lineWidth = Math.max(3, s * 0.1);
  ctx.lineJoin = 'round';
  roundRect(ctx, x + inset, y + inset, s - inset * 2, s - inset * 2, 2);
  ctx.stroke();
  ctx.strokeStyle = BOARD_COLORS.iceInner;
  ctx.lineWidth = Math.max(1.2, s * 0.035);
  roundRect(ctx, x + inset + 2.5, y + inset + 2.5, s - inset * 2 - 5, s - inset * 2 - 5, 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.3, s * 0.04);
  const corner = (row + col) % 2 === 0;
  const cx = corner ? x + s * 0.22 : x + s * 0.78;
  const cy = corner ? y + s * 0.24 : y + s * 0.76;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.11);
  ctx.lineTo(cx, cy + s * 0.11);
  ctx.moveTo(cx - s * 0.11, cy);
  ctx.lineTo(cx + s * 0.11, cy);
  ctx.moveTo(cx - s * 0.08, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.08, cy + s * 0.08);
  ctx.stroke();
  ctx.restore();
}

function drawWindStreaks(ctx, box, row, col) {
  const x = box.x;
  const y = box.y;
  const s = box.s;
  const shift = ((row * 3 + col * 5) % 3) * 0.04;
  ctx.save();
  roundRect(ctx, x, y, s, s, 2);
  ctx.clip();
  ctx.strokeStyle = BOARD_COLORS.wind;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = Math.max(1.4, s * 0.05);
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const wy = y + s * (0.28 + i * 0.22 + shift);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.12, wy);
    ctx.quadraticCurveTo(x + s * 0.4, wy - s * 0.08, x + s * 0.62, wy);
    ctx.quadraticCurveTo(x + s * 0.78, wy + s * 0.06, x + s * 0.9, wy - s * 0.02);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTrail(ctx, box, row, col, element) {
  if (element === 'fire') drawMagma(ctx, box, row, col);
  else if (element === 'ice') drawIceFrost(ctx, box, row, col);
  else if (element === 'wind') drawWindStreaks(ctx, box, row, col);
}

function drawPortal(ctx, box, portal) {
  const cx = box.x + box.s / 2;
  const cy = box.y + box.s / 2;
  const color = BOARD_COLORS[portal.element] || BOARD_COLORS.portalRing;
  const t = performance.now() / 420;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.6, box.s * 0.055);
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(0, 0, clampPositive(box.s * 0.28, 1), clampPositive(box.s * 0.18, 1), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(t);
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(0, 0, clampPositive(box.s * 0.2, 1), clampPositive(box.s * 0.12, 1), 0.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = portal.team === 'enemy' ? BOARD_COLORS.enemy : color;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.beginPath();
  canvasArc(ctx, cx, cy, box.s * 0.32);
  ctx.stroke();
  ctx.restore();
  drawElementIcon(ctx, portal.element, cx, cy, box.s * 0.16, color);
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.font = '700 ' + Math.max(8, box.s * 0.16) + 'px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('next', cx, cy + box.s * 0.38);
  ctx.restore();
}

function drawNexus(ctx, box, hp, flash) {
  const cx = box.x + box.s / 2;
  const cy = box.y + box.s / 2;
  const r = box.s * 0.42;
  const frame = flash ? '#ffffff' : BOARD_COLORS.text;
  const fill = flash ? '#ffffff' : BOARD_COLORS.text;
  const north = { x: cx, y: cy - r };
  const east = { x: cx + r, y: cy };
  const south = { x: cx, y: cy + r };
  const west = { x: cx - r, y: cy };
  const quarters = [
    [north, east],
    [east, south],
    [south, west],
    [west, north]
  ];

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, box.s * 0.05);
  ctx.strokeStyle = frame;
  ctx.beginPath();
  ctx.moveTo(north.x, north.y);
  ctx.lineTo(east.x, east.y);
  ctx.lineTo(south.x, south.y);
  ctx.lineTo(west.x, west.y);
  ctx.closePath();
  ctx.stroke();

  if (hp <= 0) {
    ctx.restore();
    return;
  }

  const diamondsLeft = Math.max(0, Math.min(4, hp - 1));
  ctx.fillStyle = fill;
  for (let i = 0; i < diamondsLeft; i++) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(quarters[i][0].x, quarters[i][0].y);
    ctx.lineTo(quarters[i][1].x, quarters[i][1].y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = flash ? '#1c1e1b' : '#f4f5f2';
  ctx.globalAlpha = diamondsLeft ? 0.92 : 0.35;
  ctx.lineWidth = Math.max(1.8, box.s * 0.035);
  ctx.lineCap = 'round';
  quarters.forEach(function (q) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(q[0].x, q[0].y);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  const core = Math.max(4.2, box.s * 0.11);
  ctx.fillStyle = fill;
  ctx.beginPath();
  canvasArc(ctx, cx, cy, core);
  ctx.fill();
  ctx.strokeStyle = flash ? '#1c1e1b' : '#f4f5f2';
  ctx.lineWidth = Math.max(1.4, box.s * 0.028);
  ctx.beginPath();
  canvasArc(ctx, cx, cy, core);
  ctx.stroke();
  ctx.restore();
}

function drawPuckBody(ctx, cx, cy, r, yours, flash) {
  const depth = Math.max(3.2, r * 0.3);
  const face = flash ? '#ffffff' : (yours ? BOARD_COLORS.puckPlayer : BOARD_COLORS.puckEnemy);
  const side = flash ? '#d0d2cc' : (yours ? BOARD_COLORS.puckPlayerSide : BOARD_COLORS.puckEnemySide);

  if (!flash) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + depth + r * 0.1, r * 0.9, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = side;
  ctx.beginPath();
  canvasArc(ctx, cx, cy + depth, r);
  ctx.fill();
  ctx.fillRect(cx - r, cy, r * 2, depth);

  ctx.beginPath();
  canvasArc(ctx, cx, cy, r);
  ctx.fillStyle = face;
  ctx.fill();

  if (!flash) {
    ctx.save();
    ctx.beginPath();
    canvasArc(ctx, cx, cy, r);
    ctx.clip();
    ctx.fillStyle = yours ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.62)';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.2, cy - r * 0.32, r * 0.7, r * 0.4, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = yours ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.08, cy + r * 0.46, r * 0.78, r * 0.3, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawTokenAt(ctx, box, wizard, selected, flash, scale) {
  const cx = box.x + box.s / 2;
  const cy = box.y + box.s / 2;
  scale = tokenPopScale(scale);
  const r = box.s * 0.36;
  const elColor = BOARD_COLORS[wizard.element] || BOARD_COLORS.text;
  const yours = wizard.team !== 'enemy';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  drawPuckBody(ctx, cx, cy, r, yours, flash);
  if (!flash) {
    ctx.lineWidth = Math.max(2.4, box.s * 0.055);
    ctx.strokeStyle = elColor;
    ctx.beginPath();
    canvasArc(ctx, cx, cy, r * 0.86);
    ctx.stroke();
  }
  if (selected && !flash) {
    ctx.lineWidth = Math.max(2, box.s * 0.045);
    ctx.strokeStyle = BOARD_COLORS.selectedBorder;
    ctx.beginPath();
    canvasArc(ctx, cx, cy, r + box.s * 0.08);
    ctx.stroke();
  }
  ctx.restore();
  if (!flash) drawElementIcon(ctx, wizard.element, cx, cy - r * 0.14, r * 0.48, elColor);
  if (wizard.silenced && !flash) {
    ctx.save();
    ctx.strokeStyle = BOARD_COLORS.lightning;
    ctx.lineWidth = Math.max(1.6, box.s * 0.045);
    ctx.beginPath();
    canvasArc(ctx, cx, cy, r * 1.08);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = flash ? '#1c1e1b' : (yours ? '#f4f5f2' : BOARD_COLORS.text);
  ctx.font = '700 ' + Math.max(8, box.s * 0.18) + 'px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(wizard.hp), cx, cy + r * 0.5);
}

function drawChargeGlow(ctx, box, element, t) {
  const cx = box.x + box.s / 2;
  const cy = box.y + box.s / 2;
  const color = BOARD_COLORS[element] || '#fff';
  const r = box.s * (0.38 + t * 0.28);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  if (element === 'lightning') {
    ctx.globalAlpha = 0.35 + (Math.sin(performance.now() / 18) * 0.5 + 0.5) * 0.65;
    ctx.lineWidth = 2.4 + t * 3;
    ctx.beginPath();
    canvasArc(ctx, cx, cy, r);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else if (element === 'wind') {
    ctx.globalAlpha = 0.55 + t * 0.4;
    ctx.lineWidth = 2.4;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    canvasArc(ctx, cx, cy, r);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (element === 'earth') {
    ctx.globalAlpha = 0.5 + t * 0.45;
    ctx.lineWidth = 3.2;
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    const s = r * 0.95;
    ctx.strokeRect(-s, -s, s * 2, s * 2);
  } else if (element === 'temporal') {
    ctx.globalAlpha = 0.55 + t * 0.4;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    canvasArc(ctx, cx, cy, r);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - r * 0.7);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.45, cy + r * 0.2);
    ctx.stroke();
  } else if (element === 'ice') {
    ctx.globalAlpha = 0.4 + t * 0.5;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    canvasArc(ctx, cx, cy, r);
    ctx.stroke();
    ctx.globalAlpha = 0.28 + t * 0.3;
    ctx.beginPath();
    canvasArc(ctx, cx, cy, r * 0.62);
    ctx.stroke();
  } else {
    ctx.globalAlpha = 0.45 + t * 0.55;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    canvasArc(ctx, cx, cy, r);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = t * 0.22;
    ctx.fill();
    ctx.fillStyle = color;
    ctx.globalAlpha = t * 0.28;
    ctx.fill();
  }
  ctx.restore();
}

function drawStream(ctx) {
  const s = boardFx.stream;
  if (!s) return;
  const fade = s.fade != null ? 1 - s.fade : 1;
  const t = s.head;
  const x = s.x0 + (s.x1 - s.x0) * t;
  const y = s.y0 + (s.y1 - s.y0) * t;
  const now = performance.now() / 90;
  const dx = s.x1 - s.x0;
  const dy = s.y1 - s.y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = '#7a1808';
  ctx.globalAlpha = 0.35 * fade;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(s.x0, s.y0);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.strokeStyle = BOARD_COLORS.fire;
  ctx.globalAlpha = 0.7 * fade;
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(s.x0, s.y0);
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    const u = (i / steps) * t;
    const wobble = Math.sin(u * 14 + now) * 4.2 * (0.35 + u);
    ctx.lineTo(s.x0 + dx * u + nx * wobble, s.y0 + dy * u + ny * wobble);
  }
  ctx.stroke();

  ctx.globalAlpha = 0.95 * fade;
  ctx.strokeStyle = '#ffd36a';
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(s.x0, s.y0);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.globalAlpha = fade;
  ctx.fillStyle = '#ffd36a';
  ctx.beginPath();
  canvasArc(ctx, x, y, 12);
  ctx.fill();
  ctx.fillStyle = BOARD_COLORS.fire;
  ctx.beginPath();
  canvasArc(ctx, x, y, 7.5);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  canvasArc(ctx, x, y, 3.2);
  ctx.fill();
  ctx.restore();
}

function drawGust(ctx) {
  const g = boardFx.gust;
  if (!g) return;
  const fade = g.fade != null ? 1 - g.fade : 1;
  const t = g.head;
  const dx = g.x1 - g.x0;
  const dy = g.y1 - g.y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const now = performance.now() / 70;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const blades = [-14, 0, 14];
  blades.forEach(function (off, bi) {
    ctx.strokeStyle = bi === 1 ? '#ffffff' : BOARD_COLORS.wind;
    ctx.globalAlpha = (bi === 1 ? 0.95 : 0.55) * fade;
    ctx.lineWidth = bi === 1 ? 3.2 : 5.5;
    ctx.beginPath();
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const u = (i / steps) * t;
      const wobble = Math.sin(u * 10 + now + bi) * 5 + off * (0.4 + u);
      const x = g.x0 + dx * u + nx * wobble;
      const y = g.y0 + dy * u + ny * wobble;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
  const hx = g.x0 + dx * t;
  const hy = g.y0 + dy * t;
  const ux = dx / len;
  const uy = dy / len;
  ctx.globalAlpha = 0.9 * fade;
  ctx.strokeStyle = BOARD_COLORS.wind;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(hx - ux * 10 - nx * 12, hy - uy * 10 - ny * 12);
  ctx.lineTo(hx + ux * 6, hy + uy * 6);
  ctx.lineTo(hx - ux * 10 + nx * 12, hy - uy * 10 + ny * 12);
  ctx.stroke();
  ctx.restore();
}

function drawBolt(ctx) {
  const b = boardFx.bolt;
  if (!b || !b.pts || !b.pts.length) return;
  const fade = b.fade != null ? 1 - b.fade : 1;
  const t = b.head == null ? 1 : b.head;
  const count = Math.max(2, Math.floor(b.pts.length * t));
  function strokePts(pts, n, width, color, alpha) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * fade;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  strokePts(b.pts, count, 10, BOARD_COLORS.lightning, 0.28);
  strokePts(b.pts, count, 4.4, '#fff4b0', 0.9);
  strokePts(b.pts, count, 1.8, '#ffffff', 1);
  (b.forks || []).forEach(function (fork) {
    if (t < 0.55) return;
    strokePts(fork, fork.length, 3.2, '#fff4b0', 0.75);
    strokePts(fork, fork.length, 1.4, '#ffffff', 0.9);
  });
  ctx.restore();
}

function drawPulseWave(ctx) {
  const p = boardFx.pulseWave;
  if (!p) return;
  ctx.save();
  ctx.strokeStyle = BOARD_COLORS.ice;
  ctx.lineWidth = 3.2;
  ctx.globalAlpha = (1 - p.t) * 0.85;
  ctx.beginPath();
  canvasArc(ctx, p.x, p.y, 8 + p.t * p.maxR);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = (1 - p.t) * 0.7;
  ctx.beginPath();
  canvasArc(ctx, p.x, p.y, 4 + p.t * p.maxR * 0.62);
  ctx.stroke();
  if (p.burst) {
    (p.tiles || []).forEach(function (tile) {
      ctx.save();
      ctx.translate(tile.x, tile.y);
      ctx.rotate(Math.PI / 4);
      const s = 5 + p.burst * 7;
      ctx.globalAlpha = (1 - p.burst) * 0.9;
      ctx.strokeStyle = BOARD_COLORS.ice;
      ctx.lineWidth = 2;
      ctx.strokeRect(-s, -s, s * 2, s * 2);
      ctx.restore();
    });
  }
  ctx.restore();
}

function drawRaiseSpike(ctx) {
  const r = boardFx.raiseSpike;
  if (!r) return;
  const layout = boardLayout();
  if (!layout) return;
  const box = cellRect(layout, r.row, r.col);
  const t = r.t;
  const x = box.x + box.s / 2;
  const base = box.y + box.s * 0.88;
  const h = box.s * 0.22 + t * box.s * 0.62;
  ctx.save();
  ctx.globalAlpha = 0.35 + t * 0.65;
  ctx.fillStyle = 'rgba(80, 74, 62, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x, base, box.s * 0.28 * t, box.s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - box.s * 0.28, base);
  ctx.lineTo(x, base - h);
  ctx.lineTo(x + box.s * 0.28, base);
  ctx.closePath();
  ctx.fillStyle = BOARD_COLORS.mountainBody;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - box.s * 0.08, base - h * 0.55);
  ctx.lineTo(x, base - h);
  ctx.lineTo(x + box.s * 0.1, base - h * 0.5);
  ctx.closePath();
  ctx.fillStyle = BOARD_COLORS.mountainSnow;
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
    if (p.kind === 'ember') p.vy -= 0.04 * k;
    if (p.kind === 'shard') p.vy += 0.06 * k;
    p.vx *= p.kind === 'streak' ? 0.97 : 0.94;
    p.vy *= p.kind === 'streak' ? 0.97 : 0.94;
    p.life -= (p.kind === 'streak' ? 0.06 : 0.045) * k;
  });
  boardFx.particles = boardFx.particles.filter(p => p.life > 0);
  boardFx.rings.forEach(r => { r.t += 0.06 * k; });
  boardFx.rings = boardFx.rings.filter(r => r.t < 1);
  boardFx.popups.forEach(p => { p.t += 0.045 * k; });
  boardFx.popups = boardFx.popups.filter(p => p.t < 1);
}

let fxLooping = false;
let fxLast = 0;

function resetBoardFx() {
  boardFx.flash = null;
  boardFx.projectile = null;
  boardFx.popups = [];
  boardFx.override = {};
  boardFx.ghosts = [];
  boardFx.slash = null;
  boardFx.rings = [];
  boardFx.particles = [];
  boardFx.shake = 0;
  boardFx.screenFlash = 0;
  boardFx.popScale = {};
  boardFx.fade = {};
  boardFx.lungeReturn = null;
  boardFx.stream = null;
  boardFx.gust = null;
  boardFx.bolt = null;
  boardFx.pulseWave = null;
  boardFx.raiseSpike = null;
  boardFx.charge = null;
}

function ensureFxLoop() {
  if (fxLooping) return;
  fxLooping = true;
  fxLast = performance.now();
  function loop(now) {
    const dt = Math.min(40, now - fxLast);
    fxLast = now;
    tickFx(dt);
    try { drawBoard(); } catch (err) { console.error(err); }
    const busy = boardFx.shake > 0 || boardFx.screenFlash > 0.02 || boardFx.particles.length || boardFx.rings.length || boardFx.popups.length || boardFx.stream || boardFx.gust || boardFx.bolt || boardFx.pulseWave || boardFx.raiseSpike || !!(state.portals && Object.keys(state.portals).length);
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

  if (state.portals && Object.keys(state.portals).length) ensureFxLoop();
  const marks = highlightSet();
  const highlightKey = {};
  marks.tiles.forEach(t => { highlightKey[t.row + ',' + t.col] = true; });

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const box = cellRect(layout, r, c);
      const highlighted = !!highlightKey[r + ',' + c] && (!mountainAt(r, c) || (marks.kind === 'cast' && marks.castKind === 'bolt'));
      const nex = nexusAt(r, c);
      const flashHere = boardFx.flash && boardFx.flash.row === r && boardFx.flash.col === c;
      let fill = tileFill(r, c, highlighted, marks.kind, marks.castKind);
      const occHere = wizardAt(r, c);
      if (occHere && occHere.id === state.selectedWizardId && !boardFx.override[occHere.id]) fill = BOARD_COLORS.selected;
      if (flashHere) fill = '#ffffff';

      roundRect(ctx, box.x, box.y, box.s, box.s, 2);
      ctx.fillStyle = fill;
      ctx.fill();

      if (voidAt(r, c) && !flashHere) drawVoid(ctx, box);
      else if (waterAt(r, c) && !flashHere) drawWater(ctx, box, r, c);
      else if (mountainAt(r, c) && !flashHere) drawMountain(ctx, box, r, c);
      else if (!flashHere) {
        const trail = trailAt(r, c);
        if (trail) drawTrail(ctx, box, r, c, trail.element);
      }
      const portal = portalAt(r, c);
      if (portal && !flashHere) drawPortal(ctx, box, portal);

      if (highlighted) {
        ctx.save();
        ctx.strokeStyle = marks.kind === 'melee' ? BOARD_COLORS.meleeBorder
          : marks.kind === 'cast' && marks.castKind === 'swap' ? BOARD_COLORS.temporal
          : marks.kind === 'cast' && marks.castKind === 'raise' ? BOARD_COLORS.earth
          : marks.kind === 'cast' && marks.castKind === 'bolt' ? BOARD_COLORS.lightning
          : marks.kind === 'cast' && marks.castKind === 'pulse' ? BOARD_COLORS.ice
          : marks.kind === 'cast' && marks.castKind === 'gust' ? BOARD_COLORS.wind
          : marks.kind === 'cast' && marks.castKind === 'stream' ? BOARD_COLORS.fire
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
    canvasArc(ctx, cx, cy, b.s * 0.18 + ring.t * b.s * 0.72);
    ctx.stroke();
    ctx.restore();
  });

  if (boardFx.stream) drawStream(ctx);
  if (boardFx.gust) drawGust(ctx);
  if (boardFx.bolt) drawBolt(ctx);
  if (boardFx.pulseWave) drawPulseWave(ctx);
  if (boardFx.raiseSpike) drawRaiseSpike(ctx);
  if (boardFx.projectile) {
    const p = boardFx.projectile;
    ctx.save();
    ctx.fillStyle = BOARD_COLORS[p.element] || BOARD_COLORS.text;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    canvasArc(ctx, p.x, p.y, 7);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    canvasArc(ctx, p.x, p.y, 14);
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
    const px = -dy / len * 32;
    const py = dx / len * 32;
    const grow = 0.3 + t * 1.15;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10 * (1 - t * 0.55);
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
    if (p.kind === 'streak') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size || 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - (p.vx || 0) * 5, p.y - (p.vy || 0) * 5);
      ctx.stroke();
    } else if (p.kind === 'shard') {
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 4);
      const s = p.size || 3;
      ctx.fillRect(-s, -s, s * 2, s * 2);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      canvasArc(ctx, p.x, p.y, p.size);
      ctx.fill();
    }
    ctx.restore();
  });

  boardFx.popups.forEach(p => {
    const b = cellRect(layout, p.row, p.col);
    const punch = 1 + (1 - p.t) * 0.28;
    ctx.save();
    ctx.globalAlpha = 1 - p.t;
    ctx.fillStyle = BOARD_COLORS[p.element] || BOARD_COLORS.text;
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
