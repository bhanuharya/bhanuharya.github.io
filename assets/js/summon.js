/* bhanuharya@sec : SUMMON.SYS
   - Config (phosphor colour, scanlines, motion), saved in localStorage
   - a sigil generated from each post's title (same title, same sigil)
   - the home page command prompt and the circle that shows a hovered entity's sigil
   - a short glitch when an entity is summoned (a link is followed)
   - moon phase, reading gauge, and "bound" marks on posts you've read
   Nothing leaves the browser. */
(function () {
  'use strict';
  var root = document.documentElement;
  var KEY = 'summon-config';
  var THEMES = ['green', 'amber', 'blood', 'ice'];
  var DEFAULTS = { theme: 'green', scanlines: 'on', motion: 'on' };

  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  var cfg = {};
  try { cfg = JSON.parse(load(KEY) || '{}') || {}; } catch (e) { cfg = {}; }
  for (var d in DEFAULTS) if (!cfg[d]) cfg[d] = DEFAULTS[d];
  cfg.theme = root.getAttribute('data-theme') || cfg.theme;

  function apply() {
    root.setAttribute('data-theme', cfg.theme);
    root.setAttribute('data-scanlines', cfg.scanlines);
    root.setAttribute('data-motion', cfg.motion);
  }
  function save() { store(KEY, JSON.stringify(cfg)); }
  function still() {
    return cfg.motion === 'off' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ---------------- config dialog ---------------- */
  var dlg = document.getElementById('config');
  var openBtn = document.getElementById('config-open');
  if (dlg && openBtn) {
    if (typeof dlg.showModal !== 'function') {
      openBtn.hidden = true;
    } else {
      openBtn.addEventListener('click', function () {
        Array.prototype.forEach.call(dlg.querySelectorAll('input[type=radio]'), function (inp) { inp.checked = cfg[inp.name] === inp.value; });
        dlg.showModal();
      });
      dlg.addEventListener('change', function (e) {
        var t = e.target;
        if (!t || !(t.name in DEFAULTS)) return;
        cfg[t.name] = t.value; save(); apply();
      });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', function () { openBtn.focus(); });
    }
  }

  /* ---------------- sigils ---------------- */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function f(n) { return Math.round(n * 100) / 100; }
  function at(r, a) { return f(r * Math.cos(a)) + ' ' + f(r * Math.sin(a)); }

  // star polygon {n/k}; compound stars (gcd > 1) become several polygons
  function starPath(n, k, r, rot) {
    var g = gcd(n, k), per = n / g, d = '';
    for (var s = 0; s < g; s++) {
      for (var i = 0; i < per; i++) {
        var idx = (s + i * k) % n;
        d += (i ? 'L' : 'M') + at(r, rot + idx * 2 * Math.PI / n);
      }
      d += 'Z';
    }
    return d;
  }

  function sigil(seed) {
    var R = rng(hash(String(seed)));
    var pick = function (arr) { return arr[Math.floor(R() * arr.length)]; };
    var out = [];
    var n = 5 + Math.floor(R() * 5);                     // 5..9 points
    var ks = [];
    for (var k = 2; k <= Math.floor((n - 1) / 2) || (k === 2 && n === 6); k++) ks.push(k);
    var kk = ks.length ? pick(ks) : 2;
    var down = R() < 0.45;                                 // point down: the inverted ones
    var rot = down ? Math.PI / 2 : -Math.PI / 2;
    out.push('<circle r="56" class="s-ring"/>');
    out.push('<circle r="50" class="s-main"/>');
    // glyph marks between the rings
    var marks = 6 + Math.floor(R() * 7);
    for (var m = 0; m < marks; m++) {
      var a = m / marks * Math.PI * 2 + R() * 0.2, kind = Math.floor(R() * 3);
      var c = at(53, a);
      if (kind === 0) out.push('<circle cx="' + c.split(' ')[0] + '" cy="' + c.split(' ')[1] + '" r="1.6" class="s-dot"/>');
      else if (kind === 1) out.push('<path d="M' + at(50, a) + 'L' + at(56, a) + '" class="s-main"/>');
      else out.push('<path d="M' + at(51, a - 0.05) + 'L' + at(55, a + 0.05) + 'M' + at(55, a - 0.05) + 'L' + at(51, a + 0.05) + '" class="s-ring"/>');
    }
    // the main star
    out.push('<path d="' + starPath(n, kk, 48, rot) + '" class="s-main"/>');
    // inner circle and a smaller shape
    var ir = 16 + Math.floor(R() * 10);
    out.push('<circle r="' + ir + '" class="s-ring"/>');
    var inner = pick([3, 4, 5]);
    out.push('<path d="' + starPath(inner, inner === 5 ? 2 : 1, ir - 3, down ? Math.PI / 2 : -Math.PI / 2) + '" class="s-red"/>');
    // spokes ending in small circles
    var spokes = 1 + Math.floor(R() * 3);
    for (var s2 = 0; s2 < spokes; s2++) {
      var va = rot + Math.floor(R() * n) * 2 * Math.PI / n;
      var end = at(48, va).split(' ');
      out.push('<path d="M' + at(ir, va) + 'L' + at(48, va) + '" class="s-ring"/>');
      out.push('<circle cx="' + end[0] + '" cy="' + end[1] + '" r="3.2" class="s-main"/>');
    }
    // centre
    out.push(R() < 0.5 ? '<circle r="2.6" class="s-reddot"/>' : '<path d="M0 -4 L3.5 2.5 L-3.5 2.5 Z" class="s-reddot" transform="rotate(' + (down ? 180 : 0) + ')"/>');
    return out.join('');
  }
  function sigilSVG(seed) {
    return '<svg viewBox="-60 -60 120 120" aria-hidden="true" focusable="false">' + sigil(seed) + '</svg>';
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-sigil]'), function (el) {
    el.innerHTML = sigilSVG(el.getAttribute('data-sigil'));
  });

  /* ---------------- summon: glitch, then follow the link ---------------- */
  var circleWrap = document.getElementById('circle-wrap');
  function flare() {
    if (!circleWrap) return;
    circleWrap.classList.remove('is-flaring'); void circleWrap.offsetWidth; circleWrap.classList.add('is-flaring');
  }
  function summon(url) {
    if (still()) { window.location.href = url; return; }
    flare();
    document.body.classList.add('glitch');
    setTimeout(function () { window.location.href = url; }, 260);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-summon]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target) return;
    e.preventDefault();
    summon(a.href);
  });
  window.addEventListener('pageshow', function () { document.body.classList.remove('glitch'); });

  /* ---------------- the circle shows a hovered entity's sigil ---------------- */
  var circleSigil = document.getElementById('circle-sigil');
  if (circleSigil) {
    var show = function (seed) {
      circleSigil.innerHTML = '<g transform="translate(300 300) scale(0.82)" class="sigil">' + sigil(seed) + '</g>';
    };
    show('Harya');
    Array.prototype.forEach.call(document.querySelectorAll('[data-sigil-for]'), function (el) {
      var on = function () { show(el.getAttribute('data-sigil-for')); };
      el.addEventListener('mouseenter', on);
      el.addEventListener('focus', on);
    });
    var list = document.getElementById('entities');
    if (list) list.addEventListener('mouseleave', function () { show('Harya'); });
  }

  /* ---------------- moon + clock ---------------- */
  var SYNODIC = 29.530588853, REF = Date.UTC(2000, 0, 6, 18, 14);
  var phase = (((Date.now() - REF) / 86400000) % SYNODIC + SYNODIC) % SYNODIC;
  var PHASES = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'last quarter', 'waning crescent'];
  var phaseName = PHASES[Math.floor(phase / SYNODIC * 8 + 0.5) % 8];
  var moonEl = document.getElementById('moon-name');
  if (moonEl) moonEl.textContent = phaseName.toUpperCase();
  var clockEl = document.getElementById('clock');
  function pad(n) { return String(n).padStart(2, '0'); }
  if (clockEl) {
    var tick = function () { var d = new Date(); clockEl.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()); };
    tick(); setInterval(tick, 30000);
  }

  /* ---------------- command prompt (home) ---------------- */
  var form = document.getElementById('prompt-form');
  var input = document.getElementById('prompt');
  var log = document.getElementById('console-log');
  var dataEl = document.getElementById('entity-data');
  if (form && input && log && dataEl) {
    var ents = [];
    try { ents = JSON.parse(dataEl.textContent) || []; } catch (e) { ents = []; }
    form.hidden = false;
    var hint = document.getElementById('prompt-hint');
    if (hint) hint.hidden = false;

    var line = function (text, cls) {
      var p = document.createElement('p');
      if (cls) p.className = cls;
      p.textContent = text;
      log.appendChild(p);
      return p;
    };
    var linkLine = function (prefix, e) {
      var p = document.createElement('p');
      p.appendChild(document.createTextNode(prefix));
      var a = document.createElement('a');
      a.href = e.url; a.setAttribute('data-summon', ''); a.textContent = e.title;
      p.appendChild(a);
      log.appendChild(p);
    };
    var find = function (q) {
      q = q.toLowerCase().trim();
      if (!q) return null;
      var num = q.replace(/^0+/, '');
      for (var i = 0; i < ents.length; i++) if (ents[i].id.replace(/^0+/, '') === num) return ents[i];
      for (var j = 0; j < ents.length; j++) if (ents[j].title.toLowerCase().indexOf(q) !== -1) return ents[j];
      return null;
    };
    var tagCounts = function () {
      var c = {};
      ents.forEach(function (e) { (e.tags || []).forEach(function (t) { c[t] = (c[t] || 0) + 1; }); });
      return c;
    };
    var go = function (url, label) { line('opening ' + label + '...', 'sys'); setTimeout(function () { summon(url); }, 200); };

    var COMMANDS = {
      help: function () {
        ['commands:',
          '  list              every entity',
          '  summon <id|word>  open an entity, e.g. summon 07',
          '  tags              every tag',
          '  tag <name>        entities with that tag',
          '  whoami            the operator',
          '  moon              tonight\'s phase',
          '  theme <colour>    green, amber, blood or ice',
          '  operator · terminal · rss · clear'].forEach(function (t) { line(t, 'out'); });
      },
      list: function () { ents.forEach(function (e) { linkLine(e.id + '  LV ' + e.lv + '  ' + e.align + '  ', e); }); },
      summon: function (arg) {
        if (!arg) { line('summon what? try: summon 07', 'err'); return; }
        var e = find(arg);
        if (!e) { line('no entity answers to "' + arg + '".', 'err'); return; }
        line('drawing the circle for ENTITY ' + e.id + '...', 'sys');
        if (circleSigil) circleSigil.innerHTML = '<g transform="translate(300 300) scale(0.82)" class="sigil">' + sigil(e.title) + '</g>';
        setTimeout(function () { summon(e.url); }, still() ? 0 : 450);
      },
      tags: function () {
        var c = tagCounts();
        Object.keys(c).sort().forEach(function (t) { line('#' + t + ' (' + c[t] + ')', 'out'); });
      },
      tag: function (arg) {
        var t = (arg || '').replace(/^#/, '').toLowerCase();
        var hits = ents.filter(function (e) { return (e.tags || []).indexOf(t) !== -1; });
        if (!hits.length) { line('no entity carries #' + t + '. try: tags', 'err'); return; }
        hits.forEach(function (e) { linkLine(e.id + '  ', e); });
      },
      whoami: function () { line('Harya/Wishnu. Information security around financial systems. Writes up local models, security tools and the agent setup at home.', 'out'); },
      moon: function () { line('moon: ' + phaseName + ', day ' + Math.floor(phase) + ' of the cycle.', 'out'); },
      theme: function (arg) {
        if (THEMES.indexOf(arg) === -1) { line('theme: ' + THEMES.join(', '), 'err'); return; }
        cfg.theme = arg; save(); apply(); line('phosphor set to ' + arg + '.', 'sys');
      },
      operator: function () { go('/about/', 'the operator file'); },
      terminal: function () { go('/terminal/', 'the terminal'); },
      rss: function () { go('/feed.xml', 'the feed'); },
      clear: function () { log.innerHTML = ''; },
      sudo: function () { line('operator is not in the sudoers file. This incident will be reported.', 'err'); },
      banish: function () { line('you cannot banish what you never summoned.', 'err'); }
    };
    COMMANDS.ls = COMMANDS.list; COMMANDS.about = COMMANDS.operator; COMMANDS.filter = COMMANDS.tag; COMMANDS.cls = COMMANDS.clear;

    var history = [], hpos = 0;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var raw = input.value.trim();
      input.value = '';
      if (!raw) return;
      history.push(raw); hpos = history.length;
      line(raw, 'cmd');
      var parts = raw.split(/\s+/), cmd = parts.shift().toLowerCase(), arg = parts.join(' ');
      if (COMMANDS[cmd]) COMMANDS[cmd](arg);
      else if (find(raw) && /^\d+$/.test(raw)) COMMANDS.summon(raw);
      else line('command not found: ' + cmd + '. try: help', 'err');
      log.scrollTop = log.scrollHeight;
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' && hpos > 0) { hpos--; input.value = history[hpos]; e.preventDefault(); }
      else if (e.key === 'ArrowDown') { hpos = Math.min(history.length, hpos + 1); input.value = history[hpos] || ''; e.preventDefault(); }
    });
  }

  /* ---------------- reading gauge + bound marks ---------------- */
  var BOUND = 'summon-bound';
  function bound() { try { return JSON.parse(load(BOUND) || '[]') || []; } catch (e) { return []; } }
  var article = document.querySelector('.post-content');
  if (article) {
    var gauge = document.createElement('div');
    gauge.className = 'analysis-gauge';
    gauge.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('i');
    gauge.appendChild(fill);
    document.body.appendChild(gauge);
    var marked = false;
    var onScroll = function () {
      var r = article.getBoundingClientRect(), total = r.height - window.innerHeight * 0.6;
      var done = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
      fill.style.width = (done * 100).toFixed(1) + '%';
      if (!marked && done > 0.85) {
        marked = true;
        var list = bound(), here = window.location.pathname;
        if (list.indexOf(here) === -1) { list.push(here); store(BOUND, JSON.stringify(list.slice(-200))); }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }
  var done = bound();
  if (done.length) {
    Array.prototype.forEach.call(document.querySelectorAll('.entity[data-url]'), function (el) {
      if (done.indexOf(el.getAttribute('data-url')) === -1) return;
      var meta = el.querySelector('.entity-meta');
      if (!meta) return;
      var b = document.createElement('span');
      b.className = 'badge badge--bound';
      b.textContent = 'BOUND';
      meta.appendChild(b);
    });
  }
})();
