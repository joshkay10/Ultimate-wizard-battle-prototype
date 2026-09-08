function createRng(seed) {
  let s = (seed >>> 0) || 1;
  return {
    seed: s,
    next: function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int: function (n) {
      if (n <= 0) return 0;
      return Math.floor(this.next() * n);
    },
    pick: function (arr) {
      if (!arr.length) return undefined;
      return arr[this.int(arr.length)];
    }
  };
}

function rand() {
  return (state.rng ? state.rng.next() : Math.random());
}

function randInt(n) {
  return state.rng ? state.rng.int(n) : Math.floor(Math.random() * n);
}
