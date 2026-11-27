// The world: obstacle / corn / haystack spawning per stage, falling knives,
// mud and ovens, collision checks, and parallax scenery (clouds, hills,
// fences, barns, kitchen windows) driven by a seeded RNG.
(function () {
  'use strict';
  var C = window.TR_CONFIG;
  var R = window.TR_RANDOM;

  function create(seed) {
    var rng = R.mulberry32(seed);
    var clouds = [], hills = [];
    for (var i = 0; i < 14; i++) clouds.push({ x: rng() * 4000, y: 30 + rng() * 90, s: 0.7 + rng() * 0.9, v: 6 + rng() * 10 });
    for (var j = 0; j < 10; j++) hills.push({ x: j * 420 + rng() * 120, w: 300 + rng() * 200, h: 60 + rng() * 70 });
    return {
      seed: seed, rng: rng, obstacles: [], pickups: [], knives: [], particles: [], popups: [],
      spawnX: 900, clouds: clouds, hills: hills, nextGap: 560, shake: 0,
    };
  }

  function obstacleFor(rng, stage, distance) {
    var table;
    if (stage === 0) table = ['fence', 'fence', 'bale', 'branch', 'mud', 'pitchfork'];
    else if (stage === 1) table = ['fence', 'bale', 'branch', 'mud', 'pitchfork', 'fence', 'bale'];
    else table = ['fence', 'oven', 'branch', 'oven', 'bale', 'mud', 'pitchfork'];
    var kind = R.pick(rng, table);
    var o = { kind: kind, x: 0, w: 46, h: 46, passed: false, t: 0 };
    if (kind === 'fence') { o.w = 44; o.h = 52; }
    if (kind === 'bale') { o.w = 62; o.h = 58; }
    if (kind === 'branch') { o.w = 70; o.h = 30; o.top = true; }
    if (kind === 'mud') { o.w = 110; o.h = 14; o.flat = true; }
    if (kind === 'oven') { o.w = 92; o.h = 34; o.hot = true; }
    if (kind === 'pitchfork') { o.w = 26; o.h = 56; }
    return o;
  }

  function spawn(world, groundY, distance, stage) {
    var rng = world.rng;
    var o = obstacleFor(rng, stage, distance);
    o.x = world.spawnX;
    o.groundY = groundY;
    world.obstacles.push(o);
    // Sometimes a haystack to hide in, a little past the obstacle.
    if (R.chance(rng, C.SPAWN.haystackChance)) {
      world.obstacles.push({ kind: 'haystack', x: world.spawnX + 260, w: 70, h: 56, groundY: groundY, passed: false });
    }
    // Corn arc over / beside the obstacle.
    if (R.chance(rng, C.SPAWN.cornChance)) {
      var n = R.int(rng, 2, 4);
      for (var i = 0; i < n; i++) {
        world.pickups.push({
          kind: R.chance(rng, 0.14) ? 'goldenCorn' : 'corn',
          x: world.spawnX + 40 + i * 44, y: groundY - (o.kind === 'branch' ? 30 : 120),
          taken: false, phase: rng() * 6,
        });
      }
    } else if (R.chance(rng, C.SPAWN.featherChance)) {
      world.pickups.push({ kind: 'feather', x: world.spawnX + 60, y: groundY - 130, taken: false, phase: rng() * 6 });
    }
    var t = Math.min(1, distance / C.GOAL_DISTANCE_M);
    world.nextGap = C.SPAWN.gapStart + (C.SPAWN.gapEnd - C.SPAWN.gapStart) * t;
    world.spawnX += world.nextGap + R.range(rng, 0, 140);
  }

  function spawnKnife(world, x, groundY) {
    world.knives.push({ x: x, y: -30, vy: 0, groundY: groundY, hit: false, warn: 0.9 });
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // Move everything, spawn ahead, resolve collisions. Returns events:
  // { hit: kind|null, corn: n, golden: n, feather: n, passed: n, oven: bool, mud: bool }
  function update(world, dt, speed, distance, stage, turkey, groundY) {
    var ev = { hit: null, corn: 0, golden: 0, feather: 0, passed: 0, oven: false, mud: false };
    var scroll = speed * dt;
    var tb = window.TR_TURKEY.box(turkey);
    var i, o, p, k;

    // Spawn ahead of the right edge.
    while (world.spawnX < 1400) spawn(world, groundY, distance, stage);

    for (i = world.obstacles.length - 1; i >= 0; i--) {
      o = world.obstacles[i];
      o.x -= scroll;
      if (o.x + o.w < -80) { world.obstacles.splice(i, 1); continue; }
      if (!o.passed && o.x + o.w < turkey.x) { o.passed = true; ev.passed++; }
      if (o.kind === 'haystack') continue;
      var ob;
      if (o.kind === 'mud') {
        ob = { x: o.x, y: groundY - 8, w: o.w, h: 12 };
        if (overlap(tb, ob)) ev.mud = true;
        continue;
      }
      if (o.kind === 'oven') {
        ob = { x: o.x, y: groundY - o.h, w: o.w, h: o.h };
        if (overlap(tb, ob)) ev.oven = true;
        continue;
      }
      if (o.kind === 'branch') {
        // Low branch: only safe while sliding (turkey box is short then).
        ob = { x: o.x, y: groundY - 62, w: o.w, h: 32 };
        if (overlap(tb, ob)) ev.hit = 'branch';
        continue;
      }
      ob = { x: o.x, y: groundY - o.h, w: o.w, h: o.h };
      if (overlap(tb, ob)) ev.hit = o.kind;
    }

    for (i = world.pickups.length - 1; i >= 0; i--) {
      p = world.pickups[i];
      p.x -= scroll;
      p.phase += dt * 4;
      if (p.x < -60) { world.pickups.splice(i, 1); continue; }
      var pb = { x: p.x - 14, y: p.y - 14 + Math.sin(p.phase) * 3, w: 28, h: 28 };
      if (!p.taken && overlap(tb, pb)) {
        p.taken = true;
        if (p.kind === 'corn') ev.corn++;
        else if (p.kind === 'goldenCorn') ev.golden++;
        else ev.feather++;
      }
    }

    for (i = world.knives.length - 1; i >= 0; i--) {
      k = world.knives[i];
      if (k.warn > 0) { k.warn -= dt; k.x = turkey.x + Math.sin(k.warn * 20) * 2; continue; }
      k.vy += 2400 * dt;
      k.y += k.vy * dt;
      if (!k.hit && k.y > groundY - 60) {
        k.hit = true;
        var kb = { x: k.x - 10, y: k.y - 10, w: 20, h: 60 };
        if (overlap(tb, kb)) ev.hit = 'knife';
      }
      if (k.y > groundY + 10) world.knives.splice(i, 1);
    }

    // Dust particles behind the turkey's feet.
    if (turkey.onGround && Math.random() < 0.5) {
      world.particles.push({ x: turkey.x - 20, y: groundY - 2, vx: -60 - Math.random() * 60, vy: -20 - Math.random() * 40, life: 0.5, max: 0.5, r: 3 + Math.random() * 3 });
    }
    for (i = world.particles.length - 1; i >= 0; i--) {
      var pt = world.particles[i];
      pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 60 * dt;
      if (pt.life <= 0) world.particles.splice(i, 1);
    }
    for (i = world.popups.length - 1; i >= 0; i--) {
      var pp = world.popups[i];
      pp.life -= dt; pp.y -= 40 * dt;
      if (pp.life <= 0) world.popups.splice(i, 1);
    }
    if (world.shake > 0) world.shake -= dt * 3;
    return ev;
  }

  function addPopup(world, x, y, text, color) {
    world.popups.push({ x: x, y: y, text: text, color: color || '#ffc93c', life: 1 });
  }
  function addBurst(world, x, y, color, n) {
    for (var i = 0; i < (n || 10); i++) {
      world.particles.push({ x: x, y: y, vx: -120 + Math.random() * 240, vy: -160 + Math.random() * 120, life: 0.6, max: 0.6, r: 2 + Math.random() * 4, color: color });
    }
  }

  window.TR_WORLD = { create: create, update: update, spawnKnife: spawnKnife, addPopup: addPopup, addBurst: addBurst };
})();
