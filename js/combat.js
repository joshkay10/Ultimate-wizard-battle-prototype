async function resolveMeleeAttack(attacker, row, col) {
  await present(simAttack(attacker, row, col, 'melee'));
}

async function resolveCastAttack(attacker, row, col) {
  await present(simAttack(attacker, row, col, 'cast'));
}
