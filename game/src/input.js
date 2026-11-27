// Keyboard + mouse + touch input. Keys are edge-triggered through `pressed()`
// (consumed once per frame) and held through `down`. Clicks on canvas/buttons
// are reported as {x, y} in canvas pixels via `consumeClick()`.
(function () {
  'use strict';
  var held = {};
  var edge = {};
  var clicks = [];
  var touchJump = false;

  function keyName(e) {
    var k = e.key;
    if (k === ' ') return 'Space';
    if (k === 'ArrowUp') return 'ArrowUp';
    if (k === 'ArrowDown') return 'ArrowDown';
    if (k === 'Shift') return 'Shift';
    return k.length === 1 ? k.toUpperCase() : k;
  }
  window.addEventListener('keydown', function (e) {
    var k = keyName(e);
    if (['Space', 'ArrowUp', 'ArrowDown'].indexOf(k) >= 0) e.preventDefault();
    if (!held[k]) edge[k] = true;
    held[k] = true;
  });
  window.addEventListener('keyup', function (e) { held[keyName(e)] = false; });
  window.addEventListener('blur', function () { held = {}; edge = {}; });

  function attachCanvas(canvas) {
    function push(e) {
      var r = canvas.getBoundingClientRect();
      var x = (e.clientX - r.left) * (canvas.width / r.width);
      var y = (e.clientY - r.top) * (canvas.height / r.height);
      clicks.push({ x: x, y: y });
      touchJump = true;
    }
    canvas.addEventListener('mousedown', push);
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); push(e.touches[0]); }, { passive: false });
  }

  window.TR_INPUT = {
    attachCanvas: attachCanvas,
    down: function (k) { return !!held[k]; },
    pressed: function (k) { return !!edge[k]; },
    anyPressed: function (keys) { for (var i = 0; i < keys.length; i++) if (edge[keys[i]]) return keys[i]; return null; },
    consumeClick: function () { return clicks.length ? clicks.shift() : null; },
    hasClick: function () { return clicks.length > 0; },
    consumeTouchJump: function () { var t = touchJump; touchJump = false; return t; },
    endFrame: function () { edge = {}; },
  };
})();
