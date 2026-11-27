// The farmer: chases from the left, speeds up when the turkey pulls away,
// slows when the turkey stumbles, throws a telegraphed knife in later stages,
// and flashes SPOTTED! when he gets close.
(function () {
  'use strict';
  var C = window.TR_CONFIG;

  function create(x, groundY) {
    return {
      x: x, groundY: groundY, y: groundY, gap: C.FARMER_BASE_GAP,
      runPhase: 0, knifeTimer: 9, throwing: 0, spotted: 0, caught: false,
    };
  }

  function update(f, dt, turkey, speed, distance, onThrowKnife) {
    f.runPhase += dt * (9 + speed / 70);
    var targetGap = C.FARMER_BASE_GAP;
    if (turkey.inMud) targetGap *= 0.55;          // stumble lets him close in
    if (turkey.hidden > 0) targetGap = C.FARMER_BASE_GAP * 1.9; // loses the trail
    if (turkey.dash > 0) targetGap *= 1.35;       // dash pulls away
    // Gap closes when the turkey is slow, opens when it is fast.
    var drift = (targetGap - f.gap) * 0.25 * dt;
    f.gap += drift + (speed < 360 ? -14 * dt : 0);
    f.gap = Math.max(10, Math.min(560, f.gap));
    f.x = turkey.x - f.gap;
    f.spotted = f.gap < C.FARMER_SPOT_GAP ? 1 : Math.max(0, f.spotted - dt * 2);
    if (f.throwing > 0) f.throwing -= dt;
    // Knife throws only in the Barn and Kitchen, every ~8-12s.
    if (distance > 480 && !turkey.dead) {
      f.knifeTimer -= dt;
      if (f.knifeTimer <= 0) {
        f.knifeTimer = C.KNIFE_MIN_S + Math.random() * (C.KNIFE_MAX_S - C.KNIFE_MIN_S);
        f.throwing = 0.5;
        if (onThrowKnife) onThrowKnife(turkey.x);
      }
    }
    f.caught = f.gap <= C.FARMER_CATCH_GAP;
  }

  function draw(ctx, f, time) {
    var legSwing = Math.sin(f.runPhase) * 9;
    var bob = Math.abs(Math.sin(f.runPhase)) * 2;
    ctx.save();
    ctx.translate(f.x, f.groundY - bob);
    // legs
    ctx.strokeStyle = '#2e4a6b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, -34); ctx.lineTo(-4 + legSwing, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, -34); ctx.lineTo(6 - legSwing, 0); ctx.stroke();
    // overalls + shirt
    ctx.fillStyle = '#2e4a6b'; ctx.fillRect(-14, -62, 28, 30);
    ctx.fillStyle = '#c94f2e'; ctx.fillRect(-16, -78, 32, 20);
    ctx.fillStyle = '#2e4a6b'; ctx.fillRect(-12, -80, 6, 20); ctx.fillRect(6, -80, 6, 20);
    // arm pumping (holding a pitchfork when throwing)
    ctx.strokeStyle = '#c94f2e'; ctx.lineWidth = 5;
    var armSwing = Math.sin(f.runPhase) * 8;
    ctx.beginPath(); ctx.moveTo(10, -74); ctx.lineTo(22 + armSwing, -58); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, -74); ctx.lineTo(-20 - armSwing, -58); ctx.stroke();
    // head + straw hat
    ctx.fillStyle = '#f0c297';
    ctx.beginPath(); ctx.arc(0, -88, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d9a441';
    ctx.beginPath(); ctx.ellipse(0, -96, 20, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-11, -108, 22, 12);
    // moustache + angry eyes
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-8, -86, 16, 3);
    ctx.fillStyle = '#1d1d1d';
    ctx.beginPath(); ctx.arc(-4, -91, 1.8, 0, Math.PI * 2); ctx.arc(5, -91, 1.8, 0, Math.PI * 2); ctx.fill();
    // pitchfork in hand while throwing
    if (f.throwing > 0) {
      ctx.strokeStyle = '#8a8f96'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(24, -40); ctx.lineTo(34, -92); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(28, -92); ctx.lineTo(26, -104); ctx.moveTo(34, -92); ctx.lineTo(34, -104); ctx.moveTo(40, -92); ctx.lineTo(42, -104); ctx.stroke();
    }
    ctx.restore();
    // SPOTTED! flash above his head
    if (f.spotted > 0) {
      var a = 0.6 + 0.4 * Math.sin(time * 12);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#d9381e';
      ctx.font = 'bold 20px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('SPOTTED!', f.x, f.groundY - 132);
      ctx.restore();
    }
  }

  window.TR_FARMER = { create: create, update: update, draw: draw };
})();
