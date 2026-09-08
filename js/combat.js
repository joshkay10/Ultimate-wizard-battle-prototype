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

function tileEl(row, col) {
  return document.querySelector('.tile[data-row="' + row + '"][data-col="' + col + '"]');
}

function showDamagePopup(row, col, amount) {
  if (!amount) return;
  const el = tileEl(row, col);
  if (!el) return;
  const pop = document.createElement('div');
  pop.className = 'damage-popup';
  pop.textContent = '-' + amount;
  el.appendChild(pop);
}

async function flashImpact(row, col) {
  const el = tileEl(row, col);
  if (!el) {
    await sleep(160);
    return;
  }
  el.classList.add('impact-flash');
  const token = el.querySelector('.wizard-token, .nexus-token');
  if (token) token.classList.add('impact-flash');
  await sleep(180);
  el.classList.remove('impact-flash');
  if (token) token.classList.remove('impact-flash');
}

async function applyDisplacementAnimated(target, dr, dc, amount) {
  const { path, tilesShort } = getDisplacementPath(target, dr, dc, amount);
  for (const step of path) {
    target.row = step.row;
    target.col = step.col;
    render();
    await sleep(70);
  }
  if (tilesShort > 0) {
    target.hp -= tilesShort;
    render();
    showDamagePopup(target.row, target.col, tilesShort);
    await flashImpact(target.row, target.col);
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

// Animate a projectile travelling tile-by-tile; each tile flashes the element color then fades (trailing effect)
async function animateProjectile(attacker, pathTiles) {
  for (let i = 0; i < pathTiles.length; i++) {
    const tile = pathTiles[i];
    const el = tileEl(tile.row, tile.col);
    if (el) {
      const dot = document.createElement('div');
      dot.className = 'projectile-dot';
      dot.style.color = ELEMENT_COLOR[attacker.element];
      dot.innerHTML = ICONS[attacker.element];
      el.appendChild(dot);
      el.classList.add('projectile-trail');
      el.style.setProperty('--trail-color', ELEMENT_COLOR[attacker.element]);
    }
    await sleep(70);
    if (el) {
      const dot = el.querySelector('.projectile-dot');
      if (dot) dot.remove();
    }
    if (el) {
      setTimeout(() => el.classList.remove('projectile-trail'), 260);
    }
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
