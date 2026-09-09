function runEnemyTurn() {
  return runTeamAi('enemy');
}

async function runTeamAi(team) {
  await teamSummonPhase(team);

  const wizards = Object.values(state.wizards).filter(w => w.team === team && w.state === 'onboard');
  for (const wizard of wizards) {
    if (wizard.state !== 'onboard') continue;
    await present(teamWizardAct(wizard, team));
    await maybeWait(280);
  }
}

async function teamSummonPhase(team) {
  while (true) {
    const affordable = Object.values(state.wizards).filter(
      w => w.team === team && w.state === 'summoned' && teamMana(team) >= w.cost
    );
    if (!affordable.length) break;

    const tile = pickSummonTile(team);
    if (!tile) break;

    const wizard = shuffle(affordable)[0];
    await present(simSummon(wizard, tile.row, tile.col, team));
    await maybeWait(240);
  }
}

function pickSummonTile(team) {
  const candidates = getTeamSummonTiles(team);
  if (!candidates.length) return null;

  const allies = Object.values(state.wizards).filter(w => w.team === team && w.state === 'onboard');
  if (!allies.length) return candidates[randInt(candidates.length)];

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
  return best[randInt(best.length)];
}

function teamWizardAct(wizard, team) {
  const events = [];
  if (canAttack(wizard)) {
    const meleeTiles = getMeleeTiles(wizard);
    const castTiles = getCastTiles(wizard);
    const meleeNexusTile = meleeTiles.find(t => isFoeNexusAt(t.row, t.col, team));
    const castNexusTile = castTiles.find(t => isFoeNexusAt(t.row, t.col, team));
    const foeTeam = opposingTeam(team);

    const meleeFoeTile = meleeTiles.find(t => {
      const w2 = wizardAt(t.row, t.col);
      return w2 && w2.team === foeTeam;
    });
    const castFoeTile = castTiles.find(t => {
      const w2 = wizardAt(t.row, t.col);
      return w2 && w2.team === foeTeam;
    });

    if (castNexusTile) return simAttack(wizard, castNexusTile.row, castNexusTile.col, 'cast');
    if (meleeNexusTile) return simAttack(wizard, meleeNexusTile.row, meleeNexusTile.col, 'melee');
    if (meleeFoeTile) return simAttack(wizard, meleeFoeTile.row, meleeFoeTile.col, 'melee');
    if (castFoeTile) return simAttack(wizard, castFoeTile.row, castFoeTile.col, 'cast');
  }

  if (canMove(wizard)) {
    const target = nearestThreatTile(wizard, team);
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
          if (path) return simMove(wizard, path);
        }
      }
    }
  }
  return events;
}

function nearestThreatTile(fromWizard, team) {
  const foeTeam = opposingTeam(team);
  const foes = Object.values(state.wizards).filter(w => w.team === foeTeam && w.state === 'onboard');
  let nearest = null;
  let nearestDist = Infinity;
  foes.forEach(w => {
    const d = manhattan(fromWizard.row, fromWizard.col, w.row, w.col);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = { row: w.row, col: w.col };
    }
  });
  const nexus = nearestFoeNexus(fromWizard, team);
  const nexusDist = manhattan(fromWizard.row, fromWizard.col, nexus.row, nexus.col);
  if (nexusDist < nearestDist) {
    nearest = { row: nexus.row, col: nexus.col };
  }
  return nearest;
}
