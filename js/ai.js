import { state, NEXUS } from './state.js';
import { wizardAt, nexusAt, manhattan, getMoveTiles, getMeleeTiles, getCastTiles, pathBFS } from './board.js';
import { resolveMeleeAttack, resolveCastAttack } from './combat.js';
import { moveWizardAnimated } from './actions.js';
import { sleep } from './util.js';

// For each enemy wizard: attack if a target (nexus or player wizard) is already in range
// (prefer the nexus when castable, since damaging it progresses the enemy's win condition),
// otherwise move as close as possible toward the nearest threat. Deliberately simple —
// no target prioritization beyond "nearest", no retreating, no planning ahead.
export async function runEnemyTurn() {
  const enemyWizards = Object.values(state.wizards).filter(w => w.team === 'enemy' && w.state === 'onboard');
  for (const wizard of enemyWizards) {
    if (wizard.state !== 'onboard') continue; // may have died mid-turn from another enemy's friendly-fire-free logic; defensive
    await runEnemyWizardTurn(wizard);
    await sleep(300); // brief gap so each wizard's action reads as distinct rather than blurring together
  }
}

async function runEnemyWizardTurn(wizard) {
  // 1. Try to attack first, before moving — prefer whatever is already in range.
  if (!wizard.hasAttacked) {
    const meleeTiles = getMeleeTiles(wizard);
    const castTiles = getCastTiles(wizard);

    const meleeNexusTile = meleeTiles.find(t => nexusAt(t.row, t.col) === NEXUS.mine);
    const castNexusTile = castTiles.find(t => nexusAt(t.row, t.col) === NEXUS.mine);
    const meleePlayerTile = meleeTiles.find(t => { const w2 = wizardAt(t.row, t.col); return w2 && w2.team === 'player'; });
    const castPlayerTile = castTiles.find(t => { const w2 = wizardAt(t.row, t.col); return w2 && w2.team === 'player'; });

    // Prefer hitting the nexus (progresses the win condition), then a player wizard; cast reaches
    // further so a cast opportunity on the nexus beats a melee opportunity on a wizard.
    if (castNexusTile) {
      await resolveCastAttack(wizard, castNexusTile.row, castNexusTile.col);
      return;
    }
    if (meleeNexusTile) {
      await resolveMeleeAttack(wizard, meleeNexusTile.row, meleeNexusTile.col);
      return;
    }
    if (meleePlayerTile) {
      await resolveMeleeAttack(wizard, meleePlayerTile.row, meleePlayerTile.col);
      return;
    }
    if (castPlayerTile) {
      await resolveCastAttack(wizard, castPlayerTile.row, castPlayerTile.col);
      return;
    }
  }

  // 2. Nothing in range (or already attacked) — move toward the nearest threat.
  if (!wizard.hasMoved) {
    const target = nearestThreatTile(wizard);
    if (target) {
      const moveTiles = getMoveTiles(wizard);
      if (moveTiles.length) {
        // pick the reachable tile that minimizes remaining distance to the target
        let best = null;
        let bestDist = Infinity;
        for (const t of moveTiles) {
          const d = manhattan(t.row, t.col, target.row, target.col);
          if (d < bestDist) { bestDist = d; best = t; }
        }
        const currentDist = manhattan(wizard.row, wizard.col, target.row, target.col);
        if (best && bestDist < currentDist) {
          const path = pathBFS(wizard, best.row, best.col);
          if (path) await moveWizardAnimated(wizard, path);
        }
      }
    }
  }
}

// Nearest tile worth marching toward: the closest player wizard, or the player's nexus if none remain.
function nearestThreatTile(fromWizard) {
  const playerWizards = Object.values(state.wizards).filter(w => w.team === 'player' && w.state === 'onboard');
  let nearest = null;
  let nearestDist = Infinity;
  playerWizards.forEach(w => {
    const d = manhattan(fromWizard.row, fromWizard.col, w.row, w.col);
    if (d < nearestDist) { nearestDist = d; nearest = { row: w.row, col: w.col }; }
  });
  const nexusDist = manhattan(fromWizard.row, fromWizard.col, NEXUS.mine.row, NEXUS.mine.col);
  if (nexusDist < nearestDist) {
    nearest = { row: NEXUS.mine.row, col: NEXUS.mine.col };
  }
  return nearest;
}
