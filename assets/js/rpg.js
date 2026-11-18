/* bhanuharya@sec : the "game" bits.
   Config dialog, menu cursor + sounds, typewriter dialog, moon phase,
   reading-progress gauge, and "cleared" marks for posts you've read.
   Everything is stored in this browser only (localStorage), and every
   storage call is wrapped so private windows still work. */
(function () {
  'use strict';
  var root = document.documentElement;
  var KEY = 'rpg-config';
  var DEFAULTS = { theme: 'indigo', speed: 'normal', sound: 'off', scanlines: 'on', motion: 'on' };

  function load() {
    var c = {};
    try { c = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { c = {}; }
    var out = {};
    for (var k in DEFAULTS) out[k] = c[k] || DEFAULTS[k];
    out.theme = root.getAttribute('data-theme') || out.theme;
    return out;
  }
  var cfg = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  function apply() {
    root.setAttribute('data-theme', cfg.theme);
    root.setAttribute('data-scanlines', cfg.scanlines);
    root.setAttribute('data-motion', cfg.motion);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', { indigo: '#0c1240', crimson: '#3a0817', jade: '#082e27', parchment: '#e8d9b2' }[cfg.theme] || '#0c1240');
    var ev;
    try { ev = new CustomEvent('rpg:config', { detail: cfg }); } catch (e) { ev = document.createEvent('Event'); ev.initEvent('rpg:config', true, true); }
    document.dispatchEvent(ev);
  }

  function reducedMotion() {
    return cfg.motion === 'off' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ---------------- sound: tiny square-wave blips ---------------- */
  var actx = null;
  function blip(kind) {
    if (cfg.sound !== 'on') return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!actx) actx = new AC();
      if (actx.state === 'suspended') actx.resume();
      var notes = { move: [[880, 0.035]], ok: [[660, 0.05], [990, 0.07]], back: [[440, 0.05], [330, 0.07]], text: [[1320, 0.012]] }[kind] || [[880, 0.04]];
      var t = actx.currentTime;
      notes.forEach(function (n) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = 'square';
        o.frequency.value = n[0];
        g.gain.setValueAtTime(kind === 'text' ? 0.025 : 0.05, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + n[1]);
        o.connect(g); g.connect(actx.destination);
        o.start(t); o.stop(t + n[1] + 0.01);
        t += n[1];
      });
    } catch (e) {}
  }

  /* ---------------- config dialog ---------------- */
  var dlg = document.getElementById('config');
  var openBtn = document.getElementById('config-open');
  if (dlg && openBtn) {
    if (typeof dlg.showModal !== 'function') {
      openBtn.hidden = true; // very old browser: no <dialog>, keep defaults
    } else {
      var sync = function () {
        Array.prototype.forEach.call(dlg.querySelectorAll('input[type=radio]'), function (inp) {
          inp.checked = cfg[inp.name] === inp.value;
        });
      };
      openBtn.addEventListener('click', function () {
        sync();
        dlg.showModal();
        blip('ok');
      });
      dlg.addEventListener('change', function (e) {
        var t = e.target;
        if (!t || !t.name || !(t.name in DEFAULTS)) return;
        cfg[t.name] = t.value;
        save();
        apply();
        blip(t.name === 'sound' && t.value === 'on' ? 'ok' : 'move');
      });
      dlg.addEventListener('close', function () { blip('back'); openBtn.focus(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    }
  }

  /* ---------------- menus: cursor sounds, arrow keys, help bar ---------------- */
  function menuLinks() {
    return Array.prototype.slice.call(document.querySelectorAll('.site-nav a, .site-nav button, .cmd-menu a, .choices a, .quest-title a, .post-nav a'));
  }
  var lastHover = null;
  menuLinks().forEach(function (a) {
    a.addEventListener('mouseenter', function () { if (lastHover !== a) { lastHover = a; blip('move'); } });
    a.addEventListener('focus', function () { if (lastHover !== a) { lastHover = a; blip('move'); } });
    if (a.tagName === 'A') {
      a.addEventListener('click', function (e) {
        if (cfg.sound !== 'on' || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#' || a.target) return;
        e.preventDefault();
        blip('ok');
        setTimeout(function () { window.location.href = a.href; }, 140);
      });
    }
  });

  function rovingMenu(list, itemSel) {
    if (!list) return;
    list.addEventListener('keydown', function (e) {
      var items = Array.prototype.slice.call(list.querySelectorAll(itemSel));
      var i = items.indexOf(document.activeElement);
      if (i === -1) return;
      var next = -1;
      if (e.key === 'ArrowDown') next = (i + 1) % items.length;
      else if (e.key === 'ArrowUp') next = (i - 1 + items.length) % items.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = items.length - 1;
      if (next === -1) return;
      e.preventDefault();
      items[next].focus();
    });
  }
  rovingMenu(document.getElementById('cmd-menu'), 'a');
  rovingMenu(document.querySelector('.choices'), 'a');

  var help = document.getElementById('help-text');
  var cmd = document.getElementById('cmd-menu');
  if (help && cmd) {
    var setHelp = function (a) {
      Array.prototype.forEach.call(cmd.querySelectorAll('a'), function (x) { x.classList.toggle('is-active', x === a); });
      help.textContent = a.getAttribute('data-help') || '';
    };
    Array.prototype.forEach.call(cmd.querySelectorAll('a'), function (a) {
      a.addEventListener('mouseenter', function () { setHelp(a); });
      a.addEventListener('focus', function () { setHelp(a); });
    });
    var first = cmd.querySelector('a');
    if (first) setHelp(first);
  }

  /* ---------------- dialog box with typewriter text ---------------- */
  var box = document.getElementById('dialog');
  var linesEl = document.getElementById('dialog-lines');
  if (box && linesEl) {
    var lines = Array.prototype.map.call(linesEl.querySelectorAll('p'), function (p) { return p.textContent.trim(); });
    if (lines.length) {
      // full text stays in the DOM for screen readers; the animated copy is decorative
      linesEl.classList.add('visually-hidden');
      var shown = document.createElement('p');
      shown.className = 'dialog-text';
      shown.setAttribute('aria-hidden', 'true');
      box.appendChild(shown);
      var more = document.createElement('span');
      more.className = 'more';
      more.setAttribute('aria-hidden', 'true');
      box.appendChild(more);
      var next = document.createElement('button');
      next.type = 'button';
      next.className = 'dialog-next';
      next.setAttribute('aria-label', 'Next line of dialogue');
      box.appendChild(next);
      var hint = document.createElement('span');
      hint.className = 'dialog-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = 'CLICK';
      box.appendChild(hint);

      var idx = 0, pos = 0, timer = 0;
      var speeds = { slow: 55, normal: 26, instant: 0 };
      var finish = function () {
        clearTimeout(timer);
        timer = 0;
        shown.textContent = lines[idx];
        pos = lines[idx].length;
        box.setAttribute('data-typing', 'false');
        hint.textContent = idx === lines.length - 1 ? 'AGAIN' : 'NEXT';
      };
      var type = function () {
        var delay = speeds[cfg.speed];
        if (delay === undefined) delay = speeds.normal;
        if (!delay || reducedMotion()) { finish(); return; }
        box.setAttribute('data-typing', 'true');
        var step = function () {
          pos++;
          shown.textContent = lines[idx].slice(0, pos);
          if (pos % 3 === 0 && lines[idx].charAt(pos - 1) !== ' ') blip('text');
          if (pos >= lines[idx].length) { finish(); return; }
          var ch = lines[idx].charAt(pos - 1);
          timer = setTimeout(step, /[.,:!?]/.test(ch) ? delay * 6 : delay);
        };
        pos = 0;
        shown.textContent = '';
        timer = setTimeout(step, delay);
      };
      var advance = function () {
        if (timer) { finish(); return; }
        idx = (idx + 1) % lines.length;
        blip('ok');
        type();
      };
      next.addEventListener('click', advance);
      // start typing once the box is on screen
      if ('IntersectionObserver' in window) {
        var started = false;
        new IntersectionObserver(function (entries, obs) {
          if (!started && entries[0].isIntersecting) { started = true; obs.disconnect(); type(); }
        }).observe(box);
      } else {
        type();
      }
    }
  }

  /* ---------------- moon phase + clock ---------------- */
  var moonName = document.getElementById('moon-name');
  var moonIcon = document.getElementById('moon-icon');
  var clock = document.getElementById('moon-clock');
  if (moonName && moonIcon) {
    var SYNODIC = 29.530588853;
    var REF = Date.UTC(2000, 0, 6, 18, 14); // a known new moon
    var phase = (((Date.now() - REF) / 86400000) % SYNODIC + SYNODIC) % SYNODIC / SYNODIC;
    var names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    moonName.textContent = names[Math.floor(phase * 8 + 0.5) % 8];
    // lit part: outer half-circle on the lit side + an elliptical terminator
    var r = 13, c = 16;
    var k = Math.cos(phase * 2 * Math.PI);          // 1 new .. -1 full
    var waxing = phase < 0.5;
    var rx = Math.abs(k) * r;
    var outerSweep = waxing ? 1 : 0;
    var innerSweep = (waxing ? k > 0 : k < 0) ? 0 : 1;
    var d = 'M' + c + ' ' + (c - r) +
      ' A' + r + ' ' + r + ' 0 0 ' + outerSweep + ' ' + c + ' ' + (c + r) +
      ' A' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + innerSweep + ' ' + c + ' ' + (c - r) + 'Z';
    moonIcon.innerHTML = '<circle cx="16" cy="16" r="13" fill="#1c2147" stroke="#000" stroke-width="1"/>' +
      '<path d="' + d + '" fill="#eef1ff"/>' +
      '<circle cx="16" cy="16" r="13" fill="none" stroke="#9aa3c4" stroke-width="1"/>';
  }
  if (clock) {
    var days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    var tick = function () {
      var n = new Date();
      var h = n.getHours();
      var part = h < 5 ? 'Late night' : h < 11 ? 'Morning' : h < 15 ? 'Daytime' : h < 18 ? 'After school' : h < 23 ? 'Evening' : 'Late night';
      clock.textContent = days[n.getDay()] + ' · ' + part;
    };
    tick();
    setInterval(tick, 60000);
  }

  /* ---------------- reading progress + cleared quests ---------------- */
  var CLEARED = 'rpg-cleared';
  function getCleared() {
    try { return JSON.parse(localStorage.getItem(CLEARED) || '[]') || []; } catch (e) { return []; }
  }
  var article = document.querySelector('.post-content');
  if (article) {
    var gauge = document.createElement('div');
    gauge.className = 'exp-gauge';
    gauge.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('i');
    gauge.appendChild(fill);
    document.body.appendChild(gauge);
    var marked = false;
    var onScroll = function () {
      var rect = article.getBoundingClientRect();
      var total = rect.height - window.innerHeight * 0.6;
      var done = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
      fill.style.width = (done * 100).toFixed(1) + '%';
      if (!marked && done > 0.85) {
        marked = true;
        var list = getCleared();
        var here = window.location.pathname;
        if (list.indexOf(here) === -1) {
          list.push(here);
          try { localStorage.setItem(CLEARED, JSON.stringify(list.slice(-200))); } catch (e) {}
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  var cleared = getCleared();
  if (cleared.length) {
    Array.prototype.forEach.call(document.querySelectorAll('.quest[data-url]'), function (q) {
      if (cleared.indexOf(q.getAttribute('data-url')) === -1) return;
      var meta = q.querySelector('.quest-meta');
      if (!meta) return;
      var b = document.createElement('span');
      b.className = 'badge badge--clear';
      b.textContent = 'CLEARED';
      meta.appendChild(b);
    });
  }
})();
