function simMove(match, wizard, path) {
  if (!canMove(wizard)) return [];
  if (!path || !path.length) return [];
  const from = { row: wizard.row, col: wizard.col };
  const travelled = [];
  const extra = [];
  for (let i = 0; i < path.length; i++) {
    const step = path[i];
    wizard.row = step.row;
    wizard.col = step.col;
    travelled.push(step);
    extra.push.apply(extra, applyTileEnter(match, wizard));
    if (wizard.state !== 'onboard') break;
  }
  if (wizard.state === 'onboard' && travelled.length) {
    const last = travelled[travelled.length - 1];
    const prev = travelled.length >= 2 ? travelled[travelled.length - 2] : from;
    extra.push.apply(extra, applyWindCarry(match, wizard, last.row - prev.row, last.col - prev.col, travelled));
  }
  wizard.hasMoved = true;
  return [{ type: 'move', wizardId: wizard.id, from: from, path: travelled }].concat(extra);
}
