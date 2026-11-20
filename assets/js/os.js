/* bhanuharya OS: the window manager.
   Every page is served as a desktop with one window open, so the site works
   without this script. With it, links open as windows in place: the page is
   fetched, its window is lifted out and added to the desktop.
   os-apps.js and os-player.js add the programs that only exist with JS.
   Nothing leaves the browser. */
(function () {
  'use strict';
  var root = document.documentElement;
  var desktop = document.getElementById('desktop');
  var layer = document.getElementById('main');
  var tasks = document.getElementById('tasks');
  var iconBox = document.querySelector('.icons');
  var startBtn = document.getElementById('start-btn');
  var startMenu = document.getElementById('start-menu');
  if (!desktop || !layer || !tasks) return;

  var ICON = { capture: 'capture', browser: 'browser', terminal: 'terminal', notepad: 'notepad', untitled: 'notepad', about: 'computer', bin: 'bin', player: 'player', firewall: 'firewall' };
  var wins = [];
  var apps = {};
  var z = 10;
  var opened = 0;
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; };
  // same test as the phone rules in style.css: narrow, or a phone on its side
  var phone = mq('(max-width: 760px), (max-height: 500px) and (pointer: coarse)');
  var coarse = mq('(pointer: coarse)');
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var siteName = (document.querySelector('meta[property="og:site_name"]') || {}).content || document.title;
  var data = { posts: [], songs: [] };
  try { data = JSON.parse(document.getElementById('os-data').textContent); } catch (e) {}

  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function svg(name, cls) { return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
  function rel(u) { return u.pathname + u.search + u.hash; }
  function rectOf(el) { return el && el.getBoundingClientRect ? el.getBoundingClientRect() : null; }

  var handlers = {};
  function on(evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); }
  function emit(evt, a, b) { (handlers[evt] || []).forEach(function (fn) { try { fn(a, b); } catch (e) { if (window.console) console.error(e); } }); }

  function appFor(path) {
    path = path.replace(/index\.html$/, '');
    if (path === '/') return 'capture';
    if (path === '/about/') return 'about';
    if (path === '/readme/') return 'notepad';
    if (path === '/terminal/') return 'terminal';
    if (/^\/blog\/[^\/]+\/?$/.test(path)) return 'browser';
    // any other page renders in the Browser (including the 404 page)
    if (!/\.[a-z0-9]+$/i.test(path) || /\.html$/i.test(path)) return 'browser';
    return null;
  }

  /* ---------------- sounds (made on the spot, no files) ---------------- */
  var actx = null;
  function audio() {
    if (!actx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { actx = new C(); } catch (e) { return null; }
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function soundOn() { try { return localStorage.getItem('sound') !== 'off'; } catch (e) { return true; } }
  function tone(ctx, out, f, t, len, type, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + len + 0.05);
  }
  function sound(name) {
    if (!soundOn()) return;
    var ctx = audio();
    if (!ctx) return;
    var t = ctx.currentTime + 0.02, out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(ctx.destination);
    if (name === 'startup') {
      [[196, 0, 2.2, 'sine', 0.12], [392, 0, 0.9, 'triangle', 0.16], [587.33, 0.14, 0.9, 'triangle', 0.16],
       [783.99, 0.28, 1.0, 'triangle', 0.16], [987.77, 0.42, 1.6, 'sine', 0.18], [1174.66, 0.42, 1.6, 'sine', 0.05]]
        .forEach(function (n) { tone(ctx, out, n[0], t + n[1], n[2], n[3], n[4]); });
    } else if (name === 'shutdown') {
      [[987.77, 0, 0.6], [783.99, 0.16, 0.6], [587.33, 0.32, 0.7], [392, 0.48, 1.4]]
        .forEach(function (n) { tone(ctx, out, n[0], t + n[1], n[2], 'triangle', 0.15); });
    } else if (name === 'ding') {
      tone(ctx, out, 1046.5, t, 0.5, 'sine', 0.2); tone(ctx, out, 2093, t, 0.25, 'sine', 0.04);
    } else if (name === 'error') {
      tone(ctx, out, 311.13, t, 0.18, 'square', 0.06); tone(ctx, out, 233.08, t + 0.16, 0.3, 'square', 0.06);
    } else if (name === 'pop') {
      tone(ctx, out, 660, t, 0.08, 'sine', 0.12);
    } else if (name === 'trash') {
      var b = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.frequency.value = 1800; g.gain.value = 0.5;
      s.buffer = b; s.connect(f); f.connect(g); g.connect(out); s.start(t);
    }
  }

  /* ---------------- zoom rectangles (open, minimize, restore) ---------------- */
  function zoom(a, b) {
    if (reduce.matches || !a || !b || !document.body.animate || phone.matches) return;
    var r = document.createElement('div');
    r.className = 'zoomrect';
    document.body.appendChild(r);
    var f = function (x) { return { left: x.left + 'px', top: x.top + 'px', width: x.width + 'px', height: x.height + 'px' }; };
    var an = r.animate([f(a), f(b)], { duration: 220, easing: 'ease-in' });
    an.onfinish = an.oncancel = function () { r.remove(); };
  }

  /* ---------------- windows ---------------- */
  function top() {
    var best = null;
    wins.forEach(function (w) { if (!w.el.classList.contains('minimized') && (!best || +w.el.style.zIndex > +best.el.style.zIndex)) best = w; });
    return best;
  }
  function find(app) { for (var i = 0; i < wins.length; i++) if (wins[i].app === app) return wins[i]; return null; }
  function focus(w, keepUrl) {
    if (!w) return;
    w.el.classList.remove('minimized');
    w.el.style.zIndex = ++z;
    wins.forEach(function (o) {
      var on = o === w;
      o.el.classList.toggle('inactive', !on);
      o.btn.setAttribute('aria-pressed', String(on));
    });
    document.title = w.docTitle || siteName;
    if (w.btn.scrollIntoView && tasks.scrollWidth > tasks.clientWidth) { try { w.btn.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} }
    if (!keepUrl && w.url && rel(new URL(w.url, location.href)) !== rel(location)) history.replaceState(null, '', w.url);
    emit('focus', w);
  }
  function refreshFocus() {
    var t = top();
    if (t) focus(t);
    else wins.forEach(function (o) { o.btn.setAttribute('aria-pressed', 'false'); o.el.classList.add('inactive'); });
  }
  function minimize(w) {
    zoom(rectOf(w.el), rectOf(w.btn));
    w.el.classList.add('minimized');
    w.btn.setAttribute('aria-pressed', 'false');
    emit('minimize', w);
    refreshFocus();
  }
  function restore(w) {
    var was = w.el.classList.contains('minimized');
    focus(w);
    if (was) zoom(rectOf(w.btn), rectOf(w.el));
  }
  function toggleMax(w, force) {
    var on = force === undefined ? !w.el.classList.contains('maximized') : force;
    var before = rectOf(w.el);
    w.el.classList.toggle('maximized', on);
    zoom(before, rectOf(w.el));
    var b = $('[data-act="max"]', w.el);
    if (b) b.setAttribute('aria-label', on ? 'Restore' : 'Maximize');
  }
  function close(w) {
    var i = wins.indexOf(w);
    if (i === -1) return;
    wins.splice(i, 1);
    emit('close', w);
    w.el.remove();
    w.btn.remove();
    var t = top();
    if (t) focus(t);
    else { document.title = siteName; if (location.pathname !== '/' || location.search) history.replaceState(null, '', '/'); }
  }
  function closeAll() { wins.slice().forEach(close); }
  function taskClick(w) {
    if (w.el.classList.contains('minimized')) restore(w);
    else if (top() === w) minimize(w);
    else focus(w);
  }
  function windowMenu(w, x, y) {
    var max = w.el.classList.contains('maximized'), min = w.el.classList.contains('minimized');
    menu([
      { label: 'Restore', disabled: !max && !min, act: function () { if (min) restore(w); else toggleMax(w, false); } },
      { label: 'Minimize', disabled: min, act: function () { minimize(w); } },
      { label: 'Maximize', disabled: max || phone.matches, act: function () { focus(w); toggleMax(w, true); } },
      { sep: true },
      { label: 'Close', bold: true, act: function () { close(w); } }
    ], x, y);
  }

  function register(el, url, docTitle) {
    var app = el.getAttribute('data-app');
    var w = { el: el, app: app, url: url, docTitle: docTitle || document.title };
    $$('.tbtn[hidden], .browser-bar [hidden]', el).forEach(function (b) { if (b.getAttribute('data-act') !== 'hex') b.hidden = false; });
    var tt = $('.titlebar .tt', el);
    if (tt && !tt.textContent) tt.textContent = el.getAttribute('data-title') || app;
    ['e', 's', 'se'].forEach(function (d) { var g = document.createElement('i'); g.className = 'grip g-' + d; g.setAttribute('data-grip', d); el.appendChild(g); });
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'task';
    btn.innerHTML = svg(ICON[app] || 'post') + '<span></span>';
    w.btn = btn;
    setTitle(w, el.getAttribute('data-title') || app);
    btn.addEventListener('click', function () { taskClick(w); });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); windowMenu(w, e.clientX, e.clientY); });
    tasks.appendChild(btn);
    wins.push(w);
    wire(w);
    if (window.Capture) window.Capture.init(el, url);
    if (app === 'about') tabs(el);
    if (app === 'browser') browserChrome(w);
    emit('register', w);
    return w;
  }
  function setTitle(w, title) {
    w.el.setAttribute('data-title', title);
    var tt = $('.titlebar .tt', w.el);
    if (tt) tt.textContent = title;
    w.btn.querySelector('span').textContent = title;
    w.btn.title = title;
  }

  function wire(w) {
    var el = w.el;
    el.addEventListener('pointerdown', function () { if (top() !== w) focus(w); }, true);
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b || !el.contains(b) || b.closest('.menubar, .sm-items')) return;
      var act = b.getAttribute('data-act');
      if (act === 'min') { e.preventDefault(); minimize(w); }
      else if (act === 'max') { e.preventDefault(); toggleMax(w); }
      else if (act === 'close') { e.preventDefault(); close(w); }
    });
    var bar = $('.titlebar', el);
    if (bar) {
      bar.addEventListener('dblclick', function (e) { if (!e.target.closest('.tbtn') && !phone.matches) toggleMax(w); });
      bar.addEventListener('contextmenu', function (e) { e.preventDefault(); windowMenu(w, e.clientX, e.clientY); });
      bar.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 || e.target.closest('.tbtn') || phone.matches || el.classList.contains('maximized')) return;
        e.preventDefault();
        pin(el);
        var sx = e.clientX, sy = e.clientY, sl = el.offsetLeft, st = el.offsetTop;
        var W = desktop.clientWidth, H = desktop.clientHeight, ew = el.offsetWidth;
        drag(bar, e, function (ev) {
          el.style.left = Math.min(W - 60, Math.max(60 - ew, sl + ev.clientX - sx)) + 'px';
          el.style.top = Math.min(H - 26, Math.max(0, st + ev.clientY - sy)) + 'px';
        });
      });
    }
    $$('.grip', el).forEach(function (g) {
      g.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 || phone.matches || el.classList.contains('maximized')) return;
        e.preventDefault();
        pin(el);
        el.style.height = el.offsetHeight + 'px';
        el.style.maxHeight = 'none';
        var d = g.getAttribute('data-grip'), sx = e.clientX, sy = e.clientY, sw = el.offsetWidth, sh = el.offsetHeight;
        var W = desktop.clientWidth - el.offsetLeft, H = desktop.clientHeight - el.offsetTop;
        drag(g, e, function (ev) {
          if (d !== 's') el.style.width = Math.min(W, Math.max(260, sw + ev.clientX - sx)) + 'px';
          if (d !== 'e') el.style.height = Math.min(H, Math.max(140, sh + ev.clientY - sy)) + 'px';
        });
      });
    });
  }
  function drag(handle, e, move) {
    root.classList.add('dragging');
    try { handle.setPointerCapture(e.pointerId); } catch (x) {}
    var up = function () {
      root.classList.remove('dragging');
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }
  // freeze a window's CSS default position and size into pixels before moving it
  function pin(el) {
    if (el.getAttribute('data-pinned')) return;
    var l = el.offsetLeft, t = el.offsetTop, wd = el.offsetWidth, ht = el.offsetHeight;
    el.style.left = l + 'px'; el.style.top = t + 'px'; el.style.width = wd + 'px';
    if (el.getAttribute('data-app') !== 'about' && el.getAttribute('data-app') !== 'player') el.style.height = ht + 'px';
    el.setAttribute('data-pinned', '1');
  }
  function cascade(el) {
    if (phone.matches) return;
    if (!wins.length) opened = 0;
    var n = opened++ % 6;
    if (!n) return;
    pin(el);
    var W = desktop.clientWidth, H = desktop.clientHeight;
    var l = Math.max(0, Math.min(W - el.offsetWidth, el.offsetLeft + n * 22)), t = Math.max(0, Math.min(H - 60, el.offsetTop + n * 22));
    el.style.left = l + 'px';
    el.style.top = t + 'px';
    if (el.style.height && t + el.offsetHeight > H - 4) el.style.height = Math.max(160, H - t - 4) + 'px';
  }
  window.addEventListener('resize', function () {
    var W = desktop.clientWidth, H = desktop.clientHeight;
    wins.forEach(function (w) {
      if (!w.el.getAttribute('data-pinned')) return;
      if (w.el.offsetLeft > W - 60) w.el.style.left = Math.max(0, W - w.el.offsetWidth) + 'px';
      if (w.el.offsetTop > H - 26) w.el.style.top = Math.max(0, H - 60) + 'px';
    });
  });

  // a window made by script (terminal, recycle bin, player, game...)
  function makeWindow(app, title, bodyHTML, opts) {
    opts = opts || {};
    var el = document.createElement('section');
    el.className = 'window win-app' + (opts.cls ? ' ' + opts.cls : '');
    el.setAttribute('data-app', app);
    el.setAttribute('data-title', title);
    el.setAttribute('aria-label', title);
    el.innerHTML = '<header class="titlebar" data-drag>' + svg(ICON[app] || 'post', 'ti') + '<span class="tt"></span><span class="tbtns">' +
      '<button type="button" class="tbtn" data-act="min" aria-label="Minimize"><i class="g-min"></i></button>' +
      (opts.noMax ? '' : '<button type="button" class="tbtn" data-act="max" aria-label="Maximize"><i class="g-max"></i></button>') +
      '<button type="button" class="tbtn" data-act="close" aria-label="Close"><i class="g-close"></i></button></span></header>' + bodyHTML;
    $('.tt', el).textContent = title;
    layer.appendChild(el);
    cascade(el);
    var w = register(el, opts.url || null, title + ' · ' + siteName);
    focus(w, true);
    if (opts.from) zoom(opts.from, rectOf(el));
    return w;
  }

  /* ---------------- opening pages as windows ---------------- */
  var loading = null;
  function fetchWindow(u) {
    return fetch(rel(u), { credentials: 'same-origin' }).then(function (r) {
      return r.text().then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var el = doc.querySelector('.win-app');
        if (!el) throw new Error('no window');
        return { el: document.importNode(el, true), title: doc.title };
      });
    });
  }
  function open(href, opts) {
    opts = opts || {};
    var u;
    try { u = new URL(href, location.href); } catch (e) { return; }
    if (u.origin !== location.origin) { window.open(u.href, '_blank', 'noopener'); return; }
    var app = appFor(u.pathname);
    if (!app) { window.location.href = u.href; return; }
    closeMenus();
    if (app === 'terminal') { openTerminal(opts); if (opts.push !== false && rel(u) !== rel(location)) history.pushState(null, '', rel(u)); return; }
    var existing = find(app);
    if (existing && app !== 'browser' && !opts.reload) {
      existing.url = rel(u);
      if (app === 'capture' && window.Capture) window.Capture.init(existing.el, existing.url);
      restore(existing);
      if (opts.push !== false && rel(u) !== rel(location)) history.pushState(null, '', rel(u));
      return;
    }
    var token = loading = {};
    root.classList.add('busy');
    var status = existing ? $('[data-status]', existing.el) : null;
    if (status) status.textContent = 'Opening page ' + u.href + '...';
    fetchWindow(u).then(function (res) {
      if (loading !== token) return;
      root.classList.remove('busy');
      var el = res.el;
      if (existing && wins.indexOf(existing) !== -1) {
        ['left', 'top', 'width', 'height', 'maxHeight'].forEach(function (k) { el.style[k] = existing.el.style[k]; });
        if (existing.el.getAttribute('data-pinned')) el.setAttribute('data-pinned', '1');
        if (existing.el.classList.contains('maximized')) el.classList.add('maximized');
        layer.replaceChild(el, existing.el);
        existing.btn.remove();
        wins.splice(wins.indexOf(existing), 1);
        emit('close', existing);
      } else {
        layer.appendChild(el);
        cascade(el);
        if (opts.from) zoom(opts.from, rectOf(el));
      }
      var w = register(el, rel(u), res.title);
      if (opts.push !== false && rel(u) !== rel(location)) history.pushState(null, '', rel(u));
      focus(w, true);
      var view = $('.page-view', el);
      if (view) {
        view.scrollTop = 0;
        if (u.hash) { try { var t = el.querySelector(decodeURIComponent(u.hash)); if (t) t.scrollIntoView(); } catch (e) {} }
      }
    }).catch(function () { root.classList.remove('busy'); window.location.href = u.href; });
  }

  /* ---------------- browser chrome ---------------- */
  function browserChrome(w) {
    var el = w.el;
    var form = $('.address', el), input = $('.address input', el);
    $$('.browser-bar [data-act]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-act');
        if (act === 'back') history.back();
        else if (act === 'fwd') history.forward();
        else if (act === 'reload') open(w.url, { reload: true, push: false });
      });
    });
    if (form && input) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = input.value.trim();
        if (!v) return;
        if (!/^[a-z]+:\/\//i.test(v) && v.charAt(0) !== '/') v = (/\./.test(v.split('/')[0]) ? 'https://' : '/') + v;
        open(v);
      });
    }
  }

  /* ---------------- terminal, recycle bin ---------------- */
  function openTerminal(opts) {
    var w = find('terminal');
    if (w) { restore(w); return; }
    w = makeWindow('terminal', 'Terminal', '<iframe class="term-frame" src="/terminal/" title="Terminal"></iframe>', { url: '/terminal/', from: opts && opts.from });
    w.docTitle = 'terminal · ' + siteName;
    var f = $('iframe', w.el);
    f.addEventListener('load', function () { try { f.contentWindow.focus(); } catch (e) {} });
  }
  on('focus', function (w) {
    if (w.app !== 'terminal') return;
    var f = $('iframe', w.el);
    setTimeout(function () { try { f.contentWindow.focus(); } catch (e) {} }, 0);
  });
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
    var t = find('terminal');
    if (e.data.type === 'os-open' && typeof e.data.url === 'string') open(e.data.url);
    if (e.data.type === 'os-close' && t) close(t);
    if (e.data.type === 'os-focus' && t && top() !== t) focus(t);
  });

  var binned = [];
  var binIcon = $('.dicon[data-app="bin"]');
  function binChanged() {
    if (binIcon) $('use', binIcon).setAttribute('href', binned.length ? '#i-bin-full' : '#i-bin');
    var w = find('bin');
    if (w) fillBin(w);
  }
  function toBin(list) {
    list = list.filter(function (ic) { return ic !== binIcon && !ic.hidden; });
    if (!list.length) return;
    list.forEach(function (ic) { ic.hidden = true; ic.classList.remove('sel'); binned.push(ic); });
    sound('trash');
    binChanged();
  }
  function emptyBin() {
    binned.forEach(function (ic) { ic.setAttribute('data-gone', '1'); });
    binned = [];
    sound('trash');
    binChanged();
  }
  function fillBin(w) {
    var body = $('.bin-body', w.el), status = $('.statusline .seg', w.el);
    if (!binned.length) body.innerHTML = '<p class="bin-empty">The Recycle Bin is empty.<br><span class="dim">Drag a desktop icon here to throw it away.</span></p>';
    else {
      body.innerHTML = '<ul class="bin-list">' + binned.map(function (ic, i) {
        return '<li><span>' + $('svg', ic).outerHTML + esc(ic.textContent.trim()) + '</span><button type="button" class="btn small" data-restore="' + i + '">Restore</button></li>';
      }).join('') + '</ul><div class="dialog-buttons"><button type="button" class="btn" data-empty>Empty Recycle Bin</button></div>';
    }
    status.textContent = binned.length + ' object(s)';
  }
  apps.bin = function (from) {
    var w = find('bin');
    if (w) { restore(w); return; }
    w = makeWindow('bin', 'Recycle Bin', '<div class="win-body bin-body sunken"></div><div class="statusline"><span class="seg grow">0 object(s)</span></div>', { from: from });
    fillBin(w);
    w.el.addEventListener('click', function (e) {
      var r = e.target.closest('[data-restore]');
      if (r) { var ic = binned.splice(+r.getAttribute('data-restore'), 1)[0]; ic.hidden = false; sound('pop'); binChanged(); }
      if (e.target.closest('[data-empty]')) {
        msg({ title: 'Confirm Delete', icon: 'warn', text: 'Delete these ' + binned.length + ' item(s) for good?\n\n(They come back when you reload the page.)', buttons: ['Yes', 'No'] }).then(function (b) {
          if (b === 0) emptyBin();
        });
      }
    });
  };

  /* ---------------- System Properties tabs ---------------- */
  function tabs(el) {
    var list = $('[role="tablist"]', el);
    if (!list) return;
    var tabsEls = $$('[role="tab"]', list);
    var show = function (t, focusIt) {
      tabsEls.forEach(function (o) {
        var sel = o === t;
        o.setAttribute('aria-selected', String(sel));
        o.tabIndex = sel ? 0 : -1;
        var p = document.getElementById(o.getAttribute('aria-controls'));
        if (p) p.hidden = !sel;
      });
      if (focusIt) t.focus();
    };
    list.hidden = false;
    tabsEls.forEach(function (t, i) {
      t.addEventListener('click', function () { show(t); });
      t.addEventListener('keydown', function (e) {
        var j = e.key === 'ArrowRight' ? (i + 1) % tabsEls.length : e.key === 'ArrowLeft' ? (i - 1 + tabsEls.length) % tabsEls.length : -1;
        if (j !== -1) { e.preventDefault(); show(tabsEls[j], true); }
      });
    });
    show(tabsEls[0]);
  }

  /* ---------------- menus (right-click, menubars) ---------------- */
  var openMenus = [];
  function dropMenu(m) { var i = openMenus.indexOf(m); if (i !== -1) openMenus.splice(i, 1); m.remove(); }
  function closeMenus() {
    openMenus.slice().forEach(dropMenu);
    closeStart();
  }
  function menu(items, x, y, opts) {
    opts = opts || {};
    if (!opts.sub) closeMenus();
    var m = document.createElement('ul');
    m.className = 'menu raised';
    m.setAttribute('role', 'menu');
    var kids = function () { return openMenus.filter(function (o) { return o._parent === m; }); };
    items.forEach(function (it) {
      var li = document.createElement('li');
      li.setAttribute('role', 'none');
      if (it.sep) { li.className = 'sep'; li.setAttribute('role', 'separator'); m.appendChild(li); return; }
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', it.checked !== undefined ? 'menuitemcheckbox' : 'menuitem');
      if (it.checked !== undefined) b.setAttribute('aria-checked', String(!!it.checked));
      b.textContent = it.label;
      if (it.bold) b.style.fontWeight = 'bold';
      if (it.disabled) b.disabled = true;
      if (it.sub) { b.className = 'has-sub'; b.setAttribute('aria-haspopup', 'true'); }
      var fire = function () {
        if (it.sub) {
          var r = b.getBoundingClientRect();
          kids().forEach(dropMenu);
          var sm = menu(it.sub, r.right - 3, r.top - 3, { sub: true, focus: false });
          sm._parent = m;
          return sm;
        }
        closeMenus();
        if (it.act) it.act();
      };
      b.addEventListener('click', fire);
      b.addEventListener('mouseenter', function () { if (it.sub) fire(); else kids().forEach(dropMenu); });
      li.appendChild(b);
      m.appendChild(li);
    });
    m.addEventListener('keydown', function (e) {
      var bs = $$(':scope > li > button:not(:disabled)', m), i = bs.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); bs[(i + 1) % bs.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); bs[(i - 1 + bs.length) % bs.length].focus(); }
      else if (e.key === 'ArrowRight' && document.activeElement.classList.contains('has-sub')) {
        e.preventDefault(); e.stopPropagation(); document.activeElement.click();
        var s = openMenus[openMenus.length - 1], f = s && $('button:not(:disabled)', s);
        if (f) f.focus();
      }
      else if (e.key === 'ArrowLeft' && m._parent) { e.preventDefault(); e.stopPropagation(); var p = m._parent; dropMenu(m); var pb = $('.has-sub', p); if (pb) pb.focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenus(); if (opts.returnFocus) opts.returnFocus.focus(); }
    });
    document.body.appendChild(m);
    var W = window.innerWidth, H = window.innerHeight;
    var mw = m.offsetWidth, mh = m.offsetHeight;
    if (x + mw > W) x = Math.max(0, opts.sub ? x - mw - 150 : W - mw - 2);
    if (y + mh > H - 4) y = Math.max(0, H - mh - 4);
    m.style.left = x + 'px';
    m.style.top = y + 'px';
    openMenus.push(m);
    var first = $('button:not(:disabled)', m);
    if (first && opts.focus !== false) first.focus({ preventScroll: true });
    return m;
  }
  document.addEventListener('pointerdown', function (e) {
    if (openMenus.length && !e.target.closest('.menu') && !e.target.closest('.menubar button')) closeMenus();
  });
  window.addEventListener('blur', function () { if (openMenus.length) closeMenus(); });

  /* ---------------- message boxes ---------------- */
  function msg(o) {
    return new Promise(function (resolve) {
      var buttons = o.buttons || ['OK'];
      var bg = document.createElement('div');
      bg.className = 'modal-bg';
      bg.innerHTML = '<div class="modal raised" role="alertdialog" aria-modal="true" aria-labelledby="mb-t" aria-describedby="mb-x">' +
        '<header class="titlebar"><span class="tt" id="mb-t"></span></header><form class="body" method="dialog"><div class="row">' + svg(o.icon || 'help') +
        '<div><div class="mb-text" id="mb-x"></div>' + (o.html || '') + '</div></div><div class="btns">' +
        buttons.map(function (b, i) { return '<button class="btn" type="' + (i ? 'button' : 'submit') + '" data-i="' + i + '">' + esc(b) + '</button>'; }).join('') + '</div></form></div>';
      $('.tt', bg).textContent = o.title || siteName;
      $('.mb-text', bg).textContent = o.text || '';
      var prev = document.activeElement;
      document.body.appendChild(bg);
      if (o.icon === 'warn') sound('ding');
      var done = function (i) {
        var val = o.onDone ? o.onDone(i, bg) : undefined;
        if (val === false) return;
        bg.remove();
        if (prev && prev.focus && document.contains(prev)) prev.focus();
        resolve(i);
      };
      $('form', bg).addEventListener('submit', function (e) { e.preventDefault(); done(0); });
      bg.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b && b.type === 'button') done(+b.getAttribute('data-i')); });
      bg.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); done(buttons.length - 1); }
        if (e.key === 'Tab') {
          var bs = $$('button, input, select, textarea', bg), i = bs.indexOf(document.activeElement);
          e.preventDefault();
          bs[(i + (e.shiftKey ? bs.length - 1 : 1)) % bs.length].focus();
        }
      });
      bg.addEventListener('pointerdown', function (e) {
        if (e.target !== bg) return;
        e.preventDefault();
        sound('pop');
        var m = $('.modal', bg);
        m.classList.remove('nudge'); void m.offsetWidth; m.classList.add('nudge');
      });
      var f = $('input', bg) || $('[data-i="0"]', bg);
      f.focus();
      if (o.onOpen) o.onOpen(bg);
    });
  }

  /* ---------------- links ---------------- */
  function plainClick(e) { return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey; }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || !plainClick(e) || e.defaultPrevented || a.target) return;
    if (a.closest('.icons')) return; // desktop icons are handled below
    if (!a.closest('.windows, .start-menu, .menu, .modal, .balloon, .cal')) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    var u = new URL(a.href, location.href);
    if (a.hasAttribute('data-ext') || u.origin !== location.origin) { e.preventDefault(); window.open(u.href, '_blank', 'noopener'); closeMenus(); return; }
    if (appFor(u.pathname)) { e.preventDefault(); open(u.href, { from: a.closest('.start-menu, .cal') ? rectOf(a) : null }); }
  });

  /* ---------------- desktop icons: select, drag, rubber band, bin ---------------- */
  var lastPointer = 'mouse';
  var icons = $$('.dicon');
  function selected() { return icons.filter(function (o) { return o.classList.contains('sel') && !o.hidden; }); }
  function select(list, add) {
    if (!add) icons.forEach(function (o) { o.classList.remove('sel'); });
    list.forEach(function (o) { o.classList.add('sel'); });
  }
  function launch(ic) {
    var app = ic.getAttribute('data-app'), from = rectOf($('svg', ic));
    if (apps[app]) { apps[app](from); return; }
    if (ic.hasAttribute('data-ext')) { window.open(ic.href, '_blank', 'noopener'); return; }
    open(ic.href, { from: from });
  }
  function freeIcons() {
    if (iconBox.classList.contains('free')) return;
    var pos = icons.map(function (o) { return [o.offsetLeft, o.offsetTop]; });
    iconBox.classList.add('free');
    icons.forEach(function (o, i) { if (o !== binIcon) { o.style.left = pos[i][0] + 'px'; o.style.top = pos[i][1] + 'px'; } });
  }
  function arrange() {
    iconBox.classList.remove('free');
    icons.forEach(function (o) { o.style.left = ''; o.style.top = ''; });
  }
  function hit(r, x, y) { return r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
  icons.forEach(function (ic) {
    if (ic.tagName === 'BUTTON') ic.hidden = false;
    ic.draggable = false;
    ic.addEventListener('dragstart', function (e) { e.preventDefault(); });
    ic.addEventListener('pointerdown', function (e) {
      lastPointer = e.pointerType || 'mouse';
      if (e.button !== 0 || lastPointer !== 'mouse' || phone.matches) return;
      if (!ic.classList.contains('sel')) select([ic], e.ctrlKey || e.metaKey);
      if (ic === binIcon) return;
      var group = selected().filter(function (o) { return o !== binIcon; }), sx = e.clientX, sy = e.clientY, moved = false, starts, hover = false;
      drag(ic, e, function (ev) {
        var dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
        if (!moved) {
          moved = true;
          freeIcons();
          starts = group.map(function (o) { return [o.offsetLeft, o.offsetTop]; });
          group.forEach(function (o) { o.classList.add('moving'); });
        }
        var W = iconBox.clientWidth - 84, H = iconBox.clientHeight - 70;
        group.forEach(function (o, i) {
          o.style.left = Math.max(0, Math.min(W, starts[i][0] + dx)) + 'px';
          o.style.top = Math.max(0, Math.min(H, starts[i][1] + dy)) + 'px';
        });
        hover = !!(binIcon && group.indexOf(binIcon) === -1 && hit(rectOf($('svg', binIcon)), ev.clientX, ev.clientY));
        if (binIcon) binIcon.classList.toggle('drop', hover);
      });
      var finish = function () {
        ic.removeEventListener('pointerup', finish);
        ic.removeEventListener('pointercancel', finish);
        if (!moved) return;
        group.forEach(function (o) { o.classList.remove('moving'); });
        if (binIcon) binIcon.classList.remove('drop');
        ic._dragged = true;
        if (hover) {
          group.forEach(function (o, i) { o.style.left = starts[i][0] + 'px'; o.style.top = starts[i][1] + 'px'; });
          toBin(group);
        }
      };
      ic.addEventListener('pointerup', finish);
      ic.addEventListener('pointercancel', finish);
    });
    ic.addEventListener('click', function (e) {
      if (!plainClick(e)) { if (e.ctrlKey || e.metaKey) e.preventDefault(); return; }
      e.preventDefault();
      if (ic._dragged) { ic._dragged = false; return; }
      if (lastPointer !== 'mouse' || e.detail === 0) { select([ic]); launch(ic); }
    });
    ic.addEventListener('dblclick', function (e) { e.preventDefault(); launch(ic); });
    ic.addEventListener('keydown', function (e) {
      if (e.key === 'Delete' && ic !== binIcon) { e.preventDefault(); toBin([ic]); }
    });
    ic.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      if (!ic.classList.contains('sel')) select([ic]);
      var items = [{ label: 'Open', bold: true, act: function () { launch(ic); } }];
      if (ic.tagName === 'A' && !ic.hasAttribute('data-ext')) items.push({ label: 'Open in new tab', act: function () { window.open(ic.href, '_blank', 'noopener'); } });
      if (ic === binIcon) items.push({ sep: true }, { label: 'Empty Recycle Bin', disabled: !binned.length, act: emptyBin });
      else items.push({ sep: true }, { label: 'Delete', act: function () { toBin(selected()); } });
      items.push({ label: 'Properties', act: function () { iconProps(ic); } });
      menu(items, e.clientX, e.clientY, { returnFocus: ic });
    });
  });
  function iconProps(ic) {
    var name = ic.textContent.trim();
    var target = ic.tagName === 'A' ? ic.href : '(built in)';
    var kind = ic.hasAttribute('data-ext') ? 'Shortcut to a web page' : ic === binIcon ? 'System folder' : 'Application';
    msg({ title: name + ' Properties', icon: ICON[ic.getAttribute('data-app')] || 'browser', text: name + '\n\nType: ' + kind + '\nTarget: ' + target + '\nSize: smaller than you would think' });
  }

  // rubber band selection on the empty desktop
  desktop.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.dicon, .window, .menu')) return;
    select([]);
    if (e.button !== 0 || (e.pointerType && e.pointerType !== 'mouse')) return;
    var box = document.createElement('div');
    box.className = 'marquee';
    var dr = desktop.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
    desktop.appendChild(box);
    drag(desktop, e, function (ev) {
      var x1 = Math.min(sx, ev.clientX), y1 = Math.min(sy, ev.clientY), x2 = Math.max(sx, ev.clientX), y2 = Math.max(sy, ev.clientY);
      box.style.left = (x1 - dr.left) + 'px'; box.style.top = (y1 - dr.top) + 'px';
      box.style.width = (x2 - x1) + 'px'; box.style.height = (y2 - y1) + 'px';
      select(icons.filter(function (o) {
        if (o.hidden) return false;
        var r = o.getBoundingClientRect();
        return r.left < x2 && r.right > x1 && r.top < y2 && r.bottom > y1;
      }));
    });
    var end = function () { box.remove(); desktop.removeEventListener('pointerup', end); desktop.removeEventListener('pointercancel', end); };
    desktop.addEventListener('pointerup', end);
    desktop.addEventListener('pointercancel', end);
  });
  desktop.addEventListener('contextmenu', function (e) {
    if (e.target.closest('.dicon, .window')) return;
    e.preventDefault();
    var x = e.clientX, y = e.clientY, at = { left: x, top: y, width: 1, height: 1 };
    menu([
      { label: 'Arrange Icons', act: arrange },
      { label: 'Refresh', act: function () { iconBox.classList.add('refresh'); setTimeout(function () { iconBox.classList.remove('refresh'); }, 180); } },
      { sep: true },
      phone.matches ? { label: 'New Text Document', act: function () { if (apps.newtext) apps.newtext(at); } } :
      { label: 'New', sub: [
        { label: 'Text Document', act: function () { if (apps.newtext) apps.newtext(at); } }
      ] },
      { sep: true },
      { label: 'Night', checked: isDark(), act: toggleTheme },
      { label: 'Sounds', checked: soundOn(), act: toggleSound },
      { label: 'Screen Saver', disabled: !apps.screensaver, act: function () { apps.screensaver(); } },
      { sep: true },
      { label: 'Properties', act: function () { open('/about/', { from: at }); } }
    ], x, y);
  });

  /* ---------------- start menu ---------------- */
  function closeStart() {
    if (!startMenu || startMenu.hidden) return;
    startMenu.hidden = true;
    startBtn.setAttribute('aria-expanded', 'false');
    $$('.sm-sub.open', startMenu).forEach(function (s) { s.classList.remove('open'); $('button', s).setAttribute('aria-expanded', 'false'); });
  }
  function startItems() { return $$('[role="menuitem"]', startMenu).filter(function (b) { return b.offsetParent !== null; }); }
  if (startBtn && startMenu) {
    $$('li[hidden]', startMenu).forEach(function (li) { li.hidden = false; });
    startBtn.hidden = false;
    startBtn.addEventListener('click', function () {
      if (startMenu.hidden) {
        closeMenus();
        startMenu.hidden = false;
        startBtn.setAttribute('aria-expanded', 'true');
        sound('pop');
        var first = startItems()[0];
        if (first) first.focus();
      } else closeStart();
    });
    $$('.sm-sub', startMenu).forEach(function (s) {
      var b = $('button', s);
      var set = function (on) {
        if (on) $$('.sm-sub.open', startMenu).forEach(function (o) { if (o !== s) { o.classList.remove('open'); $('button', o).setAttribute('aria-expanded', 'false'); } });
        s.classList.toggle('open', on);
        b.setAttribute('aria-expanded', String(on));
      };
      b.addEventListener('click', function () { set(!s.classList.contains('open')); });
      s.addEventListener('mouseenter', function () { if (!phone.matches) set(true); });
      s.addEventListener('mouseleave', function () { if (!phone.matches) set(false); });
      s.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' && document.activeElement === b) { e.preventDefault(); set(true); var f = $('.sm-fly [role="menuitem"]', s); if (f) f.focus(); }
        if (e.key === 'ArrowLeft' && s.classList.contains('open')) { e.preventDefault(); set(false); b.focus(); }
      });
    });
    startMenu.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      var list = startItems(), i = list.indexOf(document.activeElement);
      list[(i + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length].focus();
    });
    startMenu.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act'), r = rectOf(b);
      closeStart();
      if (apps[act]) apps[act](r);
      else emit('action', act);
    });
    document.addEventListener('pointerdown', function (e) {
      if (!startMenu.hidden && !startMenu.contains(e.target) && !startBtn.contains(e.target)) closeStart();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !startMenu.hidden) { closeStart(); startBtn.focus(); }
    });
  }

  /* ---------------- tray: clock, sound, Day/Night ---------------- */
  var clock = document.getElementById('clock');
  if (clock) {
    var tick = function () {
      var d = new Date();
      clock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      clock.title = d.toDateString();
    };
    tick();
    setInterval(tick, 15000);
  }
  var themeBtn = document.getElementById('theme-toggle');
  function isDark() { return root.getAttribute('data-theme') === 'dark'; }
  function themeLabel() {
    if (!themeBtn) return;
    var dark = isDark();
    themeBtn.setAttribute('aria-label', dark ? 'Switch to Day' : 'Switch to Night');
    themeBtn.title = dark ? 'Day' : 'Night';
    $('use', themeBtn).setAttribute('href', dark ? '#i-sun' : '#i-moon');
  }
  function toggleTheme() {
    var dark = !isDark();
    if (dark) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
    try { if (dark) localStorage.setItem('theme', 'dark'); else localStorage.removeItem('theme'); } catch (e) {}
    themeLabel();
  }
  if (themeBtn) { themeBtn.hidden = false; themeLabel(); themeBtn.addEventListener('click', toggleTheme); }
  var soundBtn = document.getElementById('sound-toggle');
  function soundLabel() {
    if (!soundBtn) return;
    var s = soundOn();
    soundBtn.setAttribute('aria-label', s ? 'Mute sounds' : 'Turn sounds on');
    soundBtn.title = s ? 'Sounds on' : 'Sounds off';
    $('use', soundBtn).setAttribute('href', s ? '#i-speaker' : '#i-mute');
  }
  function toggleSound() {
    var s = !soundOn();
    try { if (s) localStorage.removeItem('sound'); else localStorage.setItem('sound', 'off'); } catch (e) {}
    soundLabel();
    if (s) sound('pop');
  }
  if (soundBtn) { soundBtn.hidden = false; soundLabel(); soundBtn.addEventListener('click', toggleSound); }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openMenus.length) closeMenus();
  });

  /* ---------------- touch: press and hold = right-click ---------------- */
  var lpTimer = null, synthAt = 0, swallow = false;
  function swallowLift() { swallow = true; setTimeout(function () { swallow = false; }, 900); }
  document.addEventListener('pointerdown', function (e) {
    swallow = false; // a new touch is a new tap
    if (e.pointerType !== 'touch' || e.isPrimary === false) return;
    var t = e.target;
    var ok = t.closest('.dicon, .titlebar, .task') || (t.closest('.desktop') && !t.closest('.window'));
    if (!ok || t.closest('.tbtn')) return;
    var x = e.clientX, y = e.clientY;
    clearTimeout(lpTimer);
    var off = function () {
      ['pointermove', 'pointerup', 'pointercancel'].forEach(function (k) { document.removeEventListener(k, cancel, true); });
    };
    var cancel = function (ev) {
      if (ev.type === 'pointermove' && Math.abs(ev.clientX - x) + Math.abs(ev.clientY - y) < 10) return;
      clearTimeout(lpTimer); lpTimer = null; off();
    };
    ['pointermove', 'pointerup', 'pointercancel'].forEach(function (k) { document.addEventListener(k, cancel, true); });
    lpTimer = setTimeout(function () {
      lpTimer = null; off();
      synthAt = Date.now();
      swallowLift();
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (x2) {} }
      t.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
    }, 520);
  }, true);
  document.addEventListener('contextmenu', function (e) {
    if (!e.isTrusted) return;
    // Android also sends its own long-press menu event: keep only one
    if (Date.now() - synthAt < 1000) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; swallowLift(); }
  }, true);
  // lifting the finger after a long press must not also "tap" what is under it
  document.addEventListener('click', function (e) {
    if (swallow) { swallow = false; e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  /* ---------------- show desktop ---------------- */
  var showBtn = document.getElementById('show-desktop'), stash = [];
  function showDesktop() {
    var up = wins.filter(function (w) { return !w.el.classList.contains('minimized'); });
    if (up.length) {
      stash = up.sort(function (a, b) { return +a.el.style.zIndex - +b.el.style.zIndex; });
      up.forEach(function (w) { w.el.classList.add('minimized'); });
      refreshFocus();
    } else if (stash.length) {
      stash.forEach(function (w) { if (wins.indexOf(w) !== -1) focus(w, true); });
      stash = [];
      var t = top(); if (t) focus(t);
    }
    closeMenus();
  }
  if (showBtn) { showBtn.hidden = false; showBtn.addEventListener('click', showDesktop); }

  /* ---------------- phone keyboard (iOS keeps the layout and slides the view) ---------------- */
  var vv = window.visualViewport;
  if (vv) {
    var fit = function () {
      var kb = coarse.matches && vv.height < window.innerHeight - 120;
      root.classList.toggle('kbd', kb);
      if (kb) {
        root.style.setProperty('--vvh', Math.round(vv.height) + 'px');
        root.style.setProperty('--vvt', Math.round(vv.offsetTop) + 'px');
      }
    };
    vv.addEventListener('resize', fit);
    vv.addEventListener('scroll', fit);
  }

  /* ---------------- start ---------------- */
  window.OS = {
    top: top, coarse: coarse, showDesktop: showDesktop,
    open: open, makeWindow: makeWindow, focus: focus, restore: restore, close: close, closeAll: closeAll,
    minimize: minimize, find: find, setTitle: setTitle, wins: wins, apps: apps, data: data,
    menu: menu, closeMenus: closeMenus, msg: msg, sound: sound, audio: audio, soundOn: soundOn, on: on, emit: emit,
    zoom: zoom, rect: rectOf, svg: svg, esc: esc, phone: phone, reduce: reduce, siteName: siteName, isDark: isDark, toggleTheme: toggleTheme
  };
  // deferred scripts (os-apps.js, os-player.js) run before this fires, so their hooks see the first window
  document.addEventListener('DOMContentLoaded', function () {
    $$('.win-app', layer).forEach(function (el) { focus(register(el, rel(location)), true); });
    window.addEventListener('popstate', function () { open(location.href, { push: false }); });
    emit('ready');
  });
})();
