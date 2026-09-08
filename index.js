(function () {

  // ---------- Icons (outline, inherit currentColor) ----------
  const ICONS = {
    fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.5-2-1-2.5.8 2 .5 4-1 5.2A5 5 0 0 1 7 7c0-2.5 1.8-4 2.5-5C10 3.5 11 3 12 2z"/><path d="M8.5 13.5A4.5 4.5 0 0 0 13 18a4 4 0 0 0 4-4c0-1.2-.5-2-1-2.6"/></svg>',
    ice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M5 6l14 12"/><path d="M19 6L5 18"/><path d="M9 3l3 3 3-3"/><path d="M9 21l3-3 3 3"/><path d="M3 9l3 3-3 3"/><path d="M21 9l-3 3 3 3"/></svg>',
    wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h9a3 3 0 1 0-3-3"/><path d="M3 16h13a3 3 0 1 1-3 3"/><path d="M3 12h16a3 3 0 1 0-3-3"/></svg>',
    move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><path d="M2 12h20"/><path d="M12 2v20"/></svg>',
    melee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>',
    cast: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v3"/><path d="M12 19v3"/><path d="M4.2 4.2l2.1 2.1"/><path d="M17.7 17.7l2.1 2.1"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="M4.2 19.8l2.1-2.1"/><path d="M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
    mana: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c3 4 6 7.5 6 11.5A6 6 0 0 1 6 13.5C6 9.5 9 6 12 2z"/></svg>'
  };

  const ELEMENT_COLOR = {
    fire: 'var(--fire)',
    ice: 'var(--ice)',
    wind: 'var(--wind)'
  };

  const WIZARD_TYPES = [
    { id: 'fire', name: 'Ember', element: 'fire', moveRange: 3, hp: 10, cost: 3, meleeAttack: 5, meleeDisplacement: 2, castAttack: 3, castDisplacement: 1 },
    { id: 'ice', name: 'Rime', element: 'ice', moveRange: 2, hp: 12, cost: 2, meleeAttack: 4, meleeDisplacement: 2, castAttack: 2, castDisplacement: 1 },
    { id: 'wind', name: 'Gale', element: 'wind', moveRange: 4, hp: 8, cost: 2, meleeAttack: 3, meleeDisplacement: 2, castAttack: 2, castDisplacement: 1 }
  ];

  const BOARD_SIZE = 9;
  const CENTER = 4; // 0-indexed center of 9x9

  // ---------- State ----------
  // wizards keyed by id: { id, name, element, hp, maxHp, moveRange, state: 'summoned'|'onboard'|'moving', row, col }
  let wizards = {};
  let nextId = 1;
  let selectedWizardId = null;
  let selectedAction = 'move'; // 'move' | 'melee' | 'cast'
  let animating = false;
  let turnCount = 1;

  // Turn ownership: whose turn it is. Increments turnCount once a full round (player+enemy) completes.
  let currentTurn = 'player'; // 'player' | 'enemy'
  let firstPlayerTurnDone = false;
  let firstEnemyTurnDone = false;

  // Game over state: once set, all actions are locked and a result banner shows.
  // null while the game is ongoing; otherwise 'player' | 'enemy' | 'draw' indicating who WON (or draw).
  let gameOverResult = null;

  // wizard currently picked from the roster, awaiting a tile tap to place
  let placingWizardId = null;

  // Elemental trails left behind by attacks: keyed by "row,col" -> { element, turnsLeft }
  // turnsLeft counts down at endTurn; a trail is removed once it hits 0 (visible for one full turn).
  let trails = {};
  function layTrail(row, col, element) {
    trails[row + ',' + col] = { element, turnsLeft: 1 };
  }
  function trailAt(row, col) {
    return trails[row + ',' + col] || null;
  }
  function tickTrails() {
    Object.keys(trails).forEach(key => {
      trails[key].turnsLeft -= 1;
      if (trails[key].turnsLeft <= 0) delete trails[key];
    });
  }

  // Mana: starts at 0, max mana +1 each turn (capped 10), refilled to max on turn start
  let mana = 0;
  let maxMana = 0;
  const MANA_CAP = 10;

  // Nexuses: fixed objects, block movement and summoning, cannot be selected
  // Row labels A..I map to 0-indexed rows 0..8; column 5 -> 0-indexed col 4
  const NEXUS = {
    mine: { row: BOARD_SIZE - 1, col: CENTER, hp: 20, maxHp: 20 },   // row I, col 5
    enemy: { row: 0, col: CENTER, hp: 20, maxHp: 20 }                // row A, col 5
  };
  function nexusAt(row, col) {
    if (NEXUS.mine.row === row && NEXUS.mine.col === col) return NEXUS.mine;
    if (NEXUS.enemy.row === row && NEXUS.enemy.col === col) return NEXUS.enemy;
    return null;
  }
  // A tile is blocked (can't summon onto it, can't move through/onto it) if it holds a wizard or a nexus
  function isBlocked(row, col) {
    return !!wizardAt(row, col) || !!nexusAt(row, col);
  }

  // player summon zone = bottom 3 rows of the board
  const SUMMON_ROW_START = BOARD_SIZE - 3;
  function isSummonTile(row, col) {
    return row >= SUMMON_ROW_START && row < BOARD_SIZE;
  }

  function createWizard(typeId, team) {
    const type = WIZARD_TYPES.find(t => t.id === typeId);
    const id = 'w' + (nextId++);
    wizards[id] = {
      id,
      name: type.name,
      element: type.element,
      moveRange: type.moveRange,
      hp: type.hp,
      maxHp: type.hp,
      cost: type.cost,
      meleeAttack: type.meleeAttack,
      meleeDisplacement: type.meleeDisplacement,
      castAttack: type.castAttack,
      castDisplacement: type.castDisplacement,
      team: team || 'player',
      state: 'summoned', // not on board
      row: null,
      col: null,
      hasMoved: false,
      hasAttacked: false
    };
    return id;
  }

  // seed roster: one of each element available to summon, but allow multiple summons of same type up to 2 each for team feel
  const ROSTER = [
    { typeId: 'fire' }, { typeId: 'ice' }, { typeId: 'wind' },
    { typeId: 'fire' }, { typeId: 'ice' }, { typeId: 'wind' }
  ];
  ROSTER.forEach(r => createWizard(r.typeId, 'player'));

  // Place 3 random enemy wizards directly on the board, spread across the enemy zone (top 3 rows)
  const ENEMY_ROW_END = 3; // rows 0,1,2 = enemy zone (mirrors player's bottom-3-rows zone)

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  (function spawnRandomEnemies() {
    const occupied = new Set();
    const elementPool = shuffle(['fire', 'ice', 'wind']);

    // Split the 9 columns into 3 bands so each of the 3 enemies lands in a different third
    // of the row, then pick a random free row+column within that band — avoids the visual
    // clustering that pure uniform-random-across-all-tiles can produce.
    const bandWidth = Math.ceil(BOARD_SIZE / 3);
    const bands = shuffle([0, 1, 2]);

    for (let i = 0; i < 3; i++) {
      const typeId = elementPool[i];
      const bandIndex = bands[i];
      const colStart = bandIndex * bandWidth;
      const colEnd = Math.min(BOARD_SIZE, colStart + bandWidth);

      const candidates = [];
      for (let r = 0; r < ENEMY_ROW_END; r++) {
        for (let c = colStart; c < colEnd; c++) {
          const key = r + ',' + c;
          if (!occupied.has(key) && !nexusAt(r, c)) candidates.push({ row: r, col: c });
        }
      }
      if (!candidates.length) continue; // band full/blocked, skip rather than crash

      const tile = candidates[Math.floor(Math.random() * candidates.length)];
      const id = createWizard(typeId, 'enemy');
      const w = wizards[id];
      w.state = 'onboard';
      w.row = tile.row;
      w.col = tile.col;
      occupied.add(tile.row + ',' + tile.col);
    }
  })();

  // Turn 1 starts with 1 mana per the ruleset (mana progression normally happens on endTurn)
  maxMana = 1;
  mana = 1;

  // ---------- Helpers ----------
  function wizardAt(row, col) {
    return Object.values(wizards).find(w => w.state === 'onboard' && w.row === row && w.col === col);
  }

  function inBounds(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
  }

  function manhattan(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  }

  // BFS move range respecting obstacles (other wizards block passage)
  function getMoveTiles(wizard) {
    const result = [];
    const visited = new Set([wizard.row + ',' + wizard.col]);
    let frontier = [{ row: wizard.row, col: wizard.col, dist: 0 }];
    while (frontier.length) {
      const next = [];
      for (const cell of frontier) {
        if (cell.dist >= wizard.moveRange) continue;
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dr, dc] of dirs) {
          const nr = cell.row + dr, nc = cell.col + dc;
          if (!inBounds(nr, nc)) continue;
          const key = nr + ',' + nc;
          if (visited.has(key)) continue;
          if (isBlocked(nr, nc)) continue; // blocked by wizard or nexus
          visited.add(key);
          result.push({ row: nr, col: nc });
          next.push({ row: nr, col: nc, dist: cell.dist + 1 });
        }
      }
      frontier = next;
    }
    return result;
  }

  function getMeleeTiles(wizard) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    const result = [];
    for (const [dr, dc] of dirs) {
      const nr = wizard.row + dr, nc = wizard.col + dc;
      if (inBounds(nr, nc)) result.push({ row: nr, col: nc });
    }
    return result;
  }

  // Cast: line in each of 4 cardinal directions out to range 4 (stops at first blocker, inclusive of blocker tile as far as it can reach)
  function getCastTiles(wizard) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    const result = [];
    for (const [dr, dc] of dirs) {
      for (let dist = 1; dist <= 4; dist++) {
        const nr = wizard.row + dr * dist, nc = wizard.col + dc * dist;
        if (!inBounds(nr, nc)) break;
        result.push({ row: nr, col: nc });
        if (isBlocked(nr, nc)) break; // line stops at first occupied tile (wizard or nexus)
      }
    }
    return result;
  }

  function pathBFS(wizard, targetRow, targetCol) {
    // returns array of {row, col} steps from current to target (exclusive of start)
    const start = { row: wizard.row, col: wizard.col };
    const visited = new Set([start.row + ',' + start.col]);
    const prev = {};
    let frontier = [start];
    let found = false;
    let steps = 0;
    while (frontier.length && steps <= wizard.moveRange && !found) {
      const next = [];
      for (const cell of frontier) {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dr, dc] of dirs) {
          const nr = cell.row + dr, nc = cell.col + dc;
          if (!inBounds(nr, nc)) continue;
          const key = nr + ',' + nc;
          if (visited.has(key)) continue;
          if (isBlocked(nr, nc)) continue;
          visited.add(key);
          prev[key] = cell;
          next.push({ row: nr, col: nc });
          if (nr === targetRow && nc === targetCol) { found = true; break; }
        }
        if (found) break;
      }
      frontier = next;
      steps++;
    }
    if (!found) return null;
    // reconstruct
    const path = [];
    let cur = { row: targetRow, col: targetCol };
    while (!(cur.row === start.row && cur.col === start.col)) {
      path.unshift(cur);
      cur = prev[cur.row + ',' + cur.col];
    }
    return path;
  }

  // ---------- Actions ----------
  // Player-initiated actions are only valid when the game is ongoing and it's the player's turn.
  function canAct() {
    return !gameOverResult && currentTurn === 'player';
  }

  function pickWizardToSummon(id) {
    if (animating || !canAct()) return;
    const wizard = wizards[id];
    if (!wizard || wizard.state !== 'summoned') return;
    if (mana < wizard.cost) return; // can't afford — ignore the tap
    selectedWizardId = null; // picking a summon clears any board selection
    placingWizardId = (placingWizardId === id) ? null : id;
    render();
  }

  function placeWizard(row, col) {
    if (!canAct()) return;
    if (!placingWizardId) return;
    if (!isSummonTile(row, col)) return;
    if (isBlocked(row, col)) return; // occupied by a wizard or the nexus
    const wizard = wizards[placingWizardId];
    if (!wizard || wizard.state !== 'summoned') return;
    if (mana < wizard.cost) { placingWizardId = null; render(); return; } // safety net, shouldn't happen
    mana -= wizard.cost;
    wizard.state = 'onboard';
    wizard.row = row;
    wizard.col = col;
    placingWizardId = null;
    render();
  }

  function selectWizard(id) {
    if (animating || !canAct()) return;
    const wizard = wizards[id];
    if (!wizard || wizard.state !== 'onboard' || wizard.team !== 'player') return;
    if (selectedWizardId === id) {
      selectedWizardId = null;
    } else {
      selectedWizardId = id;
      selectedAction = 'move';
    }
    render();
  }

  function deselect() {
    selectedWizardId = null;
    placingWizardId = null;
    render();
  }

  function setAction(action) {
    if (!selectedWizardId || animating || !canAct()) return;
    selectedAction = action;
    render();
  }

  async function moveWizardAnimated(wizard, path) {
    animating = true;
    for (const step of path) {
      render(); // ensure current position rendered
      const tokenEl = document.querySelector('.wizard-token[data-id="' + wizard.id + '"]');
      if (tokenEl) {
        tokenEl.classList.add('lifted');
        await sleep(100);
      }
      wizard.row = step.row;
      wizard.col = step.col;
      render();
      const movedEl = document.querySelector('.wizard-token[data-id="' + wizard.id + '"]');
      if (movedEl) {
        movedEl.classList.add('lifted');
        await sleep(10);
        movedEl.classList.remove('lifted');
      }
      await sleep(90);
    }
    wizard.hasMoved = true;
    animating = false;
    render();
  }

  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

  function handleTileClick(row, col) {
    if (animating || !canAct()) return;

    if (placingWizardId) {
      placeWizard(row, col);
      return;
    }

    if (!selectedWizardId) {
      // clicking an occupied tile selects that wizard
      const occ = wizardAt(row, col);
      if (occ) selectWizard(occ.id);
      return;
    }
    const wizard = wizards[selectedWizardId];
    if (!wizard) return;

    // Try to act first; if the tile isn't a valid target for the current mode, fall back to
    // reselecting whatever wizard is standing there (lets you switch wizards without deselecting
    // first, no matter which action mode you're currently in).
    const reselectOrBail = () => {
      const occ = wizardAt(row, col);
      if (occ && occ.id !== wizard.id) selectWizard(occ.id);
    };

    if (selectedAction === 'move') {
      if (wizard.hasMoved) { reselectOrBail(); return; }
      const moveTiles = getMoveTiles(wizard);
      const isValid = moveTiles.some(t => t.row === row && t.col === col);
      if (!isValid) { reselectOrBail(); return; }
      const path = pathBFS(wizard, row, col);
      if (path) moveWizardAnimated(wizard, path);
    } else if (selectedAction === 'melee') {
      if (wizard.hasAttacked) { reselectOrBail(); return; }
      const tiles = getMeleeTiles(wizard);
      const isValid = tiles.some(t => t.row === row && t.col === col);
      if (!isValid) { reselectOrBail(); return; }
      resolveMeleeAttack(wizard, row, col);
    } else if (selectedAction === 'cast') {
      if (wizard.hasAttacked) { reselectOrBail(); return; }
      const tiles = getCastTiles(wizard);
      const isValid = tiles.some(t => t.row === row && t.col === col);
      if (!isValid) { reselectOrBail(); return; }
      resolveCastAttack(wizard, row, col);
    }
  }

  // ---------- Attack resolution ----------

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
  function applyDisplacement(target, dr, dc, amount, attackerElement) {
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
      if (selectedWizardId === wizard.id) selectedWizardId = null;
    }
  }

  async function resolveMeleeAttack(attacker, row, col) {
    if (attacker.state !== 'onboard' || attacker.row === null || attacker.hasAttacked) return;
    animating = true;
    render();

    const targetWizard = wizardAt(row, col);
    const targetNexus = nexusAt(row, col);
    const dir = directionBetween(attacker.row, attacker.col, row, col);

    await flashTileElement(row, col, attacker.element, 220);
    layTrail(row, col, attacker.element);

    if (targetWizard) {
      targetWizard.hp -= attacker.meleeAttack;
      applyDisplacement(targetWizard, dir.dr, dir.dc, attacker.meleeDisplacement, attacker.element);
      killIfDead(targetWizard);
    } else if (targetNexus) {
      targetNexus.hp = Math.max(0, targetNexus.hp - attacker.meleeAttack);
    }

    attacker.hasAttacked = true;
    animating = false;
    render();
  }

  async function resolveCastAttack(attacker, row, col) {
    if (attacker.state !== 'onboard' || attacker.row === null || attacker.hasAttacked) return;
    animating = true;
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
      applyDisplacement(targetWizard, dir.dr, dir.dc, attacker.castDisplacement, attacker.element);
      killIfDead(targetWizard);
    } else if (targetNexus) {
      targetNexus.hp = Math.max(0, targetNexus.hp - attacker.castAttack);
    }

    attacker.hasAttacked = true;
    animating = false;
    render();
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

  // Returns 'player' | 'enemy' | 'draw' if the game has just ended, otherwise null.
  // Checked at the end of each side's turn. Neither condition can trigger on a team's
  // very first turn (both sides get one turn to summon before the board-wipe condition applies).
  function checkWinLoss() {
    const mineDead = NEXUS.mine.hp <= 0;
    const enemyDead = NEXUS.enemy.hp <= 0;
    if (mineDead && enemyDead) return 'draw';

    const playerWizardCount = Object.values(wizards).filter(w => w.team === 'player' && w.state === 'onboard').length;
    const enemyWizardCount = Object.values(wizards).filter(w => w.team === 'enemy' && w.state === 'onboard').length;

    const playerWiped = mineDead || playerWizardCount === 0;
    const enemyWiped = enemyDead || enemyWizardCount === 0;

    if (playerWiped && enemyWiped) return 'draw';
    if (playerWiped) return 'enemy'; // player lost -> enemy wins
    if (enemyWiped) return 'player'; // enemy lost -> player wins
    return null;
  }

  function resetActionFlagsFor(team) {
    Object.values(wizards).forEach(w => {
      if (w.state === 'onboard' && w.team === team) {
        w.hasMoved = false;
        w.hasAttacked = false;
      }
    });
  }

  function endTurn() {
    if (animating || gameOverResult) return;

    // --- Resolve the end of the player's turn ---
    const isPlayersFirstTurn = !firstPlayerTurnDone;
    firstPlayerTurnDone = true;
    tickTrails();
    selectedWizardId = null;
    placingWizardId = null;

    let result = isPlayersFirstTurn ? null : checkWinLoss();
    if (result) {
      gameOverResult = result;
      render();
      return;
    }

    // --- Hand the turn to the enemy ---
    currentTurn = 'enemy';
    render();

    // Enemy turn: run a simple AI pass for each enemy wizard, then hand back to the player.
    setTimeout(async () => {
      await runEnemyTurn();

      const isEnemysFirstTurn = !firstEnemyTurnDone;
      firstEnemyTurnDone = true;
      resetActionFlagsFor('enemy');

      result = isEnemysFirstTurn ? null : checkWinLoss();
      if (result) {
        gameOverResult = result;
        render();
        return;
      }

      // --- Round complete: hand the turn back to the player ---
      turnCount++;
      currentTurn = 'player';
      maxMana = Math.min(MANA_CAP, maxMana + 1);
      mana = maxMana;
      resetActionFlagsFor('player');
      render();
    }, 500); // brief pause so the "enemy turn" state is visibly readable before AI acts
  }

  // ---------- Enemy AI (v1) ----------
  // For each enemy wizard: attack if a target (nexus or player wizard) is already in range
  // (prefer the nexus when castable, since damaging it progresses the enemy's win condition),
  // otherwise move as close as possible toward the nearest threat. Deliberately simple —
  // no target prioritization beyond "nearest", no retreating, no planning ahead.
  async function runEnemyTurn() {
    const enemyWizards = Object.values(wizards).filter(w => w.team === 'enemy' && w.state === 'onboard');
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
    const playerWizards = Object.values(wizards).filter(w => w.team === 'player' && w.state === 'onboard');
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

  // ---------- Render ----------
  function iconSpan(name, color) {
    return '<span style="color:' + color + '; display:flex; align-items:center; justify-content:center;">' + ICONS[name] + '</span>';
  }

  function renderBoard() {
    let highlightTiles = [];
    let highlightClass = '';
    const selectedWizard = selectedWizardId ? wizards[selectedWizardId] : null;

    if (placingWizardId && !animating) {
      highlightClass = 'summon-target';
      for (let r = SUMMON_ROW_START; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (!isBlocked(r, c)) highlightTiles.push({ row: r, col: c });
        }
      }
    } else if (selectedWizard && !animating) {
      if (selectedAction === 'move') {
        highlightTiles = getMoveTiles(selectedWizard);
        highlightClass = 'move-target';
      } else if (selectedAction === 'melee') {
        highlightTiles = getMeleeTiles(selectedWizard);
        highlightClass = 'melee-target';
      } else if (selectedAction === 'cast') {
        highlightTiles = getCastTiles(selectedWizard);
        highlightClass = 'cast-target';
      }
    }

    let tiles = '';
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const isAlt = (r + c) % 2 === 1;
        const occ = wizardAt(r, c);
        const nex = nexusAt(r, c);
        const isHighlighted = highlightTiles.some(t => t.row === r && t.col === c);
        let classes = 'tile' + (isAlt ? ' alt' : '');
        if (isSummonTile(r, c)) classes += ' summon-zone';
        const trail = trailAt(r, c);
        if (trail) classes += ' terrain-' + trail.element;
        if (nex) classes += ' nexus-tile';
        if (isHighlighted) classes += ' ' + highlightClass;
        if (occ && occ.id === selectedWizardId) classes += ' occupied-selected';

        let tokenHtml = '';
        if (occ) {
          const isSel = occ.id === selectedWizardId;
          const isEnemy = occ.team === 'enemy';
          tokenHtml = '<div class="wizard-token' + (isSel ? ' selected-ring' : '') + (isEnemy ? ' enemy-token' : '') + '" data-id="' + occ.id + '" data-wizard-token="1">' +
            iconSpan(occ.element, ELEMENT_COLOR[occ.element]) +
          '</div>';
        } else if (nex) {
          tokenHtml = '<div class="nexus-token" title="' + (nex === NEXUS.mine ? 'your nexus' : 'enemy nexus') + '">' +
            '<div class="nexus-hp-label">' + nex.hp + '</div>' +
          '</div>';
        }
        tiles += '<div class="' + classes + '" data-row="' + r + '" data-col="' + c + '">' + tokenHtml + '</div>';
      }
    }
    return '<div class="board-wrap"><div class="board">' + tiles + '</div></div>';
  }

  function renderPanel() {
    // Build a card for every wizard still alive, in roster order — summoned or on board.
    // Cards vanish only once a wizard is dead.
    const wizardCards = ROSTER.map((r, i) => {
      const type = WIZARD_TYPES.find(t => t.id === r.typeId);
      const sameType = Object.values(wizards)
        .filter(w => w.element === type.element && w.team === 'player')
        .sort((a, b) => parseInt(a.id.slice(1), 10) - parseInt(b.id.slice(1), 10));
      const indexAmongType = ROSTER.slice(0, i + 1).filter(x => x.typeId === r.typeId).length - 1;
      const wiz = sameType[indexAmongType];
      if (!wiz) return '';
      if (wiz.state === 'dead') return ''; // card vanishes on death

      const isPicked = wiz.id === placingWizardId;
      const isBoardSelected = wiz.id === selectedWizardId;
      const isSummoned = wiz.state === 'summoned';
      const affordable = mana >= wiz.cost;
      const clickable = isSummoned ? affordable : true;

      const stateLabel = isSummoned ? 'summoned' : 'on board';
      const cardClasses = 'wizard-card'
        + (isSummoned ? ' summoned' : '')
        + (isPicked ? ' placing' : '')
        + (isBoardSelected ? ' board-selected' : '');

      let actionRow = '';
      if (isBoardSelected) {
        const moveDisabled = wiz.hasMoved;
        const atkDisabled = wiz.hasAttacked;
        actionRow =
          '<div class="action-row">' +
            '<button class="action-btn move' + (selectedAction === 'move' ? ' active' : '') + '" data-action="move" ' + (moveDisabled ? 'disabled' : '') + '>' + ICONS.move + ' move</button>' +
            '<button class="action-btn melee' + (selectedAction === 'melee' ? ' active' : '') + '" data-action="melee" ' + (atkDisabled ? 'disabled' : '') + '>' + ICONS.melee + ' melee</button>' +
            '<button class="action-btn cast' + (selectedAction === 'cast' ? ' active' : '') + '" data-action="cast" ' + (atkDisabled ? 'disabled' : '') + '>' + ICONS.cast + ' cast</button>' +
          '</div>';
      }

      const moveFlag = wiz.hasMoved ? '<span class="action-flag used">move</span>' : '<span class="action-flag available">move</span>';
      const atkFlag = wiz.hasAttacked ? '<span class="action-flag used">attack</span>' : '<span class="action-flag available">attack</span>';

      return (
        '<div class="' + cardClasses + '">' +
          '<button class="wizard-card-hit" data-roster-id="' + wiz.id + '" data-clickable="' + (clickable ? '1' : '0') + '" ' + (clickable ? '' : 'disabled') + '>' +
            '<div class="wizard-cost-badge ' + wiz.element + '">' + wiz.cost + '</div>' +
            '<div class="wizard-card-head">' +
              '<div class="wizard-card-icon">' + iconSpan(wiz.element, ELEMENT_COLOR[wiz.element]) + '</div>' +
              '<div>' +
                '<div class="wizard-card-name">' + wiz.name + '</div>' +
                '<div class="wizard-card-state">' + stateLabel + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="wizard-tables">' +
              '<div class="wizard-table">' +
                '<div class="wizard-table-row"><span class="label">attack</span><span class="value">' + wiz.meleeAttack + ' &middot; ' + wiz.castAttack + '</span></div>' +
                '<div class="wizard-table-row"><span class="label">displace</span><span class="value">+' + wiz.meleeDisplacement + ' &middot; +' + wiz.castDisplacement + '</span></div>' +
              '</div>' +
              '<div class="wizard-table">' +
                '<div class="wizard-table-row"><span class="label">health</span><span class="value">' + wiz.hp + '/' + wiz.maxHp + '</span></div>' +
                '<div class="wizard-table-row"><span class="label">move</span><span class="value">' + wiz.moveRange + '</span></div>' +
              '</div>' +
            '</div>' +
            (isSummoned ? '' : '<div class="wizard-action-flags">' + moveFlag + atkFlag + '</div>') +
          '</button>' +
          actionRow +
        '</div>'
      );
    }).filter(Boolean).join('');

    const placingHint = (placingWizardId && wizards[placingWizardId])
      ? '<div class="no-selection-hint">tap a highlighted tile in your back 3 rows to place ' + wizards[placingWizardId].name + '</div>'
      : '';

    return (
      '<div class="panel">' +
        placingHint +
        (wizardCards ? (
          '<div>' +
            '<p class="panel-section-label">wizards</p>' +
            '<div class="wizard-grid">' + wizardCards + '</div>' +
          '</div>'
        ) : '') +
      '</div>'
    );
  }

  function render() {
    const app = document.getElementById('app');
    app.classList.toggle('is-animating', animating);
    app.classList.toggle('is-enemy-turn', currentTurn === 'enemy' && !gameOverResult);
    const turnLabel = gameOverResult ? 'game over' : (currentTurn === 'player' ? 'your turn' : 'enemy turn');
    app.innerHTML =
      '<div class="topbar">' +
        '<div class="topbar-mana">' + ICONS.mana + mana + '<span class="mana-max">/' + maxMana + '</span></div>' +
        '<div class="topbar-round">round ' + turnCount + ' &middot; ' + turnLabel + '</div>' +
        '<div class="topbar-end"><button class="end-turn-btn" id="end-turn-btn" ' + (canAct() ? '' : 'disabled') + '>end turn</button></div>' +
      '</div>' +
      renderBoard() +
      renderPanel() +
      renderGameOverOverlay();

    attachHandlers();
  }

  function renderGameOverOverlay() {
    if (!gameOverResult) return '';
    let heading, sub;
    if (gameOverResult === 'draw') {
      heading = 'draw';
      sub = 'both nexuses fell at the same time';
    } else if (gameOverResult === 'player') {
      heading = 'you win';
      sub = 'the enemy nexus fell, or their wizards were wiped out';
    } else {
      heading = 'you lose';
      sub = 'your nexus fell, or your wizards were wiped out';
    }
    return (
      '<div class="game-over-overlay">' +
        '<div class="game-over-card">' +
          '<div class="game-over-heading">' + heading + '</div>' +
          '<div class="game-over-sub">' + sub + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function attachHandlers() {
    document.querySelectorAll('.tile').forEach(el => {
      el.addEventListener('click', () => {
        const row = parseInt(el.getAttribute('data-row'), 10);
        const col = parseInt(el.getAttribute('data-col'), 10);
        handleTileClick(row, col);
      });
    });

    document.querySelectorAll('[data-roster-id]').forEach(el => {
      el.addEventListener('click', () => {
        if (el.getAttribute('data-clickable') !== '1') return;
        const id = el.getAttribute('data-roster-id');
        const w = wizards[id];
        if (!w) return;
        if (w.state === 'summoned') pickWizardToSummon(id);
        else if (w.state === 'onboard') selectWizard(id);
      });
    });

    document.querySelectorAll('.action-btn').forEach(el => {
      el.addEventListener('click', () => {
        setAction(el.getAttribute('data-action'));
      });
    });

    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn) endTurnBtn.addEventListener('click', endTurn);
  }

  render();
})();


