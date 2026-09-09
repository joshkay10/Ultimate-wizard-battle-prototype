function runEnemyTurn() {
  return runTeamAi('enemy');
}

async function runTeamAi(team) {
  await teamSummonPhase(team);

  const wizards = Object.values(state.wizards)
    .filter(w => w.team === team && w.state === 'onboard')
    .sort((a, b) => compareWizardActOrder(a, b, team));
  for (const wizard of wizards) {
    if (wizard.state !== 'onboard') continue;
    await present(teamWizardAct(wizard, team));
    await maybeWait(280);
  }
}

function compareWizardActOrder(a, b, team) {
  const sa = wizardActPriority(a, team);
  const sb = wizardActPriority(b, team);
  if (sb !== sa) return sb - sa;
  return a.id < b.id ? -1 : 1;
}

function wizardActPriority(wizard, team) {
  let best = 0;
  if (canAttack(wizard)) {
    const atk = pickAttack(wizard, team);
    if (atk) best = Math.max(best, atk.score);
  }
  if (canMove(wizard)) {
    const target = nearestThreatTile(wizard, team);
    if (target) {
      const d = manhattan(wizard.row, wizard.col, target.row, target.col);
      best = Math.max(best, 40 - d);
    }
  }
  return best;
}

async function teamSummonPhase(team) {
  while (true) {
    const affordable = Object.values(state.wizards).filter(
      w => w.team === team && w.state === 'summoned' && teamMana(team) >= w.cost
    );
    if (!affordable.length) break;

    const tile = pickSummonTile(team);
    if (!tile) break;

    const wizard = pickSummonWizard(affordable, tile, team);
    await present(simSummon(wizard, tile.row, tile.col, team));
    await maybeWait(240);
  }
}

function pickSummonWizard(affordable, tile, team) {
  const threatened = mostThreatenedNexus(team);
  const front = team === 'player' ? tile.row === SUMMON_ROW_START : tile.row === ENEMY_ROW_END - 1;
  if (threatened && manhattan(tile.row, tile.col, threatened.row, threatened.col) <= 2) {
    const tank = affordable.find(w => w.element === 'earth')
      || affordable.find(w => w.element === 'ice')
      || affordable[0];
    return tank;
  }
  if (front) {
    return affordable.find(w => w.element === 'wind')
      || affordable.find(w => w.element === 'lightning')
      || affordable.find(w => w.element === 'fire')
      || affordable[0];
  }
  return shuffle(affordable)[0];
}

function pickSummonTile(team) {
  const candidates = getTeamSummonTiles(team);
  if (!candidates.length) return null;

  const threatened = mostThreatenedNexus(team);
  const foeNexus = nearestLivingNexusFrom(team === 'player' ? SUMMON_ROW_START : 1, CENTER, opposingTeam(team));
  let best = [];
  let bestScore = -Infinity;
  for (const tile of candidates) {
    let score = 0;
    if (threatened) {
      const d = manhattan(tile.row, tile.col, threatened.row, threatened.col);
      score += Math.max(0, 8 - d) * 4;
    }
    if (foeNexus) {
      score += Math.max(0, 12 - manhattan(tile.row, tile.col, foeNexus.row, foeNexus.col));
    }
    const front = team === 'player' ? (BOARD_SIZE - 1 - tile.row) : tile.row;
    score += front;
    if (score > bestScore) {
      bestScore = score;
      best = [tile];
    } else if (score === bestScore) {
      best.push(tile);
    }
  }
  return best[randInt(best.length)];
}

function teamWizardAct(wizard, team) {
  if (canAttack(wizard)) {
    const atk = pickAttack(wizard, team);
    if (atk && atk.score >= 180) return simAttack(wizard, atk.row, atk.col, atk.kind);
  }

  if (canMove(wizard)) {
    const dest = pickMoveTile(wizard, team);
    if (dest) {
      const path = pathBFS(wizard, dest.row, dest.col);
      if (path && path.length) {
        const events = simMove(wizard, path);
        if (canAttack(wizard)) {
          const atk = pickAttack(wizard, team);
          if (atk && atk.score >= 80) return events.concat(simAttack(wizard, atk.row, atk.col, atk.kind));
        }
        return events;
      }
    }
  }

  if (canAttack(wizard)) {
    const atk = pickAttack(wizard, team);
    if (atk) return simAttack(wizard, atk.row, atk.col, atk.kind);
  }
  return [];
}

function pickAttack(wizard, team) {
  let best = null;
  let bestScore = 0;
  function consider(kind, tiles) {
    tiles.forEach(t => {
      const score = attackScore(wizard, t, kind, team);
      if (score > bestScore) {
        bestScore = score;
        best = { row: t.row, col: t.col, kind: kind, score: score };
      }
    });
  }
  consider('melee', getMeleeTiles(wizard));
  consider('cast', getCastTiles(wizard));
  return best;
}

function attackScore(wizard, tile, kind, team) {
  if (kind === 'cast' && wizard.castKind === 'pulse') return pulseScore(wizard, team);
  if (kind === 'cast' && wizard.castKind === 'raise') return raiseScore(tile, team);
  if (kind === 'cast' && wizard.castKind === 'swap') return swapScore(wizard, tile, team);

  const dmg = kind === 'cast' ? wizard.castAttack : wizard.meleeAttack;
  const n = nexusAt(tile.row, tile.col);
  if (n && n.team === opposingTeam(team) && n.hp > 0) {
    const lethal = dmg >= n.hp ? 400 : 0;
    return 220 + lethal + (n.maxHp - n.hp) * 8 + dmg + (kind === 'melee' ? 2 : 0);
  }
  const w2 = wizardAt(tile.row, tile.col);
  if (w2 && w2.team === opposingTeam(team)) {
    const lethal = dmg >= w2.hp ? 180 : 0;
    let score = 90 + lethal + dmg + (kind === 'melee' ? 3 : 0);
    if (kind === 'cast' && wizard.castKind === 'bolt') score += 35;
    if (kind === 'cast' && wizard.castKind === 'gust') score += wizard.castDisplacement * 4;
    return score;
  }
  return 0;
}

function pulseScore(wizard, team) {
  let score = 0;
  getPulseTiles(wizard).forEach(function (t) {
    const dmg = wizard.castAttack;
    const n = nexusAt(t.row, t.col);
    if (n && n.hp > 0) {
      if (n.team === opposingTeam(team)) {
        const lethal = dmg >= n.hp ? 400 : 0;
        score += 220 + lethal + (n.maxHp - n.hp) * 8 + dmg;
      } else {
        score -= 120;
      }
    }
    const w2 = wizardAt(t.row, t.col);
    if (w2) {
      if (w2.team === opposingTeam(team)) {
        const lethal = dmg >= w2.hp ? 180 : 0;
        score += 90 + lethal + dmg;
      } else {
        score -= 55;
      }
    }
  });
  return Math.max(0, score);
}

function raiseScore(tile, team) {
  let score = 0;
  Object.values(state.wizards).forEach(function (w) {
    if (w.state !== 'onboard' || w.team === team) return;
    const d = manhattan(tile.row, tile.col, w.row, w.col);
    if (d === 1) score += 48;
    else if (d === 2) score += 12;
  });
  livingNexuses(team).forEach(function (n) {
    if (manhattan(tile.row, tile.col, n.row, n.col) === 1) score += 22;
  });
  return score;
}

function swapScore(wizard, tile, team) {
  const other = wizardAt(tile.row, tile.col);
  if (other) {
    if (other.team === team) return 0;
    let score = 20;
    const foeN = nearestLivingNexusFrom(other.row, other.col, opposingTeam(team));
    if (foeN) {
      const before = manhattan(wizard.row, wizard.col, foeN.row, foeN.col);
      const after = manhattan(other.row, other.col, foeN.row, foeN.col);
      score += (before - after) * 18;
      if (after <= 1) score += 140;
    }
    const ownN = nearestLivingNexusFrom(wizard.row, wizard.col, team);
    if (ownN) {
      const theyBefore = manhattan(other.row, other.col, ownN.row, ownN.col);
      const theyAfter = manhattan(wizard.row, wizard.col, ownN.row, ownN.col);
      if (theyAfter < theyBefore) score -= 70;
      else score += 16;
      if (theyBefore <= 2 && theyAfter > theyBefore) score += 80;
    }
    return Math.max(0, score);
  }

  const foeN = nearestLivingNexusFrom(tile.row, tile.col, opposingTeam(team));
  if (!foeN) return 0;
  const before = manhattan(wizard.row, wizard.col, foeN.row, foeN.col);
  const after = manhattan(tile.row, tile.col, foeN.row, foeN.col);
  if (after >= before) return 0;
  let score = 24 + (before - after) * 14;
  if (after <= 1) score += 140;
  return score;
}

function pickMoveTile(wizard, team) {
  const moveTiles = getMoveTiles(wizard);
  if (!moveTiles.length) return null;
  const target = nearestThreatTile(wizard, team);
  let best = null;
  let bestScore = -Infinity;
  const currentThreat = tileThreatScore(wizard, { row: wizard.row, col: wizard.col }, team, target);
  moveTiles.forEach(t => {
    const score = tileThreatScore(wizard, t, team, target);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  });
  if (!best || bestScore <= currentThreat) return null;
  return best;
}

function tileThreatScore(wizard, tile, team, target) {
  const saved = { row: wizard.row, col: wizard.col };
  wizard.row = tile.row;
  wizard.col = tile.col;
  const atk = pickAttack(wizard, team);
  wizard.row = saved.row;
  wizard.col = saved.col;
  let score = atk ? atk.score : 0;
  if (target) {
    score += Math.max(0, 16 - manhattan(tile.row, tile.col, target.row, target.col));
  }
  const p = portalAt(tile.row, tile.col);
  if (p && p.team !== team) score += 80;
  if (p && p.team === team) score -= 120;
  const trail = trailAt(tile.row, tile.col);
  if (trail && trail.element === 'fire') score -= 30;
  if (trail && trail.element === 'wind') score += 6;
  return score;
}

function mostThreatenedNexus(team) {
  const own = livingNexuses(team);
  if (!own.length) return null;
  const foes = Object.values(state.wizards).filter(w => w.team === opposingTeam(team) && w.state === 'onboard');
  if (!foes.length) return own[0];
  let best = own[0];
  let bestScore = -Infinity;
  own.forEach(n => {
    let nearest = Infinity;
    foes.forEach(w => {
      const d = manhattan(n.row, n.col, w.row, w.col);
      if (d < nearest) nearest = d;
    });
    const score = (20 - nearest) * 10 + (n.maxHp - n.hp) * 6;
    if (score > bestScore) {
      bestScore = score;
      best = n;
    }
  });
  return best;
}

function nearestLivingNexusFrom(row, col, team) {
  const living = livingNexuses(team);
  if (!living.length) return null;
  let best = living[0];
  let bestD = manhattan(row, col, best.row, best.col);
  for (let i = 1; i < living.length; i++) {
    const d = manhattan(row, col, living[i].row, living[i].col);
    if (d < bestD) {
      bestD = d;
      best = living[i];
    }
  }
  return best;
}

function nearestThreatTile(fromWizard, team) {
  const defender = mostThreatenedNexus(team);
  const foes = Object.values(state.wizards).filter(w => w.team === opposingTeam(team) && w.state === 'onboard');
  if (defender) {
    let raider = null;
    let raidD = 3;
    foes.forEach(w => {
      const d = manhattan(w.row, w.col, defender.row, defender.col);
      if (d <= raidD) {
        raidD = d;
        raider = w;
      }
    });
    if (raider) return { row: raider.row, col: raider.col };
  }

  let bestPortal = null;
  let bestPD = Infinity;
  Object.keys(state.portals || {}).forEach(function (k) {
    const p = state.portals[k];
    if (!p || p.team === team) return;
    const d = manhattan(fromWizard.row, fromWizard.col, p.row, p.col);
    if (d < bestPD) {
      bestPD = d;
      bestPortal = p;
    }
  });
  if (bestPortal && bestPD <= fromWizard.moveRange + 1) {
    return { row: bestPortal.row, col: bestPortal.col };
  }

  const damaged = livingNexuses(opposingTeam(team)).slice().sort((a, b) => {
    if (a.hp !== b.hp) return a.hp - b.hp;
    const da = manhattan(fromWizard.row, fromWizard.col, a.row, a.col);
    const db = manhattan(fromWizard.row, fromWizard.col, b.row, b.col);
    return da - db;
  });
  if (damaged.length) return { row: damaged[0].row, col: damaged[0].col };

  let nearest = null;
  let nearestDist = Infinity;
  foes.forEach(w => {
    const d = manhattan(fromWizard.row, fromWizard.col, w.row, w.col);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = { row: w.row, col: w.col };
    }
  });
  return nearest;
}
