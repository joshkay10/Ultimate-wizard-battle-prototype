async function resolveMeleeAttack(attacker, row, col) {
  await present(simAttack(state, attacker, row, col, 'melee'));
  await afterPlayerAction();
}

async function resolveCastAttack(attacker, row, col) {
  await present(simAttack(state, attacker, row, col, 'cast'));
  await afterPlayerAction();
}
