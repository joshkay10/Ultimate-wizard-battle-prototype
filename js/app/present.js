function present(events) {
  if (!events) events = [];
  for (let i = 0; i < events.length; i++) state.log.push(events[i]);
  if (state.fxEnabled && typeof playEvents === 'function') {
    if (!events.length) return Promise.resolve();
    state.animating = true;
    return playEvents(events).catch(function (err) {
      console.error(err);
      state.animating = false;
    });
  }
  return Promise.resolve();
}

function maybeWait(ms) {
  if (!state.fxEnabled) return Promise.resolve();
  return sleep(ms);
}
