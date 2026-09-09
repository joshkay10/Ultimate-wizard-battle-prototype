if (currentRoute() === 'play') {
  startBattle();
  render();
  maybeAutoEndTurn();
} else {
  render();
}
