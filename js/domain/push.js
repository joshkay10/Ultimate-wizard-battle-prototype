function getDisplacementPath(match, target, dr, dc, amount) {
  if (amount === 0) return { path: [], tilesShort: 0, crash: null };
  const dir = amount > 0 ? 1 : -1;
  let remaining = Math.abs(amount);
  const path = [];
  let curRow = target.row;
  let curCol = target.col;
  let guard = 0;
  while (remaining > 0 && guard++ < BOARD_SIZE + 2) {
    const nr = curRow + dr * dir;
    const nc = curCol + dc * dir;
    const crash = crashObstacle(match, nr, nc);
    if (crash) {
      return { path: path, tilesShort: remaining, crash: crash };
    }
    path.push({ row: nr, col: nc });
    curRow = nr;
    curCol = nc;
    const trail = trailAt(match, nr, nc);
    if (!(trail && trail.element === 'ice')) remaining -= 1;
  }
  return { path: path, tilesShort: 0, crash: null };
}

function crashObstacle(match, row, col) {
  if (!inBounds(row, col)) return { kind: 'wall', row: row, col: col };
  const wizard = wizardAt(match, row, col);
  if (wizard) return { kind: 'wizard', wizardId: wizard.id, row: row, col: col };
  const nexus = nexusAt(match, row, col);
  if (nexus) return { kind: 'nexus', nexusId: nexus.id, row: row, col: col };
  if (mountainAt(match, row, col)) return { kind: 'wall', row: row, col: col };
  return null;
}

function applyCrashDamage(match, pushed, crash, amount) {
  const events = [];
  pushed.hp -= amount;
  events.push({
    type: 'damage',
    targetKind: 'wizard',
    targetId: pushed.id,
    amount: amount,
    row: pushed.row,
    col: pushed.col,
    cause: 'crash'
  });
  const death = simKill(match, pushed);
  if (death) events.push(death);
  if (crash.kind === 'wizard') {
    const other = match.wizards[crash.wizardId];
    if (other && other.state === 'onboard') {
      other.hp -= amount;
      events.push({
        type: 'damage',
        targetKind: 'wizard',
        targetId: other.id,
        amount: amount,
        row: other.row,
        col: other.col,
        cause: 'crash'
      });
      const otherDeath = simKill(match, other);
      if (otherDeath) events.push(otherDeath);
    }
  }
  if (crash.kind === 'nexus') {
    const nexus = nexusById(match, crash.nexusId) || nexusAt(match, crash.row, crash.col);
    events.push.apply(events, hurtNexus(match, nexus, amount, 'crash'));
  }
  return events;
}

function simPush(match, target, dr, dc, amount) {
  const from = { row: target.row, col: target.col };
  const planned = getDisplacementPath(match, target, dr, dc, amount);
  const events = [];
  const extra = [];
  const travelled = [];
  for (let i = 0; i < planned.path.length; i++) {
    const step = planned.path[i];
    target.row = step.row;
    target.col = step.col;
    travelled.push(step);
    extra.push.apply(extra, applyTileEnter(match, target));
    if (target.state !== 'onboard') break;
  }
  const finished = travelled.length === planned.path.length && target.state === 'onboard';
  if (finished) {
    extra.push.apply(extra, applyWindCarry(match, target, dr, dc, travelled));
  }
  events.push({
    type: 'push',
    wizardId: target.id,
    from: from,
    path: travelled,
    tilesShort: planned.tilesShort,
    crash: planned.crash
  });
  events.push.apply(events, extra);
  if (finished && planned.crash) {
    events.push.apply(events, applyCrashDamage(match, target, planned.crash, CRASH_DAMAGE));
  }
  return events;
}
