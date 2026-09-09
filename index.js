if (currentRoute() === 'play') {
  resetMatch((Date.now() >>> 0) || 1);
  render();
  maybeAutoEndTurn();
} else {
  render();
}
