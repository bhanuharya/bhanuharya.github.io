/* obscuraOS: boot, log on, and the small programs.
   Boot + log on run once per tab. The name you log on with stays in this
   tab (sessionStorage) and is forgotten when you close it. */
(function () {
  'use strict';
  var OS = window.OS;
  if (!OS) return;
  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = OS.esc, svg = OS.svg;
  var posts = OS.data.posts || [];
  window.OSBoot = true;

  function user() { try { return sessionStorage.getItem('os-user') || 'guest'; } catch (e) { return 'guest'; } }
  function setUser(u) { try { if (u) sessionStorage.setItem('os-user', u); else sessionStorage.removeItem('os-user'); } catch (e) {} }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, OS.reduce.matches ? Math.min(ms, 120) : ms); }); }
  function shell(on) {
    ['desktop', 'start-menu'].forEach(function (id) { var el = document.getElementById(id); if (el) el.inert = !on; });
    var tb = $('.taskbar'); if (tb) tb.inert = !on;
  }
  function logoffLabel() {
    var b = $('#start-menu [data-act="logoff"] span');
    if (b) b.textContent = 'Log Off ' + user() + '…';
  }

  /* ---------------- boot ---------------- */
  function bootScreen() {
    var b = document.getElementById('bootscreen');
    if (!b) { b = document.createElement('div'); b.className = 'bootscreen'; b.id = 'bootscreen'; document.body.appendChild(b); }
    return b;
  }
  function setting(k, d) { var s = OS.settings ? OS.settings() : {}; return k in s ? s[k] : d; }
  function boot(fast) {
    var b = bootScreen();
    root.classList.remove('boot-pending');
    shell(false);
    b.className = 'bootscreen';
    b.innerHTML = '';
    var quick = fast || setting('boot', 'full') === 'quick';
    var skipped = false, setup = false;
    var onKey = function (e) {
      if (e.key === 'Delete' || e.key === 'F2') { e.preventDefault(); setup = true; }
      skipped = true;
    };
    var onTap = function (e) {
      var t = e.target.closest('[data-boot]');
      if (t && t.getAttribute('data-boot') === 'setup') setup = true;
      skipped = true;
    };
    b.addEventListener('click', onTap);
    document.addEventListener('keydown', onKey);
    var d = new Date();
    var lines = [
      'obscura BIOS v' + d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '   (c) Harya',
      '',
      'CPU: one person, part time',
      'Memory test: 640K OK',
      '',
      'Detecting drives...',
      '  C: posts ................ ' + posts.length + ' found',
      '  D: drafts ............... not telling',
      'Checking for trackers ..... none',
      'Checking for cookies ...... none',
      ''
    ];
    var pre = document.createElement('pre');
    pre.className = 'post-text';
    b.innerHTML = svg('logo', 'post-logo') + '<p class="post-skip">' + (OS.coarse.matches ?
      '<button type="button" class="boot-key" data-boot="setup">Setup</button> <button type="button" class="boot-key" data-boot="skip">Skip</button>' :
      'Press <b>DEL</b> to enter Setup, any other key to skip') + '</p>';
    b.insertBefore(pre, b.firstChild);
    var i = 0;
    if (quick) pre.textContent = lines.join('\n');
    var p = quick ? wait(900) : new Promise(function (done) {
      var step = function () {
        if (skipped || i >= lines.length) { pre.textContent = lines.join('\n'); done(); return; }
        pre.textContent += (i ? '\n' : '') + lines[i++];
        setTimeout(step, 60 + Math.random() * 110);
      };
      step();
    });
    var enterSetup = function () { return OS.apps.setup ? OS.apps.setup({ boot: true }) : null; };
    return p.then(function () { return skipped || quick ? null : wait(650); }).then(function () {
      if (setup) return enterSetup();
      if (skipped || quick) return;
      b.innerHTML = '<div class="splash"><div class="mark">' + svg('logo') + '<span>obscura<b>OS</b></span></div>' +
        '<div class="bar"><i></i></div><small>Starting up...</small></div>';
      return wait(1500).then(function () { if (setup) return enterSetup(); });
    }).then(function () {
      b.removeEventListener('click', onTap);
      document.removeEventListener('keydown', onKey);
      return logon();
    });
  }

  /* ---------------- log on ---------------- */
  var JOKES = {
    root: 'Nice try. You are guest today.',
    admin: 'Nice try. You are guest today.',
    administrator: 'Nice try. You are guest today.',
    sudo: 'Not a user. Logging you on as guest.'
  };
  function logon() {
    var b = bootScreen();
    shell(false);
    b.className = 'bootscreen logon';
    b.innerHTML =
      '<div class="logon-win raised" role="dialog" aria-modal="true" aria-labelledby="lo-t">' +
        '<header class="titlebar"><span class="tt" id="lo-t">Log On to obscuraOS</span></header>' +
        '<div class="logon-banner">' + svg('logo') + '<span>obscura<b>OS</b><small>Notes on things set up, tested and broken</small></span></div>' +
        '<div class="logon-strip" aria-hidden="true"></div>' +
        '<form class="logon-body" autocomplete="off">' +
          '<div class="logon-users" role="radiogroup" aria-label="Users on this computer">' +
            '<button type="button" role="radio" aria-checked="true" data-u="guest">' + svg('user') + '<span>guest</span></button>' +
            '<button type="button" role="radio" aria-checked="false" data-u="harya">' + svg('user') + '<span>harya</span></button>' +
          '</div>' +
          '<div class="logon-fields">' +
            '<label for="lo-user"><u>U</u>ser name:</label><input class="field sunken" id="lo-user" name="u" value="guest" maxlength="16" spellcheck="false" autocapitalize="off">' +
            '<label for="lo-pass"><u>P</u>assword:</label><input class="field sunken" id="lo-pass" type="password" disabled placeholder="(none, just press OK)">' +
          '</div>' +
          '<p class="logon-note" aria-live="polite"></p>' +
          '<div class="logon-btns"><button class="btn" type="submit">OK</button><button class="btn" type="button" data-cancel>Cancel</button><button class="btn" type="button" data-off>Shut Down…</button></div>' +
        '</form>' +
      '</div>';
    var form = $('form', b), input = $('#lo-user', b), note = $('.logon-note', b);
    var pick = function (name) {
      input.value = name;
      $$('[data-u]', b).forEach(function (t) { t.setAttribute('aria-checked', String(t.getAttribute('data-u') === name)); });
    };
    $$('[data-u]', b).forEach(function (t) {
      t.addEventListener('click', function () { pick(t.getAttribute('data-u')); input.focus(); });
      t.addEventListener('dblclick', function () { pick(t.getAttribute('data-u')); form.requestSubmit ? form.requestSubmit() : form.submit(); });
    });
    input.addEventListener('input', function () {
      var v = input.value.trim().toLowerCase();
      $$('[data-u]', b).forEach(function (t) { t.setAttribute('aria-checked', String(t.getAttribute('data-u') === v)); });
      note.textContent = '';
    });
    $('[data-cancel]', b).addEventListener('click', function () { pick('guest'); note.textContent = 'There is nowhere else to go. guest is fine.'; input.focus(); });
    $('[data-off]', b).addEventListener('click', function () { offScreen(); });
    // on touch screens don't pop the keyboard up for a name most people won't change
    if (OS.coarse.matches) $('.logon-btns [type="submit"]', b).focus();
    else { input.focus(); input.select(); }
    return new Promise(function (resolve) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = input.value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 16) || 'guest';
        var said = JOKES[name];
        if (said) { name = 'guest'; note.textContent = said; OS.sound('error'); OS.log('warn', 'Logon', 529, 'Logon refused for "' + input.value.trim().slice(0, 16) + '". Logged on as guest instead.'); OS.emit('discover', 'root'); }
        else if (name === 'harya') { note.textContent = 'harya has no password either. That should get fixed.'; OS.emit('discover', 'harya'); }
        setUser(name);
        $$('button, input', form).forEach(function (x) { x.disabled = true; });
        wait(said || name === 'harya' ? 1300 : 200).then(function () { return loggingOn(name); }).then(resolve);
      });
    });
  }
  function loggingOn(name) {
    var b = bootScreen();
    b.innerHTML = '<div class="logon-win busybox raised" role="status"><header class="titlebar"><span class="tt">Logging On</span></header>' +
      '<div class="logon-banner">' + svg('logo') + '<span>obscura<b>OS</b></span></div><div class="logon-strip"></div>' +
      '<div class="logon-body"><p class="ld">Loading your personal settings...</p><div class="bar sunken"><i></i></div></div></div>';
    return wait(650).then(function () {
      $('.ld', b).textContent = 'Applying your personal settings...';
      return wait(650);
    }).then(function () {
      b.remove();
      shell(true);
      logoffLabel();
      root.classList.add('fresh');
      $$('.dicon').forEach(function (ic, i) { ic.style.setProperty('--i', i); });
      setTimeout(function () { root.classList.remove('fresh'); }, 1600);
      OS.sound('startup');
      OS.log('info', 'Logon', 528, name + ' logged on. No password was asked for.');
      OS.emit('login', name);
      setTimeout(function () { welcome(name); }, 900);
    });
  }

  /* ---------------- balloon tips ---------------- */
  var TIPS = [
    ['Right-click the desktop. There is more there.', 'Press and hold the desktop or an icon. There are menus.'],
    ['Drag a desktop icon onto the Recycle Bin.', 'The button next to Start shows the desktop.'],
    ['Click the clock to see which days have posts.', 'Tap the clock to see which days have posts.'],
    'Start, then Run, takes commands. Try "help".',
    'Packet Capture takes filters like: tag == "ai"',
    'Media Player has a few songs. You can open your own, too.',
    ['Leave the mouse alone for a while.', 'In Packet Capture, tap a row twice to read it.'],
    'Firewall is a game. Drop the bad packets.',
    ['Press / to search every post.', 'Start, then Find, searches every post.'],
    ['Click the shield in the tray to see what this page sends where.', 'Tap the shield in the tray to see what this page sends where.'],
    ['Press DEL while it boots. Or Start, then Settings.', 'Start, then Settings. It is not what you expect.'],
    ['Drag a window to the edge of the screen.', 'Start, then Programs, then Event Viewer: a log of this visit.']
  ];
  var balloonTimer = null;
  OS.balloon = function (t, x) { balloon(t, x); };
  function balloon(title, text) {
    var old = $('.balloon');
    if (old) old.remove();
    var b = document.createElement('div');
    b.className = 'balloon';
    b.setAttribute('role', 'status');
    b.innerHTML = '<b>' + svg('help') + '<span></span></b><p></p><button type="button" class="x" aria-label="Close tip">×</button>';
    $('b span', b).textContent = title;
    $('p', b).textContent = text;
    document.body.appendChild(b);
    var go = function () { b.remove(); clearTimeout(balloonTimer); };
    $('.x', b).addEventListener('click', go);
    b.addEventListener('click', function (e) { if (!e.target.closest('.x')) go(); });
    clearTimeout(balloonTimer);
    balloonTimer = setTimeout(go, 9000);
  }
  function welcome(name) {
    var tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    if (typeof tip !== 'string') tip = tip[OS.coarse.matches ? 1 : 0];
    balloon('Welcome, ' + name, 'The posts are in Packet Capture. ' + tip);
  }

  /* ---------------- shut down, restart, log off ---------------- */
  function offScreen() {
    OS.log('info', 'Kernel', 13, 'The system was shut down by ' + user() + '.');
    OS.sound('shutdown');
    var s = document.createElement('div');
    s.className = 'offscreen';
    s.tabIndex = 0;
    s.setAttribute('role', 'button');
    s.innerHTML = '<div><p>It\'s now safe to close this tab.</p><small>Click or press a key to start again</small></div>';
    var b = document.getElementById('bootscreen');
    if (b) b.remove();
    document.body.appendChild(s);
    s.focus();
    var wake = function () {
      s.remove();
      setUser(null);
      boot(false);
    };
    setTimeout(function () {
      s.addEventListener('click', wake, { once: true });
      s.addEventListener('keydown', wake, { once: true });
    }, 400);
  }
  function shutdownDialog() {
    OS.msg({
      title: 'Shut Down obscuraOS', icon: 'power', text: 'What do you want the computer to do?',
      html: '<div class="choices"><label><input type="radio" name="sd" value="off" checked> Shut down</label>' +
        '<label><input type="radio" name="sd" value="restart"> Restart</label>' +
        '<label><input type="radio" name="sd" value="logoff"> Log off ' + esc(user()) + '</label></div>',
      buttons: ['OK', 'Cancel'],
      onDone: function (i, bg) { if (i === 0) shutdownDialog.v = bg.querySelector('input:checked').value; }
    }).then(function (i) {
      if (i !== 0) return;
      var v = shutdownDialog.v;
      if (v === 'restart') { OS.closeAll(); setUser(null); history.replaceState(null, '', '/'); boot(false).then(reopenHome); }
      else if (v === 'logoff') logoff(true);
      else offScreen();
    });
  }
  function reopenHome() { if (!OS.wins.length) OS.open('/', { push: false }); }
  function logoff(sure) {
    var go = function () {
      OS.log('info', 'Logon', 538, user() + ' logged off.');
      OS.sound('shutdown');
      OS.closeAll();
      setUser(null);
      history.replaceState(null, '', '/');
      logon().then(reopenHome);
    };
    if (sure) { go(); return; }
    OS.msg({ title: 'Log Off obscuraOS', icon: 'logoff', text: 'Are you sure you want to log off?', buttons: ['Log Off', 'Cancel'] })
      .then(function (i) { if (i === 0) go(); });
  }
  OS.on('action', function (a) {
    if (a === 'shutdown') shutdownDialog();
    if (a === 'logoff') logoff(false);
  });

  /* ---------------- Run ---------------- */
  var RUN_HELP = 'Things to type: capture, browser, terminal, about, readme, notepad, player, firewall, bin, calendar, screensaver, ' +
    'shutdown, logoff, a post number (1 is the newest), a word from a post title, a filter like tag == "ai", or a web address.';
  function run(cmd) {
    var c = cmd.trim(), l = c.toLowerCase();
    if (!c) return true;
    OS.log('info', 'Shell', 4688, 'Run: ' + c.slice(0, 120));
    var map = { capture: '/', posts: '/', home: '/', wireshark: '/', browser: posts[0] && posts[0].u, about: '/about/', winver: '/about/', ver: '/about/', readme: '/readme/', 'readme.txt': '/readme/', terminal: '/terminal/', cmd: '/terminal/', sh: '/terminal/', bash: '/terminal/' };
    if (map[l]) { OS.open(map[l]); return true; }
    var appAlias = { find: 'find', search: 'find', grep: 'find', events: 'events', eventvwr: 'events', log: 'events', logs: 'events', security: 'security', wscui: 'security', csp: 'security', setup: 'setup', bios: 'setup', settings: 'setup', notepad: 'newtext', 'notepad.exe': 'newtext', edit: 'newtext', player: 'player', music: 'player', mplayer: 'player', firewall: 'firewall', game: 'firewall', bin: 'bin', trash: 'bin', calendar: 'calendar', date: 'calendar', screensaver: 'screensaver' };
    if (appAlias[l] && OS.apps[appAlias[l]]) { OS.apps[appAlias[l]](); return true; }
    if (l === 'shutdown') { offScreen(); return true; }
    if (l === 'logoff' || l === 'logout' || l === 'exit') { logoff(false); return true; }
    if (l === 'help' || l === '?') { OS.msg({ title: 'Run', icon: 'help', text: RUN_HELP }); return true; }
    if (l === 'whoami') { OS.msg({ title: 'whoami', icon: 'user', text: user() }); return true; }
    if (/^sudo\b/.test(l)) { OS.emit('discover', 'sudo'); }
    if (/^(find|grep|search)\s+\S/.test(l) && OS.apps.find) { OS.apps.find(c.replace(/^\S+\s+/, '')); return true; }
    if (/^sudo\b/.test(l)) { OS.msg({ title: 'sudo', icon: 'warn', text: user() + ' is not in the sudoers file. This incident will be reported.\n\n(To the Event Viewer on this computer. Nobody else.)' }); OS.log('warn', 'Security', 4673, user() + ' asked for sudo. Refused.'); return true; }
    if (/^rm\s+-rf/.test(l) || l === 'format c:' || l === 'del *.*') { OS.msg({ title: 'Run', icon: 'warn', text: 'Let\'s not.' }); return true; }
    if (/^\d+$/.test(l) && posts[+l - 1]) { OS.open(posts[+l - 1].u); return true; }
    if (/==|!=|contains|matches/.test(c)) { OS.open('/?filter=' + encodeURIComponent(c)); return true; }
    if (/^(https?:\/\/|www\.)/i.test(c) || /^[a-z0-9-]+\.[a-z]{2,}(\/|$)/i.test(c)) { OS.open(/^https?:/i.test(c) ? c : 'https://' + c); return true; }
    if (c.charAt(0) === '/') { OS.open(c); return true; }
    var hit = posts.filter(function (p) { return p.t.toLowerCase().indexOf(l) !== -1 || p.u.indexOf(l.replace(/\s+/g, '-')) !== -1; });
    if (hit.length) { OS.open(hit[0].u); return true; }
    return false;
  }
  OS.apps.run = function () {
    var list = ['capture', 'terminal', 'about', 'readme', 'notepad', 'player', 'firewall', 'calendar', 'screensaver', 'help'].concat(posts.map(function (p, i) { return String(i + 1); }));
    var again = function (start) {
      OS.msg({
        title: 'Run', icon: 'run',
        text: 'Type the name of a program, a post, or a filter, and obscuraOS will open it for you.',
        html: '<label class="run-row"><span><u>O</u>pen:</span><input class="field sunken" id="run-in" list="run-list" spellcheck="false" autocapitalize="off" value="' + esc(start || '') + '"></label>' +
          '<datalist id="run-list">' + list.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>',
        buttons: ['OK', 'Cancel'],
        onDone: function (i, bg) { if (i === 0) OS.apps.run.v = bg.querySelector('#run-in').value; }
      }).then(function (i) {
        if (i !== 0) return;
        var v = OS.apps.run.v;
        if (!run(v)) {
          OS.sound('error');
          OS.msg({ title: v, icon: 'warn', text: 'Cannot find \'' + v + '\'. Make sure you typed the name correctly, then try again. Type help to see what works.' })
            .then(function () { again(v); });
        }
      });
    };
    again('');
  };

  /* ---------------- calendar (from the clock) ---------------- */
  var calEl = null;
  function closeCal() { if (calEl) { calEl.remove(); calEl = null; } }
  OS.apps.calendar = function () {
    if (calEl) { closeCal(); return; }
    var now = new Date(), view = new Date(now.getFullYear(), now.getMonth(), 1);
    var byDay = {};
    posts.forEach(function (p) { (byDay[p.d] = byDay[p.d] || []).push(p); });
    calEl = document.createElement('div');
    calEl.className = 'cal raised';
    calEl.setAttribute('role', 'dialog');
    calEl.setAttribute('aria-label', 'Calendar');
    document.body.appendChild(calEl);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var draw = function () {
      var y = view.getFullYear(), m = view.getMonth();
      var first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
      var month = view.toLocaleString('en', { month: 'long' });
      var cells = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(function (d) { return '<span class="dow">' + d + '</span>'; });
      for (var i = 0; i < first; i++) cells.push('<span></span>');
      var inMonth = [];
      for (var d = 1; d <= days; d++) {
        var key = y + '-' + pad(m + 1) + '-' + pad(d), ps = byDay[key];
        var today = y === now.getFullYear() && m === now.getMonth() && d === now.getDate();
        if (ps) {
          inMonth = inMonth.concat(ps);
          cells.push('<a class="d has ' + esc(ps[0].f) + (today ? ' today' : '') + '" href="' + esc(ps[0].u) + '" title="' + esc(ps.map(function (p) { return p.t; }).join(' / ')) + '">' + d + '</a>');
        } else cells.push('<span class="d' + (today ? ' today' : '') + '">' + d + '</span>');
      }
      calEl.innerHTML = '<header class="titlebar"><span class="tt">Date/Time</span><span class="tbtns"><button type="button" class="tbtn" data-x aria-label="Close"><i class="g-close"></i></button></span></header>' +
        '<div class="cal-head"><button type="button" class="btn small" data-m="-1" aria-label="Previous month">◂</button><b>' + month + ' ' + y + '</b><button type="button" class="btn small" data-m="1" aria-label="Next month">▸</button></div>' +
        '<div class="cal-grid sunken">' + cells.join('') + '</div>' +
        '<div class="cal-list">' + (inMonth.length ? '<ul>' + inMonth.map(function (p) { return '<li><span class="dim">' + p.d.slice(8) + '</span> <a href="' + esc(p.u) + '">' + esc(p.t) + '</a></li>'; }).join('') + '</ul>' :
          '<p class="dim">No posts this month.' + (posts.length ? ' <button type="button" class="linkish" data-latest>Jump to the latest.</button>' : '') + '</p>') + '</div>' +
        '<div class="cal-foot"><span class="dim">' + now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) + ', ' + now.toDateString() + '</span></div>';
    };
    calEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]');
      if (b) { view.setMonth(view.getMonth() + +b.getAttribute('data-m')); draw(); return; }
      if (e.target.closest('[data-latest]') && posts[0]) { var p = posts[0].d.split('-'); view = new Date(+p[0], +p[1] - 1, 1); draw(); return; }
      if (e.target.closest('[data-x]')) { closeCal(); return; }
      if (e.target.closest('a')) setTimeout(closeCal, 0);
    });
    calEl.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeCal(); $('#clock').focus(); } });
    draw();
    var f = $('[data-m="-1"]', calEl);
    if (f) f.focus();
  };
  var clock = $('#clock');
  if (clock) clock.addEventListener('click', function () { OS.apps.calendar(); });
  document.addEventListener('pointerdown', function (e) {
    if (calEl && !calEl.contains(e.target) && !e.target.closest('#clock')) closeCal();
  });

  /* ---------------- Notepad: readme becomes editable, and new documents ---------------- */
  var untitled = 0;
  function notepadize(w) {
    var pre = $('.notepad-text', w.el), bar = $('.menubar', w.el);
    if (!pre || !bar || w.el.getAttribute('data-np')) return;
    w.el.setAttribute('data-np', '1');
    var ta = document.createElement('textarea');
    ta.className = 'notepad-text';
    ta.spellcheck = false;
    ta.setAttribute('aria-label', 'Text');
    ta.value = pre.textContent;
    pre.replaceWith(ta);
    var original = ta.value, file = (w.el.getAttribute('data-title') || 'Untitled - Notepad').replace(/ - Notepad$/, '');
    var dirty = function () { return ta.value !== original; };
    var save = function () {
      OS.msg({ title: 'Notepad', icon: 'warn', text: 'Saving is turned off on this computer.\n\nNothing you type here leaves this tab. Copy it somewhere if you want to keep it.' });
    };
    var aboutNp = function () { OS.msg({ title: 'About Notepad', icon: 'notepad', text: 'Notepad for obscuraOS.\nIt edits text. It does not save it.' }); };
    var MENUS = {
      File: [
        { label: 'New', act: function () { OS.apps.newtext(); } },
        { label: 'Save', act: save },
        { label: 'Save As…', act: save },
        { sep: true },
        { label: 'Exit', act: function () { closeNp(); } }
      ],
      Edit: [
        { label: 'Select All', act: function () { ta.focus(); ta.select(); } },
        { label: 'Time/Date', act: function () { ta.focus(); ta.setRangeText(new Date().toLocaleString('en'), ta.selectionStart, ta.selectionEnd, 'end'); } },
        { label: 'Revert', act: function () { ta.value = original; } }
      ],
      Format: [
        { label: 'Word Wrap', get checked() { return !ta.classList.contains('nowrap'); }, act: function () { ta.classList.toggle('nowrap'); } }
      ],
      Help: [{ label: 'About Notepad', act: aboutNp }]
    };
    bar.removeAttribute('aria-hidden');
    bar.setAttribute('role', 'menubar');
    bar.innerHTML = Object.keys(MENUS).map(function (k) { return '<button type="button" role="menuitem" aria-haspopup="true" data-menu="' + k + '"><u>' + k.charAt(0) + '</u>' + k.slice(1) + '</button>'; }).join('');
    $$('[data-menu]', bar).forEach(function (b) {
      var show = function () {
        var r = b.getBoundingClientRect();
        $$('[data-menu]', bar).forEach(function (o) { o.classList.toggle('open', o === b); });
        var m = OS.menu(MENUS[b.getAttribute('data-menu')], r.left, r.bottom, { returnFocus: b });
        new MutationObserver(function (_, obs) { if (!document.contains(m)) { b.classList.remove('open'); obs.disconnect(); } }).observe(document.body, { childList: true });
      };
      b.addEventListener('click', function () { if (b.classList.contains('open')) OS.closeMenus(); else show(); });
      b.addEventListener('mouseenter', function () { if ($('[data-menu].open', bar) && !b.classList.contains('open')) show(); });
    });
    ta.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); } });
    var closeNp = function () {
      if (!dirty()) { OS.close(w); return; }
      OS.msg({ title: 'Notepad', icon: 'warn', text: 'The text in ' + file + ' has changed.\n\nIt can\'t be saved here anyway. Close it?', buttons: ['Close', 'Cancel'] })
        .then(function (i) { if (i === 0) OS.close(w); });
    };
    var x = $('.titlebar [data-act="close"]', w.el);
    if (x) x.addEventListener('click', function (e) { if (dirty()) { e.preventDefault(); e.stopImmediatePropagation(); closeNp(); } }, true);
  }
  OS.on('register', function (w) { if (w.app === 'notepad' || w.app === 'untitled') notepadize(w); });
  OS.apps.newtext = function (from) {
    untitled++;
    var name = untitled === 1 ? 'Untitled' : 'Untitled ' + untitled;
    OS.makeWindow('untitled', name + ' - Notepad',
      '<div class="menubar" aria-hidden="true"></div><div class="win-body notepad-body sunken"><pre class="notepad-text"></pre></div>', { from: from });
    var w = OS.wins[OS.wins.length - 1];
    var ta = $('textarea', w.el);
    if (ta) ta.focus();
  };

  /* ---------------- screen saver: packets drifting past ---------------- */
  var saver = null, idleTimer = null, IDLE = 120000;
  OS.apps.screensaver = function () {
    if (saver || OS.reduce.matches) return;
    OS.log('info', 'Display', 7, 'Screen saver started.');
    OS.emit('discover', 'saver');
    saver = document.createElement('canvas');
    saver.className = 'saver';
    saver.setAttribute('aria-hidden', 'true');
    document.body.appendChild(saver);
    var ctx = saver.getContext('2d'), W, H, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = function () { W = saver.width = innerWidth * dpr; H = saver.height = innerHeight * dpr; };
    size();
    var COLORS = { sec: '#c9c4ff', ai: '#b7dcff', game: '#b6f09a', misc: '#e8e8e8' };
    var names = posts.length ? posts : [{ p: 'TCP', f: 'misc', t: 'hello' }];
    var pk = [];
    var spawn = function (x) {
      var p = names[Math.floor(Math.random() * names.length)], z = 0.35 + Math.random() * 0.9;
      return { x: x === undefined ? -300 * dpr : x, y: Math.random() * H, z: z, p: p, v: (0.6 + Math.random()) * z * dpr };
    };
    for (var i = 0; i < 26; i++) pk.push(spawn(Math.random() * W));
    var last = performance.now(), start = last, raf;
    var frame = function (t) {
      var dt = Math.min(50, t - last) / 16.7; last = t;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      pk.sort(function (a, b) { return a.z - b.z; });
      pk.forEach(function (o, i) {
        o.x += o.v * dt * 1.6;
        var fs = Math.round(12 * o.z * dpr), h = fs * 2, lab = 54 * o.z * dpr;
        ctx.font = fs + 'px "Lucida Console", monospace';
        var w = lab + 12 * o.z * dpr + ctx.measureText(o.p.t).width + 10 * o.z * dpr;
        ctx.globalAlpha = 0.25 + o.z * 0.6;
        ctx.fillStyle = COLORS[o.p.f] || COLORS.misc;
        ctx.fillRect(o.x, o.y, w, h);
        ctx.fillStyle = '#0a246a'; ctx.fillRect(o.x, o.y, lab, h);
        ctx.fillStyle = '#fff'; ctx.font = 'bold ' + fs + 'px Tahoma, Verdana, sans-serif'; ctx.textBaseline = 'middle';
        ctx.fillText(o.p.p, o.x + 6 * o.z * dpr, o.y + h / 2);
        ctx.fillStyle = '#000'; ctx.font = fs + 'px "Lucida Console", monospace';
        ctx.fillText(o.p.t, o.x + lab + 8 * o.z * dpr, o.y + h / 2);
        if (o.x > W + 20) pk[i] = spawn();
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#555'; ctx.font = (12 * dpr) + 'px "Lucida Console", monospace'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('obscuraOS · captured ' + Math.floor((t - start) / 1000 * 7) + ' packets while you were away', 20 * dpr, H - 20 * dpr);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    var stop = function () {
      if (!saver) return;
      cancelAnimationFrame(raf);
      saver.remove(); saver = null;
      ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(function (ev) { document.removeEventListener(ev, guard, true); });
      removeEventListener('resize', size);
    };
    var armed = false;
    setTimeout(function () { armed = true; }, 400);
    var guard = function (e) { if (!armed) return; if (e.type !== 'pointermove' || Math.abs(e.movementX) + Math.abs(e.movementY) > 2) { e.preventDefault(); e.stopPropagation(); stop(); } };
    ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(function (ev) { document.addEventListener(ev, guard, true); });
    addEventListener('resize', size);
  };
  function poke() {
    clearTimeout(idleTimer);
    // not on phones (they sleep on their own), not mid-read, not while music plays
    if (OS.coarse.matches) return;
    var mins = +setting('saver', 2);
    if (!mins) return;
    IDLE = mins * 60000;
    idleTimer = setTimeout(function () {
      var t = OS.top();
      if (t && (t.app === 'browser' || t.app === 'terminal' || t.app === 'untitled')) { poke(); return; }
      if (!document.getElementById('bootscreen') && !document.hidden && !$('.modal-bg') && !(OS.player && OS.player.playing())) OS.apps.screensaver();
    }, IDLE);
  }
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, poke, { passive: true }); });
  window.addEventListener('message', poke);
  poke();

  /* ---------------- Firewall: a small game ---------------- */
  var RULES = [
    { text: 'Drop TELNET (port 23). Nobody should be using it.', bad: function (p) { return p.port === 23; } },
    { text: 'Drop anything from 203.0.113.66. It has been knocking all week.', bad: function (p) { return p.src === '203.0.113.66'; } },
    { text: 'Drop SMB (port 445) coming from outside.', bad: function (p) { return p.port === 445; } },
    { text: 'Drop requests with \' OR 1=1 in them.', bad: function (p) { return p.info.indexOf("' OR 1=1") !== -1; } },
    { text: 'Drop RDP (port 3389) unless it comes from 10.0.0.5.', bad: function (p) { return p.port === 3389 && p.src !== '10.0.0.5'; } }
  ];
  var GOOD = [
    ['HTTPS', 443, 'GET /blog/ HTTP/1.1'], ['HTTPS', 443, 'GET /feed.xml'], ['DNS', 53, 'query A bhanuharya.github.io'],
    ['HTTPS', 443, 'POST /search q=hex'], ['NTP', 123, 'time please'], ['SSH', 22, 'key exchange (from 10.0.0.5)'],
    ['HTTPS', 443, 'GET /about/'], ['SMTP', 25, 'MAIL FROM:<friend@example.org>']
  ];
  var BAD = [
    ['TELNET', 23, 'login: admin'], ['TELNET', 23, 'password: password'], ['SMB', 445, 'tree connect \\\\C$'],
    ['HTTP', 80, "GET /login?user=' OR 1=1 --"], ['HTTPS', 443, "POST /api q=' OR 1=1"], ['RDP', 3389, 'connection request'],
    ['SMB', 445, 'negotiate protocol']
  ];
  var best = 0;
  function rndIp() { return [198, 51, 100, 1 + Math.floor(Math.random() * 250)].join('.'); }
  OS.apps.firewall = function (from) {
    var w = OS.find('firewall');
    if (w) { OS.restore(w); return; }
    w = OS.makeWindow('firewall', 'Firewall', '<div class="win-body fw-body">' +
      '<div class="fw-rules sunken"><b>Rules</b><ol></ol></div>' +
      '<div class="fw-lane sunken" tabindex="0" aria-label="Incoming packets. Click a packet, or press Space, to drop it."><div class="fw-wall"><span>your network</span></div>' +
        '<div class="fw-over"><p><b>Firewall</b></p><p>Packets fall toward your network. Click the ones the rules say to drop (or press Space to drop the lowest one).</p><p>Let a bad one through, or drop a good one, and you lose a shield.</p><button type="button" class="btn" data-go>Start</button></div>' +
      '</div></div>' +
      '<div class="statusline"><span class="seg" data-score>Score: 0</span><span class="seg" data-level>Level 1</span><span class="seg grow" data-msg>Ready.</span><span class="seg" data-lives aria-label="Shields"></span></div>', { from: from });
    var el = w.el, lane = $('.fw-lane', el), over = $('.fw-over', el), rulesEl = $('.fw-rules ol', el);
    var S = { run: false, raf: 0, packets: [], score: 0, lives: 3, level: 1, handled: 0, spawnIn: 0, last: 0, paused: false };
    var setMsg = function (t) { $('[data-msg]', el).textContent = t; };
    var hud = function () {
      $('[data-score]', el).textContent = 'Score: ' + S.score;
      $('[data-level]', el).textContent = 'Level ' + S.level;
      $('[data-lives]', el).innerHTML = new Array(S.lives + 1).join(svg('shield'));
      rulesEl.innerHTML = RULES.slice(0, Math.min(S.level, RULES.length)).map(function (r) { return '<li>' + esc(r.text) + '</li>'; }).join('');
    };
    var make = function () {
      var rules = RULES.slice(0, Math.min(S.level, RULES.length));
      var p, tries = 0;
      do {
        var useBad = Math.random() < 0.42;
        var t = useBad ? BAD[Math.floor(Math.random() * BAD.length)] : GOOD[Math.floor(Math.random() * GOOD.length)];
        p = { proto: t[0], port: t[1], info: t[2], src: Math.random() < 0.15 + 0.05 * S.level && S.level >= 2 ? '203.0.113.66' : (t[0] === 'SSH' || (t[0] === 'RDP' && Math.random() < 0.4) ? '10.0.0.5' : rndIp()) };
        p.bad = rules.some(function (r) { return r.bad(p); });
        tries++;
      } while (tries < 5 && !p.bad && BAD.some(function (b) { return b[2] === p.info; }));
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'fw-pk ' + ({ HTTPS: 'ai', DNS: 'ai', NTP: 'misc', SSH: 'game', SMTP: 'misc' }[p.proto] || 'sec');
      d.innerHTML = '<b>' + esc(p.proto) + '</b><span>' + esc(p.src) + ' → :' + p.port + '</span><span class="i">' + esc(p.info) + '</span>';
      d.style.top = '-30px';
      p.el = d; p.y = -30;
      p.v = 0.035 + S.level * 0.008 + Math.random() * 0.012;
      d.addEventListener('pointerdown', function (e) { e.preventDefault(); drop(p); });
      lane.appendChild(d);
      S.packets.push(p);
    };
    var remove = function (p, cls) {
      S.packets.splice(S.packets.indexOf(p), 1);
      p.el.classList.add(cls);
      p.el.disabled = true;
      setTimeout(function () { p.el.remove(); }, 420);
    };
    var lose = function (why) {
      S.lives--;
      OS.sound('error');
      OS.log('warn', 'Firewall', 5157, why);
      lane.classList.remove('hit'); void lane.offsetWidth; lane.classList.add('hit');
      setMsg(why);
      if (S.lives <= 0) end();
    };
    var progress = function () {
      S.handled++;
      if (S.handled % 12 === 0) {
        S.level++;
        OS.sound('ding');
        OS.log('info', 'Firewall', 5440, 'Level ' + S.level + ' reached. Score ' + S.score + '.');
        if (S.level >= 5) OS.emit('discover', 'fw5');
        setMsg(S.level <= RULES.length ? 'Level ' + S.level + '. New rule: ' + RULES[S.level - 1].text : 'Level ' + S.level + '. Faster.');
      }
      hud();
    };
    var drop = function (p) {
      if (!S.run || S.paused || S.packets.indexOf(p) === -1) return;
      if (p.bad) { S.score += 10; OS.sound('pop'); setMsg('Dropped ' + p.proto + ' from ' + p.src + '.'); remove(p, 'dropped'); }
      else { remove(p, 'wrong'); lose('That was a real visitor (' + p.proto + ' :' + p.port + ').'); }
      progress();
    };
    var frame = function (t) {
      if (!S.run) return;
      var dt = Math.min(48, t - (S.last || t)); S.last = t;
      if (!S.paused) {
        var H = lane.clientHeight - 30;
        S.spawnIn -= dt;
        if (S.spawnIn <= 0) { make(); S.spawnIn = Math.max(420, 1500 - S.level * 120) * (0.7 + Math.random() * 0.6); }
        S.packets.slice().forEach(function (p) {
          p.y += p.v * dt;
          p.el.style.top = p.y + 'px';
          if (p.y > H) {
            if (p.bad) { remove(p, 'breach'); lose('Breach: ' + p.proto + ' "' + p.info + '" got in.'); }
            else { S.score += 1; remove(p, 'passed'); }
            if (S.run) progress();
          }
        });
      }
      S.raf = requestAnimationFrame(frame);
    };
    var start = function () {
      S.packets.forEach(function (p) { p.el.remove(); });
      $$('.fw-pk', lane).forEach(function (n) { n.remove(); });
      S = { run: true, raf: 0, packets: [], score: 0, lives: 3, level: 1, handled: 0, spawnIn: 300, last: 0, paused: false };
      over.hidden = true;
      hud();
      setMsg('Rule 1 is up. Watch for TELNET.');
      OS.log('info', 'Firewall', 5024, 'Firewall started. Rule 1: drop TELNET.');
      lane.focus();
      S.raf = requestAnimationFrame(frame);
    };
    var end = function () {
      S.run = false;
      cancelAnimationFrame(S.raf);
      best = Math.max(best, S.score);
      OS.log('info', 'Firewall', 5025, 'Firewall stopped. Score ' + S.score + ', level ' + S.level + '.');
      over.hidden = false;
      over.innerHTML = '<p><b>Game over</b></p><p>Score ' + S.score + ' · level ' + S.level + ' · best this visit ' + best + '</p><button type="button" class="btn" data-go>Play again</button>';
      $('[data-go]', over).focus();
    };
    el.addEventListener('click', function (e) { if (e.target.closest('[data-go]')) start(); });
    lane.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        if (!S.run) return;
        e.preventDefault();
        var low = S.packets.slice().sort(function (a, b) { return b.y - a.y; })[0];
        if (low) drop(low);
      }
    });
    OS.on('focus', function (o) { if (S.run) { S.paused = o !== w; if (S.paused) setMsg('Paused. Click the game to go on.'); } });
    OS.on('minimize', function (o) { if (o === w && S.run) { S.paused = true; setMsg('Paused.'); } });
    OS.on('close', function (o) { if (o === w) { S.run = false; cancelAnimationFrame(S.raf); } });
    hud();
  };

  /* ---------------- start ---------------- */
  OS.on('ready', function () {
    logoffLabel();
    if (root.classList.contains('boot-pending')) boot(false);
  });
})();
