function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeIn(t) {
  return t * t;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animate(duration, step) {
  return new Promise(function (resolve) {
    const t0 = performance.now();
    function frame(now) {
      const t = Math.max(0, Math.min(1, (now - t0) / duration));
      try {
        step(t, now);
        drawBoard();
      } catch (err) {
        console.error(err);
        resolve();
        return;
      }
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

function fxGroupStart(type) {
  return type === 'attack' || type === 'move' || type === 'summon' || type === 'portalBlocked';
}

function fxGroupStop(type) {
  return fxGroupStart(type) || type === 'portal' || type === 'emergeMark' || type === 'turnEnd' || type === 'turnStart' || type === 'gameOver';
}

function holdDiscAt(wizard, row, col) {
  if (!wizard || row == null || col == null) return;
  if (typeof boardLayout !== 'function' || typeof cellRect !== 'function') return;
  const layout = boardLayout();
  if (!layout || !boardFx || !boardFx.override) return;
  boardFx.override[wizard.id] = boxToOv(cellRect(layout, row, col));
}

function releaseDisc(wizard) {
  if (!wizard || !boardFx || !boardFx.override) return;
  delete boardFx.override[wizard.id];
}

function pinRewindHolds(events) {
  if (!events) return;
  let i;
  for (i = 0; i < events.length; i++) {
    const ev = events[i];
    if ((ev.type === 'move' || ev.type === 'push') && ev.from && ev.wizardId) {
      const w = state.wizards[ev.wizardId];
      if (w) holdDiscAt(w, ev.from.row, ev.from.col);
    }
    if (ev.type === 'attack' && ev.path && ev.from && ev.attackerId) {
      const w = state.wizards[ev.attackerId];
      if (w) holdDiscAt(w, ev.from.row, ev.from.col);
    }
  }
}

function rewindForFx(events) {
  let i;
  for (i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if ((ev.type === 'move' || ev.type === 'push') && ev.from) {
      wakeWizardAt(ev.wizardId, ev.from.row, ev.from.col);
    }
    if (ev.type === 'attack' && ev.path && ev.from && ev.attackerId) {
      wakeWizardAt(ev.attackerId, ev.from.row, ev.from.col);
    }
    if (ev.type === 'summon') {
      const w = state.wizards[ev.wizardId];
      if (w) {
        w.state = 'emerging';
        w.row = ev.row;
        w.col = ev.col;
      }
    }
    if (ev.type === 'emergeMark') {
      const w = state.wizards[ev.wizardId];
      if (w) {
        w.state = 'emerging';
        w.row = null;
        w.col = null;
      }
    }
    if (ev.type === 'damage') {
      if (ev.targetKind === 'wizard' && ev.targetId) {
        const w = state.wizards[ev.targetId];
        if (w) w.hp += ev.amount;
      }
      if (ev.targetKind === 'nexus' && ev.targetId) {
        const n = nexusById(state, ev.targetId);
        if (n) {
          n.hp = Math.min(n.maxHp, n.hp + ev.amount);
          if (n.hp > 0 && state.voids) delete state.voids[tileKey(n.row, n.col)];
        }
      }
    }
    if (ev.type === 'death') {
      const at = ev.row != null ? { row: ev.row, col: ev.col } : null;
      if (at) wakeWizardAt(ev.wizardId, at.row, at.col);
    }
  }
}

async function playEvents(events) {
  if (!events || !events.length) {
    if (typeof render === 'function') render();
    return;
  }
  state.animating = true;
  const matchId = state.matchId;
  try {
    rewindForFx(events);
    pinRewindHolds(events);
    if (typeof drawBoard === 'function') drawBoard();
    let i = 0;
    while (i < events.length) {
      if (state.matchId !== matchId) return;
      const ev = events[i];
      if (fxGroupStart(ev.type)) {
        let j = i + 1;
        while (j < events.length && !fxGroupStop(events[j].type)) j++;
        await playAttackGroup(events, i, j, matchId);
        if (j < events.length) {
          const gap = ev.type === 'move' ? 400 : (ev.type === 'attack' ? 280 : 220);
          await sleep(gap);
        }
        i = j;
      } else {
        await playEvent(ev);
        i++;
      }
    }
  } finally {
    boardFx.flash = null;
    boardFx.projectile = null;
    boardFx.slash = null;
    boardFx.stream = null;
    boardFx.gust = null;
    boardFx.bolt = null;
    boardFx.pulseWave = null;
    boardFx.raiseSpike = null;
    boardFx.charge = null;
    boardFx.strikeTiles = null;
    boardFx.override = {};
    boardFx.ghosts = [];
    boardFx.fall = {};
    boardFx.lungeReturn = null;
    state.animating = false;
    if (typeof render === 'function') render();
  }
}

function buryWizard(w) {
  if (!w) return;
  w.state = 'dead';
  w.row = null;
  w.col = null;
}

function wakeWizardAt(id, row, col) {
  const w = state.wizards[id];
  if (!w) return null;
  w.state = 'onboard';
  w.row = row;
  w.col = col;
  return w;
}

async function playAttackGroup(events, start, end, matchId) {
  const layout = boardLayout();
  const restored = [];
  const relocated = {};
  for (let k = start; k < end; k++) {
    const ev = events[k];
    if ((ev.type === 'push' || ev.type === 'move') && ev.wizardId) relocated[ev.wizardId] = true;
    if (ev.type === 'push' && layout) {
      const w = state.wizards[ev.wizardId];
      if (w && w.state === 'onboard') holdDiscAt(w, ev.from.row, ev.from.col);
    }
    if (ev.type === 'swap' && layout) {
      const a = state.wizards[ev.aId];
      if (a) boardFx.override[a.id] = boxToOv(cellRect(layout, ev.fromA.row, ev.fromA.col));
      if (ev.bId && ev.fromB) {
        const b = state.wizards[ev.bId];
        if (b) boardFx.override[b.id] = boxToOv(cellRect(layout, ev.fromB.row, ev.fromB.col));
      }
    }
    if (ev.type === 'death') {
      const corpse = state.wizards[ev.wizardId];
      if (corpse) {
        const motion = events.slice(start, end).find(e =>
          (e.type === 'push' || e.type === 'move') && e.wizardId === ev.wizardId
        );
        const at = motion && motion.from ? motion.from : { row: ev.row, col: ev.col };
        wakeWizardAt(corpse.id, at.row, at.col);
        holdDiscAt(corpse, at.row, at.col);
        restored.push(corpse);
      }
    }
  }

  for (let k = start; k < end; k++) {
    if (matchId != null && state.matchId !== matchId) return;
    await playEvent(events[k]);
  }
  if (boardFx.lungeReturn && relocated[boardFx.lungeReturn.id]) boardFx.lungeReturn = null;
  await returnLunge();

  restored.forEach(buryWizard);
}

async function playEvent(ev) {
  if (ev.type === 'trail') return;
  if (ev.type === 'emergeMark') return playEmergeMark(ev);
  if (ev.type === 'summon') return playSummon(ev);
  if (ev.type === 'portal') return playPortal(ev);
  if (ev.type === 'portalBlocked') return playPortalBlocked(ev);
  if (ev.type === 'move') return playMove(ev);
  if (ev.type === 'undoMove') return playUndoMove(ev);
  if (ev.type === 'intent') return playIntent(ev);
  if (ev.type === 'attack') return playAttack(ev);
  if (ev.type === 'damage') return playDamage(ev);
  if (ev.type === 'ground') return playGround(ev);
  if (ev.type === 'push') return playPush(ev);
  if (ev.type === 'raise') return playRaiseTerrain(ev);
  if (ev.type === 'swap') return playSwap(ev);
  if (ev.type === 'silence') return playSilence(ev);
  if (ev.type === 'root') return playRoot(ev);
  if (ev.type === 'burn') return playBurnMark(ev);
  if (ev.type === 'fizzle') return playFizzle(ev);
  if (ev.type === 'jump') return playJump(ev);
  if (ev.type === 'void') return playVoidOpen(ev);
  if (ev.type === 'death') return playDeath(ev);
  if (ev.type === 'gameOver') {
    boardFx.shake = 16;
    boardFx.screenFlash = 0.7;
    ensureFxLoop();
    await sleep(280);
  }
}

function banner(ev, text) {
  if (ev.row == null && !(ev.from && ev.from.row != null)) return;
  const row = ev.from ? ev.from.row : ev.row;
  const col = ev.from ? ev.from.col : ev.col;
  boardFx.popups.push({ row: row, col: col, text: text, t: 0, element: ev.element });
  ensureFxLoop();
}

function pinStrikeTiles(ev, attacker) {
  if (!ev.tiles || !ev.tiles.length) return;
  const style = attacker && attacker.pawnKind && typeof defenseTelegraphStyle === 'function'
    ? defenseTelegraphStyle(attacker.pawnKind)
    : { fill: 'rgba(28, 30, 27, 0.28)', edge: '#1c1e1b' };
  boardFx.strikeTiles = { tiles: ev.tiles, fill: style.fill, edge: style.edge };
}

async function playAttack(ev) {
  const attacker = ev.attackerId ? state.wizards[ev.attackerId] : null;
  pinStrikeTiles(ev, attacker);
  if (attacker && attacker.pawnKind && ev.strikeOrder != null && ev.from) {
    boardFx.popups.push({
      row: ev.from.row,
      col: ev.from.col,
      text: '#' + (ev.strikeOrder + 1),
      t: 0,
      element: attacker.element
    });
    boardFx.rings.push({ row: ev.from.row, col: ev.from.col, t: 0, element: attacker.element });
    ensureFxLoop();
  } else if (ev.kind === 'cast' && (ev.spellName || ev.castKind)) {
    banner(ev, ev.spellName || ev.castKind);
  }
  if (ev.kind !== 'cast') return playMeleeLunge(ev);
  if (ev.castKind === 'gust' && attacker && attacker.pawnKind === 'charge') return playChargeCast(ev);
  if (ev.castKind === 'pulse' || ev.castKind === 'summonBurst') return playPulseCast(ev);
  if (ev.castKind === 'burst') return playBurstCast(ev);
  if (ev.castKind === 'raise') return playRaiseCast(ev);
  if (ev.castKind === 'swap' || ev.castKind === 'blink') return playSwapCast(ev);
  if (ev.castKind === 'gust') return playGustCast(ev);
  if (ev.castKind === 'pull') return playPullCast(ev);
  if (ev.castKind === 'bolt') return playBoltCast(ev);
  await playStreamCast(ev);
}

async function playMeleeLunge(ev) {
  const layout = boardLayout();
  if (!layout) return;
  const attacker = ev.attackerId ? state.wizards[ev.attackerId] : null;
  const slow = !!(attacker && attacker.pawnKind);
  const from = cellRect(layout, ev.from.row, ev.from.col);
  const to = cellRect(layout, ev.row, ev.col);
  const dx = (to.x - from.x) * 0.52;
  const dy = (to.y - from.y) * 0.52;
  await animate(slow ? 140 : 110, function (t) {
    const k = easeOut(t);
    boardFx.override[ev.attackerId] = { x: from.x + dx * k, y: from.y + dy * k, s: from.s };
    boardFx.popScale[ev.attackerId] = 1 + k * 0.08;
  });
  boardFx.slash = {
    x0: from.x + from.s / 2,
    y0: from.y + from.s / 2,
    x1: to.x + to.s / 2,
    y1: to.y + to.s / 2,
    t: 0,
    element: ev.element
  };
  const cx = to.x + to.s / 2;
  const cy = to.y + to.s / 2;
  spawnBurst(cx, cy, BOARD_COLORS[ev.element] || '#fff', slow ? 18 : 14, slow ? 5.2 : 4.2);
  spawnBurst(cx, cy, '#ffffff', slow ? 8 : 6, slow ? 3.2 : 2.6);
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: ev.element });
  boardFx.shake = Math.max(boardFx.shake, slow ? 7 : 5);
  if (slow) boardFx.screenFlash = Math.max(boardFx.screenFlash, 0.18);
  ensureFxLoop();
  await animate(slow ? 120 : 110, function (t) { boardFx.slash.t = t; });
  boardFx.slash = null;
  boardFx.lungeReturn = {
    id: ev.attackerId,
    from: { x: from.x + dx, y: from.y + dy, s: from.s },
    to: { x: from.x, y: from.y, s: from.s }
  };
}

async function returnLunge() {
  const l = boardFx.lungeReturn;
  if (!l) return;
  const w = state.wizards[l.id];
  const layout = typeof boardLayout === 'function' ? boardLayout() : null;
  if (w && w.state === 'onboard' && layout && w.row != null) {
    const home = cellRect(layout, w.row, w.col);
    l.to = { x: home.x, y: home.y, s: home.s };
  }
  await animate(90, function (t) {
    const k = easeInOut(t);
    boardFx.override[l.id] = {
      x: l.from.x + (l.to.x - l.from.x) * k,
      y: l.from.y + (l.to.y - l.from.y) * k,
      s: l.to.s
    };
  });
  delete boardFx.override[l.id];
  boardFx.lungeReturn = null;
}

function lineEnds(ev) {
  const layout = boardLayout();
  if (!layout) return null;
  const start = cellRect(layout, ev.from.row, ev.from.col);
  const end = cellRect(layout, ev.row, ev.col);
  return {
    layout: layout,
    start: start,
    end: end,
    x0: start.x + start.s / 2,
    y0: start.y + start.s / 2,
    x1: end.x + end.s / 2,
    y1: end.y + end.s / 2
  };
}

function jaggedBoltPoints(x0, y0, x1, y1, segs) {
  const pts = [{ x: x0, y: y0 }];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 1; i < segs; i++) {
    const u = i / segs;
    const mag = (Math.random() - 0.5) * 16 * (u < 0.12 || u > 0.88 ? 0.25 : 1);
    pts.push({ x: x0 + dx * u + nx * mag, y: y0 + dy * u + ny * mag });
  }
  pts.push({ x: x1, y: y1 });
  return pts;
}

async function playStreamCast(ev) {
  const line = lineEnds(ev);
  if (!line) return;
  const x0 = line.x0;
  const y0 = line.y0;
  const x1 = line.x1;
  const y1 = line.y1;
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const color = BOARD_COLORS.fire;

  boardFx.charge = { id: ev.attackerId, t: 0, element: 'fire' };
  spawnBurst(x0, y0, color, 14, 2.6);
  ensureFxLoop();
  const attacker = ev.attackerId ? state.wizards[ev.attackerId] : null;
  const windup = attacker && attacker.pawnKind ? 160 : 420;
  await animate(windup, function (t) {
    boardFx.charge.t = t;
    boardFx.popScale[ev.attackerId] = 1 + t * 0.32;
    if (Math.random() < 0.92) {
      const a = Math.random() * Math.PI * 2;
      const d = 38 * (1 - t * 0.65);
      boardFx.particles.push({
        x: x0 + Math.cos(a) * d,
        y: y0 + Math.sin(a) * d,
        vx: -Math.cos(a) * 1.7,
        vy: -Math.sin(a) * 1.7,
        life: 0.85,
        color: Math.random() < 0.4 ? '#ffd36a' : color,
        size: 2.2 + Math.random() * 2.6,
        kind: 'ember'
      });
    }
    ensureFxLoop();
  });
  await sleep(attacker && attacker.pawnKind ? 30 : 80);

  boardFx.stream = { x0: x0, y0: y0, x1: x1, y1: y1, head: 0, element: 'fire', fade: 0 };
  const travel = (attacker && attacker.pawnKind ? 180 : 300) + dist * 0.75;
  await animate(travel, function (t) {
    boardFx.stream.head = easeOut(t);
    const hx = x0 + (x1 - x0) * boardFx.stream.head;
    const hy = y0 + (y1 - y0) * boardFx.stream.head;
    const nx = -(y1 - y0);
    const ny = (x1 - x0);
    const nlen = Math.hypot(nx, ny) || 1;
    if (Math.random() < 0.95) {
      const off = (Math.random() - 0.5) * 14;
      boardFx.particles.push({
        x: hx + (nx / nlen) * off,
        y: hy + (ny / nlen) * off,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2 - 0.4,
        life: 0.75,
        color: Math.random() < 0.35 ? '#ffd36a' : color,
        size: 2.2 + Math.random() * 2.4,
        kind: 'ember'
      });
    }
    ensureFxLoop();
  });

  spawnBurst(x1, y1, color, 22, 5.6);
  spawnBurst(x1, y1, '#ffd36a', 10, 3.4);
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: 'fire' });
  boardFx.shake = Math.max(boardFx.shake, 7);
  boardFx.screenFlash = Math.max(boardFx.screenFlash, 0.22);
  ensureFxLoop();
  await sleep(60);

  if (attacker && attacker.pawnKind) {
    await animate(140, function (t) {
      boardFx.stream.fade = t;
      boardFx.popScale[ev.attackerId] = 1.18 - t * 0.18;
    });
  } else {
    const recoilX = (x0 - x1) / (dist || 1) * 10;
    const recoilY = (y0 - y1) / (dist || 1) * 10;
    await animate(140, function (t) {
      const k = 1 - t;
      boardFx.override[ev.attackerId] = {
        x: line.start.x + recoilX * k,
        y: line.start.y + recoilY * k,
        s: line.start.s
      };
      boardFx.stream.fade = t;
      boardFx.popScale[ev.attackerId] = 1.18 - t * 0.18;
    });
    delete boardFx.override[ev.attackerId];
  }
  delete boardFx.popScale[ev.attackerId];
  boardFx.stream = null;
  boardFx.charge = null;
}

async function playChargeCast(ev) {
  const line = lineEnds(ev);
  if (!line) return;
  const x0 = line.x0;
  const y0 = line.y0;
  const x1 = line.x1;
  const y1 = line.y1;
  const dist = Math.hypot(x1 - x0, y1 - y0) || 1;
  const ux = (x1 - x0) / dist;
  const uy = (y1 - y0) / dist;
  const color = BOARD_COLORS.wind;
  const attacker = ev.attackerId ? state.wizards[ev.attackerId] : null;
  const path = ev.path || [];
  const dest = path.length ? path[path.length - 1] : ev.from;
  const destBox = cellRect(line.layout, dest.row, dest.col);
  boardFx.charge = { id: ev.attackerId, t: 0, element: 'wind' };
  boardFx.popScale[ev.attackerId] = 1.08;
  ensureFxLoop();
  await animate(70, function (t) {
    boardFx.charge.t = t;
    boardFx.popScale[ev.attackerId] = 1 + t * 0.16;
  });
  boardFx.gust = { x0: x0, y0: y0, x1: x1, y1: y1, head: 0, fade: 0 };
  await animate(160 + dist * 0.28, function (t) {
    const k = easeOut(t);
    boardFx.gust.head = k;
    boardFx.override[ev.attackerId] = {
      x: line.start.x + (destBox.x - line.start.x) * k,
      y: line.start.y + (destBox.y - line.start.y) * k,
      s: line.start.s
    };
    const hx = x0 + (x1 - x0) * k;
    const hy = y0 + (y1 - y0) * k;
    if (Math.random() < 0.85) {
      boardFx.particles.push({
        x: hx,
        y: hy,
        vx: ux * (3.2 + Math.random() * 2),
        vy: uy * (3.2 + Math.random() * 2),
        life: 0.5,
        color: Math.random() < 0.4 ? '#ffffff' : color,
        size: 1.6 + Math.random() * 1.8,
        kind: 'streak'
      });
    }
    ensureFxLoop();
  });
  spawnBurst(x1, y1, color, 16, 4.6);
  spawnBurst(x1, y1, '#ffffff', 8, 2.8);
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: 'wind' });
  boardFx.shake = Math.max(boardFx.shake, ev.hit === 'none' ? 5 : 10);
  boardFx.screenFlash = Math.max(boardFx.screenFlash, ev.hit === 'none' ? 0.12 : 0.28);
  if (attacker && dest) {
    attacker.row = dest.row;
    attacker.col = dest.col;
  }
  ensureFxLoop();
  await animate(70, function (t) { boardFx.gust.fade = t; });
  delete boardFx.popScale[ev.attackerId];
  boardFx.gust = null;
  boardFx.charge = null;
}

async function playGustCast(ev) {
  const line = lineEnds(ev);
  if (!line) return;
  const x0 = line.x0;
  const y0 = line.y0;
  const x1 = line.x1;
  const y1 = line.y1;
  const dist = Math.hypot(x1 - x0, y1 - y0) || 1;
  const ux = (x1 - x0) / dist;
  const uy = (y1 - y0) / dist;
  const color = BOARD_COLORS.wind;

  boardFx.charge = { id: ev.attackerId, t: 0, element: 'wind' };
  await animate(70, function (t) {
    boardFx.charge.t = t;
    boardFx.popScale[ev.attackerId] = 1 - t * 0.08;
    boardFx.override[ev.attackerId] = {
      x: line.start.x + ux * 6 * t,
      y: line.start.y + uy * 6 * t,
      s: line.start.s
    };
  });

  boardFx.gust = { x0: x0, y0: y0, x1: x1, y1: y1, head: 0, fade: 0 };
  await animate(200 + dist * 0.35, function (t) {
    boardFx.gust.head = easeOut(t);
    const hx = x0 + (x1 - x0) * boardFx.gust.head;
    const hy = y0 + (y1 - y0) * boardFx.gust.head;
    if (Math.random() < 0.85) {
      boardFx.particles.push({
        x: hx,
        y: hy,
        vx: ux * (3.5 + Math.random() * 2.2),
        vy: uy * (3.5 + Math.random() * 2.2),
        life: 0.55,
        color: Math.random() < 0.4 ? '#ffffff' : color,
        size: 1.6 + Math.random() * 1.8,
        kind: 'streak'
      });
    }
    ensureFxLoop();
  });

  spawnBurst(x1, y1, color, 10, 3.8);
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: 'wind' });
  ensureFxLoop();
  await animate(110, function (t) {
    boardFx.gust.fade = t;
    boardFx.override[ev.attackerId] = {
      x: line.start.x + ux * 6 * (1 - t),
      y: line.start.y + uy * 6 * (1 - t),
      s: line.start.s
    };
    boardFx.popScale[ev.attackerId] = 0.92 + t * 0.08;
  });
  delete boardFx.override[ev.attackerId];
  delete boardFx.popScale[ev.attackerId];
  boardFx.gust = null;
  boardFx.charge = null;
}

async function playPullCast(ev) {
  const line = lineEnds(ev);
  if (!line) return;
  const x0 = line.x0;
  const y0 = line.y0;
  const x1 = line.x1;
  const y1 = line.y1;
  const dist = Math.hypot(x1 - x0, y1 - y0) || 1;
  const ux = (x0 - x1) / dist;
  const uy = (y0 - y1) / dist;
  const color = BOARD_COLORS.wind;

  boardFx.charge = { id: ev.attackerId, t: 0, element: 'wind' };
  await animate(80, function (t) {
    boardFx.charge.t = t;
    boardFx.popScale[ev.attackerId] = 1 - t * 0.1;
    boardFx.override[ev.attackerId] = {
      x: line.start.x + ux * -8 * t,
      y: line.start.y + uy * -8 * t,
      s: line.start.s
    };
  });

  boardFx.gust = { x0: x1, y0: y1, x1: x0, y1: y0, head: 0, fade: 0 };
  await animate(220 + dist * 0.3, function (t) {
    boardFx.gust.head = easeOut(t);
    const hx = x1 + (x0 - x1) * boardFx.gust.head;
    const hy = y1 + (y0 - y1) * boardFx.gust.head;
    if (Math.random() < 0.9) {
      boardFx.particles.push({
        x: hx,
        y: hy,
        vx: ux * (3.2 + Math.random() * 2.2),
        vy: uy * (3.2 + Math.random() * 2.2),
        life: 0.55,
        color: Math.random() < 0.4 ? '#ffffff' : color,
        size: 1.6 + Math.random() * 1.8,
        kind: 'streak'
      });
    }
    ensureFxLoop();
  });

  spawnBurst(x0, y0, color, 12, 3.6);
  boardFx.rings.push({ row: ev.from.row, col: ev.from.col, t: 0, element: 'wind' });
  ensureFxLoop();
  await animate(100, function (t) {
    boardFx.gust.fade = t;
    boardFx.popScale[ev.attackerId] = 0.9 + t * 0.1;
  });
  delete boardFx.override[ev.attackerId];
  delete boardFx.popScale[ev.attackerId];
  boardFx.gust = null;
  boardFx.charge = null;
}

async function playBoltCast(ev) {
  const line = lineEnds(ev);
  if (!line) return;
  const x0 = line.x0;
  const y0 = line.y0;
  const x1 = line.x1;
  const y1 = line.y1;
  boardFx.charge = { id: ev.attackerId, t: 0, element: 'lightning' };
  await animate(50, function (t) {
    boardFx.charge.t = t;
    boardFx.popScale[ev.attackerId] = 1 + t * 0.12;
  });
  const pts = jaggedBoltPoints(x0, y0, x1, y1, 9);
  const mid = pts[Math.floor(pts.length * 0.55)];
  const forks = [];
  if (mid) {
    forks.push(jaggedBoltPoints(mid.x, mid.y, mid.x + (Math.random() - 0.5) * 36, mid.y + (Math.random() - 0.5) * 36, 4));
  }
  boardFx.bolt = { pts: pts, forks: forks, head: 0, fade: 0 };
  boardFx.screenFlash = Math.max(boardFx.screenFlash, 0.72);
  boardFx.shake = Math.max(boardFx.shake, 6);
  ensureFxLoop();
  await animate(120, function (t) {
    boardFx.bolt.head = Math.min(1, t * 1.8);
    if (t > 0.55) boardFx.bolt.fade = (t - 0.55) / 0.45;
  });
  spawnBurst(x1, y1, '#ffffff', 16, 5.2);
  spawnBurst(x1, y1, BOARD_COLORS.lightning, 8, 3.6);
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: 'lightning' });
  ensureFxLoop();
  await sleep(40);
  boardFx.bolt = null;
  boardFx.charge = null;
  delete boardFx.popScale[ev.attackerId];
}

async function playPulseCast(ev) {
  return playAreaCast(ev, false);
}

async function playBurstCast(ev) {
  return playAreaCast(ev, true);
}

async function playAreaCast(ev, fromAim) {
  const layout = boardLayout();
  if (!layout) return;
  const origin = fromAim ? { row: ev.row, col: ev.col } : ev.from;
  const start = cellRect(layout, origin.row, origin.col);
  const x0 = start.x + start.s / 2;
  const y0 = start.y + start.s / 2;
  const element = ev.element || 'ice';
  const color = BOARD_COLORS[element] || BOARD_COLORS.ice;
  const tiles = ev.burstTiles || ev.pathTiles || [{ row: ev.row, col: ev.col }];
  boardFx.charge = { id: ev.attackerId, t: 0, element: element };
  spawnBurst(x0, y0, color, 8, 2.2);
  ensureFxLoop();
  boardFx.pulseWave = {
    x: x0,
    y: y0,
    t: 0,
    maxR: start.s * (fromAim ? 1.7 : 1.35),
    tiles: tiles.map(function (t) {
      const b = cellRect(layout, t.row, t.col);
      return { x: b.x + b.s / 2, y: b.y + b.s / 2 };
    }),
    burst: 0
  };
  await animate(220, function (t) {
    boardFx.charge.t = t;
    boardFx.pulseWave.t = t;
    boardFx.popScale[ev.attackerId] = 1 + t * 0.18;
    ensureFxLoop();
  });
  tiles.forEach(function (t) {
    const b = cellRect(layout, t.row, t.col);
    const cx = b.x + b.s / 2;
    const cy = b.y + b.s / 2;
    boardFx.rings.push({ row: t.row, col: t.col, t: 0, element: element });
    for (let i = 0; i < 5; i++) {
      boardFx.particles.push({
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 2.4,
        vy: -0.4 + Math.random() * 2.2,
        life: 0.9,
        color: Math.random() < 0.4 ? '#ffffff' : color,
        size: 1.8 + Math.random() * 1.8,
        kind: 'shard'
      });
    }
  });
  boardFx.shake = Math.max(boardFx.shake, fromAim ? 7 : 5);
  ensureFxLoop();
  await animate(180, function (t) {
    boardFx.pulseWave.burst = t;
    boardFx.pulseWave.t = Math.min(1, 0.7 + t * 0.3);
  });
  delete boardFx.popScale[ev.attackerId];
  boardFx.charge = null;
  boardFx.pulseWave = null;
}

async function playRaiseCast(ev) {
  const layout = boardLayout();
  if (!layout) return;
  const start = cellRect(layout, ev.from.row, ev.from.col);
  const end = cellRect(layout, ev.row, ev.col);
  boardFx.charge = { id: ev.attackerId, t: 0, element: 'earth' };
  await animate(160, function (t) {
    boardFx.charge.t = t;
    const stomp = Math.sin(t * Math.PI) * 10;
    boardFx.override[ev.attackerId] = { x: start.x, y: start.y + stomp, s: start.s };
    boardFx.shake = Math.max(boardFx.shake, 4 + t * 8);
  });
  boardFx.raiseSpike = { row: ev.row, col: ev.col, t: 0 };
  const cx = end.x + end.s / 2;
  const cy = end.y + end.s / 2;
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16;
    boardFx.particles.push({
      x: cx,
      y: cy + 8,
      vx: Math.cos(a) * 2.8,
      vy: Math.sin(a) * 1.4 - 1.6,
      life: 0.85,
      color: i % 2 ? BOARD_COLORS.earth : BOARD_COLORS.mountainBody,
      size: 2 + Math.random() * 2.6
    });
  }
  boardFx.shake = Math.max(boardFx.shake, 12);
  ensureFxLoop();
  await animate(220, function (t) {
    boardFx.raiseSpike.t = easeOut(t);
    boardFx.override[ev.attackerId] = { x: start.x, y: start.y, s: start.s };
  });
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: 'earth' });
  delete boardFx.override[ev.attackerId];
  delete boardFx.popScale[ev.attackerId];
  boardFx.charge = null;
  boardFx.raiseSpike = null;
}

async function playSwapCast(ev) {
  const layout = boardLayout();
  if (!layout) return;
  const start = cellRect(layout, ev.from.row, ev.from.col);
  const x0 = start.x + start.s / 2;
  const y0 = start.y + start.s / 2;
  const color = BOARD_COLORS.temporal;
  boardFx.charge = { id: ev.attackerId, t: 0, element: 'temporal' };
  spawnBurst(x0, y0, color, 10, 2.4);
  ensureFxLoop();
  await animate(180, function (t) {
    boardFx.charge.t = t;
    boardFx.fade[ev.attackerId] = 1 - t * 0.55;
    boardFx.popScale[ev.attackerId] = 1 + t * 0.12;
    ensureFxLoop();
  });
  boardFx.charge = null;
}

async function playRaiseTerrain(ev) {
  const layout = boardLayout();
  if (layout) {
    const b = cellRect(layout, ev.row, ev.col);
    spawnBurst(b.x + b.s / 2, b.y + b.s / 2, BOARD_COLORS.earth, 14, 4.2);
  }
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: 'earth' });
  boardFx.shake = Math.max(boardFx.shake, 8);
  ensureFxLoop();
  await sleep(50);
}

async function playSwap(ev) {
  const layout = boardLayout();
  if (!layout) return;
  const color = BOARD_COLORS[ev.element] || BOARD_COLORS.temporal;
  const aFrom = cellRect(layout, ev.fromA.row, ev.fromA.col);
  const aTo = cellRect(layout, ev.toA.row, ev.toA.col);
  const aWiz = state.wizards[ev.aId];
  const bWiz = ev.bId ? state.wizards[ev.bId] : null;
  boardFx.ghosts = [];
  if (aWiz) {
    boardFx.ghosts.push({ box: boxToOv(aFrom), wizard: aWiz, alpha: 0.45, scale: 1 });
  }
  if (bWiz && ev.fromB) {
    boardFx.ghosts.push({ box: boxToOv(cellRect(layout, ev.fromB.row, ev.fromB.col)), wizard: bWiz, alpha: 0.45, scale: 1 });
  }
  spawnBurst(aFrom.x + aFrom.s / 2, aFrom.y + aFrom.s / 2, color, 10, 2.6);
  spawnBurst(aTo.x + aTo.s / 2, aTo.y + aTo.s / 2, color, 10, 2.6);
  boardFx.rings.push({ row: ev.fromA.row, col: ev.fromA.col, t: 0, element: 'temporal' });
  boardFx.rings.push({ row: ev.toA.row, col: ev.toA.col, t: 0, element: 'temporal' });
  boardFx.screenFlash = Math.max(boardFx.screenFlash, 0.18);
  ensureFxLoop();
  boardFx.override[ev.aId] = boxToOv(aTo);
  if (ev.bId && ev.toB) {
    boardFx.override[ev.bId] = boxToOv(cellRect(layout, ev.toB.row, ev.toB.col));
  }
  await animate(220, function (t) {
    boardFx.fade[ev.aId] = t;
    boardFx.popScale[ev.aId] = 0.7 + t * 0.3;
    if (ev.bId) {
      boardFx.fade[ev.bId] = t;
      boardFx.popScale[ev.bId] = 0.7 + t * 0.3;
    }
    boardFx.ghosts.forEach(function (g) { g.alpha = 0.45 * (1 - t); });
  });
  delete boardFx.override[ev.aId];
  if (ev.bId) delete boardFx.override[ev.bId];
  delete boardFx.popScale[ev.aId];
  if (ev.bId) delete boardFx.popScale[ev.bId];
  delete boardFx.fade[ev.aId];
  if (ev.bId) delete boardFx.fade[ev.bId];
  boardFx.ghosts = [];
}

async function playSilence(ev) {
  boardFx.popups.push({ row: ev.row, col: ev.col, text: 'sil', t: 0 });
  boardFx.flash = { row: ev.row, col: ev.col };
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: 'lightning' });
  ensureFxLoop();
  await sleep(90);
  boardFx.flash = null;
}

async function playRoot(ev) {
  const layout = boardLayout();
  if (layout && ev.row != null) {
    const b = cellRect(layout, ev.row, ev.col);
    spawnBurst(b.x + b.s / 2, b.y + b.s / 2, BOARD_COLORS.ice, 14, 3.4);
  }
  boardFx.popups.push({ row: ev.row, col: ev.col, text: ev.skip ? 'skip' : 'lock', t: 0, element: 'ice' });
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: 'ice' });
  boardFx.flash = { row: ev.row, col: ev.col };
  ensureFxLoop();
  await sleep(120);
  boardFx.flash = null;
}

async function playBurnMark(ev) {
  const layout = boardLayout();
  if (layout && ev.row != null) {
    const b = cellRect(layout, ev.row, ev.col);
    spawnBurst(b.x + b.s / 2, b.y + b.s / 2, BOARD_COLORS.fire, 12, 3.2);
  }
  boardFx.popups.push({ row: ev.row, col: ev.col, text: 'burn', t: 0, element: 'fire' });
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: 'fire' });
  ensureFxLoop();
  await sleep(110);
}

async function playFizzle(ev) {
  const layout = boardLayout();
  if (layout) {
    const b = cellRect(layout, ev.row, ev.col);
    spawnBurst(b.x + b.s / 2, b.y + b.s / 2, BOARD_COLORS.earth, 12, 3.2);
    spawnBurst(b.x + b.s / 2, b.y + b.s / 2, BOARD_COLORS.lightning, 8, 2.4);
  }
  boardFx.popups.push({ row: ev.row, col: ev.col, text: 'fizzle', t: 0, element: 'lightning' });
  boardFx.shake = Math.max(boardFx.shake, 5);
  ensureFxLoop();
  await sleep(110);
}

async function playJump(ev) {
  (ev.tiles || []).forEach(function (t) {
    boardFx.rings.push({ row: t.row, col: t.col, t: 0, element: 'lightning' });
    boardFx.flash = { row: t.row, col: t.col };
  });
  boardFx.screenFlash = Math.max(boardFx.screenFlash, 0.35);
  ensureFxLoop();
  await sleep(90);
  boardFx.flash = null;
}

async function playVoidOpen(ev) {
  openVoid(state, ev.row, ev.col);
  const layout = boardLayout();
  if (layout) {
    const b = cellRect(layout, ev.row, ev.col);
    spawnBurst(b.x + b.s / 2, b.y + b.s / 2, BOARD_COLORS.voidRim, 16, 4.4);
  }
  boardFx.shake = Math.max(boardFx.shake, 10);
  boardFx.popups.push({ row: ev.row, col: ev.col, text: 'void', t: 0 });
  ensureFxLoop();
  await sleep(120);
}

async function playProjectile(ev) {
  return playStreamCast(ev);
}

async function playGround(ev) {
  const layout = boardLayout();
  if (layout) {
    const b = cellRect(layout, ev.row, ev.col);
    spawnBurst(b.x + b.s / 2, b.y + b.s / 2, BOARD_COLORS[ev.element] || '#fff', 16, 4.2);
  }
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: ev.element });
  boardFx.flash = { row: ev.row, col: ev.col };
  boardFx.shake = 5;
  boardFx.screenFlash = 0.22;
  ensureFxLoop();
  drawBoard();
  await sleep(55);
  boardFx.flash = null;
  drawBoard();
}

async function playDamage(ev) {
  const falling = ev.cause === 'water' || ev.cause === 'void';
  const smash = ev.cause === 'crash' && ev.amount >= 2;
  const over = !falling && (ev.overkill || 0) > 0;
  const killish = ev.amount >= 5 || ev.cause === 'collision' || smash || over;
  boardFx.popups.push({
    row: ev.row,
    col: ev.col,
    text: falling ? (ev.cause === 'water' ? 'splash' : 'fall') : ('-' + ev.amount),
    t: 0
  });
  if (smash) boardFx.popups.push({ row: ev.row, col: ev.col, text: 'smash', t: 0, element: 'earth' });
  if (over) boardFx.popups.push({ row: ev.row, col: ev.col, text: '+' + ev.overkill, t: 0, element: 'fire' });
  boardFx.flash = falling ? null : { row: ev.row, col: ev.col };
  boardFx.screenFlash = falling ? 0.12 : (ev.targetKind === 'nexus' ? 0.55 : (smash ? 0.62 : (killish ? 0.48 : 0.38)));
  boardFx.shake = falling ? 4 : (ev.targetKind === 'nexus' ? 12 : (smash ? 10 + ev.amount * 2 : (ev.cause === 'collision' || ev.cause === 'crash' ? 11 : 8)));
  if (!falling && ev.targetKind === 'wizard' && ev.targetId) {
    boardFx.popScale[ev.targetId] = smash || over ? 1.38 : 1.24;
  }
  const layout = boardLayout();
  if (layout && !falling) {
    const b = cellRect(layout, ev.row, ev.col);
    spawnBurst(b.x + b.s / 2, b.y + b.s / 2, '#ffffff', 16, 5.2);
  }
  ensureFxLoop();
  drawBoard();
  if (ev.targetKind === 'wizard' && ev.targetId) {
    const w = state.wizards[ev.targetId];
    if (w) w.hp = Math.max(0, w.hp - ev.amount);
  } else if (ev.targetKind === 'nexus' && ev.targetId) {
    const n = nexusById(state, ev.targetId);
    if (n) n.hp = Math.max(0, n.hp - ev.amount);
  }
  const stop = smash || over ? 220 : (ev.cause === 'collision' || ev.cause === 'crash' ? 180 : (ev.targetKind === 'nexus' ? 200 : 160));
  await sleep(stop);
  if (ev.targetId) delete boardFx.popScale[ev.targetId];
  boardFx.flash = null;
  drawBoard();
}

async function lerpOverride(id, r0, c0, r1, c1, duration, opts) {
  opts = opts || {};
  const layout = boardLayout();
  if (!layout) return;
  const a = cellRect(layout, r0, c0);
  const b = cellRect(layout, r1, c1);
  const wiz = state.wizards[id];
  await animate(duration, function (t) {
    const k = easeInOut(t);
    const hop = opts.bounce ? Math.sin(Math.PI * t) * a.s * 0.28 : 0;
    const box = {
      x: a.x + (b.x - a.x) * k,
      y: a.y + (b.y - a.y) * k - hop,
      s: a.s
    };
    boardFx.override[id] = box;
    if (opts.bounce) boardFx.popScale[id] = 1 + Math.sin(Math.PI * t) * 0.08;
    if (opts.trail && wiz) {
      boardFx.ghosts = [
        { box: { x: a.x + (b.x - a.x) * Math.max(0, k - 0.22), y: a.y + (b.y - a.y) * Math.max(0, k - 0.22), s: a.s }, wizard: wiz, alpha: 0.32, scale: 0.94 },
        { box: { x: a.x + (b.x - a.x) * Math.max(0, k - 0.4), y: a.y + (b.y - a.y) * Math.max(0, k - 0.4), s: a.s }, wizard: wiz, alpha: 0.16, scale: 0.88 }
      ];
    }
  });
  if (opts.bounce) delete boardFx.popScale[id];
  if (opts.trail) boardFx.ghosts = [];
}

async function playMove(ev) {
  const layout = boardLayout();
  if (!layout) return;
  wakeWizardAt(ev.wizardId, ev.from.row, ev.from.col);
  const w0 = state.wizards[ev.wizardId];
  const stepMs = w0 && w0.pawnKind ? 200 : (w0 && w0.team === 'enemy' ? 200 : 150);
  let r = ev.from.row;
  let c = ev.from.col;
  holdDiscAt(w0, r, c);
  for (let i = 0; i < ev.path.length; i++) {
    const step = ev.path[i];
    await lerpOverride(ev.wizardId, r, c, step.row, step.col, stepMs, { bounce: !(w0 && w0.pawnKind) });
    r = step.row;
    c = step.col;
    if (w0 && w0.state === 'onboard') {
      w0.row = r;
      w0.col = c;
    }
    await sleep(w0 && w0.pawnKind ? 50 : (w0 && w0.team === 'enemy' ? 140 : 40));
  }
  if (w0 && w0.state === 'onboard') {
    w0.row = r;
    w0.col = c;
  }
  await sleep(80);
  releaseDisc(w0);
}

async function playUndoMove(ev) {
  const layout = boardLayout();
  if (!layout || !ev.from || !ev.to) return;
  wakeWizardAt(ev.wizardId, ev.from.row, ev.from.col);
  boardFx.override[ev.wizardId] = boxToOv(cellRect(layout, ev.from.row, ev.from.col));
  await lerpOverride(ev.wizardId, ev.from.row, ev.from.col, ev.to.row, ev.to.col, 160, { bounce: true });
  const w = state.wizards[ev.wizardId];
  if (w && w.state === 'onboard') {
    w.row = ev.to.row;
    w.col = ev.to.col;
  }
  delete boardFx.override[ev.wizardId];
}

async function playPush(ev) {
  if (!ev.path.length) {
    boardFx.shake = Math.max(boardFx.shake, 6);
    ensureFxLoop();
    return;
  }
  let r = ev.from.row;
  let c = ev.from.col;
  const layout = boardLayout();
  if (!layout) return;
  wakeWizardAt(ev.wizardId, ev.from.row, ev.from.col);
  const pusher = state.wizards[ev.wizardId];
  holdDiscAt(pusher, r, c);
  const stepMs = pusher && pusher.pawnKind ? 180 : 90;
  for (let i = 0; i < ev.path.length; i++) {
    const step = ev.path[i];
    await lerpOverride(ev.wizardId, r, c, step.row, step.col, stepMs, { trail: true });
    r = step.row;
    c = step.col;
    if (pusher && pusher.state === 'onboard') {
      pusher.row = r;
      pusher.col = c;
    }
  }
  if (pusher && pusher.state === 'onboard') {
    pusher.row = r;
    pusher.col = c;
  }
  boardFx.ghosts = [];
  await sleep(pusher && pusher.pawnKind ? 80 : 0);
  releaseDisc(pusher);
}

async function playPortal(ev) {
  const layout = boardLayout();
  if (layout) {
    const b = cellRect(layout, ev.row, ev.col);
    spawnBurst(b.x + b.s / 2, b.y + b.s / 2, BOARD_COLORS[ev.element] || '#fff', 14, 3.4);
  }
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: ev.element });
  boardFx.popups.push({ row: ev.row, col: ev.col, text: 'next turn', t: 0, element: ev.element });
  ensureFxLoop();
  await animate(200, function () {});
}

async function playPortalBlocked(ev) {
  boardFx.flash = { row: ev.row, col: ev.col };
  boardFx.shake = Math.max(boardFx.shake, 11);
  boardFx.screenFlash = Math.max(boardFx.screenFlash, 0.42);
  boardFx.popups.push({ row: ev.row, col: ev.col, text: 'both die', t: 0, element: ev.element });
  ensureFxLoop();
  await sleep(120);
  boardFx.flash = null;
}

async function playSummon(ev) {
  const w = state.wizards[ev.wizardId];
  if (w) {
    w.state = 'onboard';
    w.row = ev.row;
    w.col = ev.col;
  }
  const layout = boardLayout();
  if (layout) {
    const b = cellRect(layout, ev.row, ev.col);
    spawnBurst(b.x + b.s / 2, b.y + b.s / 2, BOARD_COLORS[ev.element] || '#fff', 18, 4);
  }
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: ev.element });
  boardFx.popups.push({
    row: ev.row,
    col: ev.col,
    text: w && w.pawnKind ? 'in' : 'arrives',
    t: 0,
    element: ev.element
  });
  boardFx.popScale[ev.wizardId] = 0.2;
  ensureFxLoop();
  await animate(340, function (t) {
    const k = t < 0.7 ? easeOut(t / 0.7) * 1.18 : 1.18 - (t - 0.7) / 0.3 * 0.18;
    boardFx.popScale[ev.wizardId] = k;
  });
  delete boardFx.popScale[ev.wizardId];
  if (typeof render === 'function') render();
}

async function playEmergeMark(ev) {
  const w = state.wizards[ev.wizardId];
  if (w) {
    w.state = 'emerging';
    w.row = ev.row;
    w.col = ev.col;
  }
  const layout = boardLayout();
  if (layout) {
    const b = cellRect(layout, ev.row, ev.col);
    spawnBurst(b.x + b.s / 2, b.y + b.s / 2, BOARD_COLORS.intentEdge, 10, 2.8);
  }
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: ev.element });
  boardFx.popups.push({ row: ev.row, col: ev.col, text: 'in', t: 0, element: ev.element });
  ensureFxLoop();
  if (typeof render === 'function') render();
  await sleep(160);
}

async function playIntent(ev) {
  if (ev.row == null) return;
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: ev.element });
  ensureFxLoop();
  if (typeof render === 'function') render();
  await sleep(70);
}

async function playDeath(ev) {
  const fall = ev.cause === 'water' || ev.cause === 'void';
  if (ev.row != null && !fall) {
    boardFx.popups.push({ row: ev.row, col: ev.col, text: 'out', t: 0 });
  }
  const w = state.wizards[ev.wizardId];
  const layout = boardLayout();
  if (w && ev.row != null) {
    w.state = 'onboard';
    w.row = ev.row;
    w.col = ev.col;
    if (layout) boardFx.override[w.id] = boxToOv(cellRect(layout, ev.row, ev.col));
  }
  if (layout && ev.row != null) {
    const box = cellRect(layout, ev.row, ev.col);
    const cx = box.x + box.s / 2;
    const cy = box.y + box.s / 2;
    if (fall) {
      const color = ev.cause === 'water' ? BOARD_COLORS.water : '#1c1e1b';
      for (let i = 0; i < 12; i++) {
        boardFx.particles.push({
          x: cx + (Math.random() - 0.5) * box.s * 0.3,
          y: cy,
          vx: (Math.random() - 0.5) * 1.2,
          vy: 0.9 + Math.random() * 1.8,
          life: 0.95,
          color: color,
          size: 2 + Math.random() * 2.4,
          kind: 'shard'
        });
      }
    } else {
      spawnBurst(cx, cy, '#ffffff', 20, 5);
    }
  }
  if (!fall) {
    boardFx.shake = Math.max(boardFx.shake, 10);
    boardFx.screenFlash = Math.max(boardFx.screenFlash, 0.4);
  }
  ensureFxLoop();
  if (w) {
    if (fall) {
      const drop = layout && ev.row != null ? cellRect(layout, ev.row, ev.col).s * 0.62 : 28;
      await animate(420, function (t) {
        const k = easeIn(t);
        boardFx.fall[w.id] = k * drop;
        boardFx.popScale[w.id] = 1 - k * 0.9;
        boardFx.fade[w.id] = 1 - k * 0.82;
      });
    } else {
      await animate(220, function (t) {
        boardFx.fade[w.id] = 1 - t;
        boardFx.popScale[w.id] = 1 + t * 0.45;
      });
    }
    delete boardFx.fade[w.id];
    delete boardFx.popScale[w.id];
    delete boardFx.override[w.id];
    delete boardFx.fall[w.id];
    buryWizard(w);
  }
}
