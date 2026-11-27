// Seeded RNG (mulberry32) + small helpers. Every staged screenshot and every
// deterministic replay runs off one of these, so the same seed draws the same farm.
(function () {
  'use strict';
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  window.TR_RANDOM = {
    mulberry32: mulberry32,
    range: function (rng, lo, hi) { return lo + rng() * (hi - lo); },
    int: function (rng, lo, hi) { return Math.floor(lo + rng() * (hi - lo + 1)); },
    pick: function (rng, arr) { return arr[Math.floor(rng() * arr.length)]; },
    chance: function (rng, p) { return rng() < p; },
  };
})();
