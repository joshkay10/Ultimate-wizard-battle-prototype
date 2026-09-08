// Direction unit vector from a straight line between two points (assumes same row or same col)
function directionBetween(fromRow, fromCol, toRow, toCol) {
  return {
    dr: Math.sign(toRow - fromRow),
    dc: Math.sign(toCol - fromCol)
  };
}

// Apply displacement to a target sitting at (row,col), moving along (dr,dc) by `amount` tiles.
// Positive amount = push further along (dr,dc) away from the attacker.
function getDisplacementPath(target, dr, dc, amount) {
  if (amount === 0) return { path: [], tilesShort: 0 };
  const dir = amount > 0 ? 1 : -1;
  const steps = Math.abs(amount);
  const path = [];
  let curRow = target.row, curCol = target.col;
  for (let i = 0; i < steps; i++) {
    const nr = curRow + dr * dir;
    const nc = curCol + dc * dir;
    if (!inBounds(nr, nc) || isBlocked(nr, nc)) {
      return { path, tilesShort: Math.min(3, steps - i) };
    }
    path.push({ row: nr, col: nc });
    curRow = nr;
    curCol = nc;
  }
  return { path, tilesShort: 0 };
}

async function applyDisplacementAnimated(target, dr, dc, amount) {
  const { path, tilesShort } = getDisplacementPath(target, dr, dc, amount);
  if (path.length) boardFx.liftedId = target.id;
  for (const step of path) {
    target.row = step.row;
    target.col = step.col;
    render();
    await sleep(70);
  }
  boardFx.liftedId = null;
  if (tilesShort > 0) {
    target.hp -= tilesShort;
    render();
    showDamagePopup(target.row, target.col, tilesShort);
    await flashImpact(target.row, target.col);
  } else if (path.length) {
    drawBoard();
  }
  return { tilesShort, collided: tilesShort > 0 };
}

function killIfDead(wizard) {
  if (wizard.hp <= 0) {
    wizard.hp = 0;
    wizard.state = 'dead';
    wizard.row = null;
    wizard.col = null;
    if (state.selectedWizardId === wizard.id) state.selectedWizardId = null;
  }
}

async function resolveMeleeAttack(attacker, row, col) {
  if (attacker.state !== 'onboard' || attacker.row === null || attacker.hasAttacked) return;
  state.animating = true;
  render();

  const targetWizard = wizardAt(row, col);
  const targetNexus = nexusAt(row, col);
  const dir = directionBetween(attacker.row, attacker.col, row, col);

  layTrail(row, col, attacker.element);

  if (targetWizard) {
    const dmg = attacker.meleeAttack;
    targetWizard.hp -= dmg;
    render();
    showDamagePopup(row, col, dmg);
    await flashImpact(row, col);
    await applyDisplacementAnimated(targetWizard, dir.dr, dir.dc, attacker.meleeDisplacement);
    killIfDead(targetWizard);
  } else if (targetNexus) {
    const dmg = attacker.meleeAttack;
    targetNexus.hp = Math.max(0, targetNexus.hp - dmg);
    render();
    showDamagePopup(row, col, dmg);
    await flashImpact(row, col);
  } else {
    await flashImpact(row, col);
  }

  attacker.hasAttacked = true;
  state.animating = false;
  render();
}

async function resolveCastAttack(attacker, row, col) {
  if (attacker.state !== 'onboard' || attacker.row === null || attacker.hasAttacked) return;
  state.animating = true;
  render();

  const dir = directionBetween(attacker.row, attacker.col, row, col);
  const dist = Math.max(Math.abs(row - attacker.row), Math.abs(col - attacker.col));
  const pathTiles = [];
  for (let i = 1; i <= dist; i++) {
    pathTiles.push({ row: attacker.row + dir.dr * i, col: attacker.col + dir.dc * i });
  }

  await animateProjectile(attacker, pathTiles);
  pathTiles.forEach(t => layTrail(t.row, t.col, attacker.element));

  const targetWizard = wizardAt(row, col);
  const targetNexus = nexusAt(row, col);

  if (targetWizard) {
    const dmg = attacker.castAttack;
    targetWizard.hp -= dmg;
    render();
    showDamagePopup(row, col, dmg);
    await flashImpact(row, col);
    await applyDisplacementAnimated(targetWizard, dir.dr, dir.dc, attacker.castDisplacement);
    killIfDead(targetWizard);
  } else if (targetNexus) {
    const dmg = attacker.castAttack;
    targetNexus.hp = Math.max(0, targetNexus.hp - dmg);
    render();
    showDamagePopup(row, col, dmg);
    await flashImpact(row, col);
  } else {
    await flashImpact(row, col);
  }

  attacker.hasAttacked = true;
  state.animating = false;
  render();
}
