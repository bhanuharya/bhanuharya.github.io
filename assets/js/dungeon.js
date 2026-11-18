/* First-person corridor, drawn per pixel on a 320x180 canvas and scaled up
   with nearest-neighbour. Analytic ray cast against a straight hallway:
   walls at x = +-1, floor at y = -1, ceiling at y = +1.1. Ordered dithering
   down to 5 bits per channel gives the 15-bit colour banding of old consoles.
   Respects prefers-reduced-motion and the site's Animation setting by
   drawing a single still frame. */
(function () {
  'use strict';
  var canvas = document.getElementById('dungeon');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d', { alpha: false });

  var W = 320, H = 180;
  var img, buf;

  // 4x4 Bayer matrix, scaled to +-4 (one 5-bit step is 8)
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) { return (v / 16 - 0.5) * 8; });

  function themeTint() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'crimson') return [1.15, 0.72, 0.8];
    if (t === 'jade') return [0.7, 1.08, 0.95];
    if (t === 'parchment') return [1.1, 0.95, 0.75];
    return [0.82, 0.88, 1.18];
  }
  var tint = themeTint();

  function resize() {
    var r = canvas.getBoundingClientRect();
    var aspect = r.width > 0 && r.height > 0 ? r.width / r.height : 16 / 9;
    W = 320;
    H = Math.max(120, Math.min(360, Math.round(W / aspect)));
    canvas.width = W;
    canvas.height = H;
    img = ctx.createImageData(W, H);
    buf = img.data;
  }

  function hash(n) {
    var s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  }

  var DOOR_EVERY = 6;     // a door every 6 units, alternating sides
  var LAMP_EVERY = 4;
  var CEIL = 1.1, FLOOR = 1.0;

  function render(camZ, t) {
    var cx = W / 2 + Math.sin(t * 0.5) * 2;
    var bob = Math.sin(t * 3.2) * 0.012;
    var cy = H * 0.5;
    var f = W * 0.62;
    var sway = Math.sin(t * 0.37) * 0.05;
    var flick = 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7.3);
    var p = 0;

    for (var sy = 0; sy < H; sy++) {
      var dy = (cy - sy) / f + bob;
      for (var sx = 0; sx < W; sx++) {
        var dx = (sx - cx) / f + sway;
        var tw = 1 / Math.max(Math.abs(dx), 1e-4);
        var tf = dy > 0 ? CEIL / dy : FLOOR / Math.max(-dy, 1e-4);
        var tt, r, g, b, hz;

        if (tw < tf) {
          // wall
          tt = tw;
          hz = camZ + tt;
          var wy = dy * tt;            // -1 .. 1.1
          var side = dx < 0 ? 0 : 1;
          var seg = Math.floor(hz / DOOR_EVERY);
          var lz = hz - seg * DOOR_EVERY;
          var doorSide = seg % 2;
          var isDoor = side === doorSide && lz > 2.2 && lz < 3.5 && wy < 0.55;
          var isFrame = side === doorSide && lz > 2.08 && lz < 3.62 && wy < 0.67 && !isDoor;
          if (isDoor) {
            // wooden door with panels and a little window
            var dz = (lz - 2.2) / 1.3;
            var panel = (dz > 0.12 && dz < 0.88 && ((wy > -0.85 && wy < -0.2) || (wy > -0.1 && wy < 0.42))) ? 1 : 0;
            var grain = hash(Math.floor(wy * 40) + seg * 31) * 10;
            r = 74 + grain - panel * 14; g = 46 + grain * 0.6 - panel * 10; b = 30 - panel * 6;
            if (dz > 0.78 && dz < 0.84 && wy > -0.36 && wy < -0.3) { r = 220; g = 190; b = 90; } // knob
            if (wy > 0.1 && wy < 0.38 && dz > 0.25 && dz < 0.75) { // frosted window
              var lit = hash(seg * 7.7) > 0.55 ? 1 : 0;
              r = lit ? 230 : 40; g = lit ? 200 : 46; b = lit ? 120 : 70;
            }
          } else if (isFrame) {
            r = 40; g = 30; b = 24;
          } else if (wy < -0.72) {
            // skirting board
            r = 48; g = 40; b = 46;
            if (wy > -0.75) { r = 90; g = 84; b = 92; }
          } else {
            // plaster with a dado rail and old poster patches
            var band = wy < -0.1 ? 0.84 : 1;
            var n = hash(Math.floor(hz * 12) * 3.1 + Math.floor(wy * 12) * 17.3) * 10;
            r = (128 + n) * band; g = (126 + n) * band; b = (138 + n) * band;
            if (wy > -0.12 && wy < -0.08) { r = 70; g = 56; b = 50; }
            var pz = hz - Math.floor(hz / 9) * 9;
            if (side !== doorSide && pz > 4 && pz < 4.7 && wy > 0.05 && wy < 0.6) {
              var ph = hash(Math.floor(hz / 9) + side * 5);
              r = 160 + ph * 80; g = 60 + ph * 70; b = 70 + (1 - ph) * 90;
              if (wy > 0.42 && wy < 0.47) { r *= 0.5; g *= 0.5; b *= 0.5; }
            }
          }
        } else {
          tt = tf;
          hz = camZ + tt;
          var hx = dx * tt;
          if (dy > 0) {
            // ceiling tiles + fluorescent lamps
            var ux = hx * 2, uz = hz * 2;
            var grid = (Math.abs(ux - Math.round(ux)) < 0.04 || Math.abs(uz - Math.round(uz)) < 0.05) ? 0.7 : 1;
            r = 96 * grid; g = 98 * grid; b = 112 * grid;
            var lzc = hz - Math.floor(hz / LAMP_EVERY) * LAMP_EVERY;
            if (Math.abs(hx) < 0.16 && lzc > 1.6 && lzc < 2.4) {
              var broken = Math.floor(hz / LAMP_EVERY) % 5 === 3;
              var on = broken ? (flick > 0.93 ? 1 : 0.15) : 1;
              r = 255 * on; g = 250 * on; b = 228 * on;
            }
          } else {
            // checkerboard linoleum
            var chk = ((Math.floor(hx * 2.2 + 10) + Math.floor(hz * 2.2)) & 1);
            r = chk ? 132 : 64; g = chk ? 128 : 60; b = chk ? 120 : 74;
            // reflection of lamps
            var lzf = hz - Math.floor(hz / LAMP_EVERY) * LAMP_EVERY;
            var refl = Math.max(0, 1 - Math.abs(hx) * 3) * Math.max(0, 1 - Math.abs(lzf - 2) * 1.2);
            r += refl * 60; g += refl * 60; b += refl * 50;
          }
        }

        // lighting: pools under each lamp, falling off with distance
        var lampPhase = hz - Math.floor(hz / LAMP_EVERY) * LAMP_EVERY - 2;
        var pool = 0.45 + 0.75 * Math.exp(-lampPhase * lampPhase * 0.9);
        if (Math.floor(hz / LAMP_EVERY) % 5 === 3) pool = 0.35 + (pool - 0.35) * (flick > 0.93 ? 1 : 0.2);
        var fog = Math.exp(-tt * 0.19);
        var lightK = pool * fog;
        r = r * lightK * tint[0];
        g = g * lightK * tint[1];
        b = b * lightK * tint[2];

        // far end: a faint glow at the vanishing point
        var vx = (sx - cx) / W, vy = (sy - cy) / H;
        var glow = Math.max(0, 0.06 - (vx * vx + vy * vy)) * 500;
        r += glow * 0.6; g += glow * 0.7; b += glow * 1.2;

        // dither to 5 bits per channel
        var d = BAYER[(sy & 3) * 4 + (sx & 3)];
        r = ((r + d) >> 3) << 3; g = ((g + d) >> 3) << 3; b = ((b + d) >> 3) << 3;
        buf[p++] = r < 0 ? 0 : r > 255 ? 255 : r;
        buf[p++] = g < 0 ? 0 : g > 255 ? 255 : g;
        buf[p++] = b < 0 ? 0 : b > 255 ? 255 : b;
        buf[p++] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  function still() {
    return (reduce && reduce.matches) || document.documentElement.getAttribute('data-motion') === 'off';
  }

  var running = false, visible = true, last = 0, z = 0, clock = 0, raf = 0;
  var FRAME = 1000 / 24; // a PS1-ish frame rate, and cheaper

  function loop(now) {
    raf = 0;
    if (!running) return;
    if (now - last >= FRAME) {
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      clock += dt;
      z += dt * 0.9;
      render(z, clock);
    }
    raf = requestAnimationFrame(loop);
  }

  function update() {
    var should = visible && !document.hidden && !still();
    if (should && !running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    } else if (!should && running) {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    if (!running) render(z, clock);
  }

  resize();
  render(0, 0);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      update();
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', update);
  if (reduce && reduce.addEventListener) reduce.addEventListener('change', update);
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); render(z, clock); }, 150);
  });
  // Config changes (theme / motion) are announced by rpg.js
  document.addEventListener('rpg:config', function () {
    tint = themeTint();
    update();
    if (!running) render(z, clock);
  });
  update();
})();
