// The turkey: physics (run / jump / double jump / slide / dash / hide),
// squash-and-stretch, and all of its canvas drawing. No assets — feathers,
// beak, wattle and tail fan are drawn from primitives.
(function () {
  'use strict';
  var C = window.TR_CONFIG;

  function create(x, groundY) {
    return {
      x: x, groundY: groundY, y: groundY, vy: 0, jumps: 0,
      sliding: 0, dash: 0, dashCd: 0, invuln: 0, hidden: 0, hideCd: 0,
      squash: 0, runPhase: 0, dead: false, onGround: true, inMud: false, inOven: false,
    };
  }

  function width(t) { return t.sliding > 0 ? 78 : 52; }
  function height(t) { return t.sliding > 0 ? 34 : 64; }
  function box(t) {
    return { x: t.x - width(t) / 2, y: t.y - height(t), w: width(t), h: height(t) };
  }

  function jump(t) {
    if (t.hidden > 0 || t.dead) return false;
    if (t.onGround) {
      t.vy = -C.JUMP_V; t.onGround = false; t.jumps = 1; t.squash = -0.25;
      window.TR_AUDIO.jump();
      return true;
    }
    if (t.jumps < 2) {
      t.vy = -C.DOUBLE_JUMP_V; t.jumps = 2; t.squash = -0.2;
      window.TR_AUDIO.doubleJump();
      return true;
    }
    return false;
  }
  function slide(t) {
    if (t.onGround && t.sliding <= 0) { t.sliding = C.SLIDE_TIME; return true; }
    return false;
  }
  function dash(t) {
    if (t.dashCd <= 0 && t.dash <= 0) {
      t.dash = C.DASH_TIME; t.dashCd = C.DASH_COOLDOWN; t.invuln = Math.max(t.invuln, C.DASH_TIME + 0.15);
      window.TR_AUDIO.dash();
      return true;
    }
    return false;
  }
  function hide(t) {
    if (t.hideCd <= 0 && t.onGround) {
      t.hidden = C.HIDE_TIME; t.hideCd = 5; window.TR_AUDIO.hide();
      return true;
    }
    return false;
  }

  function update(t, dt, speed) {
    t.runPhase += dt * (10 + speed / 60);
    if (t.sliding > 0) t.sliding -= dt;
    if (t.dash > 0) t.dash -= dt;
    if (t.dashCd > 0) t.dashCd -= dt;
    if (t.invuln > 0) t.invuln -= dt;
    if (t.hideCd > 0) t.hideCd -= dt;
    if (t.hidden > 0) t.hidden -= dt;
    if (!t.onGround) {
      t.vy += C.GRAVITY * dt;
      t.y += t.vy * dt;
      if (t.y >= t.groundY) {
        t.y = t.groundY; t.vy = 0; t.onGround = true; t.jumps = 0; t.squash = 0.28;
      }
    }
    t.squash *= Math.pow(0.0001, dt); // spring back toward 0
    if (Math.abs(t.squash) < 0.01) t.squash = 0;
  }

  // Draw the turkey at its feet position (t.x, t.y). `hidden` draws it tucked
  // inside a haystack instead of in the open.
  function draw(ctx, t, time) {
    var w = width(t), h = height(t);
    var sq = t.squash;
    var sx = 1 + sq, sy = 1 - sq;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(sx, sy);
    if (t.invuln > 0 && Math.floor(time * 14) % 2 === 0 && t.dash <= 0) ctx.globalAlpha = 0.45;
    if (t.hidden > 0) {
      // Tucked in hay: only eyes and tail peeking out of a golden mound.
      ctx.fillStyle = '#d9a441';
      ctx.beginPath(); ctx.ellipse(0, -16, 46, 20, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#a87c22'; ctx.lineWidth = 2;
      for (var i = -3; i <= 3; i++) {
        ctx.beginPath(); ctx.moveTo(i * 11, -14); ctx.lineTo(i * 13, -30 - Math.abs(i)); ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-6, -26, 4, 0, Math.PI * 2); ctx.arc(6, -26, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1d1d1d';
      ctx.beginPath(); ctx.arc(-6, -26, 2, 0, Math.PI * 2); ctx.arc(6, -26, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }
    var bob = t.onGround && t.sliding <= 0 ? Math.sin(t.runPhase) * 2 : 0;
    ctx.translate(0, bob);
    var legSwing = t.onGround ? Math.sin(t.runPhase) * 8 : 6;
    // legs
    ctx.strokeStyle = '#e8862e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(-6 + legSwing, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(8 - legSwing, 0); ctx.stroke();
    // tail fan
    var tailCols = ['#b23a12', '#e8701a', '#ffc93c', '#7a4a1f', '#d9381e'];
    for (var f = 0; f < 5; f++) {
      var ang = -0.9 + f * 0.45;
      ctx.save(); ctx.translate(-w / 2 + 4, -h + 26); ctx.rotate(ang);
      ctx.fillStyle = tailCols[f];
      ctx.beginPath(); ctx.ellipse(-14, 0, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // body
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath(); ctx.ellipse(0, -h / 2 - 4, w / 2, h / 2 - 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a9713a';
    ctx.beginPath(); ctx.ellipse(4, -h / 2 - 2, w / 2 - 8, h / 2 - 8, 0, 0, Math.PI * 2); ctx.fill();
    // wing
    ctx.fillStyle = '#6b3f1d';
    ctx.beginPath(); ctx.ellipse(-2, -h / 2 - 2, 16, 10, -0.4, 0, Math.PI * 2); ctx.fill();
    // head + neck
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(w / 2 - 12, -h - 8, 12, 22);
    ctx.fillStyle = '#c98a4b';
    ctx.beginPath(); ctx.arc(w / 2 - 4, -h - 12, 13, 0, Math.PI * 2); ctx.fill();
    // beak + wattle + snood
    ctx.fillStyle = '#f5a623';
    ctx.beginPath(); ctx.moveTo(w / 2 + 6, -h - 14); ctx.lineTo(w / 2 + 20, -h - 10); ctx.lineTo(w / 2 + 6, -h - 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9381e';
    ctx.beginPath(); ctx.ellipse(w / 2 + 2, -h - 2, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
    // eye
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(w / 2 - 2, -h - 16, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1d1d1d'; ctx.beginPath(); ctx.arc(w / 2 - 1, -h - 16, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  window.TR_TURKEY = { create: create, update: update, draw: draw, jump: jump, slide: slide, dash: dash, hide: hide, box: box, width: width, height: height };
})();
