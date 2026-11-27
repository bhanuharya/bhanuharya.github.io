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
  var DISCOVERIES = {
    setup: ['BIOS Setup', 'Entered the BIOS Setup Utility'],
    depth: ['Retro Colors', 'Changed Color Depth in Setup'],
    csp: ['Policy Proof', 'Watched the CSP block example.com'],
    find: ['Full-Text Search', 'Searched posts with Find'],
    bin: ['Empty Trash', 'Emptied the Recycle Bin'],
    music: ['Audiophile', 'Played music or a YouTube track in Media Player'],
    fw5: ['Packet Defender', 'Reached Level 5 in Firewall'],
    wayback: ['Time Traveler', 'Opened a site from ~2000 in The Web'],
    capture: ['Wiretapper', 'Followed an HTTP stream in Packet Capture'],
    virus: ['Survived notavirus.exe', 'Ran notavirus.exe and lived to tell the tale'],
    terminal: ['Shell Dweller', 'Found .plan or played a game in Terminal'],
    fav: ['Bookmarked', 'Saved a page to Browser Favorites']
  };
  var KEYS = Object.keys(DISCOVERIES);
  var found = [];
  try {
    var savedFound = JSON.parse(sessionStorage.getItem('os-found') || '[]');
    if (Array.isArray(savedFound)) found = savedFound.filter(function (k) { return !!DISCOVERIES[k]; });
  } catch (e) {}
  OS.on('discover', function (id) {
    if (!DISCOVERIES[id] || found.indexOf(id) !== -1) return;
    found.push(id);
    try { sessionStorage.setItem('os-found', JSON.stringify(found)); } catch (e) {}
    var d = DISCOVERIES[id];
    OS.log('audit', 'Discoveries', 7001, 'Unlocked (' + found.length + '/' + KEYS.length + '): ' + d[0] + ' — ' + d[1] + '.');
    if (OS.balloon) OS.balloon('Discovery ' + found.length + '/' + KEYS.length, d[0] + ': ' + d[1] + '.');
  });
  function showDiscoveries() {
    var items = KEYS.map(function (k) {
      var ok = found.indexOf(k) !== -1, d = DISCOVERIES[k];
      return '<li class="' + (ok ? 'disc-ok' : 'disc-no') + '">' + (ok ? '✓ <b>' + esc(d[0]) + '</b> — ' + esc(d[1]) : '☐ <span class="dim">Undiscovered</span>') + '</li>';
    }).join('');
    OS.msg({
      title: 'Discoveries (' + found.length + ' / ' + KEYS.length + ')', icon: 'key',
      text: found.length === KEYS.length ? 'You found all ' + KEYS.length + ' things around obscuraOS!' : 'Things to find around the desktop during this visit:',
      html: '<ul class="disc-list">' + items + '</ul>'
    });
  }
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
      { label: 'System Time', info: function () { return new Date().toLocaleTimeString('en-GB'); }, help: 'Read from this device.' },
      { label: 'System Date', info: function () { return new Date().toDateString(); }, help: 'Read from this device.' },
      { label: 'Processor', info: function () { return sysinfo().cpu; }, help: 'Logical processors, as the browser reports them.' },
      { label: 'Memory', info: function () { return sysinfo().memShort; }, help: 'Browsers round this down and stop at 8 GB on purpose, so pages cannot tell devices apart by it.' },
      { label: 'Display', info: function () { return sysinfo().displayShort; }, help: 'Screen size in CSS pixels and the pixel ratio.' },
      { label: 'Platform', info: function () { return sysinfo().platform; }, help: 'Reported by the browser.' },
      { label: 'Browser', info: function () { return sysinfo().browser; }, help: 'obscuraOS runs inside it.' },
      { label: 'OS Version', info: function () { return 'obscuraOS ' + (OS.data.build || ''); }, help: 'The date this copy was built.' }
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
      { k: 'saver', label: 'Screen Saver', opts: [[0, 'Disabled'], [1, 'After 1 min'], [2, 'After 2 min'], [5, 'After 5 min']], help: 'Pulsar ridge lines when idle. Stays off on touch screens and while Media Player is playing.' },
      { k: 'trails', label: 'Mouse Trails', opts: [[false, 'Disabled'], [true, 'Enabled']], help: 'For when the pointer was hard to find on a slow screen. Mouse only.' }
    ] },
    { name: 'Security', items: [
      { label: 'Supervisor Password', fixed: 'Not Installed', help: 'No password is set.' },
      { label: 'Content Security Policy', fixed: 'Enforced', help: 'The browser only lets this system load files from its own address. Security Center shows the policy and what it has blocked.' },
      { label: 'Cookies', fixed: 'None', help: 'This system sets no cookies.' },
      { label: 'Third-Party Frames', fixed: 'Ask First', help: 'Only YouTube (Media Player) and the Internet Archive (The Web), and only after you agree.' }
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
    var start = current(), cur = current(), tab = (typeof opts.tab === 'number' && opts.tab >= 0 && opts.tab < MENUS.length) ? opts.tab : 0, row = 0, dlg = null;
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
        '<p class="sc-foot">Found a security problem with this site? <a href="/.well-known/security.txt" target="_blank" rel="noopener">security.txt</a> explains how to report one.</p>' +
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
      // sites this page only contacts when you ask: YouTube (Media Player) and the Internet Archive (The Web)
      var ASKED = { 'https://www.youtube-nocookie.com': 'YouTube, because you pressed Play on a YouTube video', 'https://web.archive.org': 'the Internet Archive, because you opened an old web page' };
      var onlyYt = others.length && others.every(function (o) { return ASKED[o]; });
      head.textContent = others.length ? 'This page contacted ' + others.length + ' other site' + (others.length > 1 ? 's' : '') + '.' : 'This page has contacted 0 other sites.';
      $('[data-sc-sub]', el).textContent = onlyYt ?
        'That is ' + others.map(function (o) { return ASKED[o]; }).join(', and ') + ', and you agreed. They make their own requests from there, which this page cannot see. Closing the video or the page unloads them.' :
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
    var onClose = function (o) {
      if (o === w) {
        if (obs) obs.disconnect();
        document.removeEventListener('securitypolicyviolation', onBlock);
        OS.off('close', onClose);
      }
    };
    OS.on('close', onClose);
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
  function clearMarks(scope) {
    if (!scope) return;
    $$('mark.find-hit', scope).forEach(function (mk) {
      var p = mk.parentNode;
      if (!p) return;
      p.replaceChild(document.createTextNode(mk.textContent), mk);
      p.normalize();
    });
  }
  function markMatches(scope, q) {
    clearMarks(scope);
    var target = $('.post-content', scope) || $('.page-doc', scope) || $('.page-view', scope);
    if (!target || !q) return [];
    var ts = terms(q);
    if (!ts.length) return [];
    var re = new RegExp(ts.map(reEsc).sort(function (a, b) { return b.length - a.length; }).join('|'), 'gi');
    var walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, null), nodes = [], marks = [];
    while (walker.nextNode()) {
      var pn = walker.currentNode.parentNode;
      if (pn && /^(SCRIPT|STYLE|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(pn.tagName)) continue;
      nodes.push(walker.currentNode);
    }
    nodes.forEach(function (n) {
      if (marks.length >= 200) return;
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
        if (marks.length >= 200) break;
      }
      frag.appendChild(document.createTextNode(t.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });
    return marks;
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
        '<button type="button" class="btn tool" data-ev="disc">Discoveries (' + found.length + '/' + KEYS.length + ')</button>' +
        '<label class="ev-show">Show <select class="field sunken" data-ev-filter><option value="">All events</option><option value="warn">Warnings</option><option value="audit">Audit</option><option value="info">Information</option></select></label></div>' +
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
      $('[data-ev-found]', el).textContent = 'User: ' + user() + ' · Discoveries: ' + found.length + '/' + KEYS.length;
      var db = $('[data-ev="disc"]', el);
      if (db) db.textContent = 'Discoveries (' + found.length + '/' + KEYS.length + ')';
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
      if (!b) return;
      var act = b.getAttribute('data-ev');
      if (act === 'clear') {
        OS.msg({ title: 'Event Viewer', icon: 'warn', text: 'Clear every event in this log?', buttons: ['Clear', 'Cancel'] }).then(function (i) {
          if (i !== 0) return;
          OS.clearLog();
          OS.log('warn', 'Event Log', 1102, 'The log was cleared by ' + user() + '.');
        });
      } else if (act === 'disc') {
        showDiscoveries();
      }
    });
    var onLog = function () { if (document.contains(el)) draw(); };
    var onClose = function (o) { if (o === w) { OS.off('log', onLog); OS.off('close', onClose); } };
    OS.on('log', onLog);
    OS.on('close', onClose);
    draw();
  };

  /* =================================================================
     SYSTEM INFORMATION (real, read from this device)
     ================================================================= */
  function sysinfo() {
    var n = navigator, s = window.screen || {}, c = n.connection || {}, uad = n.userAgentData, ua = n.userAgent || '';
    var brand = '';
    if (uad && uad.brands) uad.brands.forEach(function (b) { if (!brand && !/not.?a.?brand|chromium/i.test(b.brand)) brand = b.brand + ' ' + b.version; });
    if (!brand) {
      var m = /Firefox\/(\d+)/.exec(ua) || /Edg\/(\d+)/.exec(ua) || /Version\/(\d+)[^ ]* (Mobile\/\S+ )?Safari/.exec(ua) || /Chrome\/(\d+)/.exec(ua);
      brand = m ? (/Firefox/.test(m[0]) ? 'Firefox ' : /Edg/.test(m[0]) ? 'Edge ' : /Safari/.test(m[0]) ? 'Safari ' : 'Chrome ') + m[1] : 'Unknown';
      if (/Chromium|Chrome/.test(brand) && uad && uad.brands) uad.brands.forEach(function (b) { if (/chromium/i.test(b.brand)) brand = 'Chromium ' + b.version; });
    }
    var store = true;
    try { localStorage.setItem('os-probe', '1'); localStorage.removeItem('os-probe'); } catch (e) { store = false; }
    var dpr = window.devicePixelRatio || 1;
    var mem = n.deviceMemory;
    return {
      cpu: n.hardwareConcurrency ? n.hardwareConcurrency + ' logical processors' : 'not reported',
      mem: mem ? (mem >= 8 ? '8 GB or more' : mem + ' GB') + ' (as reported)' : 'not reported',
      memShort: mem ? (mem >= 8 ? '8 GB or more' : mem + ' GB') : 'not reported',
      display: s.width + ' x ' + s.height + ' at ' + dpr + 'x, ' + (s.colorDepth || 24) + '-bit color',
      displayShort: s.width + ' x ' + s.height + ' @' + dpr + 'x',
      win: window.innerWidth + ' x ' + window.innerHeight,
      input: (window.matchMedia && matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse') + (n.maxTouchPoints ? ', ' + n.maxTouchPoints + ' touch points' : ''),
      net: (n.onLine === false ? 'offline' : 'online') + (c.effectiveType ? ', ' + c.effectiveType : ''),
      storage: store ? 'local storage available' : 'local storage blocked',
      browser: brand,
      platform: (uad && uad.platform) || n.platform || 'unknown',
      lang: n.language || '',
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone) || ''
    };
  }
  OS.sysinfo = sysinfo;
  function since(ms) {
    var m = Math.floor(ms / 60000), h = Math.floor(m / 60);
    return h ? h + ' h ' + (m % 60) + ' min' : m ? m + ' min ' + Math.floor(ms / 1000) % 60 + ' s' : Math.floor(ms / 1000) + ' s';
  }
  function gpu() {
    try {
      var g = document.createElement('canvas').getContext('webgl');
      if (!g) return 'no WebGL';
      var d = g.getExtension('WEBGL_debug_renderer_info');
      return String(d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER));
    } catch (e) { return 'not reported'; }
  }
  OS.apps.system = function (from) {
    var w = OS.find('system');
    if (w) { OS.restore(w); return; }
    var si = sysinfo(), tabs = ['General', 'Hardware', 'Performance', 'Network'];
    var dl = function (rows) { return '<dl>' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd' + (r[2] ? ' data-live="' + r[2] + '"' : '') + '>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>'; };
    var logon = 0;
    try { logon = +sessionStorage.getItem('os-logon') || 0; } catch (e) {}
    w = OS.makeWindow('system', 'System Properties',
      '<div class="win-body dialog-body props sysprops">' +
        '<div class="tabs" role="tablist" aria-label="System Properties">' + tabs.map(function (t, i) { return '<button type="button" role="tab" id="sp-t' + i + '" aria-controls="sp-p' + i + '" aria-selected="' + (i === 0) + '"' + (i ? ' tabindex="-1"' : '') + '>' + t + '</button>'; }).join('') + '</div>' +
        '<div class="tab-panels">' +
          '<div class="tab-panel" id="sp-p0" role="tabpanel" aria-labelledby="sp-t0"><div class="sysinfo">' + svg('computer', 'big-ico') + '<div>' +
            '<p><b>obscuraOS</b><br><span class="dim">Version ' + esc(OS.data.build || '') + '</span></p>' +
            '<p>Registered to:<br>' + esc(user()) + '</p></div></div>' +
            dl([['Logged on', logon ? new Date(logon).toLocaleTimeString('en-GB') : 'this session'], ['Up for', since(performance.now()), 'up'], ['Browser', si.browser], ['Platform', si.platform], ['Language', si.lang], ['Time zone', si.tz]]) + '</div>' +
          '<div class="tab-panel" id="sp-p1" role="tabpanel" aria-labelledby="sp-t1" hidden>' +
            dl([['Processor', si.cpu], ['Memory', si.mem], ['Graphics', '…', 'gpu'], ['Display', si.display], ['Window', si.win, 'win'], ['Input', si.input], ['Storage', si.storage]]) +
            '<p class="dim small">Read from this device by the browser. Nothing here is sent anywhere.</p></div>' +
          '<div class="tab-panel" id="sp-p2" role="tabpanel" aria-labelledby="sp-t2" hidden>' +
            dl([['Frame rate', 'measuring…', 'fps'], ['Script memory', '…', 'heap'], ['Page elements', '…', 'dom'], ['Windows open', '…', 'wins'], ['Requests so far', '…', 'reqs'], ['Storage used', '…', 'quota']]) + '</div>' +
          '<div class="tab-panel" id="sp-p3" role="tabpanel" aria-labelledby="sp-t3" hidden>' +
            dl([['Status', si.net, 'net'], ['Server', location.host], ['Protocol', '…', 'proto'], ['Downlink', '…', 'down'], ['Round trip', '…', 'rtt']]) +
            '<p><button type="button" class="btn small" data-ping>Ping ' + esc(location.host) + '</button></p><pre class="ping sunken" hidden></pre></div>' +
        '</div>' +
        '<div class="dialog-buttons"><button type="button" class="btn" data-act="close">OK</button></div>' +
      '</div>', { from: from });
    var el = w.el, tabEls = $$('[role="tab"]', el);
    var showTab = function (t, f) {
      tabEls.forEach(function (o) { var on = o === t; o.setAttribute('aria-selected', String(on)); o.tabIndex = on ? 0 : -1; document.getElementById(o.getAttribute('aria-controls')).hidden = !on; });
      if (f) t.focus();
    };
    tabEls.forEach(function (t, i) {
      t.addEventListener('click', function () { showTab(t); });
      t.addEventListener('keydown', function (e) {
        var j = e.key === 'ArrowRight' ? (i + 1) % tabEls.length : e.key === 'ArrowLeft' ? (i - 1 + tabEls.length) % tabEls.length : -1;
        if (j !== -1) { e.preventDefault(); showTab(tabEls[j], true); }
      });
    });
    var set = function (k, v) { var d = $('[data-live="' + k + '"]', el); if (d) d.textContent = v; };
    setTimeout(function () { set('gpu', gpu()); }, 50);
    var nav = (performance.getEntriesByType('navigation') || [])[0];
    set('proto', nav && nav.nextHopProtocol ? nav.nextHopProtocol.toUpperCase().replace('H2', 'HTTP/2').replace('H3', 'HTTP/3') : 'not reported');
    var frames = 0, last = performance.now(), alive = true;
    var count = function () { if (!alive) return; frames++; requestAnimationFrame(count); };
    requestAnimationFrame(count);
    var tick = function () {
      if (!document.contains(el)) { alive = false; clearInterval(timer); return; }
      var nowT = performance.now();
      set('fps', Math.round(frames * 1000 / (nowT - last)) + ' frames per second');
      frames = 0; last = nowT;
      set('up', since(nowT));
      set('win', window.innerWidth + ' x ' + window.innerHeight);
      var pm = performance.memory;
      set('heap', pm ? (pm.usedJSHeapSize / 1048576).toFixed(1) + ' MB of ' + (pm.jsHeapSizeLimit / 1048576).toFixed(0) + ' MB' : 'not reported by this browser');
      set('dom', document.getElementsByTagName('*').length + ' elements');
      set('wins', String(OS.wins.length));
      set('reqs', String(performance.getEntriesByType('resource').length + 1));
      var c = navigator.connection || {};
      set('net', (navigator.onLine === false ? 'offline' : 'online') + (c.effectiveType ? ', ' + c.effectiveType : '') + (c.saveData ? ', data saver on' : ''));
      set('down', c.downlink ? c.downlink + ' Mbps (estimate)' : 'not reported');
      set('rtt', c.rtt ? c.rtt + ' ms (estimate)' : 'not reported');
    };
    var timer = setInterval(tick, 1000);
    tick();
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function (q) { set('quota', (q.usage / 1024).toFixed(1) + ' KB of ' + (q.quota / 1073741824).toFixed(1) + ' GB available to this site'); }).catch(function () { set('quota', 'not reported'); });
    else set('quota', 'not reported');
    $('[data-ping]', el).addEventListener('click', function () {
      var out = $('.ping', el), n = 0, times = [];
      out.hidden = false;
      out.textContent = 'Pinging ' + location.host + ' over ' + location.protocol.replace(':', '').toUpperCase() + ':\n';
      var one = function () {
        var t0 = performance.now();
        fetch('/search.json?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' }).then(function (r) {
          var t = Math.round(performance.now() - t0);
          times.push(t);
          out.textContent += 'Reply from ' + location.host + ': status=' + r.status + ' time=' + t + 'ms\n';
        }).catch(function () { out.textContent += 'Request failed.\n'; }).then(function () {
          if (++n < 4) setTimeout(one, 400);
          else if (times.length) out.textContent += '\nMinimum = ' + Math.min.apply(null, times) + 'ms, Maximum = ' + Math.max.apply(null, times) + 'ms, Average = ' + Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length) + 'ms';
        });
      };
      one();
    });
  };

  /* =================================================================
     BROWSER: The Web (Wayback), Bookmarks, In-page Find, Autocomplete,
     Contents, Text size, View Source, 404 help
     ================================================================= */
  function wbYear() { try { return +sessionStorage.getItem('wb-year') || 2001; } catch (e) { return 2001; } }
  function wayback(w, tab) {
    var pane = tab ? tab.pane : w.el;
    var view = $('.wb-view', pane);
    if (!view) return;
    var q;
    try { q = new URL((tab ? tab.url : w.url) || location.href, location.href).searchParams; } catch (e) { return; }
    var target = q.get('u'), year = parseInt(q.get('y'), 10) || wbYear();
    if (!target) {
      // Portal page (/web/): enable live search/filter + direct time-travel form (works on mobile too)
      var goForm = $('.wb-go', pane), sel = $('.wb-year', pane), urlIn = $('.wb-url', pane);
      if (goForm && sel) {
        goForm.hidden = false;
        sel.value = String(wbYear());
        sel.addEventListener('change', function () { try { sessionStorage.setItem('wb-year', sel.value); } catch (e) {} });
        var items = $$('.wb-list li', pane);
        if (urlIn) {
          urlIn.addEventListener('input', function () {
            var f = urlIn.value.trim().toLowerCase();
            items.forEach(function (li) { li.hidden = !!(f && li.textContent.toLowerCase().indexOf(f) === -1); });
          });
        }
        goForm.addEventListener('submit', function (e) {
          e.preventDefault();
          var raw = urlIn ? urlIn.value.trim() : '';
          var y = parseInt(sel.value, 10) || 2001;
          try { sessionStorage.setItem('wb-year', String(y)); } catch (x) {}
          if (!raw) return;
          // If it looks like a domain or URL, time-travel directly; otherwise open the first visible filtered site
          if (/\./.test(raw.split('/')[0]) || /^https?:\/\//i.test(raw)) {
            var dest = /^https?:\/\//i.test(raw) ? raw : 'http://' + raw;
            OS.open('/web/?u=' + encodeURIComponent(dest) + '&y=' + y);
          } else {
            var firstA = $('.wb-list li:not([hidden]) a', pane);
            if (firstA) OS.open(firstA.getAttribute('href'));
          }
        });
      }
      return;
    }
    if (!/^https?:\/\//i.test(target)) target = 'http://' + target;
    var host = target;
    try { host = new URL(target).hostname.replace(/^www\./, ''); } catch (e) { return; }
    year = Math.max(1996, Math.min(new Date().getFullYear(), year));
    var src = 'https://web.archive.org/web/' + year + '0601000000if_/' + target;
    var full = 'https://web.archive.org/web/' + year + '0601000000/' + target;
    var status = $('[data-status]', w.el);
    if (w.browser && tab) {
      tab.docTitle = host + ' (' + year + ') · ' + OS.siteName;
      w.browser.setTabMeta(tab, host + ' (' + year + ')', host + ' (' + year + ') - Browser', target, 'oldweb');
    } else {
      var addr = $('.address input', w.el);
      if (addr) addr.value = target;
      OS.setTitle(w, host + ' (' + year + ') - Browser');
      w.docTitle = host + ' (' + year + ') · ' + OS.siteName;
    }
    var yearOpts = '';
    for (var yOpt = 1996; yOpt <= 2010; yOpt++) yearOpts += '<option value="' + yOpt + '"' + (yOpt === year ? ' selected' : '') + '>' + yOpt + '</option>';
    if (year > 2010) yearOpts += '<option value="' + year + '" selected>' + year + '</option>';
    var load = function () {
      view.classList.add('wb-framed');
      view.innerHTML =
        '<div class="wb-bar">' +
          '<span class="wb-bar-id">' + OS.svg('oldweb') + ' <b>' + esc(host) + '</b> around ' +
            '<select class="field sunken wb-jump" aria-label="Change archive year">' + yearOpts + '</select></span>' +
          '<span class="wb-bar-acts"><a href="/web/">Back to The Web</a> · <a href="' + esc(full) + '" target="_blank" rel="noopener noreferrer">Open in new tab</a></span>' +
        '</div>' +
        '<iframe class="wb-frame" title="' + esc(host) + ' in ' + year + '" src="' + esc(src) + '" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerpolicy="no-referrer"></iframe>';
      var jump = $('.wb-jump', view);
      if (jump) {
        jump.addEventListener('change', function () {
          try { sessionStorage.setItem('wb-year', jump.value); } catch (x) {}
          OS.open('/web/?u=' + encodeURIComponent(target) + '&y=' + jump.value);
        });
      }
      if (status) status.textContent = 'Opening ' + host + ' (' + year + ') from the Internet Archive...';
      if (tab) { tab.loading = true; if (w.browser && w.browser.active === tab) w.el.classList.add('loading'); }
      $('iframe', view).addEventListener('load', function () {
        if (tab) { tab.loading = false; tab.status = 'Done (web.archive.org)'; }
        if (w.browser && w.browser.active === tab) {
          w.el.classList.remove('loading');
          if (status) status.textContent = 'Done (web.archive.org)';
        }
        if (w.browser) w.browser.renderTabs();
      });
      OS.log('warn', 'Browser', 3, 'Opened ' + target + ' as of ' + year + ' from web.archive.org at your request.');
      OS.emit('discover', 'wayback');
    };
    var ok = false;
    try { ok = sessionStorage.getItem('wb-ok') === '1'; } catch (e) {}
    if (ok) { load(); return; }
    view.innerHTML = '<div class="page-doc site wb-ask"><h1>' + esc(host) + ', ' + year + '</h1>' +
      '<p>This page comes from the Internet Archive\'s Wayback Machine. Opening it connects to web.archive.org, which sees your IP address, the same as visiting it yourself. Nothing has loaded yet.</p>' +
      '<p class="wb-btns"><button type="button" class="btn" data-wb="go">Open it</button> <a class="btn" href="' + esc(full) + '" target="_blank" rel="noopener noreferrer">Open in a new tab instead</a> <a class="btn" href="/web/">Back to the list</a></p>' +
      '<label class="yt-remember"><input type="checkbox" data-wb-remember> Don\'t ask again until I close this tab</label></div>';
    $('[data-wb="go"]', view).addEventListener('click', function () {
      var r = $('[data-wb-remember]', view);
      if (r && r.checked) { try { sessionStorage.setItem('wb-ok', '1'); } catch (e) {} }
      load();
    });
  }

  /* Browser: Address Bar Autocomplete */
  function addressHints(w) {
    var dl = $('#addr-list', w.el);
    if (!dl || dl.children.length) return;
    var opts = [
      ['/web/', 'The Web (Home)'],
      ['/', 'Harya — Posts'],
      ['/projects/', 'Harya — Projects'],
      ['/about/', 'About Harya']
    ];
    posts.forEach(function (p) { opts.push([p.u, p.t]); });
    (OS.data.web || []).forEach(function (s) {
      var clean = String(s.u || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
      if (clean) opts.push([clean + ' ' + s.y, s.n + ' (' + s.y + ')']);
    });
    dl.innerHTML = opts.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('');
  }

  /* Browser: Persistent Bookmarks (Favorites + Star Button) */
  function loadFavs() {
    try {
      var list = JSON.parse(localStorage.getItem('os-favs') || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function saveFavs(list) {
    try {
      if (list.length) localStorage.setItem('os-favs', JSON.stringify(list));
      else localStorage.removeItem('os-favs');
    } catch (e) {}
  }
  function activeTabOf(w) { return w.browser ? w.browser.active : { url: w.url || '/', title: (w.el.getAttribute('data-title') || '').replace(/\s*-\s*Browser$/, '') }; }
  function isFav(url) { return loadFavs().some(function (f) { return f.u === url; }); }
  function syncStar(w) {
    var sb = $('[data-act="star"]', w.el);
    if (!sb) return;
    var t = activeTabOf(w);
    var on = isFav(t.url);
    sb.setAttribute('aria-pressed', String(on));
    sb.title = on ? 'Remove from Favorites' : 'Add to Favorites';
    var u = $('use', sb);
    if (u) u.setAttribute('href', on ? '#i-star-on' : '#i-star');
  }
  function toggleFav(w) {
    var t = activeTabOf(w);
    var list = loadFavs();
    var idx = -1;
    list.forEach(function (f, i) { if (f.u === t.url) idx = i; });
    var st = $('[data-status]', w.el);
    if (idx !== -1) {
      list.splice(idx, 1);
      saveFavs(list);
      if (st) st.textContent = 'Removed from Favorites';
    } else {
      list.unshift({ t: t.title || t.url, u: t.url });
      if (list.length > 30) list.length = 30;
      saveFavs(list);
      OS.sound('pop');
      OS.emit('discover', 'fav');
      if (st) st.textContent = 'Added “' + (t.title || t.url) + '” to Favorites';
    }
    syncStar(w);
  }
  function favorites(w) {
    var b = $('[data-act="fav"]', w.el), sb = $('[data-act="star"]', w.el);
    if (sb) sb.addEventListener('click', function () { toggleFav(w); });
    if (!b) return;
    b.addEventListener('click', function () {
      var r = b.getBoundingClientRect();
      var t = activeTabOf(w), saved = isFav(t.url), custom = loadFavs();
      var items = [
        { label: saved ? '★ Remove this page from Favorites' : '☆ Add this page to Favorites', bold: !saved, act: function () { toggleFav(w); } },
        { sep: true },
        { label: 'Home (The Web)', act: function () { OS.open('/web/'); } },
        { label: 'Harya', act: function () { OS.open('/'); } },
        { label: 'Projects', act: function () { OS.open('/projects/'); } },
        { label: 'About', act: function () { OS.open('/about/'); } }
      ];
      if (custom.length) {
        items.push({ sep: true });
        custom.forEach(function (f) { items.push({ label: '★ ' + f.t, act: function () { OS.open(f.u); } }); });
      }
      items.push({ sep: true });
      items = items.concat(posts.slice(0, 12).map(function (p) { return { label: p.t, act: function () { OS.open(p.u); } }; }));
      items.push({ sep: true }, { label: 'RSS feed', act: function () { window.open('/feed.xml', '_blank', 'noopener'); } });
      OS.menu(items, r.left, r.bottom, { returnFocus: b });
    });
  }

  /* Browser: View Source (Wayback-aware) */
  function viewSource(w) {
    var b = $('[data-act="source"]', w.el);
    if (!b) return;
    var openSource = function (url) {
      fetch(url, { cache: 'force-cache', credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (html) {
        var name = (url.replace(/[?#].*$/, '').replace(/\/$/, '/index.html').split('/').pop()) || 'index.html';
        OS.makeWindow('untitled', name + ' - Notepad', '<div class="menubar" aria-hidden="true"></div><div class="win-body notepad-body sunken"><pre class="notepad-text">' + esc(html) + '</pre></div>');
        var ta = $('.win-app[data-app="untitled"]:last-of-type textarea');
        if (ta) { ta.classList.add('nowrap'); ta.scrollTop = 0; }
      }).catch(function () { OS.msg({ title: 'Source', icon: 'warn', text: 'Could not read the source of this page.' }); });
    };
    b.addEventListener('click', function () {
      var t = activeTabOf(w), url = t.url || location.pathname;
      if (/^\/web\/\?/.test(url) && /[?&]u=/.test(url)) {
        var q = new URL(url, location.href).searchParams;
        var target = q.get('u') || '', yr = parseInt(q.get('y'), 10) || wbYear();
        var full = 'https://web.archive.org/web/' + yr + '0601000000/' + (/^https?:\/\//i.test(target) ? target : 'http://' + target);
        OS.msg({
          title: 'View Source', icon: 'oldweb',
          text: 'This archived page is loaded from web.archive.org in a sandboxed frame, so the browser will not let obscuraOS read its HTML.\n\nYou can inspect the local /web/ frame page or open the archive directly.',
          buttons: ['View /web/ HTML', 'Open Archive', 'Cancel']
        }).then(function (i) {
          if (i === 0) openSource('/web/');
          else if (i === 1) window.open(full, '_blank', 'noopener');
        });
        return;
      }
      openSource(url);
    });
  }

  /* Browser: In-Page Find Bar (Ctrl+F, toolbar Find, and global Find match stepper) */
  function inPageFind(w) {
    var bar = $('.findbar', w.el), inp = $('#infind-q', w.el), cnt = $('.fb-count', w.el);
    var btn = $('[data-act="infind"]', w.el);
    if (!bar || !inp) return;
    var marks = [], idx = -1;
    function paneOf() { return w.browser && w.browser.active ? w.browser.active.pane : w.el; }
    function jump(i) {
      if (!marks.length) return;
      idx = (i + marks.length) % marks.length;
      marks.forEach(function (m, j) { m.classList.toggle('cur', j === idx); });
      var view = $('.page-view', paneOf());
      if (view && marks[idx]) {
        var vr = view.getBoundingClientRect(), mr = marks[idx].getBoundingClientRect();
        view.scrollTo({ top: view.scrollTop + mr.top - vr.top - vr.height / 3, behavior: OS.reduce.matches ? 'auto' : 'smooth' });
      }
      if (cnt) cnt.textContent = (idx + 1) + ' of ' + marks.length + (marks.length >= 200 ? '+' : '');
    }
    function run(q) {
      var p = paneOf();
      marks = markMatches(p, q);
      idx = -1;
      if (!q.trim()) { if (cnt) cnt.textContent = ''; return; }
      if (!marks.length) {
        if (cnt) cnt.textContent = 'No matches';
        return;
      }
      jump(0);
      var st = $('[data-status]', w.el);
      if (st) st.textContent = marks.length + (marks.length >= 200 ? '+' : '') + ' match' + (marks.length === 1 ? '' : 'es') + ' for "' + q.trim() + '"';
    }
    function openBar(initialQ) {
      bar.hidden = false;
      if (btn) btn.setAttribute('aria-pressed', 'true');
      if (typeof initialQ === 'string') inp.value = initialQ;
      run(inp.value);
      inp.focus();
      inp.select();
    }
    function closeBar() {
      if (bar.hidden) return;
      bar.hidden = true;
      if (btn) btn.setAttribute('aria-pressed', 'false');
      if (w.browser) w.browser.tabs.forEach(function (t) { clearMarks(t.pane); });
      else clearMarks(w.el);
      marks = []; idx = -1;
      if (cnt) cnt.textContent = '';
    }
    w._openFind = openBar;
    w._syncFind = function () { if (!bar.hidden) run(inp.value); };
    if (btn) btn.addEventListener('click', function () { if (bar.hidden) openBar(); else closeBar(); });
    var timer = null;
    inp.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { run(inp.value); }, 90); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (!marks.length) run(inp.value); else jump(idx + (e.shiftKey ? -1 : 1)); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeBar(); }
    });
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-fb]');
      if (!b) return;
      var a = b.getAttribute('data-fb');
      if (a === 'next') jump(idx + 1);
      else if (a === 'prev') jump(idx - 1);
      else if (a === 'close') closeBar();
    });
    var onKey = function (e) {
      if (OS.top() !== w || !document.contains(w.el)) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        if ($('.bios, .modal-bg, #bootscreen, .saver')) return;
        e.preventDefault();
        openBar();
      }
    };
    document.addEventListener('keydown', onKey);
    var onClose = function (o) { if (o === w) { document.removeEventListener('keydown', onKey); OS.off('close', onClose); } };
    OS.on('close', onClose);
  }

  /* Browser: Text size, Contents (per-tab), 404 help */
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
  function syncTocButton(w, tab) {
    var btn = $('[data-act="toc"]', w.el);
    if (!btn) return;
    var has = !!(tab && tab._hasToc);
    btn.hidden = !has;
    btn.setAttribute('aria-pressed', String(!!(has && tab._tocOpen)));
  }
  function contents(w, tab) {
    var pane = tab ? tab.pane : w.el;
    var content = $('.post-content', pane), view = $('.page-view', pane);
    if (!content || !view) return;
    var hs = $$('h2, h3', content).filter(function (h) { return h.textContent.trim(); });
    if (hs.length < 3) return;
    var panel = null;
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
        hs.map(function (h, i) { return '<li class="' + h.tagName.toLowerCase() + '"><a href="#' + esc(h.id || '') + '" data-i="' + i + '">' + esc(h.textContent.trim().replace(/#$/, '').trim()) + '</a></li>'; }).join('') + '</ul>';
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
    var toggle = function (on) {
      if (on === undefined) on = !pane.classList.contains('toc-open');
      if (on && !panel) build();
      pane.classList.toggle('toc-open', on);
      if (tab) tab._tocOpen = on;
      if (!w.browser || w.browser.active === tab) syncTocButton(w, tab);
      if (on) mark();
    };
    if (tab) { tab._hasToc = true; tab._tocOpen = false; tab._tocToggle = toggle; }
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
  function notFound(w, tab) {
    var pane = tab ? tab.pane : w.el;
    var page = $('.errorpage', pane);
    if (!page) return;
    var path = (tab ? tab.url : w.url) || location.pathname;
    try { path = decodeURIComponent(new URL(path, location.href).pathname); } catch (e) {}
    $$('.nf-path', pane).forEach(function (c) { c.textContent = path; });
    if (w.browser && tab) w.browser.setTabMeta(tab, 'Not found', 'Cannot find page - Browser', location.origin + path);
    else { var addr = $('.address input', w.el); if (addr) addr.value = location.origin + path; }
    var slug = path.replace(/\/$/, '').split('/').pop().toLowerCase();
    var slugWords = slug.split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3; });
    var best = null, bestScore = 0;
    posts.forEach(function (p) {
      var ps = p.u.replace(/\/$/, '').split('/').pop();
      var pt = p.t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      var sc = Math.max(similar(slug, ps), similar(slug, pt));
      var hay = (' ' + ps + ' ' + pt + ' ' + (p.tags || []).join(' ') + ' ').toLowerCase();
      var hits = slugWords.filter(function (w) { return hay.indexOf(w) !== -1; }).length;
      if (hits) sc = Math.max(sc, 0.32 + Math.min(0.4, hits * 0.15));
      if (sc > bestScore) { bestScore = sc; best = p; }
    });
    var words = slug.replace(/\.[a-z]+$/, '').replace(/[-_]+/g, ' ').trim();
    var more = $('.nf-more', pane);
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
    addressHints(w);
    textButton(w);
    favorites(w);
    viewSource(w);
    inPageFind(w);
    var tocBtn = $('[data-act="toc"]', w.el);
    if (tocBtn) tocBtn.addEventListener('click', function () {
      var t = w.browser && w.browser.active;
      if (t && t._tocToggle) t._tocToggle();
    });
  });
  function siteFind(pane) {
    var sf = $('.site-find', pane);
    if (!sf || !OS.apps.find) return;
    sf.hidden = false;
    if (sf.dataset.findWired) return;
    sf.dataset.findWired = '1';
    sf.addEventListener('click', function () { OS.apps.find(); });
  }
  OS.on('browser-page', function (w, tab) {
    if (w._pageSeen) OS.log('info', 'Browser', 4101, 'Navigated to ' + (tab.title || tab.url) + ' (' + tab.url + ').');
    w._pageSeen = true;
    wayback(w, tab);
    contents(w, tab);
    notFound(w, tab);
    siteFind(tab ? tab.pane : w.el);
    if (!w.browser || w.browser.active === tab) {
      syncTocButton(w, tab);
      syncStar(w);
      if (w._syncFind) w._syncFind();
    }
    if (pending && tab.url && tab.url.indexOf(pending.u) === 0) {
      var q = pending.q;
      pending = null;
      setTimeout(function () { if (w._openFind) w._openFind(q); }, 30);
    }
  });
  OS.on('browser-tab', function (w, tab) {
    syncTocButton(w, tab);
    syncStar(w);
    if (w._syncFind) w._syncFind();
  });

  OS.on('ready', function () {
    if (window.OSBlocked && window.OSBlocked.length) OS.log('warn', 'Security', 4957, 'Content Security Policy blocked ' + window.OSBlocked.length + ' request(s) while the page loaded.');
  });
  // fallback for any non-browser window that renders .site-find
  OS.on('register', function (w) {
    if (!w.browser) siteFind(w.el);
  });
})();
