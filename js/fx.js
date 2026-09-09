function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animate(duration, step) {
  return new Promise(function (resolve) {
    const t0 = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - t0) / duration);
      step(t, now);
      drawBoard();
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

async function playEvents(events) {
  if (!events || !events.length) {
    if (typeof render === 'function') render();
    return;
  }
  state.animating = true;
  if (typeof render === 'function') render();

  let i = 0;
  while (i < events.length) {
    const ev = events[i];
    if (ev.type === 'attack') {
      let j = i + 1;
      while (j < events.length) {
        const n = events[j].type;
        if (n === 'attack' || n === 'move' || n === 'summon' || n === 'portal' || n === 'portalBlocked' || n === 'turnEnd' || n === 'turnStart' || n === 'gameOver') break;
        j++;
      }
      await playAttackGroup(events, i, j);
      i = j;
    } else {
      await playEvent(ev);
      i++;
    }
  }

  boardFx.flash = null;
  boardFx.projectile = null;
  boardFx.slash = null;
  boardFx.stream = null;
  boardFx.charge = null;
  boardFx.override = {};
  boardFx.ghosts = [];
  boardFx.lungeReturn = null;
  state.animating = false;
  if (typeof render === 'function') render();
}

async function playAttackGroup(events, start, end) {
  const layout = boardLayout();
  let restored = null;
  for (let k = start; k < end; k++) {
    const ev = events[k];
    if (ev.type === 'push' && layout) {
      const w = state.wizards[ev.wizardId];
      if (w && w.state === 'onboard') {
        boardFx.override[w.id] = boxToOv(cellRect(layout, ev.from.row, ev.from.col));
      }
    }
    if (ev.type === 'death') {
      restored = state.wizards[ev.wizardId];
      if (restored) {
        restored.state = 'onboard';
        restored.row = ev.row;
        restored.col = ev.col;
        if (layout) {
          const push = events.slice(start, end).find(e => e.type === 'push' && e.wizardId === ev.wizardId);
          const at = push ? push.from : { row: ev.row, col: ev.col };
          restored.row = at.row;
          restored.col = at.col;
          boardFx.override[restored.id] = boxToOv(cellRect(layout, at.row, at.col));
        }
      }
    }
  }

  for (let k = start; k < end; k++) {
    await playEvent(events[k]);
  }
  await returnLunge();

  if (restored) {
    restored.state = 'dead';
    restored.row = null;
    restored.col = null;
  }
}

async function playEvent(ev) {
  if (ev.type === 'trail') return;
  if (ev.type === 'summon') return playSummon(ev);
  if (ev.type === 'portal') return playPortal(ev);
  if (ev.type === 'portalBlocked') return playPortalBlocked(ev);
  if (ev.type === 'move') return playMove(ev);
  if (ev.type === 'attack') return playAttack(ev);
  if (ev.type === 'damage') return playDamage(ev);
  if (ev.type === 'ground') return playGround(ev);
  if (ev.type === 'push') return playPush(ev);
  if (ev.type === 'death') return playDeath(ev);
  if (ev.type === 'gameOver') {
    boardFx.shake = 16;
    boardFx.screenFlash = 0.7;
    ensureFxLoop();
    await sleep(280);
  }
}

async function playAttack(ev) {
  if (ev.kind === 'cast') await playCastSpell(ev);
  else await playMeleeLunge(ev);
}

async function playMeleeLunge(ev) {
  const layout = boardLayout();
  if (!layout) return;
  const from = cellRect(layout, ev.from.row, ev.from.col);
  const to = cellRect(layout, ev.row, ev.col);
  const dx = (to.x - from.x) * 0.46;
  const dy = (to.y - from.y) * 0.46;
  await animate(95, function (t) {
    const k = easeOut(t);
    boardFx.override[ev.attackerId] = { x: from.x + dx * k, y: from.y + dy * k, s: from.s };
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
  spawnBurst(cx, cy, BOARD_COLORS[ev.element] || '#fff', 10, 3.2);
  ensureFxLoop();
  await animate(85, function (t) { boardFx.slash.t = t; });
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

async function playCastSpell(ev) {
  const layout = boardLayout();
  if (!layout) return;
  const start = cellRect(layout, ev.from.row, ev.from.col);
  const end = cellRect(layout, ev.row, ev.col);
  const x0 = start.x + start.s / 2;
  const y0 = start.y + start.s / 2;
  const x1 = end.x + end.s / 2;
  const y1 = end.y + end.s / 2;
  const color = BOARD_COLORS[ev.element] || '#fff';
  const dist = Math.hypot(x1 - x0, y1 - y0);

  boardFx.charge = { id: ev.attackerId, t: 0, element: ev.element };
  spawnBurst(x0, y0, color, 12, 2.4);
  ensureFxLoop();
  await animate(480, function (t) {
    boardFx.charge.t = t;
    boardFx.popScale[ev.attackerId] = 1 + t * 0.3;
    if (Math.random() < 0.9) {
      const a = Math.random() * Math.PI * 2;
      const d = 36 * (1 - t * 0.65);
      boardFx.particles.push({
        x: x0 + Math.cos(a) * d,
        y: y0 + Math.sin(a) * d,
        vx: -Math.cos(a) * 1.6,
        vy: -Math.sin(a) * 1.6,
        life: 0.8,
        color: color,
        size: 2.4 + Math.random() * 2.4
      });
    }
    ensureFxLoop();
  });
  await sleep(140);

  boardFx.stream = { x0: x0, y0: y0, x1: x1, y1: y1, head: 0, element: ev.element, fade: 0 };
  const travel = 280 + dist * 0.7;
  await animate(travel, function (t) {
    boardFx.stream.head = easeOut(t);
    const hx = x0 + (x1 - x0) * boardFx.stream.head;
    const hy = y0 + (y1 - y0) * boardFx.stream.head;
    const nx = -(y1 - y0);
    const ny = (x1 - x0);
    const nlen = Math.hypot(nx, ny) || 1;
    if (Math.random() < 0.9) {
      const off = (Math.random() - 0.5) * 12;
      boardFx.particles.push({
        x: hx + (nx / nlen) * off,
        y: hy + (ny / nlen) * off,
        vx: (Math.random() - 0.5) * 1.1,
        vy: (Math.random() - 0.5) * 1.1,
        life: 0.7,
        color: color,
        size: 2 + Math.random() * 2.2
      });
    }
    ensureFxLoop();
  });

  spawnBurst(x1, y1, color, 24, 5.4);
  spawnBurst(x1, y1, '#ffffff', 10, 3.2);
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: ev.element });
  boardFx.shake = Math.max(boardFx.shake, 7);
  boardFx.screenFlash = Math.max(boardFx.screenFlash, 0.3);
  ensureFxLoop();
  await sleep(70);

  const recoilX = (x0 - x1) / (dist || 1) * 10;
  const recoilY = (y0 - y1) / (dist || 1) * 10;
  await animate(140, function (t) {
    const k = 1 - t;
    boardFx.override[ev.attackerId] = {
      x: start.x + recoilX * k,
      y: start.y + recoilY * k,
      s: start.s
    };
    boardFx.stream.fade = t;
    boardFx.popScale[ev.attackerId] = 1.18 - t * 0.18;
  });
  delete boardFx.override[ev.attackerId];
  delete boardFx.popScale[ev.attackerId];
  boardFx.stream = null;
  boardFx.charge = null;
}

async function playProjectile(ev) {
  return playCastSpell(ev);
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
  const killish = ev.amount >= 5 || ev.cause === 'collision' || ev.cause === 'crash';
  boardFx.popups.push({ row: ev.row, col: ev.col, text: '-' + ev.amount, t: 0 });
  boardFx.flash = { row: ev.row, col: ev.col };
  boardFx.screenFlash = ev.targetKind === 'nexus' ? 0.55 : (killish ? 0.48 : 0.38);
  boardFx.shake = ev.targetKind === 'nexus' ? 12 : (ev.cause === 'collision' || ev.cause === 'crash' ? 11 : 8);
  const layout = boardLayout();
  if (layout) {
    const b = cellRect(layout, ev.row, ev.col);
    spawnBurst(b.x + b.s / 2, b.y + b.s / 2, '#ffffff', 14, 4.8);
  }
  ensureFxLoop();
  drawBoard();
  const stop = ev.cause === 'collision' || ev.cause === 'crash' ? 110 : (ev.targetKind === 'nexus' ? 100 : 85);
  await sleep(stop);
  boardFx.flash = null;
  drawBoard();
}

async function lerpOverride(id, r0, c0, r1, c1, duration) {
  const layout = boardLayout();
  if (!layout) return;
  const a = cellRect(layout, r0, c0);
  const b = cellRect(layout, r1, c1);
  await animate(duration, function (t) {
    const k = easeInOut(t);
    boardFx.override[id] = {
      x: a.x + (b.x - a.x) * k,
      y: a.y + (b.y - a.y) * k,
      s: a.s
    };
  });
}

async function playMove(ev) {
  const layout = boardLayout();
  if (!layout) return;
  let r = ev.from.row;
  let c = ev.from.col;
  boardFx.override[ev.wizardId] = boxToOv(cellRect(layout, r, c));
  for (let i = 0; i < ev.path.length; i++) {
    const step = ev.path[i];
    await lerpOverride(ev.wizardId, r, c, step.row, step.col, 115);
    r = step.row;
    c = step.col;
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
  boardFx.override[ev.wizardId] = boxToOv(cellRect(layout, r, c));
  for (let i = 0; i < ev.path.length; i++) {
    const step = ev.path[i];
    await lerpOverride(ev.wizardId, r, c, step.row, step.col, 80);
    r = step.row;
    c = step.col;
  }
  delete boardFx.override[ev.wizardId];
}

async function playPortal(ev) {
  const layout = boardLayout();
  if (layout) {
    const b = cellRect(layout, ev.row, ev.col);
    spawnBurst(b.x + b.s / 2, b.y + b.s / 2, BOARD_COLORS[ev.element] || '#fff', 14, 3.4);
  }
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: ev.element });
  ensureFxLoop();
  await animate(200, function () {});
}

async function playPortalBlocked(ev) {
  boardFx.flash = { row: ev.row, col: ev.col };
  boardFx.shake = Math.max(boardFx.shake, 11);
  boardFx.screenFlash = Math.max(boardFx.screenFlash, 0.42);
  ensureFxLoop();
  await sleep(120);
  boardFx.flash = null;
}

async function playSummon(ev) {
  const layout = boardLayout();
  if (layout) {
    const b = cellRect(layout, ev.row, ev.col);
    spawnBurst(b.x + b.s / 2, b.y + b.s / 2, BOARD_COLORS[ev.element] || '#fff', 18, 4);
  }
  boardFx.rings.push({ row: ev.row, col: ev.col, t: 0, element: ev.element });
  boardFx.popScale[ev.wizardId] = 0.2;
  ensureFxLoop();
  await animate(220, function (t) {
    const k = t < 0.7 ? easeOut(t / 0.7) * 1.18 : 1.18 - (t - 0.7) / 0.3 * 0.18;
    boardFx.popScale[ev.wizardId] = k;
  });
  delete boardFx.popScale[ev.wizardId];
  if (typeof render === 'function') render();
}

async function playDeath(ev) {
  const w = state.wizards[ev.wizardId];
  const layout = boardLayout();
  if (layout && ev.row != null) {
    const box = cellRect(layout, ev.row, ev.col);
    spawnBurst(box.x + box.s / 2, box.y + box.s / 2, '#ffffff', 20, 5);
  }
  boardFx.shake = Math.max(boardFx.shake, 10);
  boardFx.screenFlash = Math.max(boardFx.screenFlash, 0.4);
  ensureFxLoop();
  if (w) {
    await animate(260, function (t) {
      boardFx.fade[w.id] = 1 - t;
      boardFx.popScale[w.id] = 1 + t * 0.4;
    });
    delete boardFx.fade[w.id];
    delete boardFx.popScale[w.id];
    delete boardFx.override[w.id];
  }
}
