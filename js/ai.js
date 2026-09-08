import { state, NEXUS } from './state.js';
import { wizardAt, nexusAt, manhattan, getMoveTiles, getMeleeTiles, getCastTiles, pathBFS, getEnemySummonTiles } from './board.js';
import { resolveMeleeAttack, resolveCastAttack } from './combat.js';
import { moveWizardAnimated } from './actions.js';
import { sleep, shuffle } from './util.js';
import { render } from './ui.js';

// Enemy follows the same summon rules as the player: pay mana, place in their
// back 3 rows, then existing onboard wizards attack or march.
export async function runEnemyTurn() {
  await enemySummonPhase();

  const enemyWizards = Object.values(state.wizards).filter(w => w.team === 'enemy' && w.state === 'onboard');
  for (const wizard of enemyWizards) {
    if (wizard.state !== 'onboard') continue;
    await runEnemyWizardTurn(wizard);
    await sleep(300);
  }
}

async function enemySummonPhase() {
  while (true) {
    const affordable = Object.values(state.wizards).filter(
      w => w.team === 'enemy' && w.state === 'summoned' && state.enemyMana >= w.cost
    );
    if (!affordable.length) break;

    const tile = pickEnemySummonTile();
    if (!tile) break;

    const wizard = shuffle(affordable)[0];
    state.enemyMana -= wizard.cost;
    wizard.state = 'onboard';
    wizard.row = tile.row;
    wizard.col = tile.col;
    render();
    await sleep(280);
  }
}

function pickEnemySummonTile() {
  const candidates = getEnemySummonTiles();
  if (!candidates.length) return null;

  const allies = Object.values(state.wizards).filter(w => w.team === 'enemy' && w.state === 'onboard');
  if (!allies.length) return candidates[Math.floor(Math.random() * candidates.length)];

  let best = [];
  let bestScore = -Infinity;
  for (const tile of candidates) {
    let nearest = Infinity;
    allies.forEach(w => {
      const d = manhattan(tile.row, tile.col, w.row, w.col);
      if (d < nearest) nearest = d;
    });
    if (nearest > bestScore) {
      bestScore = nearest;
      best = [tile];
    } else if (nearest === bestScore) {
      best.push(tile);
    }
  }
  return best[Math.floor(Math.random() * best.length)];
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
