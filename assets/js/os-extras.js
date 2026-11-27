/* obscuraOS: BIOS Setup, Security Center, Find, Event Viewer,
   reading aids (contents, text size), and a few things to discover.
   Settings live in localStorage ('os-settings'). The event log and the
   discoveries live in sessionStorage and go when the tab closes. */
(function () {
  'use strict';
  var OS = window.OS;
  if (!OS) return;
  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = OS.esc, svg = OS.svg;
  var posts = OS.data.posts || [];
  function user() { try { return sessionStorage.getItem('os-user') || 'guest'; } catch (e) { return 'guest'; } }

  /* =================================================================
     SETTINGS
     ================================================================= */
  var DEFAULTS = { wallpaper: 'blue', depth: 'true', crt: false, font: 'normal', text: 'm', boot: 'full', saver: 2, trails: false };
  function load() {
    var s = {}, o = {};
    try { s = JSON.parse(localStorage.getItem('os-settings') || '{}') || {}; } catch (e) {}
    for (var k in DEFAULTS) o[k] = k in s ? s[k] : DEFAULTS[k];
    return o;
  }
  function save(s) {
    var diff = {};
    for (var k in DEFAULTS) if (s[k] !== DEFAULTS[k]) diff[k] = s[k];
    try {
      if (Object.keys(diff).length) localStorage.setItem('os-settings', JSON.stringify(diff));
      else localStorage.removeItem('os-settings');
    } catch (e) {}
  }
  function attr(name, val, def) { if (val !== def) root.setAttribute(name, val); else root.removeAttribute(name); }
  function apply(s) {
    attr('data-wall', s.wallpaper, 'blue');
    attr('data-depth', s.depth, 'true');
    attr('data-text', s.text, 'm');
    root.classList.toggle('crt', !!s.crt);
    root.classList.toggle('large', s.font === 'large');
    trails(!!s.trails);
    OS.emit('settings', s);
  }
  OS.settings = load;

  /* mouse trails, the old way */
  var trailEls = null, trailPts = [], trailPos = null;
  function trailMove(e) { if (e.pointerType === 'mouse') trailPos = [e.clientX, e.clientY]; }
  function trailLoop() {
    if (!trailEls) return;
    if (trailPos) {
      trailPts.unshift(trailPos);
      if (trailPts.length > 40) trailPts.pop();
      trailEls.forEach(function (t, i) {
        var p = trailPts[Math.min(trailPts.length - 1, (i + 1) * 4)];
        t.style.transform = 'translate(' + p[0] + 'px,' + p[1] + 'px)';
        t.hidden = false;
      });
    }
    requestAnimationFrame(trailLoop);
  }
  function trails(on) {
    if (on && !trailEls && !OS.coarse.matches && !OS.reduce.matches) {
      trailEls = [];
      for (var i = 0; i < 7; i++) {
        var t = document.createElement('i');
        t.className = 'trail';
        t.hidden = true;
        t.style.opacity = String(0.75 - i * 0.09);
        document.body.appendChild(t);
        trailEls.push(t);
      }
      document.addEventListener('pointermove', trailMove, true);
      requestAnimationFrame(trailLoop);
    } else if (!on && trailEls) {
      trailEls.forEach(function (t) { t.parentNode.removeChild(t); });
      trailEls = null;
      trailPts = [];
      document.removeEventListener('pointermove', trailMove, true);
    }
  }
  if (load().trails) trails(true);

  /* =================================================================
     DISCOVERIES + EVENT LOG GLUE
     ================================================================= */
  var FINDS = {
    setup: 'Entered BIOS Setup',
    root: 'Tried to log on as root',
    harya: 'Logged on as harya',
    sudo: 'Asked for sudo',
    bin: 'Emptied the Recycle Bin',
    fw5: 'Reached level 5 in Firewall',
    depth: 'Changed the color depth',
    csp: 'Watched the browser block a request',
    saver: 'Saw the screen saver',
    music: 'Played a song',
    find: 'Searched the posts',
    konami: 'Typed the old cheat code'
  };
  var KEYS = Object.keys(FINDS);
  var found = [];
  try { found = JSON.parse(sessionStorage.getItem('os-found') || '[]') || []; } catch (e) {}
  OS.on('discover', function (k) {
    if (!FINDS[k] || found.indexOf(k) !== -1) return;
    found.push(k);
    try { sessionStorage.setItem('os-found', JSON.stringify(found)); } catch (e) {}
    OS.log('audit', 'Discovery', 900 + KEYS.indexOf(k), FINDS[k] + '. (' + found.length + ' of ' + KEYS.length + ')');
    if (OS.balloon) OS.balloon('Discovery ' + found.length + ' of ' + KEYS.length, FINDS[k] + '.' + (found.length === KEYS.length ? ' That was all of them.' : ''));
  });
  OS.on('register', function (w) {
    var t = w.el.getAttribute('data-title') || w.app;
    OS.log('info', 'Shell', 4100, 'Opened ' + t + (w.url ? ' (' + w.url + ')' : '') + '.');
  });
  OS.on('theme', function (dark) { OS.log('info', 'Display', 3, 'Switched to ' + (dark ? 'Night' : 'Day') + '.'); });
  OS.on('bin', function (what, names) {
    if (what === 'empty') { OS.log('warn', 'Recycle Bin', 41, 'Deleted for good: ' + names.join(', ') + '. (They come back on reload.)'); OS.emit('discover', 'bin'); }
    else OS.log('info', 'Recycle Bin', 40, 'Moved to the Recycle Bin: ' + names.join(', ') + '.');
  });

  /* =================================================================
     BIOS SETUP
     ================================================================= */
  var WALL = [['blue', 'Blue'], ['teal', 'Teal'], ['packets', 'Packets'], ['grid', 'Graph Paper'], ['hex', 'Hex Dump'], ['black', 'Black']];
  var MENUS = [
    { name: 'Main', items: [
      { label: 'System Time', info: function () { return new Date().toLocaleTimeString('en-GB'); }, help: 'Read from your device. This computer keeps no time of its own.' },
      { label: 'System Date', info: function () { return new Date().toDateString(); }, help: 'Read from your device.' },
      { label: 'Logged On As', info: function () { return user(); }, help: 'The name typed at log on. It is kept in this tab only and forgotten when the tab closes.' },
      { label: 'Posts Installed', info: function () { return String(posts.length); }, help: 'Every post is a packet in Packet Capture.' },
      { label: 'Processor', info: function () { return 'One person, part time'; }, help: 'Writes after work and on weekends.' },
      { label: 'Memory', info: function () { return '640 KB (should be enough)'; }, help: 'Famous last words.' }
    ] },
    { name: 'Display', items: [
      { k: 'theme', label: 'Theme', opts: [['day', 'Day'], ['night', 'Night']], help: 'Day is the classic grey. Night is the same, dimmed. The moon in the tray switches too.' },
      { k: 'wallpaper', label: 'Wallpaper', opts: WALL, help: 'What sits behind the windows.' },
      { k: 'depth', label: 'Color Depth', opts: [['true', 'True Color'], ['256', '256 Colors'], ['16', '16 Colors'], ['green', 'Green Screen']], help: 'Fewer colors, the way some of us first saw computers. Everything still works.' },
      { k: 'crt', label: 'CRT Effect', opts: [[false, 'Disabled'], [true, 'Enabled']], help: 'Scan lines and a darker edge, like a tube monitor.' },
      { k: 'font', label: 'Interface Font', opts: [['normal', 'Normal'], ['large', 'Large']], help: 'Bigger text in menus, windows and lists.' },
      { k: 'text', label: 'Reading Text', opts: [['s', 'Small'], ['m', 'Medium'], ['l', 'Large'], ['xl', 'Extra Large']], help: 'Size of the text in posts. The Aa button in the Browser changes it too.' }
    ] },
    { name: 'Sound', items: [
      { k: 'sound', label: 'System Sounds', opts: [[true, 'Enabled'], [false, 'Disabled']], help: 'Start-up chime, clicks and dings. Made by your browser on the spot; no sound files. The speaker in the tray switches too.' }
    ] },
    { name: 'Boot', items: [
      { k: 'boot', label: 'Boot Screen', opts: [['full', 'Full'], ['quick', 'Quick']], help: 'Quick skips the memory test and the logo. You still log on. There is still no password.' },
      { k: 'saver', label: 'Screen Saver', opts: [[0, 'Disabled'], [1, 'After 1 min'], [2, 'After 2 min'], [5, 'After 5 min']], help: 'Never on touch screens, never while a post is open, never while music plays.' },
      { k: 'trails', label: 'Mouse Trails', opts: [[false, 'Disabled'], [true, 'Enabled']], help: 'For when the pointer was hard to find on a slow screen. Mouse only.' }
    ] },
    { name: 'Security', items: [
      { label: 'Trackers', fixed: 'Disabled', help: 'Not a setting. There is no tracking code here to turn on.' },
      { label: 'Cookies', fixed: 'Disabled', help: 'This site sets no cookies at all.' },
      { label: 'Third-Party Requests', fixed: 'Blocked', help: 'Your browser enforces a Content Security Policy: this page can only load files from bhanuharya.github.io. One exception, and only when you ask: a YouTube track in Media Player loads YouTube\'s player after you press Play and agree. The Security Center shows all of it.' },
      { label: 'Supervisor Password', fixed: 'Not Installed', help: 'There is no password. There never was.' },
      { label: 'Boot Sector Write', fixed: 'Protected', help: 'Nothing here can write to your disk. It is a web page.' }
    ] },
    { name: 'Exit', items: [
      { label: 'Save Changes and Exit', act: 'save', help: 'Keep these settings in this browser and continue.' },
      { label: 'Discard Changes and Exit', act: 'discard', help: 'Leave everything as it was.' },
      { label: 'Load Setup Defaults', act: 'defaults', help: 'Back to how the site comes: Day, blue, sounds on, full boot.' }
    ] }
  ];
  function current() {
    var s = load();
    s.theme = OS.isDark() ? 'night' : 'day';
    s.sound = OS.soundOn();
    return s;
  }
  function optLabel(it, v) { for (var i = 0; i < it.opts.length; i++) if (it.opts[i][0] === v) return it.opts[i][1]; return String(v); }
  OS.apps.setup = function (opts) {
    opts = opts || {};
    if ($('.bios')) return Promise.resolve();
    OS.closeMenus();
    OS.emit('discover', 'setup');
    OS.log('info', 'Setup', 1, 'BIOS Setup opened' + (opts.boot ? ' during boot.' : '.'));
    var start = current(), cur = current(), tab = 0, row = 0, dlg = null;
    var el = document.createElement('div');
    el.className = 'bios';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'BIOS Setup');
    el.tabIndex = -1;
    document.body.appendChild(el);
    var shellInert = function (on) {
      ['desktop', 'start-menu'].forEach(function (id) { var x = document.getElementById(id); if (x) x.inert = on; });
      var tb = $('.taskbar'); if (tb) tb.inert = on;
    };
    shellInert(true);
    var changed = function () { return Object.keys(cur).some(function (k) { return cur[k] !== start[k]; }); };
    var draw = function () {
      var m = MENUS[tab], it = m.items[row];
      el.innerHTML =
        '<div class="bios-top">obscura BIOS Setup Utility</div>' +
        '<div class="bios-tabs" role="tablist">' + MENUS.map(function (x, i) {
          return '<button type="button" role="tab" data-tab="' + i + '" aria-selected="' + (i === tab) + '">' + x.name + '</button>';
        }).join('') + '</div>' +
        '<div class="bios-main"><div class="bios-items" role="list">' + m.items.map(function (x, i) {
          var v = x.k ? '[' + optLabel(x, cur[x.k]) + ']' : x.info ? x.info() : x.fixed ? '[' + x.fixed + ']' : '';
          var cls = 'bios-row' + (i === row ? ' on' : '') + (x.fixed || x.info ? ' fixed' : '') + (x.k && cur[x.k] !== start[x.k] ? ' changed' : '') + (x.act ? ' act' : '');
          return '<button type="button" role="listitem" class="' + cls + '" data-row="' + i + '"><span class="k">' + (x.act ? '' : '') + esc(x.label) + '</span><span class="v">' + esc(v) + '</span></button>';
        }).join('') + '</div>' +
        '<div class="bios-help"><b>Item Specific Help</b><p>' + esc(it.help || '') + '</p>' +
          (changed() ? '<p class="bios-note">Changes are not saved yet. F10 saves.</p>' : '') + '</div></div>' +
        '<div class="bios-keys">' +
          '<span>←→ Menu</span><span>↑↓ Item</span><span>Enter Change</span>' +
          '<button type="button" data-bk="defaults">F9 Defaults</button><button type="button" data-bk="save">F10 Save &amp; Exit</button><button type="button" data-bk="esc">Esc Exit</button>' +
        '</div>' + (dlg ? dlg.html : '');
    };
    var cycle = function (dir) {
      var it = MENUS[tab].items[row];
      if (it.act) { act(it.act); return; }
      if (!it.k) { OS.sound('pop'); return; }
      var i = 0;
      it.opts.forEach(function (o, j) { if (o[0] === cur[it.k]) i = j; });
      cur[it.k] = it.opts[(i + (dir || 1) + it.opts.length) % it.opts.length][0];
      draw();
    };
    var finish = function (keep) {
      return new Promise(function (resolve) {
        if (keep) {
          var s = load();
          for (var k in DEFAULTS) s[k] = cur[k];
          save(s);
          apply(s);
          if ((cur.theme === 'night') !== OS.isDark()) OS.toggleTheme();
          if (cur.sound !== OS.soundOn()) OS.setSound(cur.sound);
          var diff = Object.keys(cur).filter(function (k) { return cur[k] !== start[k]; });
          OS.log('info', 'Setup', 2, diff.length ? 'Settings saved: ' + diff.map(function (k) { return k + ' = ' + cur[k]; }).join(', ') + '.' : 'Saved with no changes.');
          if (cur.depth !== 'true' && cur.depth !== start.depth) OS.emit('discover', 'depth');
        }
        document.removeEventListener('keydown', onKey, true);
        el.innerHTML = '<div class="bios-bye">' + (keep ? 'Saving CMOS settings... OK' : 'Leaving setup...') + '</div>';
        setTimeout(function () {
          el.parentNode.removeChild(el);
          if (!opts.boot) shellInert(false);
          resolve();
        }, OS.reduce.matches ? 80 : 650);
      });
    };
    var resolveExit;
    var done = new Promise(function (r) { resolveExit = r; });
    var ask = function (text, yes) {
      dlg = { yes: yes, html: '<div class="bios-dlg" role="alertdialog"><p>' + esc(text) + '</p><p><button type="button" data-dlg="y">Yes (Y)</button> <button type="button" data-dlg="n">No (N)</button></p></div>' };
      draw();
      var b = $('[data-dlg="y"]', el); if (b) b.focus();
    };
    var answer = function (y) { var d = dlg; dlg = null; draw(); el.focus(); if (y && d) d.yes(); };
    var act = function (a) {
      if (a === 'save') ask('Save to CMOS and exit?', function () { finish(true).then(resolveExit); });
      else if (a === 'discard') ask('Quit without saving?', function () { finish(false).then(resolveExit); });
      else if (a === 'defaults') ask('Load setup defaults?', function () {
        for (var k in DEFAULTS) cur[k] = DEFAULTS[k];
        cur.theme = 'day'; cur.sound = true;
        draw();
      });
      else if (a === 'esc') { if (changed()) act('discard'); else finish(false).then(resolveExit); }
    };
    var onKey = function (e) {
      var k = e.key;
      if (dlg) {
        if (k === 'y' || k === 'Y') { e.preventDefault(); answer(true); }
        else if (k === 'n' || k === 'N' || k === 'Escape') { e.preventDefault(); answer(false); }
        return;
      }
      var n = MENUS[tab].items.length;
      if (k === 'ArrowRight') { tab = (tab + 1) % MENUS.length; row = 0; }
      else if (k === 'ArrowLeft') { tab = (tab - 1 + MENUS.length) % MENUS.length; row = 0; }
      else if (k === 'ArrowDown') row = (row + 1) % n;
      else if (k === 'ArrowUp') row = (row - 1 + n) % n;
      else if (k === 'Enter' || k === ' ' || k === '+' || k === 'PageDown') { e.preventDefault(); cycle(1); return; }
      else if (k === '-' || k === 'PageUp') { e.preventDefault(); cycle(-1); return; }
      else if (k === 'F9') { e.preventDefault(); act('defaults'); return; }
      else if (k === 'F10') { e.preventDefault(); act('save'); return; }
      else if (k === 'Escape') { e.preventDefault(); act('esc'); return; }
      else return;
      e.preventDefault();
      draw();
    };
    document.addEventListener('keydown', onKey, true);
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]');
      if (t) { tab = +t.getAttribute('data-tab'); row = 0; draw(); return; }
      var r = e.target.closest('[data-row]');
      if (r) { var i = +r.getAttribute('data-row'); if (i === row || OS.coarse.matches) { row = i; cycle(1); } else { row = i; draw(); } return; }
      var bk = e.target.closest('[data-bk]');
      if (bk) { act(bk.getAttribute('data-bk')); return; }
      var d = e.target.closest('[data-dlg]');
      if (d) answer(d.getAttribute('data-dlg') === 'y');
    });
    var clock = setInterval(function () { if (!document.contains(el)) { clearInterval(clock); return; } if (tab === 0 && !dlg) draw(); }, 1000);
    draw();
    el.focus();
    return done;
  };

  /* =================================================================
     SECURITY CENTER
     ================================================================= */
  try { if (performance.setResourceTimingBufferSize) performance.setResourceTimingBufferSize(1000); } catch (e) {}
  function kb(n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; }
  function cspText() { var m = $('meta[http-equiv="Content-Security-Policy"]'); return m ? m.getAttribute('content') : ''; }
  OS.apps.security = function (from) {
    var w = OS.find('security');
    if (w) { OS.restore(w); w.refresh(); return; }
    w = OS.makeWindow('security', 'Security Center',
      '<div class="win-body sc-body">' +
        '<div class="sc-banner" data-sc-banner>' + svg('shield') + '<div><b data-sc-head></b><span data-sc-sub></span></div></div>' +
        '<fieldset class="group"><legend>Requests from this page</legend>' +
          '<table class="sc-table"><thead><tr><th>Site</th><th class="num">Requests</th><th class="num">Downloaded</th></tr></thead><tbody data-sc-req></tbody></table>' +
          '<details class="sc-all"><summary>Every request</summary><ol data-sc-all></ol></details></fieldset>' +
        '<fieldset class="group"><legend>Content Security Policy</legend>' +
          '<p>Your browser enforces this policy on every page here. Blocked so far: <b data-sc-blocked>0</b>.</p>' +
          '<pre class="sc-csp" data-sc-csp></pre>' +
          '<p class="sc-test"><button type="button" class="btn small" data-sc-test>Try to load example.com</button> <span data-sc-result></span></p></fieldset>' +
        '<fieldset class="group"><legend>Kept in this browser</legend>' +
          '<table class="sc-table"><thead><tr><th>Name</th><th>Value</th><th>Until</th></tr></thead><tbody data-sc-store></tbody></table>' +
          '<p>Cookies: <b data-sc-cookies></b></p>' +
          '<p><button type="button" class="btn small" data-sc-forget>Forget everything</button></p></fieldset>' +
        '<fieldset class="group"><legend>Connection</legend><dl class="sc-dl" data-sc-conn></dl></fieldset>' +
        '<p class="sc-foot">Found a security problem with this site? <a href="/.well-known/security.txt" target="_blank" rel="noopener">security.txt</a> says how to reach me.</p>' +
      '</div>' +
      '<div class="statusline"><span class="seg grow" data-sc-status>Up to date</span></div>', { from: from });
    var el = w.el;
    var entries = function () {
      var list = [];
      try { list = performance.getEntriesByType('navigation').concat(performance.getEntriesByType('resource')); } catch (e) {}
      return list.filter(function (e) { return /^https?:/.test(e.name); });
    };
    var refresh = function () {
      if (!document.contains(el)) return;
      var list = entries(), by = {};
      list.forEach(function (e) {
        var o;
        try { o = new URL(e.name).origin; } catch (x) { return; }
        by[o] = by[o] || { n: 0, b: 0, cached: 0 };
        by[o].n++;
        by[o].b += e.transferSize || 0;
        if (!e.transferSize && e.decodedBodySize) by[o].cached++;
      });
      var others = Object.keys(by).filter(function (o) { return o !== location.origin; });
      var head = $('[data-sc-head]', el), banner = $('[data-sc-banner]', el);
      var onlyYt = others.length && others.every(function (o) { return o === 'https://www.youtube-nocookie.com'; });
      head.textContent = others.length ? 'This page contacted ' + others.length + ' other site' + (others.length > 1 ? 's' : '') + '.' : 'This page has contacted 0 other sites.';
      $('[data-sc-sub]', el).textContent = onlyYt ?
        'That is YouTube, because you pressed Play on a YouTube video and agreed. Its player then makes its own requests, which this page cannot see. Stop the video, or close Media Player, to unload it.' :
        'Counted live from your browser\'s own record of everything this page loaded.';
      banner.classList.toggle('bad', others.length > 0 && !onlyYt);
      banner.classList.toggle('note', !!onlyYt);
      $('[data-sc-req]', el).innerHTML = Object.keys(by).sort(function (a, b) { return a === location.origin ? -1 : b === location.origin ? 1 : 0; }).map(function (o) {
        var r = by[o];
        return '<tr' + (o !== location.origin ? ' class="bad"' : '') + '><td>' + esc(o.replace(/^https?:\/\//, '')) + (o === location.origin ? ' <span class="dim">(this site)</span>' : '') + '</td><td class="num">' + r.n + '</td><td class="num">' + kb(r.b) + (r.cached ? ' <span class="dim">+' + r.cached + ' cached</span>' : '') + '</td></tr>';
      }).join('') + (others.length ? '' : '<tr class="ok"><td>Any other site</td><td class="num">0</td><td class="num">0 B</td></tr>');
      $('[data-sc-all]', el).innerHTML = list.slice(-200).map(function (e) {
        var u = e.name.replace(location.origin, '');
        return '<li><code>' + esc(u.length > 80 ? u.slice(0, 77) + '...' : u) + '</code> <span class="dim">' + esc(e.initiatorType || 'page') + ', ' + (e.transferSize ? kb(e.transferSize) : 'cached') + '</span></li>';
      }).join('');
      var blocked = window.OSBlocked || [];
      $('[data-sc-blocked]', el).textContent = String(blocked.length);
      $('[data-sc-csp]', el).textContent = cspText().split(/;\s*/).join(';\n');
      var rows = [];
      var add = function (store, label) {
        try {
          var st = window[store];
          for (var i = 0; i < st.length; i++) {
            var k = st.key(i), v = st.getItem(k) || '';
            rows.push('<tr><td><code>' + esc(k) + '</code></td><td><code>' + esc(v.length > 60 ? v.slice(0, 57) + '...' : v) + '</code></td><td>' + label + '</td></tr>');
          }
        } catch (e) {}
      };
      add('localStorage', 'you clear it');
      add('sessionStorage', 'tab closes');
      $('[data-sc-store]', el).innerHTML = rows.join('') || '<tr><td colspan="3">Nothing.</td></tr>';
      $('[data-sc-cookies]', el).textContent = document.cookie ? document.cookie.split(';').length + ' (not from this site\'s code)' : 'none';
      var gpc = navigator.globalPrivacyControl, dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1';
      $('[data-sc-conn]', el).innerHTML =
        '<dt>Address</dt><dd>' + esc(location.origin) + '</dd>' +
        '<dt>Encrypted</dt><dd>' + (location.protocol === 'https:' ? 'Yes, HTTPS' : (window.isSecureContext ? 'Local copy' : 'No')) + '</dd>' +
        '<dt>Referrer</dt><dd>Sites you click through to see only the address of this site, not the page.</dd>' +
        '<dt>Do Not Track</dt><dd>' + (gpc || dnt ? 'Your browser asks for it.' : 'Your browser does not ask.') + ' Either way there is nothing here to opt out of.</dd>' +
        '<dt>Hosting</dt><dd>GitHub Pages. It keeps its own server logs; nothing on this page adds to them.</dd>';
      $('[data-sc-status]', el).textContent = 'Updated ' + new Date().toLocaleTimeString('en-GB') + ' · ' + list.length + ' requests';
    };
    w.refresh = refresh;
    var obs = null;
    try { obs = new PerformanceObserver(function () { setTimeout(refresh, 50); }); obs.observe({ type: 'resource' }); } catch (e) {}
    var onBlock = function () { setTimeout(refresh, 20); };
    document.addEventListener('securitypolicyviolation', onBlock);
    OS.on('close', function (o) { if (o === w) { if (obs) obs.disconnect(); document.removeEventListener('securitypolicyviolation', onBlock); } });
    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-sc-test]')) {
        var out = $('[data-sc-result]', el);
        out.textContent = 'Trying...';
        var before = (window.OSBlocked || []).length;
        fetch('https://example.com/', { mode: 'no-cors', cache: 'no-store', credentials: 'omit' }).then(function () {
          out.textContent = 'It loaded. This browser is not enforcing the policy.';
        }).catch(function () {
          setTimeout(function () {
            var hit = (window.OSBlocked || []).length > before;
            out.textContent = hit ? 'Blocked by your browser before anything was sent.' : 'It failed, but not because of the policy (offline?).';
            if (hit) {
              OS.sound('ding');
              OS.log('warn', 'Security', 4957, 'Content Security Policy blocked a request to https://example.com (connect-src). Nothing was sent.');
              OS.emit('discover', 'csp');
            }
            refresh();
          }, 60);
        });
      }
      if (e.target.closest('[data-sc-forget]')) {
        OS.msg({ title: 'Forget everything', icon: 'warn', text: 'Clear every setting this site keeps in this browser, log off and start again?', buttons: ['Forget', 'Cancel'] }).then(function (i) {
          if (i !== 0) return;
          try { localStorage.clear(); } catch (x) {}
          try { sessionStorage.clear(); } catch (x) {}
          location.href = '/';
        });
      }
    });
    refresh();
  };

  /* =================================================================
     FIND
     ================================================================= */
  var index = null;
  function getIndex() {
    if (!index) index = fetch('/search.json', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).catch(function () { index = null; return []; });
    return index;
  }
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function terms(q) { return q.toLowerCase().split(/\s+/).filter(function (t) { return t.length > 0; }).slice(0, 6); }
  function search(list, q) {
    var ts = terms(q);
    if (!ts.length) return [];
    return list.map(function (p) {
      var title = p.t.toLowerCase(), tags = (p.g || []).join(' ').toLowerCase(), body = p.x.toLowerCase(), score = 0;
      for (var i = 0; i < ts.length; i++) {
        var t = ts[i], c = 0, at = -1;
        while ((at = body.indexOf(t, at + 1)) !== -1 && c < 50) c++;
        var inT = title.indexOf(t) !== -1, inG = tags.indexOf(t) !== -1;
        if (!c && !inT && !inG) return null;
        score += c + (inT ? 25 : 0) + (inG ? 12 : 0);
      }
      return { p: p, score: score };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; });
  }
  function snippet(p, q) {
    var ts = terms(q), body = p.x, low = body.toLowerCase(), at = -1;
    for (var i = 0; i < ts.length && at === -1; i++) at = low.indexOf(ts[i]);
    if (at === -1) return esc(body.slice(0, 160)) + '…';
    var s = Math.max(0, at - 70), e = Math.min(body.length, at + 130);
    var txt = (s ? '…' : '') + body.slice(s, e) + (e < body.length ? '…' : '');
    var re = new RegExp('(' + ts.map(reEsc).sort(function (a, b) { return b.length - a.length; }).join('|') + ')', 'gi');
    return esc(txt).replace(re, '<mark>$1</mark>');
  }
  var pending = null;
  function openAt(u, q) { pending = { u: u, q: q }; OS.open(u); }
  function highlight(w, q) {
    var content = $('.post-content', w.el), view = $('.page-view', w.el);
    if (!content || !q) return;
    var ts = terms(q);
    if (!ts.length) return;
    var re = new RegExp(ts.map(reEsc).sort(function (a, b) { return b.length - a.length; }).join('|'), 'gi');
    var walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null), nodes = [], marks = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      if (marks.length > 80) return;
      var t = n.nodeValue;
      re.lastIndex = 0;
      if (!re.test(t)) return;
      re.lastIndex = 0;
      var frag = document.createDocumentFragment(), last = 0, m;
      while ((m = re.exec(t))) {
        frag.appendChild(document.createTextNode(t.slice(last, m.index)));
        var mk = document.createElement('mark');
        mk.className = 'find-hit';
        mk.textContent = m[0];
        frag.appendChild(mk);
        marks.push(mk);
        last = m.index + m[0].length;
      }
      frag.appendChild(document.createTextNode(t.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });
    if (!marks.length) return;
    marks[0].classList.add('cur');
    var vr = view.getBoundingClientRect(), mr = marks[0].getBoundingClientRect();
    view.scrollTop += mr.top - vr.top - vr.height / 3;
    var st = $('[data-status]', w.el);
    if (st) st.textContent = marks.length + (marks.length > 80 ? '+' : '') + ' match' + (marks.length === 1 ? '' : 'es') + ' for "' + q + '"';
  }
  OS.apps.find = function (q, from) {
    if (typeof q !== 'string') { from = q; q = ''; }
    var w = OS.find('find');
    if (!w) {
      w = OS.makeWindow('find', 'Find: Posts',
        '<form class="find-form" role="search"><label for="find-q">Containing text:</label>' +
          '<input class="field sunken" id="find-q" type="search" autocomplete="off" spellcheck="false" placeholder="a word or two">' +
          '<button class="btn" type="submit">Find Now</button></form>' +
        '<div class="win-body find-results sunken"><ul class="find-list" data-find-list></ul></div>' +
        '<div class="statusline"><span class="seg grow" data-find-status>Searches the full text of every post.</span></div>', { from: from });
      var el = w.el, input = $('#find-q', el), list = $('[data-find-list]', el), status = $('[data-find-status]', el), timer = null, lastQ = '';
      var run = function (commit) {
        var q = input.value.trim();
        if (q === lastQ && !commit) return;
        lastQ = q;
        if (!q) { list.innerHTML = ''; status.textContent = 'Searches the full text of every post.'; return; }
        status.textContent = 'Searching...';
        getIndex().then(function (idx) {
          if (input.value.trim() !== q) return;
          var res = search(idx, q);
          list.innerHTML = res.map(function (r) {
            return '<li class="' + esc(r.p.f || 'misc') + '"><a href="' + esc(r.p.u) + '">' + svg('post') + '<b>' + esc(r.p.t) + '</b><span class="dim">' + esc(r.p.d) + '</span></a><p>' + snippet(r.p, q) + '</p></li>';
          }).join('');
          status.textContent = res.length ? res.length + ' post' + (res.length === 1 ? '' : 's') + ' found' : 'Nothing found for "' + q + '".';
          if (commit) {
            OS.log('info', 'Search', 1, 'Searched for "' + q.slice(0, 60) + '": ' + res.length + ' result(s).');
            OS.emit('discover', 'find');
          }
        });
      };
      input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { run(false); }, 160); });
      $('.find-form', el).addEventListener('submit', function (e) {
        e.preventDefault();
        run(true);
        var first = $('a', list);
        if (first && document.activeElement !== input) first.focus();
      });
      list.addEventListener('click', function (e) {
        var a = e.target.closest('a');
        if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        OS.emit('discover', 'find');
        openAt(a.getAttribute('href'), input.value.trim());
      });
      w.search = function (text) { input.value = text; run(true); };
      getIndex();
    } else OS.restore(w);
    var inp = $('#find-q', w.el);
    if (q) w.search(q);
    if (!OS.coarse.matches) { inp.focus(); inp.select(); }
  };
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
    if ($('.bios, .modal-bg, #bootscreen, .saver')) return;
    e.preventDefault();
    OS.apps.find();
  });

  /* =================================================================
     EVENT VIEWER
     ================================================================= */
  var LEVEL = { info: ['Information', 'info'], warn: ['Warning', 'warn'], audit: ['Audit Success', 'key'] };
  OS.apps.events = function (from) {
    var w = OS.find('events');
    if (w) { OS.restore(w); return; }
    w = OS.makeWindow('events', 'Event Viewer',
      '<div class="toolbar ev-bar"><button type="button" class="btn tool" data-ev="clear">Clear Log</button>' +
        '<label class="ev-show">Show <select class="field sunken" data-ev-filter><option value="">All events</option><option value="warn">Warnings</option><option value="audit">Discoveries</option><option value="info">Information</option></select></label></div>' +
      '<div class="win-body ev-body"><div class="ev-list sunken"><table class="packets ev-table"><thead><tr><th scope="col">Type</th><th scope="col" class="ev-date">Date and Time</th><th scope="col">Source</th><th scope="col" class="num">Event</th><th scope="col">Description</th></tr></thead><tbody data-ev-rows></tbody></table></div>' +
        '<div class="ev-detail sunken" data-ev-detail><p class="dim">Select an event to read it here.</p></div></div>' +
      '<div class="statusline"><span class="seg grow" data-ev-count></span><span class="seg" data-ev-found></span></div>', { from: from });
    var el = w.el, rows = $('[data-ev-rows]', el), detail = $('[data-ev-detail]', el), filter = $('[data-ev-filter]', el), sel = null;
    var fmt = function (t) { var d = new Date(t); return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB'); };
    var show = function (ev) {
      sel = ev;
      $$('tr', rows).forEach(function (tr) { tr.classList.toggle('on', tr._ev === ev); });
      detail.innerHTML = ev ? '<dl class="ev-dl"><dt>Type</dt><dd>' + LEVEL[ev.l][0] + '</dd><dt>Date and Time</dt><dd>' + fmt(ev.t) + '</dd><dt>Source</dt><dd>' + esc(ev.s) + '</dd><dt>Event ID</dt><dd>' + ev.i + '</dd><dt>User</dt><dd>' + esc(user()) + '</dd></dl><p>' + esc(ev.x) + '</p>' : '<p class="dim">Select an event to read it here.</p>';
    };
    var draw = function () {
      var f = filter.value, list = OS.events.filter(function (ev) { return !f || ev.l === f; }).slice().reverse();
      rows.innerHTML = '';
      list.forEach(function (ev) {
        var tr = document.createElement('tr');
        tr.className = 'pk ev-' + ev.l;
        tr.tabIndex = 0;
        tr._ev = ev;
        tr.innerHTML = '<td class="ev-type">' + svg(LEVEL[ev.l][1]) + '<span>' + LEVEL[ev.l][0] + '</span></td><td class="ev-date">' + fmt(ev.t) + '</td><td>' + esc(ev.s) + '</td><td class="num">' + ev.i + '</td><td class="ev-x">' + esc(ev.x) + '</td>';
        rows.appendChild(tr);
      });
      if (!list.length) rows.innerHTML = '<tr><td colspan="5" class="dim">No events.</td></tr>';
      $('[data-ev-count]', el).textContent = OS.events.length + ' event(s) in this tab';
      $('[data-ev-found]', el).textContent = 'Discoveries: ' + found.length + ' of ' + KEYS.length;
      if (sel && OS.events.indexOf(sel) !== -1) show(sel); else show(null);
    };
    rows.addEventListener('click', function (e) { var tr = e.target.closest('tr'); if (tr && tr._ev) show(tr._ev); });
    rows.addEventListener('keydown', function (e) {
      var tr = e.target.closest('tr');
      if (!tr) return;
      var next = e.key === 'ArrowDown' ? tr.nextElementSibling : e.key === 'ArrowUp' ? tr.previousElementSibling : null;
      if (next && next._ev) { e.preventDefault(); next.focus(); show(next._ev); }
      if (e.key === 'Enter' && tr._ev) show(tr._ev);
    });
    filter.addEventListener('change', draw);
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ev]');
      if (b && b.getAttribute('data-ev') === 'clear') {
        OS.msg({ title: 'Event Viewer', icon: 'warn', text: 'Clear every event in this log?', buttons: ['Clear', 'Cancel'] }).then(function (i) {
          if (i !== 0) return;
          OS.clearLog();
          OS.log('warn', 'Event Log', 1102, 'The log was cleared by ' + user() + '.');
        });
      }
    });
    var onLog = function () { if (document.contains(el)) draw(); };
    OS.on('log', onLog);
    draw();
  };

  /* =================================================================
     BROWSER: contents, text size, find highlights, 404 help
     ================================================================= */
  var SIZES = [['s', 'Small'], ['m', 'Medium'], ['l', 'Large'], ['xl', 'Extra Large']];
  function textButton(w) {
    var b = $('[data-act="text"]', w.el);
    if (!b) return;
    var label = function () { var v = load().text; SIZES.forEach(function (x) { if (x[0] === v) b.title = 'Text size: ' + x[1]; }); };
    label();
    b.addEventListener('click', function () {
      var s = load(), i = 0;
      SIZES.forEach(function (x, j) { if (x[0] === s.text) i = j; });
      s.text = SIZES[(i + 1) % SIZES.length][0];
      save(s);
      apply(s);
      $$('[data-act="text"]').forEach(function (o) { o.title = 'Text size: ' + SIZES[(i + 1) % SIZES.length][1]; });
      var st = $('[data-status]', w.el);
      if (st) st.textContent = 'Text size: ' + SIZES[(i + 1) % SIZES.length][1];
    });
  }
  function contents(w) {
    var content = $('.post-content', w.el), view = $('.page-view', w.el), btn = $('[data-act="toc"]', w.el);
    if (!content || !view || !btn) return;
    var hs = $$('h2, h3', content).filter(function (h) { return h.textContent.trim(); });
    if (hs.length < 3) return;
    btn.hidden = false;
    var panel = null;
    var toggle = function (on) {
      if (on === undefined) on = !w.el.classList.contains('toc-open');
      if (on && !panel) build();
      w.el.classList.toggle('toc-open', on);
      btn.setAttribute('aria-pressed', String(on));
      if (on) mark();
    };
    var go = function (h) {
      var vr = view.getBoundingClientRect(), hr = h.getBoundingClientRect();
      view.scrollTo({ top: view.scrollTop + hr.top - vr.top - 10, behavior: OS.reduce.matches ? 'auto' : 'smooth' });
    };
    var mark = function () {
      if (!panel) return;
      var top = view.getBoundingClientRect().top + 40, cur = 0;
      hs.forEach(function (h, i) { if (h.getBoundingClientRect().top <= top) cur = i; });
      $$('a', panel).forEach(function (a, i) { a.classList.toggle('on', i === cur); });
    };
    var build = function () {
      var wrap = document.createElement('div');
      wrap.className = 'browser-main';
      view.parentNode.insertBefore(wrap, view);
      panel = document.createElement('nav');
      panel.className = 'toc sunken';
      panel.setAttribute('aria-label', 'Contents');
      panel.innerHTML = '<div class="toc-head"><b>Contents</b><button type="button" class="tbtn" data-toc-x aria-label="Close contents"><i class="g-close"></i></button></div><ul>' +
        hs.map(function (h, i) { return '<li class="' + h.tagName.toLowerCase() + '"><a href="#' + esc(h.id || '') + '" data-i="' + i + '">' + esc(h.textContent.trim()) + '</a></li>'; }).join('') + '</ul>';
      wrap.appendChild(panel);
      wrap.appendChild(view);
      panel.addEventListener('click', function (e) {
        var a = e.target.closest('a[data-i]');
        if (a) { e.preventDefault(); go(hs[+a.getAttribute('data-i')]); if (OS.phone.matches) toggle(false); return; }
        if (e.target.closest('[data-toc-x]')) toggle(false);
      });
      var t = null;
      view.addEventListener('scroll', function () { if (!t) t = setTimeout(function () { t = null; mark(); }, 80); }, { passive: true });
    };
    btn.addEventListener('click', function () { toggle(); });
    // long posts on wide screens open with their contents showing
    if (hs.length >= 6 && !OS.phone.matches && window.innerWidth >= 1200) toggle(true);
  }
  function similar(a, b) {
    var grams = function (s) { var g = {}; for (var i = 0; i < s.length - 1; i++) g[s.slice(i, i + 2)] = (g[s.slice(i, i + 2)] || 0) + 1; return g; };
    var A = grams(a), B = grams(b), n = 0, ta = 0, tb = 0, k;
    for (k in A) { ta += A[k]; if (B[k]) n += Math.min(A[k], B[k]); }
    for (k in B) tb += B[k];
    return ta + tb ? 2 * n / (ta + tb) : 0;
  }
  function notFound(w) {
    var page = $('.errorpage', w.el);
    if (!page) return;
    var path = w.url || location.pathname;
    try { path = decodeURIComponent(new URL(path, location.href).pathname); } catch (e) {}
    $$('.nf-path', w.el).forEach(function (c) { c.textContent = path; });
    var addr = $('.address input', w.el);
    if (addr) addr.value = location.origin + path;
    var slug = path.replace(/\/$/, '').split('/').pop().toLowerCase();
    var best = null, bestScore = 0;
    posts.forEach(function (p) {
      var ps = p.u.replace(/\/$/, '').split('/').pop();
      var sc = Math.max(similar(slug, ps), similar(slug, p.t.toLowerCase().replace(/[^a-z0-9]+/g, '-')));
      if (sc > bestScore) { bestScore = sc; best = p; }
    });
    var words = slug.replace(/\.[a-z]+$/, '').replace(/[-_]+/g, ' ').trim();
    var more = $('.nf-more', w.el);
    if (!more) return;
    var html = '';
    if (best && bestScore > 0.3) html += '<p class="nf-guess">Did you mean <a href="' + esc(best.u) + '">' + esc(best.t) + '</a>?</p>';
    if (words) html += '<p><button type="button" class="btn small" data-nf-find>Search the posts for “' + esc(words.slice(0, 40)) + '”</button></p>';
    more.innerHTML = html;
    var b = $('[data-nf-find]', more);
    if (b) b.addEventListener('click', function () { OS.apps.find(words.slice(0, 40)); });
    OS.log('warn', 'Browser', 404, 'Page not found: ' + path);
  }
  OS.on('register', function (w) {
    if (w.app !== 'browser') return;
    textButton(w);
    contents(w);
    notFound(w);
    if (pending && w.url && w.url.indexOf(pending.u) === 0) {
      var q = pending.q;
      pending = null;
      setTimeout(function () { highlight(w, q); }, 30);
    }
  });

  /* =================================================================
     ↑ ↑ ↓ ↓ ← → ← → B A
     ================================================================= */
  var CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'], at = 0;
  document.addEventListener('keydown', function (e) {
    var k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
    at = k === CODE[at] ? at + 1 : (k === CODE[0] ? 1 : 0);
    if (at < CODE.length) return;
    at = 0;
    OS.emit('discover', 'konami');
    OS.log('warn', 'Firewall', 5152, 'Packet storm. Nothing was unlocked, but nice reflexes.');
    storm();
  });
  function storm() {
    if (OS.reduce.matches) return;
    OS.sound('startup');
    var c = document.createElement('canvas');
    c.className = 'storm';
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = c.width = innerWidth * dpr, H = c.height = innerHeight * dpr, g = c.getContext('2d');
    var COL = { sec: '#c9c4ff', ai: '#b7dcff', game: '#b6f09a', misc: '#ffffff' };
    var src = posts.length ? posts : [{ p: 'TCP', f: 'misc' }];
    var drops = [];
    for (var i = 0; i < 90; i++) {
      var p = src[i % src.length];
      drops.push({ x: Math.random() * W, y: -Math.random() * H * 1.5, v: (4 + Math.random() * 9) * dpr, p: p });
    }
    var t0 = performance.now();
    var frame = function (t) {
      var age = t - t0;
      g.clearRect(0, 0, W, H);
      g.font = 'bold ' + (11 * dpr) + 'px Tahoma, Verdana, sans-serif';
      g.textBaseline = 'middle';
      g.globalAlpha = age > 3500 ? Math.max(0, 1 - (age - 3500) / 800) : 1;
      drops.forEach(function (d) {
        d.y += d.v; d.x += d.v * 0.25;
        if (d.y > H + 30) { d.y = -30; d.x = Math.random() * W; }
        var w2 = 46 * dpr, h2 = 16 * dpr;
        g.fillStyle = '#0a246a'; g.fillRect(d.x, d.y, w2, h2);
        g.fillStyle = COL[d.p.f] || COL.misc; g.fillRect(d.x + w2, d.y, 18 * dpr, h2);
        g.fillStyle = '#fff'; g.fillText(d.p.p, d.x + 4 * dpr, d.y + h2 / 2);
      });
      if (age < 4300) requestAnimationFrame(frame); else c.parentNode.removeChild(c);
    };
    requestAnimationFrame(frame);
  }

  OS.on('ready', function () {
    if (window.OSBlocked && window.OSBlocked.length) OS.log('warn', 'Security', 4957, 'Content Security Policy blocked ' + window.OSBlocked.length + ' request(s) while the page loaded.');
  });
})();
