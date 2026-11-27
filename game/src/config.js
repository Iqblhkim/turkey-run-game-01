// Turkey Run: Thanksgiving Escape — constants: stages, speeds, spawn tables, palette.
// All tuning lives here so the rest of the game reads like a recipe, not magic numbers.
(function () {
  'use strict';
  var C = {
    GOAL_DISTANCE_M: 1500,
    STAGES: [
      { name: 'THE FARMYARD', from: 0,    to: 500,  sky: '#f7c873', skyTop: '#f9a94b', ground: '#b5772e', grass: '#7fae4a' },
      { name: 'THE BARN',     from: 500,  to: 1000, sky: '#e8975a', skyTop: '#d97b3f', ground: '#8a5a28', grass: '#6d9a3e' },
      { name: 'THE KITCHEN',  from: 1000, to: 1500, sky: '#e07a4e', skyTop: '#c85a38', ground: '#6e4520', grass: '#5d8a35' },
    ],
    BASE_SPEED: 300,        // px/s at the start
    MAX_SPEED: 560,         // px/s near the goal
    PX_PER_M: 14,           // px of scroll per metre
    GRAVITY: 2600,
    JUMP_V: 980,
    DOUBLE_JUMP_V: 880,
    DASH_SPEED: 900,
    DASH_TIME: 0.28,
    DASH_COOLDOWN: 1.6,
    SLIDE_TIME: 0.55,
    MUD_SLOW: 0.55,         // speed multiplier while in mud
    OVEN_DPS: 1,            // hearts lost per second standing in an oven
    MAX_HEARTS: 3,
    INVULN_TIME: 1.2,       // seconds after a hit
    HIDE_TIME: 2.2,         // seconds hidden in a haystack
    FARMER_BASE_GAP: 210,   // px behind the turkey when all is well
    FARMER_CATCH_GAP: 26,   // px gap at which the farmer grabs the turkey
    FARMER_SPOT_GAP: 120,   // px gap that triggers the SPOTTED! alarm
    KNIFE_MIN_S: 8,         // farmer throws a knife every 8-12s in later stages
    KNIFE_MAX_S: 12,
    SPAWN: {                // gap between obstacles shrinks with distance
      gapStart: 560, gapEnd: 330, cornChance: 0.55, featherChance: 0.3, haystackChance: 0.16,
    },
    PALETTE: {
      cream: '#fff3d6', ink: '#3a2412', orange: '#e8701a', rust: '#b23a12',
      brown: '#6b3f1d', gold: '#ffc93c', red: '#d9381e', leaf: '#5d8a35',
    },
    SCORE: { corn: 100, goldenCorn: 250, feather: 50, metre: 2, hide: 150 },
  };
  C.stageAt = function (m) {
    for (var i = 0; i < C.STAGES.length; i++) if (m < C.STAGES[i].to) return i;
    return C.STAGES.length - 1;
  };
  C.speedAt = function (m) {
    var t = Math.min(1, m / C.GOAL_DISTANCE_M);
    return C.BASE_SPEED + (C.MAX_SPEED - C.BASE_SPEED) * t;
  };
  window.TR_CONFIG = C;
})();
