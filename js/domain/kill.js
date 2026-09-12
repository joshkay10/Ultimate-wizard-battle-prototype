function simKill(match, wizard) {
  if (!wizard || wizard.state === 'dead' || wizard.hp > 0) return null;
  const ev = {
    type: 'death',
    wizardId: wizard.id,
    row: wizard.row,
    col: wizard.col,
    element: wizard.element,
    team: wizard.team
  };
  wizard.hp = 0;
  wizard.state = 'dead';
  wizard.row = null;
  wizard.col = null;
  wizard.moveUndo = null;
  if (match.selectedWizardId === wizard.id) match.selectedWizardId = null;
  return ev;
}

function stampWizardDamage(wizard, amount, cause, row, col) {
  const hpBefore = Math.max(0, wizard.hp);
  wizard.hp -= amount;
  return {
    type: 'damage',
    targetKind: 'wizard',
    targetId: wizard.id,
    amount: amount,
    overkill: Math.max(0, amount - hpBefore),
    row: row != null ? row : wizard.row,
    col: col != null ? col : wizard.col,
    cause: cause
  };
}

function crashSmash(tilesShort) {
  return Math.max(CRASH_DAMAGE, tilesShort || 0);
}

function applyHazardEnter(match, wizard) {
  const events = [];
  if (!wizard || wizard.state !== 'onboard') return events;
  const cause = voidAt(match, wizard.row, wizard.col)
    ? 'void'
    : (waterAt(match, wizard.row, wizard.col) ? 'water' : null);
  if (!cause) return events;
  const amount = Math.max(1, wizard.hp);
  wizard.hp = 0;
  events.push({
    type: 'damage',
    targetKind: 'wizard',
    targetId: wizard.id,
    amount: amount,
    row: wizard.row,
    col: wizard.col,
    cause: cause
  });
  const death = simKill(match, wizard);
  if (death) {
    death.cause = cause;
    events.push(death);
  }
  return events;
}

function applyFireEnter(match, wizard) {
  const events = [];
  if (!wizard || wizard.state !== 'onboard') return events;
  const trail = trailAt(match, wizard.row, wizard.col);
  if (!trail || trail.element !== 'fire') return events;
  events.push(stampWizardDamage(wizard, FIRE_TRAIL_DAMAGE, 'fire', wizard.row, wizard.col));
  const death = simKill(match, wizard);
  if (death) events.push(death);
  return events;
}

function applyWindCarry(match, wizard, dr, dc, travelled) {
  const events = [];
  if (!wizard || wizard.state !== 'onboard') return events;
  if (!dr && !dc) return events;
  let guard = 0;
  while (wizard.state === 'onboard' && guard++ < BOARD_SIZE) {
    const trail = trailAt(match, wizard.row, wizard.col);
    if (!trail || trail.element !== 'wind') break;
    const nr = wizard.row + dr;
    const nc = wizard.col + dc;
    const crash = crashObstacle(match, nr, nc);
    if (crash) {
      events.push.apply(events, applyCrashDamage(match, wizard, crash, CRASH_DAMAGE));
      if (crash.kind === 'wizard') {
        const other = match.wizards[crash.wizardId];
        if (other && other.state === 'onboard') {
          events.push.apply(events, simPush(match, other, dr, dc, 1));
        }
      }
      break;
    }
    wizard.row = nr;
    wizard.col = nc;
    travelled.push({ row: nr, col: nc });
    events.push.apply(events, applyTileEnter(match, wizard));
  }
  return events;
}

function applyTileEnter(match, wizard) {
  const events = applyHazardEnter(match, wizard);
  if (!wizard || wizard.state !== 'onboard') return events;
  events.push.apply(events, applyFireEnter(match, wizard));
  return events;
}
