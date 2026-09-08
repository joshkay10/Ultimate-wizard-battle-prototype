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

})();

