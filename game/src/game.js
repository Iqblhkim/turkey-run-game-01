// Turkey Run — state machine, main loop, scoring, and the debug handle.
// States: title → play → pause → caught | escaped. Also owns shot mode:
// `?shot=<name>&seed=<n>` hands control to shots.js, which stages a fixed
// scene and sets window.__shotReady when it is drawn.
(function () {
  'use strict';
  var C = window.TR_CONFIG;

  var canvas, ctx, W, H;
  var G = null; // game state

  function bestScore() {
    try { return Number(window.localStorage.getItem('turkey-run-best') || 0) || 0; } catch (e) { return 0; }
  }
  function saveBest(v) {
    try { window.localStorage.setItem('turkey-run-best', String(v)); } catch (e) { /* private mode */ }
  }

  function newGame(seed) {
    var groundY = H * 0.78;
    return {
      state: 'title', seed: seed || 7, time: 0, scrollX: 0,
      distance: 0, score: 0, corn: 0, goldenCorn: 0, feathers: 0,
      hearts: C.MAX_HEARTS, stage: 0, speed: C.BASE_SPEED,
      farmerGap: C.FARMER_BASE_GAP, banner: 0, bannerStage: -1,
      ovenTime: 0, muted: false, best: bestScore(),
      turkey: window.TR_TURKEY.create(280, groundY),
      farmer: window.TR_FARMER.create(280 - C.FARMER_BASE_GAP, groundY),
      world: window.TR_WORLD.create(seed || 7),
      buttons: {},
    };
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    W = Math.max(320, Math.floor(r.width));
    H = Math.max(240, Math.floor(r.height));
    canvas.width = W; canvas.height = H;
    if (G) {
      var gy = H * 0.78;
      G.turkey.groundY = gy; G.farmer.groundY = gy;
      if (G.turkey.onGround) G.turkey.y = gy;
      G.farmer.y = gy;
    }
  }

  function startRun() {
    var seed = G.seed;
    var best = G.best, muted = G.muted;
    G = newGame(seed);
    G.best = best; G.muted = muted;
    G.state = 'play';
    G.banner = 2.2; G.bannerStage = 0;
    window.TR_INPUT.consumeTouchJump();
    while (window.TR_INPUT.consumeClick()) { /* drain stale taps */ }
    window.TR_AUDIO.unlock();
    window.TR_AUDIO.stage();
  }

  function endRun(escaped) {
    G.state = escaped ? 'escaped' : 'caught';
    if (G.score > G.best) { G.best = G.score; saveBest(G.best); }
    if (escaped) window.TR_AUDIO.victory(); else window.TR_AUDIO.caught();
  }

  function hurt(kind) {
    var t = G.turkey;
    if (t.invuln > 0 || t.hidden > 0 || t.dash > 0) return;
    G.hearts--;
    t.invuln = C.INVULN_TIME;
    G.world.shake = 1;
    window.TR_WORLD.addBurst(G.world, t.x, t.y - 30, '#d9381e', 12);
    window.TR_AUDIO.thud();
    if (G.hearts <= 0) endRun(false);
  }

  function applyEvents(ev) {
    var t = G.turkey;
    if (ev.hit) { hurt(ev.hit); }
    if (ev.corn) {
      G.corn += ev.corn; G.score += ev.corn * C.SCORE.corn;
      window.TR_WORLD.addPopup(G.world, t.x + 30, t.y - 90, '+' + ev.corn * C.SCORE.corn, '#ffc93c');
      window.TR_AUDIO.corn();
    }
    if (ev.golden) {
      G.goldenCorn += ev.golden; G.score += ev.golden * C.SCORE.goldenCorn;
      window.TR_WORLD.addPopup(G.world, t.x + 30, t.y - 110, '+' + ev.golden * C.SCORE.goldenCorn + ' GOLDEN!', '#ffd94a');
      window.TR_AUDIO.corn();
    }
    if (ev.feather) {
      G.feathers += ev.feather; G.score += ev.feather * C.SCORE.feather;
      window.TR_WORLD.addPopup(G.world, t.x + 30, t.y - 90, '+' + C.SCORE.feather, '#fff3d6');
      window.TR_AUDIO.feather();
    }
    if (ev.passed) G.score += ev.passed * 25;
    t.inMud = ev.mud;
    t.inOven = ev.oven;
    if (ev.oven) {
      G.ovenTime += 1 / 60;
      if (G.ovenTime > 0.7) { G.ovenTime = 0; hurt('oven'); }
    } else G.ovenTime = 0;
  }

  function update(dt) {
    var t = G.turkey, f = G.farmer;
    G.time += dt;
    if (G.banner > 0) G.banner -= dt;
    var speed = C.speedAt(G.distance);
    if (t.inMud) speed *= C.MUD_SLOW;
    if (t.dash > 0) speed = C.DASH_SPEED;
    G.speed = speed;
    G.scrollX += speed * dt;
    G.distance += (speed * dt) / C.PX_PER_M;
    G.score += ((speed * dt) / C.PX_PER_M) * 2; // ~2 points per metre, trickle
    var stage = C.stageAt(G.distance);
    if (stage !== G.stage) {
      G.stage = stage; G.banner = 2.4; G.bannerStage = stage;
      window.TR_AUDIO.stage();
    }
    window.TR_TURKEY.update(t, dt, speed);
    window.TR_FARMER.update(f, dt, t, speed, G.distance, function (x) {
      window.TR_WORLD.spawnKnife(G.world, x, H * 0.78);
    });
    var ev = window.TR_WORLD.update(G.world, dt, speed, G.distance, G.stage, t, H * 0.78);
    applyEvents(ev);
    if (f.caught && G.state === 'play') endRun(false);
    if (G.distance >= C.GOAL_DISTANCE_M && G.state === 'play') {
      G.score += 500;
      endRun(true);
    }
    // Alarm when the farmer is close.
    if (f.spotted > 0 && Math.floor(G.time * 2) !== Math.floor((G.time - dt) * 2)) window.TR_AUDIO.alarm();
  }

  function handleInput() {
    var I = window.TR_INPUT;
    if (I.pressed('M')) { G.muted = window.TR_AUDIO.toggleMute(); }
    if (G.state === 'title') {
      var click = I.consumeClick();
      // Title: SPACE or clicking the START button. (A bare canvas tap does
      // NOT start here, or clicking RESTART on the end screen would
      // instantly re-start the run through the same tap.)
      if (I.anyPressed(['Space', 'ArrowUp', 'W']) ||
          (click && G.buttons.startBtn && click.x >= G.buttons.startBtn.x && click.x <= G.buttons.startBtn.x + G.buttons.startBtn.w && click.y >= G.buttons.startBtn.y && click.y <= G.buttons.startBtn.y + G.buttons.startBtn.h)) {
        startRun();
      }
      return;
    }
    if (G.state === 'play') {
      if (I.pressed('P')) { G.state = 'pause'; return; }
      if (I.anyPressed(['Space', 'ArrowUp', 'W']) || I.consumeTouchJump()) window.TR_TURKEY.jump(G.turkey);
      if (I.anyPressed(['ArrowDown', 'S'])) window.TR_TURKEY.slide(G.turkey);
      if (I.pressed('ShiftLeft') || I.pressed('ShiftRight') || I.pressed('Shift')) window.TR_TURKEY.dash(G.turkey);
      if (I.pressed('H')) {
        // H only works near a haystack.
        var near = false;
        for (var i = 0; i < G.world.obstacles.length; i++) {
          var o = G.world.obstacles[i];
          if (o.kind === 'haystack' && Math.abs(o.x - G.turkey.x) < 110) { near = true; break; }
        }
        if (near) { window.TR_TURKEY.hide(G.turkey); G.score += C.SCORE.hide; G.farmerGap = C.FARMER_BASE_GAP * 1.6; }
      }
      if (I.consumeClick()) window.TR_TURKEY.jump(G.turkey);
      return;
    }
    if (G.state === 'pause') {
      if (I.pressed('P')) G.state = 'play';
      return;
    }
    // caught / escaped
    var c2 = I.consumeClick();
    if (I.pressed('R') ||
        (c2 && G.buttons.restartBtn && c2.x >= G.buttons.restartBtn.x && c2.x <= G.buttons.restartBtn.x + G.buttons.restartBtn.w && c2.y >= G.buttons.restartBtn.y && c2.y <= G.buttons.restartBtn.y + G.buttons.restartBtn.h)) {
      G = newGame(G.seed); G.state = 'title';
    }
  }

  function render() {
    var R = window.TR_RENDER;
    var groundY = H * 0.78;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (G.world.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * G.world.shake, (Math.random() - 0.5) * 8 * G.world.shake);
    if (G.state === 'title') {
      G.buttons = R.drawTitle(ctx, W, H, G, G.world, G.time);
    } else if (G.state === 'caught' || G.state === 'escaped') {
      G.buttons = R.drawEnd(ctx, W, H, G, G.world, G.time);
    } else {
      R.drawBackground(ctx, W, H, G.stage, G.scrollX, G.world, G.time);
      var i;
      for (i = 0; i < G.world.obstacles.length; i++) R.drawObstacle(ctx, G.world.obstacles[i], groundY, G.time);
      for (i = 0; i < G.world.pickups.length; i++) if (!G.world.pickups[i].taken) R.drawPickup(ctx, G.world.pickups[i], G.time);
      for (i = 0; i < G.world.knives.length; i++) R.drawKnife(ctx, G.world.knives[i], groundY);
      window.TR_FARMER.draw(ctx, G.farmer, G.time);
      window.TR_TURKEY.draw(ctx, G.turkey, G.time);
      R.drawParticles(ctx, G.world);
      R.drawHUD(ctx, W, H, G, G.world);
      if (G.state === 'pause') R.drawPause(ctx, W, H);
    }
    ctx.restore();
  }

  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    if (G.state === 'title' || G.state === 'caught' || G.state === 'escaped') G.time += dt;
    handleInput();
    if (G.state === 'play') update(dt);
    render();
    window.TR_INPUT.endFrame();
    requestAnimationFrame(frame);
  }

  function shotState() {
    return { shot: G.shotName || null, state: G.state, score: Math.floor(G.score), distance: Math.floor(G.distance), hearts: G.hearts, stage: C.STAGES[G.stage].name, corn: G.corn };
  }

  function init() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    window.TR_INPUT.attachCanvas(canvas);
    resize();
    window.addEventListener('resize', resize);
    G = newGame(7);
    var params = new URLSearchParams(window.location.search);
    var shot = params.get('shot');
    if (shot) {
      var seed = Number(params.get('seed') || 7);
      window.TR_SHOTS.stage(shot, seed, G, { W: W, H: H, render: render, shotState: shotState });
      G.shotName = shot;
      window.__shotState = shotState();
      window.__shotReady = true;
      render();
      return;
    }
    requestAnimationFrame(frame);
  }

  // Debug handle for local playtesting ONLY (harmless in play).
  window.__turkeyGame = {
    getState: function () { return { state: G.state, score: G.score, distance: G.distance, hearts: G.hearts, stage: G.stage, farmerGap: G.farmerGap, corn: G.corn }; },
    start: function () { if (G.state === 'title') startRun(); },
    debugEnd: function (which) { endRun(which === 'escaped'); },
    debugHurt: function () { hurt('test'); },
  };
  window.TR_GAME = { init: init, getG: function () { return G; }, shotState: shotState };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
