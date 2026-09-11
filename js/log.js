function actorName(id) {
  const w = id ? state.wizards[id] : null;
  if (!w) return 'a wizard';
  return w.team === 'enemy' ? 'enemy ' + w.name : w.name;
}

function compassWord(fromRow, fromCol, toRow, toCol) {
  const dr = Math.sign(toRow - fromRow);
  const dc = Math.sign(toCol - fromCol);
  if (dr < 0 && dc === 0) return 'north';
  if (dr > 0 && dc === 0) return 'south';
  if (dr === 0 && dc < 0) return 'west';
  if (dr === 0 && dc > 0) return 'east';
  if (dr < 0 && dc < 0) return 'northwest';
  if (dr < 0 && dc > 0) return 'northeast';
  if (dr > 0 && dc < 0) return 'southwest';
  if (dr > 0 && dc > 0) return 'southeast';
  return '';
}

function nexusOwnerWord(ev) {
  const n = ev.targetId
    ? state.nexuses.player.concat(state.nexuses.enemy).find(x => x.id === ev.targetId)
    : nexusAt(state, ev.row, ev.col);
  if (!n) return 'a nexus';
  return n.team === 'enemy' ? 'an enemy nexus' : 'your nexus';
}

function describeEvent(ev) {
  if (!ev || !ev.type) return '';
  if (ev.type === 'trail' || ev.type === 'turnEnd' || ev.type === 'turnStart' || ev.type === 'ground' || ev.type === 'push' || ev.type === 'damage') {
    return '';
  }

  if (ev.type === 'emergeMark') return actorName(ev.wizardId) + ' will arrive next';
  if (ev.type === 'portal') return actorName(ev.wizardId) + ' opens a portal — arrives next turn';
  if (ev.type === 'summon') return actorName(ev.wizardId) + ' arrives';
  if (ev.type === 'portalBlocked') {
    return actorName(ev.wizardId) + ' and ' + actorName(ev.blockerId) + ' die in the portal';
  }

  if (ev.type === 'move') {
    const last = ev.path && ev.path.length ? ev.path[ev.path.length - 1] : null;
    const dir = last && ev.from ? compassWord(ev.from.row, ev.from.col, last.row, last.col) : '';
    return actorName(ev.wizardId) + ' moves' + (dir ? ' ' + dir : '');
  }

  if (ev.type === 'undoMove') {
    const dir = ev.from && ev.to ? compassWord(ev.from.row, ev.from.col, ev.to.row, ev.to.col) : '';
    return actorName(ev.wizardId) + ' undoes the move' + (dir ? ' ' + dir : '');
  }

  if (ev.type === 'attack') {
    if (ev.castKind === 'swap' || ev.castKind === 'raise' || ev.castKind === 'blink') return '';
    const who = actorName(ev.attackerId);
    const dir = ev.from ? compassWord(ev.from.row, ev.from.col, ev.row, ev.col) : '';
    const toward = dir ? ' ' + dir : '';
    if (ev.kind === 'melee') {
      if (ev.hit === 'nexus') return who + ' punches ' + nexusOwnerWord(ev);
      return who + ' punches' + toward;
    }
    if (ev.hit === 'fizzle') return '';
    const spell = ev.spellId || ev.castKind || 'cast';
    if (spell === 'pulse') return who + ' pulses';
    if (spell === 'burst' || ev.castKind === 'summonBurst') return who + ' bursts';
    if (spell === 'bolt') {
      if (ev.hit === 'nexus') return who + ' bolts ' + nexusOwnerWord(ev);
      return who + ' bolts' + toward;
    }
    if (spell === 'gust') return who + ' gusts' + toward;
    if (spell === 'tug' || ev.castKind === 'pull') return who + ' tugs' + toward;
    if (spell === 'lock') return who + ' locks' + toward;
    if (spell === 'brand') return who + ' brands' + toward;
    if (spell === 'stream') return who + ' streams' + toward;
    const named = (ev.spellName || spell).toLowerCase();
    return who + ' casts ' + named + toward;
  }

  if (ev.type === 'swap') {
    if (ev.bId) return actorName(ev.aId) + ' swaps with ' + actorName(ev.bId);
    const dir = ev.fromA && ev.toA ? compassWord(ev.fromA.row, ev.fromA.col, ev.toA.row, ev.toA.col) : '';
    return actorName(ev.aId) + ' blinks' + (dir ? ' ' + dir : '');
  }
  if (ev.type === 'raise') return actorName(ev.attackerId) + ' raises a mountain';
  if (ev.type === 'silence') return actorName(ev.targetId) + ' is silenced';
  if (ev.type === 'root') {
    return actorName(ev.targetId) + (ev.skip ? ' is locked and skips the strike' : ' is locked');
  }
  if (ev.type === 'burn') return actorName(ev.targetId) + ' is branded';
  if (ev.type === 'fizzle') return actorName(ev.attackerId) + "'s bolt grounds";
  if (ev.type === 'jump') return actorName(ev.attackerId) + "'s bolt jumps the water";
  if (ev.type === 'void') return 'a nexus becomes a void';
  if (ev.type === 'death') {
    if (ev.cause === 'water') return actorName(ev.wizardId) + ' falls in the water';
    if (ev.cause === 'void') return actorName(ev.wizardId) + ' falls into a void';
    return actorName(ev.wizardId) + ' dies';
  }
  if (ev.type === 'gameOver') {
    if (ev.result === 'draw') return 'draw';
    if (ev.result === 'player') return 'you win';
    if (ev.result === 'enemy') return 'you lose';
  }
  return '';
}

function recentLogLines(limit) {
  limit = limit || 5;
  const lines = [];
  const seen = {};
  for (let i = state.log.length - 1; i >= 0 && lines.length < limit; i--) {
    const line = describeEvent(state.log[i]);
    if (!line || seen[line]) continue;
    seen[line] = true;
    lines.push(line);
  }
  return lines.reverse();
}
