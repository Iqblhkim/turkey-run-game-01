// Deterministic staged scenes for screenshots. Each shot builds a fixed game
// state from a seeded RNG, runs a fixed number of 1/60s update steps (no
// real-time dependence), then draws once. The same seed always draws the same
// pixels.
(function () {
  'use strict';
  var C = window.TR_CONFIG;
  var R = window.TR_RANDOM;

  function steps(G, n, dt) {
    // Reuse the live update path via a tiny local sim: advance scroll, turkey
    // and world without input, so staged scenes look like real play.
    for (var i = 0; i < n; i++) {
      var t = G.turkey, f = G.farmer;
      G.time += dt;
      var speed = C.speedAt(G.distance);
      G.speed = speed;
      G.scrollX += speed * dt;
      G.distance += (speed * dt) / C.PX_PER_M;
      window.TR_TURKEY.update(t, dt, speed);
      window.TR_FARMER.update(f, dt, t, speed, G.distance, null);
      window.TR_WORLD.update(G.world, dt, speed, G.distance, G.stage, t, G.groundY || 374);
    }
  }

  function stage(name, seed, G, view) {
    var H = view.H, W = view.W;
    var groundY = H * 0.78;
    G.groundY = groundY;
    var rng = R.mulberry32(seed * 7919 + 13);
    var i;

    if (name === 'title') {
      G.state = 'title';
      G.time = 3.2;
      G.best = 2450;
      return;
    }

    if (name === 'chase') {
      G.state = 'play';
      G.distance = 212; G.score = 1870; G.corn = 6; G.feathers = 2; G.hearts = 3;
      G.stage = 0; G.speed = C.speedAt(212); G.time = 12.4;
      G.turkey = window.TR_TURKEY.create(280, groundY);
      G.farmer = window.TR_FARMER.create(280 - 95, groundY); // close behind!
      G.farmer.gap = 95; G.farmer.spotted = 1;
      G.farmerGap = 95;
      G.world = window.TR_WORLD.create(seed);
      // Hand-place a fence the turkey is jumping, corn above it, a hay bale ahead.
      G.world.obstacles = [
        { kind: 'fence', x: 330, w: 44, h: 52, groundY: groundY, passed: false },
        { kind: 'bale', x: 560, w: 62, h: 58, groundY: groundY, passed: false },
        { kind: 'branch', x: 800, w: 70, h: 30, groundY: groundY, passed: false },
        { kind: 'haystack', x: 1020, w: 70, h: 56, groundY: groundY, passed: false },
      ];
      G.world.pickups = [
        { kind: 'corn', x: 350, y: groundY - 120, taken: false, phase: 0.5 },
        { kind: 'corn', x: 395, y: groundY - 140, taken: false, phase: 1.2 },
        { kind: 'goldenCorn', x: 440, y: groundY - 120, taken: false, phase: 2.0 },
        { kind: 'feather', x: 620, y: groundY - 130, taken: false, phase: 0.9 },
        { kind: 'corn', x: 850, y: groundY - 60, taken: false, phase: 1.7 },
      ];
      G.turkey.y = groundY - 95; G.turkey.vy = 120; G.turkey.onGround = false; G.turkey.jumps = 1;
      steps(G, 3, 1 / 60);
      window.TR_WORLD.addPopup(G.world, 360, groundY - 170, '+100', '#ffc93c');
      return;
    }

    if (name === 'kitchen') {
      G.state = 'play';
      G.distance = 1230; G.score = 9840; G.corn = 21; G.feathers = 5; G.hearts = 2;
      G.stage = 2; G.speed = C.speedAt(1230); G.time = 41.7;
      G.banner = 1.4; G.bannerStage = 2;
      G.turkey = window.TR_TURKEY.create(280, groundY);
      G.farmer = window.TR_FARMER.create(280 - 150, groundY);
      G.farmer.gap = 150; G.farmerGap = 150;
      G.world = window.TR_WORLD.create(seed + 5);
      G.world.obstacles = [
        { kind: 'oven', x: 360, w: 92, h: 34, groundY: groundY, passed: false },
        { kind: 'fence', x: 600, w: 44, h: 52, groundY: groundY, passed: false },
        { kind: 'oven', x: 820, w: 92, h: 34, groundY: groundY, passed: false },
        { kind: 'branch', x: 1060, w: 70, h: 30, groundY: groundY, passed: false },
      ];
      G.world.pickups = [
        { kind: 'corn', x: 400, y: groundY - 120, taken: false, phase: 0.3 },
        { kind: 'goldenCorn', x: 445, y: groundY - 140, taken: false, phase: 1.1 },
        { kind: 'corn', x: 650, y: groundY - 120, taken: false, phase: 2.2 },
        { kind: 'corn', x: 900, y: groundY - 120, taken: false, phase: 0.8 },
      ];
      // A knife mid-fall with its shadow warning, and one still telegraphed.
      G.world.knives = [
        { x: 470, y: groundY - 190, vy: 500, groundY: groundY, hit: false, warn: 0 },
        { x: 980, y: -30, vy: 0, groundY: groundY, hit: false, warn: 0.9 },
      ];
      G.turkey.y = groundY - 110; G.turkey.vy = 60; G.turkey.onGround = false; G.turkey.jumps = 1;
      steps(G, 3, 1 / 60);
      window.TR_WORLD.addPopup(G.world, 420, groundY - 180, '+250', '#ffd94a');
      return;
    }

    if (name === 'end') {
      G.state = 'escaped';
      G.distance = 1500; G.score = 12750; G.corn = 24; G.feathers = 6; G.hearts = 2;
      G.stage = 2; G.time = 5.5; G.best = 12750;
      return;
    }

    // Unknown shot name: fall back to the title so the capture fails loudly
    // on __shotState instead of rendering a blank canvas.
    G.state = 'title';
    G.shotName = name;
  }

  window.TR_SHOTS = { stage: stage };
})();
