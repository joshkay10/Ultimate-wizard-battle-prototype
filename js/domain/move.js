function simMove(match, wizard, path) {
  if (!canMove(wizard)) return [];
  if (!path || !path.length) return [];
  const from = { row: wizard.row, col: wizard.col };
  wizard.moveUndo = { row: wizard.row, col: wizard.col, hp: wizard.hp };
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
  if (wizard.state !== 'onboard') wizard.moveUndo = null;
  return [{ type: 'move', wizardId: wizard.id, from: from, path: travelled }].concat(extra);
}

function canUndoMove(wizard) {
  return !!(
    wizard &&
    wizard.state === 'onboard' &&
    wizard.moveUndo &&
    wizard.hasMoved &&
    !wizard.hasAttacked
  );
}

function simUndoMove(match, wizard) {
  if (!canUndoMove(wizard)) return [];
  const from = { row: wizard.row, col: wizard.col };
  const undo = wizard.moveUndo;
  wizard.row = undo.row;
  wizard.col = undo.col;
  wizard.hp = undo.hp;
  wizard.hasMoved = false;
  wizard.moveUndo = null;
  return [{
    type: 'undoMove',
    wizardId: wizard.id,
    from: from,
    to: { row: wizard.row, col: wizard.col }
  }];
}
