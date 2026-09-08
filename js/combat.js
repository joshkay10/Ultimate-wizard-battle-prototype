// Direction unit vector from a straight line between two points (assumes same row or same col)
function directionBetween(fromRow, fromCol, toRow, toCol) {
  return {
    dr: Math.sign(toRow - fromRow),
    dc: Math.sign(toCol - fromCol)
  };
}

// Apply displacement to a target sitting at (row,col), moving along (dr,dc) by `amount` tiles.
// Positive amount = push further along (dr,dc) away from the attacker.
// Negative amount = pull backward along (dr,dc), i.e. toward the attacker.
// Returns { finalRow, finalCol, collided, tilesShort } and applies collision damage itself.
function applyDisplacement(target, dr, dc, amount) {
  if (amount === 0) return { finalRow: target.row, finalCol: target.col, collided: false, tilesShort: 0 };
  const dir = amount > 0 ? 1 : -1;
  const steps = Math.abs(amount);
  let curRow = target.row, curCol = target.col;
  let travelled = 0;
  for (let i = 0; i < steps; i++) {
    const nr = curRow + dr * dir;
    const nc = curCol + dc * dir;
    if (!inBounds(nr, nc)) break;
    if (isBlocked(nr, nc)) break; // something else occupies it (wizard or nexus)
    curRow = nr;
    curCol = nc;
    travelled++;
  }
  const tilesShort = Math.min(3, steps - travelled);
  if (tilesShort > 0) {
    // collision damage: 1 per tile it couldn't travel, capped at 3, to the displaced unit
    target.hp -= tilesShort;
  }
  target.row = curRow;
  target.col = curCol;
  return { finalRow: curRow, finalCol: curCol, collided: tilesShort > 0, tilesShort };
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
    const el = document.querySelector('.tile[data-row="' + tile.row + '"][data-col="' + tile.col + '"]');
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
    // trailing fade handled by CSS transition after class removal
    if (el) {
      setTimeout(() => el.classList.remove('projectile-trail'), 260);
    }
  }
  await sleep(120); // brief pause on impact before damage applies
}

function flashTileElement(row, col, element, duration) {
  return new Promise(resolve => {
    const el = document.querySelector('.tile[data-row="' + row + '"][data-col="' + col + '"]');
    if (el) {
      el.style.setProperty('--trail-color', ELEMENT_COLOR[element]);
      el.classList.add('projectile-trail');
      setTimeout(() => {
        el.classList.remove('projectile-trail');
        resolve();
      }, duration);
    } else {
      resolve();
    }
  });
}

async function resolveMeleeAttack(attacker, row, col) {
  if (attacker.state !== 'onboard' || attacker.row === null || attacker.hasAttacked) return;
  state.animating = true;
  render();

  const targetWizard = wizardAt(row, col);
  const targetNexus = nexusAt(row, col);
  const dir = directionBetween(attacker.row, attacker.col, row, col);

  await flashTileElement(row, col, attacker.element, 220);
  layTrail(row, col, attacker.element);

  if (targetWizard) {
    targetWizard.hp -= attacker.meleeAttack;
    applyDisplacement(targetWizard, dir.dr, dir.dc, attacker.meleeDisplacement);
    killIfDead(targetWizard);
  } else if (targetNexus) {
    targetNexus.hp = Math.max(0, targetNexus.hp - attacker.meleeAttack);
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
  // build the path of tiles the projectile travels over, from attacker (exclusive) to target (inclusive)
  const dist = Math.max(Math.abs(row - attacker.row), Math.abs(col - attacker.col));
  const pathTiles = [];
  for (let i = 1; i <= dist; i++) {
    pathTiles.push({ row: attacker.row + dir.dr * i, col: attacker.col + dir.dc * i });
  }

  await animateProjectile(attacker, pathTiles);

  // leave a trail of the caster's element along the whole line it travelled (ice floor / wind channel / flames)
  pathTiles.forEach(t => layTrail(t.row, t.col, attacker.element));

  const targetWizard = wizardAt(row, col);
  const targetNexus = nexusAt(row, col);

  if (targetWizard) {
    targetWizard.hp -= attacker.castAttack;
    applyDisplacement(targetWizard, dir.dr, dir.dc, attacker.castDisplacement);
    killIfDead(targetWizard);
  } else if (targetNexus) {
    targetNexus.hp = Math.max(0, targetNexus.hp - attacker.castAttack);
  }

  attacker.hasAttacked = true;
  state.animating = false;
  render();
}
