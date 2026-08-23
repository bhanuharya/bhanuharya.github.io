/**
 * Joy Division "Unknown Pleasures" (Pulsar PSR B1919+21) Wave Generator
 * High-performance, zero-dependency HTML5 Canvas stacked wave visualizer.
 */
(function() {
  'use strict';

  var canvas, ctx;
  var animFrameId = null;
  var isRunning = false;
  var isVisible = true;
  var linesCount = 46;
  var time = 0;
  var mouseX = -1;
  var mouseY = -1;
  var mouseTargetX = -1;
  var mouseTargetY = -1;
  var container = null;
  var colorMode = 'auto'; // 'auto', '#ffffff', etc.

  // Precomputed seeds for each line's unique characteristics
  var lineSeeds = [];
  function initSeeds(count) {
    lineSeeds = [];
    for (var i = 0; i < count; i++) {
      lineSeeds.push({
        freq1: 0.02 + Math.random() * 0.02,
        freq2: 0.04 + Math.random() * 0.03,
        speed: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        noiseScale: 0.7 + Math.random() * 0.6,
        peakCenter: 0.5 + (Math.random() - 0.5) * 0.15,
        peakWidth: 0.14 + Math.random() * 0.06
      });
    }
  }

  function getThemeStrokeColor() {
    if (colorMode && colorMode !== 'auto') return colorMode;
    var theme = document.documentElement.getAttribute('data-theme') || 'default';
    if (theme === 'matrix') return '#50fa7b';
    if (theme === 'amber') return '#ffb000';
    if (theme === 'cyber') return '#00f0ff';
    if (theme === 'solaris') return '#38bdf8';
    return '#ffffff';
  }

  function resizeCanvas() {
    if (!canvas || !container) return;
    var rect = container.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = rect.width || 640;
    var h = container.clientHeight || 220;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    if (!isRunning || !isVisible || !canvas || !ctx) return;

    var w = parseFloat(canvas.style.width) || (canvas.width / (window.devicePixelRatio || 1));
    var h = parseFloat(canvas.style.height) || (canvas.height / (window.devicePixelRatio || 1));
    var strokeColor = getThemeStrokeColor();

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    time += 0.02;

    // Smooth mouse interpolation
    mouseX += (mouseTargetX - mouseX) * 0.1;
    mouseY += (mouseTargetY - mouseY) * 0.1;

    var padTop = 18;
    var padBottom = 22;
    var usableH = h - padTop - padBottom;
    var stepY = usableH / Math.max(1, linesCount - 1);
    var xStep = Math.max(2, Math.floor(w / 120));

    for (var i = 0; i < linesCount; i++) {
      var seed = lineSeeds[i] || lineSeeds[0];
      var baseY = padTop + i * stepY;

      ctx.beginPath();
      ctx.moveTo(0, baseY);

      for (var x = 0; x <= w; x += xStep) {
        var normX = x / w;

        // Gaussian bell curve centered around center
        var dx = (normX - seed.peakCenter) / seed.peakWidth;
        var bell = Math.exp(-0.5 * dx * dx);

        // Multi-frequency harmonic wave
        var wave1 = Math.sin(normX * 28 * seed.freq1 + time * seed.speed + seed.phase);
        var wave2 = Math.cos(normX * 45 * seed.freq2 - time * seed.speed * 1.3 + seed.phase);
        var wave3 = Math.sin(normX * 12 + time * 0.8) * Math.sin(time * 0.5 + i * 0.2);

        var rawWave = (wave1 * 0.55 + wave2 * 0.35 + wave3 * 0.25) * seed.noiseScale;

        // Mouse perturbation on wave
        var mouseDist = Math.hypot(x - mouseX, baseY - mouseY);
        var mouseEffect = 0;
        if (mouseX >= 0 && mouseDist < 120) {
          var mFactor = (1 - mouseDist / 120);
          mouseEffect = Math.sin(mouseDist * 0.1 - time * 4) * 18 * mFactor;
        }

        var rowWeight = Math.sin((i / Math.max(1, linesCount - 1)) * Math.PI);
        var maxAmp = 28 * rowWeight;
        var elevation = (rawWave * maxAmp * bell) + (mouseEffect * bell);

        var y = baseY - elevation;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(w, h + 20);
      ctx.lineTo(0, h + 20);
      ctx.closePath();

      // Occlusion fill: solid black under each wave line to block lines behind
      ctx.fillStyle = '#000000';
      ctx.fill();

      // Stroke the wave line
      ctx.lineWidth = (i % 2 === 0) ? 1.4 : 1.1;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }

    animFrameId = requestAnimationFrame(draw);
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    animFrameId = requestAnimationFrame(draw);
  }

  function stop() {
    isRunning = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  function init(containerEl, options) {
    options = options || {};
    container = containerEl || document.querySelector('[data-pulsar-waves]');
    if (!container) return;

    if (options.lines) linesCount = options.lines;
    if (options.color) colorMode = options.color;

    initSeeds(linesCount);

    canvas = container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'pulsar-canvas';
      canvas.setAttribute('aria-label', 'Joy Division PSR B1919+21 Pulsar Wave Simulation');
      container.appendChild(canvas);
    }

    ctx = canvas.getContext('2d');
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas, { passive: true });

    container.addEventListener('mousemove', function(e) {
      var rect = canvas.getBoundingClientRect();
      mouseTargetX = e.clientX - rect.left;
      mouseTargetY = e.clientY - rect.top;
    }, { passive: true });

    container.addEventListener('mouseleave', function() {
      mouseTargetX = -1;
      mouseTargetY = -1;
    }, { passive: true });

    container.addEventListener('touchmove', function(e) {
      if (e.touches && e.touches[0]) {
        var rect = canvas.getBoundingClientRect();
        mouseTargetX = e.touches[0].clientX - rect.left;
        mouseTargetY = e.touches[0].clientY - rect.top;
      }
    }, { passive: true });

    container.addEventListener('touchend', function() {
      mouseTargetX = -1;
      mouseTargetY = -1;
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function(entries) {
        isVisible = entries[0].isIntersecting;
        if (isVisible && isRunning && !animFrameId) {
          animFrameId = requestAnimationFrame(draw);
        }
      }, { threshold: 0.05 });
      obs.observe(container);
    }

    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      time = 1.0;
      draw();
      return;
    }

    start();
  }

  function toggle() {
    if (container) {
      var isHidden = container.hasAttribute('hidden') || container.style.display === 'none';
      if (isHidden) {
        container.removeAttribute('hidden');
        container.style.display = 'block';
        resizeCanvas();
        start();
        return true;
      } else {
        container.setAttribute('hidden', '');
        container.style.display = 'none';
        stop();
        return false;
      }
    }
    return false;
  }

  window.PulsarWaves = {
    init: init,
    start: start,
    stop: stop,
    toggle: toggle,
    setLines: function(n) {
      linesCount = Math.max(10, Math.min(100, parseInt(n, 10) || 46));
      initSeeds(linesCount);
      resizeCanvas();
    },
    setColor: function(c) {
      colorMode = c;
    },
    isRunning: function() {
      return isRunning;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      var c = document.querySelector('[data-pulsar-waves]');
      if (c) init(c);
    });
  } else {
    var c = document.querySelector('[data-pulsar-waves]');
    if (c) init(c);
  }
})();
