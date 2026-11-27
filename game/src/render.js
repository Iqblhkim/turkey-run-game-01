// All scene drawing: parallax background, obstacles, pickups, knives,
// HUD, title screen, end screens, stage banners and particles.
(function () {
  'use strict';
  var C = window.TR_CONFIG;
  var P = C.PALETTE;

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function text(ctx, s, x, y, font, color, align) {
    ctx.font = font;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  function outlineText(ctx, s, x, y, font, color, align) {
    ctx.font = font; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(58,36,18,0.85)';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }

  function drawBackground(ctx, W, H, stage, scrollX, world, time) {
    var st = C.STAGES[stage];
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, st.skyTop); g.addColorStop(0.6, st.sky); g.addColorStop(1, '#ffe9b8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var groundY = H * 0.78;
    // Sun with a sleepy face (it is Thanksgiving morning).
    var sx = W - 180, sy = 90;
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath(); ctx.arc(sx, sy, 42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f5a623';
    ctx.beginPath(); ctx.arc(sx, sy, 32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2412';
    ctx.beginPath(); ctx.arc(sx - 10, sy - 4, 3, 0, Math.PI * 2); ctx.arc(sx + 10, sy - 4, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx, sy + 6, 10, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    // Clouds drift slowly.
    ctx.fillStyle = 'rgba(255,250,235,0.9)';
    for (var i = 0; i < world.clouds.length; i++) {
      var cl = world.clouds[i];
      var cx = ((cl.x - scrollX * 0.05 + cl.v * time) % (W + 300)) - 150;
      ctx.beginPath();
      ctx.ellipse(cx, cl.y, 46 * cl.s, 16 * cl.s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 30 * cl.s, cl.y + 4, 34 * cl.s, 13 * cl.s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 32 * cl.s, cl.y + 5, 30 * cl.s, 12 * cl.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Rolling hills.
    ctx.fillStyle = '#8fae54';
    for (var j = 0; j < world.hills.length; j++) {
      var hl = world.hills[j];
      var hx = ((hl.x - scrollX * 0.2) % (W + 500)) - 250;
      ctx.beginPath(); ctx.ellipse(hx, groundY + 6, hl.w / 2, hl.h, 0, Math.PI, 0); ctx.fill();
    }
    // Stage scenery: barn in stage 1, kitchen windows in stage 2.
    if (stage === 1) {
      var bx = W * 0.72 - (scrollX * 0.35 % 900);
      ctx.fillStyle = '#a83c22'; ctx.fillRect(bx, groundY - 150, 190, 150);
      ctx.fillStyle = '#7e2a16';
      ctx.beginPath(); ctx.moveTo(bx - 12, groundY - 150); ctx.lineTo(bx + 95, groundY - 205); ctx.lineTo(bx + 202, groundY - 150); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff3d6'; ctx.fillRect(bx + 78, groundY - 96, 34, 96);
      ctx.strokeStyle = '#5a1f10'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx + 78, groundY - 96); ctx.lineTo(bx + 112, groundY - 62); ctx.moveTo(bx + 112, groundY - 96); ctx.lineTo(bx + 78, groundY - 62); ctx.stroke();
    }
    if (stage === 2) {
      // Kitchen wall + windows along the horizon line, below the HUD bar.
      ctx.fillStyle = 'rgba(120,50,20,0.35)';
      ctx.fillRect(0, groundY - 215, W, 115);
      ctx.fillStyle = 'rgba(255,217,74,0.9)';
      for (var wnd = 0; wnd < 4; wnd++) {
        var wx = 80 + wnd * 300;
        ctx.fillRect(wx, groundY - 190, 120, 70);
        ctx.fillStyle = '#7e2a16'; ctx.fillRect(wx + 56, groundY - 190, 8, 70); ctx.fillStyle = 'rgba(255,217,74,0.9)';
      }
      text(ctx, 'THE KITCHEN — THANKSGIVING DAY', W / 2, 66, 'bold 15px Georgia, serif', 'rgba(255,243,214,0.9)', 'center');
    }
    // Ground + grass + fence posts scrolling past.
    ctx.fillStyle = st.ground; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = st.grass; ctx.fillRect(0, groundY, W, 14);
    ctx.fillStyle = '#e8c07a';
    for (var fx = -((scrollX * 0.9) % 90); fx < W; fx += 90) {
      ctx.fillRect(fx, groundY - 34, 7, 40);
      ctx.fillRect(fx - 40, groundY - 30, 80, 5);
      ctx.fillRect(fx - 40, groundY - 18, 80, 5);
    }
    // Falling leaves in the farmyard.
    if (stage === 0) {
      ctx.fillStyle = 'rgba(232,112,26,0.8)';
      for (var lf = 0; lf < 8; lf++) {
        var lx = (lf * 173 + time * 30 - scrollX * 0.3) % (W + 40);
        if (lx < 0) lx += W + 40;
        var ly = 60 + ((lf * 97 + time * 40) % 260);
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(Math.sin(time * 2 + lf) * 0.6);
        ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
    return groundY;
  }

  function drawObstacle(ctx, o, groundY, time) {
    ctx.save();
    if (o.kind === 'fence') {
      ctx.fillStyle = '#7a4a1f';
      ctx.fillRect(o.x, groundY - 52, 6, 52); ctx.fillRect(o.x + 38, groundY - 52, 6, 52);
      ctx.fillStyle = '#a9713a';
      ctx.fillRect(o.x - 4, groundY - 48, 52, 8); ctx.fillRect(o.x - 4, groundY - 28, 52, 8);
    } else if (o.kind === 'bale') {
      ctx.fillStyle = '#d9a441';
      ctx.beginPath(); ctx.arc(o.x + 31, groundY - 29, 29, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a87c22'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(o.x + 31, groundY - 29, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(o.x + 31, groundY - 29, 10, 0, Math.PI * 2); ctx.stroke();
    } else if (o.kind === 'branch') {
      ctx.fillStyle = '#5d8a35';
      ctx.beginPath(); ctx.ellipse(o.x + 35, groundY - 58, 40, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a4a1f'; ctx.fillRect(o.x, groundY - 66, 70, 8);
      text(ctx, 'SLIDE!', o.x + 35, groundY - 92, 'bold 13px Georgia, serif', '#d9381e', 'center');
    } else if (o.kind === 'mud') {
      ctx.fillStyle = '#5a3a1a';
      ctx.beginPath(); ctx.ellipse(o.x + 55, groundY - 4, 58, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a5230';
      ctx.beginPath(); ctx.ellipse(o.x + 40, groundY - 5, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(o.x + 72, groundY - 5, 14, 3, 0, 0, Math.PI * 2); ctx.fill();
    } else if (o.kind === 'oven') {
      var glow = 0.6 + 0.4 * Math.sin(time * 6 + o.x);
      ctx.fillStyle = 'rgba(255,90,20,' + (0.25 * glow) + ')';
      ctx.beginPath(); ctx.ellipse(o.x + 46, groundY - 6, 70, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a3a3a'; rr(ctx, o.x, groundY - 34, 92, 34, 5); ctx.fill();
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.moveTo(o.x + 18, groundY - 8); ctx.lineTo(o.x + 30, groundY - 30); ctx.lineTo(o.x + 42, groundY - 10);
      ctx.lineTo(o.x + 54, groundY - 32); ctx.lineTo(o.x + 66, groundY - 10); ctx.lineTo(o.x + 78, groundY - 26);
      ctx.lineTo(o.x + 84, groundY - 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath(); ctx.arc(o.x + 46, groundY - 14, 6, 0, Math.PI * 2); ctx.fill();
      text(ctx, 'HOT!', o.x + 46, groundY - 52, 'bold 14px Georgia, serif', '#ff5a1a', 'center');
    } else if (o.kind === 'pitchfork') {
      ctx.strokeStyle = '#8a8f96'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(o.x + 13, groundY); ctx.lineTo(o.x + 13, groundY - 52); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(o.x + 3, groundY - 52); ctx.lineTo(o.x + 1, groundY - 66);
      ctx.moveTo(o.x + 13, groundY - 52); ctx.lineTo(o.x + 13, groundY - 68);
      ctx.moveTo(o.x + 23, groundY - 52); ctx.lineTo(o.x + 25, groundY - 66);
      ctx.stroke();
    } else if (o.kind === 'haystack') {
      ctx.fillStyle = '#d9a441';
      ctx.beginPath(); ctx.ellipse(o.x + 35, groundY - 20, 40, 26, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#a87c22'; ctx.lineWidth = 2;
      for (var i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(o.x + 35 + i * 12, groundY - 22); ctx.lineTo(o.x + 35 + i * 14, groundY - 44 - Math.abs(i)); ctx.stroke();
      }
      text(ctx, 'H = HIDE', o.x + 35, groundY - 66, 'bold 12px Georgia, serif', '#3a2412', 'center');
    }
    ctx.restore();
  }

  function drawPickup(ctx, p, time) {
    ctx.save();
    ctx.translate(p.x, p.y + Math.sin(p.phase) * 3);
    if (p.kind === 'feather') {
      ctx.rotate(0.5 + Math.sin(time * 2 + p.phase) * 0.2);
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath(); ctx.ellipse(0, 0, 5, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c98a4b'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke();
    } else {
      var gold = p.kind === 'goldenCorn';
      ctx.fillStyle = gold ? '#ffd94a' : '#ffc93c';
      ctx.beginPath(); ctx.ellipse(0, 0, 10, 16, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = gold ? '#fff3d6' : '#e8a90c';
      for (var r = -1; r <= 1; r++) { ctx.beginPath(); ctx.arc(r * 5, -6, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(r * 5, 2, 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#5d8a35';
      ctx.beginPath(); ctx.ellipse(0, 16, 8, 4, 0.4, 0, Math.PI * 2); ctx.fill();
      if (gold) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 20 + Math.sin(time * 5) * 2, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
  }

  function drawKnife(ctx, k, groundY) {
    if (k.warn > 0) {
      ctx.save();
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(k.warn * 30);
      ctx.fillStyle = '#d9381e';
      ctx.beginPath(); ctx.ellipse(k.x, groundY - 2, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      text(ctx, '!', k.x, groundY - 90, 'bold 26px Georgia, serif', '#d9381e', 'center');
      return;
    }
    ctx.save();
    ctx.translate(k.x, k.y);
    ctx.rotate(0.35);
    ctx.fillStyle = '#c8ccd2';
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(7, -4); ctx.lineTo(7, 8); ctx.lineTo(-7, 8); ctx.lineTo(-7, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a2412'; ctx.fillRect(-6, 8, 12, 16);
    ctx.restore();
  }

  function drawHUD(ctx, W, H, G, world) {
    var stage = C.STAGES[G.stage];
    ctx.fillStyle = 'rgba(58,36,18,0.82)';
    rr(ctx, 0, 0, W, 54, 0); ctx.fill();
    text(ctx, 'SCORE ' + Math.floor(G.score), 16, 20, 'bold 20px Georgia, serif', '#fff3d6');
    text(ctx, Math.floor(G.distance) + ' m / 1500 m', 16, 42, 'bold 14px Georgia, serif', '#ffd94a');
    text(ctx, stage.name, W / 2, 20, 'bold 18px Georgia, serif', '#fff3d6', 'center');
    text(ctx, 'SPEED ' + Math.round(G.speed) + ' px/s', W / 2, 42, '13px Georgia, serif', '#e8c07a', 'center');
    // Hearts (left of the corn counter, never overlapping it)
    for (var i = 0; i < C.MAX_HEARTS; i++) {
      var hx = W - 560 + i * 30, hy = 20;
      ctx.fillStyle = i < G.hearts ? '#d9381e' : 'rgba(255,243,214,0.25)';
      ctx.beginPath();
      ctx.moveTo(hx, hy + 7);
      ctx.bezierCurveTo(hx - 12, hy - 4, hx - 5, hy - 12, hx, hy - 4);
      ctx.bezierCurveTo(hx + 5, hy - 12, hx + 12, hy - 4, hx, hy + 7);
      ctx.fill();
    }
    text(ctx, 'CORN ' + G.corn + '  (' + G.corn * 100 + ' pts)', W - 450, 20, 'bold 15px Georgia, serif', '#ffc93c');
    text(ctx, 'FEATHERS ' + G.feathers, W - 450, 42, '13px Georgia, serif', '#fff3d6');
    // Farmer proximity bar (flush inside the right edge)
    var bw = 140, bx = W - 222, by = 62;
    ctx.fillStyle = 'rgba(58,36,18,0.7)'; rr(ctx, bx - 8, by - 6, 222, 26, 6); ctx.fill();
    text(ctx, 'FARMER', bx, by + 7, 'bold 12px Georgia, serif', '#fff3d6');
    ctx.fillStyle = '#3a2412'; ctx.fillRect(bx + 62, by, bw, 10);
    var danger = 1 - Math.max(0, Math.min(1, (G.farmerGap - C.FARMER_CATCH_GAP) / (C.FARMER_BASE_GAP - C.FARMER_CATCH_GAP)));
    ctx.fillStyle = danger > 0.66 ? '#d9381e' : danger > 0.33 ? '#e8701a' : '#5d8a35';
    ctx.fillRect(bx + 62, by, bw * danger, 10);
    if (G.muted) text(ctx, 'MUTED (M)', 16, 70, '12px Georgia, serif', '#e8c07a');
    // Stage banner
    if (G.banner > 0) {
      var a = Math.min(1, G.banner);
      ctx.save(); ctx.globalAlpha = a;
      outlineText(ctx, C.STAGES[G.stage].name, W / 2, H * 0.32, 'bold 44px Georgia, serif', '#fff3d6', 'center');
      if (G.stage === 2) outlineText(ctx, 'DODGE THE OVEN!', W / 2, H * 0.32 + 44, 'bold 20px Georgia, serif', '#ff7a1a', 'center');
      if (G.stage === 1) outlineText(ctx, 'THE FARMER IS FASTER HERE', W / 2, H * 0.32 + 44, 'bold 18px Georgia, serif', '#ffd94a', 'center');
      ctx.restore();
    }
    // Popups (dark outline so they read on the orange sky)
    ctx.font = 'bold 18px Georgia, serif'; ctx.textAlign = 'center';
    for (var j = 0; j < world.popups.length; j++) {
      var pp = world.popups[j];
      ctx.globalAlpha = Math.min(1, pp.life);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(58,36,18,0.9)';
      ctx.strokeText(pp.text, pp.x, pp.y);
      ctx.fillStyle = pp.color;
      ctx.fillText(pp.text, pp.x, pp.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(ctx, world) {
    for (var i = 0; i < world.particles.length; i++) {
      var p = world.particles[i];
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color || '#c9a06a';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function button(ctx, x, y, w, h, label) {
    ctx.fillStyle = '#b23a12'; rr(ctx, x - 3, y - 3, w + 6, h + 6, 10); ctx.fill();
    ctx.fillStyle = '#e8701a'; rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 22px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    return { x: x, y: y, w: w, h: h };
  }

  function drawTitle(ctx, W, H, G, world, time) {
    drawBackground(ctx, W, H, 0, time * 20, world, time);
    var groundY = H * 0.78;
    // Big hero turkey, centre-left, farmer silhouette lurking right.
    ctx.save();
    ctx.translate(W * 0.30, groundY);
    ctx.scale(1.9, 1.9);
    var hero = window.TR_TURKEY.create(0, 0);
    hero.runPhase = Math.sin(time * 2) * 0.4;
    window.TR_TURKEY.draw(ctx, hero, time);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.translate(W * 0.78, groundY);
    ctx.scale(1.5, 1.5);
    var f = window.TR_FARMER.create(0, 0);
    window.TR_FARMER.draw(ctx, f, time);
    ctx.restore();
    outlineText(ctx, 'TURKEY RUN', W / 2, H * 0.16, 'bold 76px Georgia, serif', '#ffc93c', 'center');
    outlineText(ctx, 'THANKSGIVING ESCAPE', W / 2, H * 0.16 + 58, 'bold 26px Georgia, serif', '#fff3d6', 'center');
    text(ctx, 'Outrun the farmer. Dodge the oven. Reach the forest — 1500 m to freedom!', W / 2, H * 0.16 + 96, '16px Georgia, serif', '#3a2412', 'center');
    var btn = button(ctx, W / 2 - 130, H * 0.62, 260, 56, '▶  START  (SPACE)');
    text(ctx, 'SPACE / ↑ / W jump (x2)    ↓ / S slide    SHIFT dash    H hide in hay    P pause    M mute', W / 2, H * 0.62 + 84, '15px Georgia, serif', '#3a2412', 'center');
    text(ctx, 'Click the canvas to jump. Best score: ' + (G.best || 0), W / 2, H * 0.62 + 112, 'bold 15px Georgia, serif', '#3a2412', 'center');
    return { startBtn: btn, groundY: groundY };
  }

  function drawEnd(ctx, W, H, G, world, time) {
    var escaped = G.state === 'escaped';
    drawBackground(ctx, W, H, escaped ? 0 : 2, time * 10, world, time);
    var groundY = H * 0.78;
    ctx.fillStyle = 'rgba(58,36,18,0.55)'; ctx.fillRect(0, 0, W, H);
    if (escaped) {
      // Hero turkey at the left, clear of the stats panel.
      ctx.save(); ctx.translate(W * 0.16, groundY); ctx.scale(1.7, 1.7);
      var hero = window.TR_TURKEY.create(0, 0); window.TR_TURKEY.draw(ctx, hero, time); ctx.restore();
      outlineText(ctx, 'ESCAPED!', W / 2, H * 0.2, 'bold 72px Georgia, serif', '#7ddb4a', 'center');
      outlineText(ctx, 'You made it to the forest — no Thanksgiving dinner today!', W / 2, H * 0.2 + 56, 'bold 20px Georgia, serif', '#fff3d6', 'center');
    } else {
      ctx.save(); ctx.translate(W * 0.16, groundY); ctx.scale(1.5, 1.5);
      var fr = window.TR_FARMER.create(0, 0); window.TR_FARMER.draw(ctx, fr, time); ctx.restore();
      outlineText(ctx, 'CAUGHT!', W / 2, H * 0.2, 'bold 72px Georgia, serif', '#ff6a4a', 'center');
      outlineText(ctx, 'The farmer got you… dinner is served. Better luck next run!', W / 2, H * 0.2 + 56, 'bold 20px Georgia, serif', '#fff3d6', 'center');
    }
    var panelY = H * 0.42;
    ctx.fillStyle = 'rgba(255,243,214,0.95)'; rr(ctx, W / 2 - 260, panelY, 520, 120, 12); ctx.fill();
    ctx.fillStyle = '#3a2412'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('SCORE   ' + Math.floor(G.score), W / 2 - 230, panelY + 26);
    ctx.fillText('DISTANCE   ' + Math.floor(G.distance) + ' m', W / 2 - 230, panelY + 58);
    ctx.font = '18px Georgia, serif';
    ctx.fillText('Corn ' + G.corn + '  •  Feathers ' + G.feathers + '  •  Best ' + (G.best || 0), W / 2 - 230, panelY + 92);
    var btn = button(ctx, W / 2 - 130, panelY + 142, 260, 56, '↻  RESTART  (R)');
    text(ctx, 'Press R or click RESTART', W / 2, panelY + 226, '15px Georgia, serif', '#fff3d6', 'center');
    return { restartBtn: btn };
  }

  function drawPause(ctx, W, H) {
    ctx.fillStyle = 'rgba(58,36,18,0.6)'; ctx.fillRect(0, 0, W, H);
    outlineText(ctx, 'PAUSED', W / 2, H * 0.4, 'bold 56px Georgia, serif', '#fff3d6', 'center');
    text(ctx, 'Press P to keep running — the farmer waits for no turkey.', W / 2, H * 0.4 + 52, '17px Georgia, serif', '#fff3d6', 'center');
  }

  window.TR_RENDER = {
    drawBackground: drawBackground, drawObstacle: drawObstacle, drawPickup: drawPickup,
    drawKnife: drawKnife, drawHUD: drawHUD, drawParticles: drawParticles,
    drawTitle: drawTitle, drawEnd: drawEnd, drawPause: drawPause, button: button,
    text: text, outlineText: outlineText,
  };
})();
