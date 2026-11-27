// WebAudio synthesized sounds only — no audio files. A tiny oscillator helper
// builds chirps, blips, thuds, alarms and a victory jingle. M toggles mute.
(function () {
  'use strict';
  var ctx = null;
  var muted = false;
  var alarmTimer = null;

  function ac() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, slideTo, delay) {
    if (muted) return;
    var c = ac(); if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol || 0.15, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, delay) {
    if (muted) return;
    var c = ac(); if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var len = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = c.createBufferSource(), g = c.createGain();
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.buffer = buf; src.connect(g); g.connect(c.destination);
    src.start(t0);
  }

  window.TR_AUDIO = {
    unlock: function () { ac(); },
    isMuted: function () { return muted; },
    toggleMute: function () { muted = !muted; return muted; },
    jump: function () { tone(520, 0.14, 'sine', 0.16, 880); },
    doubleJump: function () { tone(660, 0.12, 'sine', 0.14, 1100); },
    corn: function () { tone(880, 0.08, 'triangle', 0.18); tone(1320, 0.1, 'triangle', 0.14, null, 0.06); },
    feather: function () { tone(1200, 0.09, 'sine', 0.12, 1600); },
    thud: function () { noise(0.18, 0.3); tone(140, 0.2, 'sine', 0.25, 60); },
    dash: function () { noise(0.15, 0.12); tone(300, 0.15, 'sawtooth', 0.06, 900); },
    hide: function () { tone(420, 0.12, 'triangle', 0.12, 240); },
    alarm: function () { tone(740, 0.12, 'square', 0.08, 740); tone(560, 0.12, 'square', 0.08, 560, 0.14); },
    stage: function () { tone(523, 0.12, 'triangle', 0.15); tone(659, 0.12, 'triangle', 0.15, null, 0.1); tone(784, 0.18, 'triangle', 0.15, null, 0.2); },
    victory: function () {
      var seq = [523, 659, 784, 1047, 784, 1047, 1319];
      for (var i = 0; i < seq.length; i++) tone(seq[i], 0.22, 'triangle', 0.16, null, i * 0.13);
    },
    caught: function () { tone(392, 0.25, 'sawtooth', 0.12, 196); tone(196, 0.5, 'sawtooth', 0.12, 98, 0.22); },
  };
})();
