async function resolveMeleeAttack(attacker, row, col) {
  await present(simAttack(attacker, row, col, 'melee'));
  await afterPlayerAction();
}

async function resolveCastAttack(attacker, row, col) {
  await present(simAttack(attacker, row, col, 'cast'));
  await afterPlayerAction();
}
