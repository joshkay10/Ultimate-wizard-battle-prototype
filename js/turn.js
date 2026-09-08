import { MANA_CAP } from './constants.js';
import { state, NEXUS } from './state.js';
import { tickTrails } from './board.js';
import { runEnemyTurn } from './ai.js';
import { render } from './ui.js';

export function canAct() {
  return !state.gameOverResult && state.currentTurn === 'player';
}

// Returns 'player' | 'enemy' | 'draw' if the game has just ended, otherwise null.
// Checked at the end of each side's turn. Neither condition can trigger on a team's
// very first turn (both sides get one turn to summon before the board-wipe condition applies).
export function checkWinLoss() {
  const mineDead = NEXUS.mine.hp <= 0;
  const enemyDead = NEXUS.enemy.hp <= 0;
  if (mineDead && enemyDead) return 'draw';

  const playerWizardCount = Object.values(state.wizards).filter(w => w.team === 'player' && w.state === 'onboard').length;
  const enemyWizardCount = Object.values(state.wizards).filter(w => w.team === 'enemy' && w.state === 'onboard').length;

  const playerWiped = mineDead || playerWizardCount === 0;
  const enemyWiped = enemyDead || enemyWizardCount === 0;

  if (playerWiped && enemyWiped) return 'draw';
  if (playerWiped) return 'enemy'; // player lost -> enemy wins
  if (enemyWiped) return 'player'; // enemy lost -> player wins
  return null;
}

export function resetActionFlagsFor(team) {
  Object.values(state.wizards).forEach(w => {
    if (w.state === 'onboard' && w.team === team) {
      w.hasMoved = false;
      w.hasAttacked = false;
    }
  });
}

export function endTurn() {
  if (state.animating || state.gameOverResult) return;

  // --- Resolve the end of the player's turn ---
  const isPlayersFirstTurn = !state.firstPlayerTurnDone;
  state.firstPlayerTurnDone = true;
  tickTrails();
  state.selectedWizardId = null;
  state.placingWizardId = null;

  let result = isPlayersFirstTurn ? null : checkWinLoss();
  if (result) {
    state.gameOverResult = result;
    render();
    return;
  }

  // --- Hand the turn to the enemy ---
  state.currentTurn = 'enemy';
  render();

  // Enemy turn: run a simple AI pass for each enemy wizard, then hand back to the player.
  setTimeout(async () => {
    await runEnemyTurn();

    const isEnemysFirstTurn = !state.firstEnemyTurnDone;
    state.firstEnemyTurnDone = true;
    resetActionFlagsFor('enemy');

    result = isEnemysFirstTurn ? null : checkWinLoss();
    if (result) {
      state.gameOverResult = result;
      render();
      return;
    }

    // --- Round complete: hand the turn back to the player ---
    state.turnCount++;
    state.currentTurn = 'player';
    state.maxMana = Math.min(MANA_CAP, state.maxMana + 1);
    state.mana = state.maxMana;
    resetActionFlagsFor('player');
    render();
  }, 500); // brief pause so the "enemy turn" state is visibly readable before AI acts
}
