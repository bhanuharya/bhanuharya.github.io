/* obscuraOS: notavirus.exe
   A harmless joke in the style of the prank programs that went round by
   email around 2000: a security warning, a fake installer, then a minute
   of nonsense on screen. It only changes what is drawn. Nothing is
   deleted, stored or sent, and Esc stops it at any time. No fast
   flashing; with reduced motion it stays calm. */
(function () {
  'use strict';
  var OS = window.OS;
  if (!OS) return;
  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = OS.esc, svg = OS.svg;

  var ERRORS = [
    'Task failed successfully.',
    'Not enough memory to display this error.',
    'Keyboard not found. Press F1 to continue.',
    'Your computer has run out of fun. Please insert more fun.',
    'Error 404: error message not found.',
    'The operation completed. Nothing was done.',
    'You clicked OK. Click OK to continue.',
    'A fatal exception 0E has occurred at 0028:C0011E36. Probably.',
    'notavirus.exe is not responding. Neither is anyone else.',
    'Please wait while we waste your time.',
    'Your mouse has moved. Restart your computer for the change to take effect.',
    'Cannot delete file: there is not enough free space on the Recycle Bin.'
  ];
  var FILES = [
    'C:\\My Documents\\homework_FINAL_final_v3.doc',
    'C:\\My Documents\\My Music\\totally_legal_mp3s\\',
    'C:\\Program Files\\Games\\Solitaire\\high scores',
    'C:\\WINDOWS\\Desktop\\wallpaper.bmp',
    'C:\\Recycle Bin\\the stuff you thought was gone',
    'C:\\autoexec.bat',
    'your browser history (just kidding, I can\'t read that)',
    'C:\\My Documents\\poems_nobody_will_ever_see.txt'
  ];

  var on = false, timers = [], raf = 0, errs = 0, startLabel = '';
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

  OS.apps.virus = function () {
    if (on) return;
    OS.msg({
      title: 'Open File - Security Warning', icon: 'warn',
      text: 'The publisher could not be verified. Are you sure you want to run this software?\n\nName: notavirus.exe\nPublisher: Unknown Publisher\nType: Application, 640 KB\nFrom: a forum signature, probably',
      buttons: ['Run', 'Cancel']
    }).then(function (i) { if (i === 0) install(); });
  };

  function install() {
    on = true;
    var who = 'guest';
    try { who = sessionStorage.getItem('os-user') || 'guest'; } catch (e) {}
    OS.log('warn', 'Antivirus', 1337, 'notavirus.exe was run by ' + who + '.');
    var w = OS.makeWindow('virus', 'notavirus.exe', '<div class="win-body vx-install">' +
      '<p><b>Installing notavirus.exe</b><br>Please do not turn off your computer.</p>' +
      '<div class="vx-bar sunken"><i></i></div><p class="vx-file dim"></p></div>', { noMax: true });
    var bar = $('.vx-bar i', w.el), file = $('.vx-file', w.el), n = 0, steps = FILES.length + 2;
    var step = function () {
      if (!on) return;
      n++;
      bar.style.width = Math.min(100, n / steps * 100) + '%';
      file.textContent = n <= FILES.length ? 'Deleting ' + FILES[n - 1] + '...' : 'Done. Enjoy your new computer.';
      if (n < steps) later(step, OS.reduce.matches ? 250 : 380 + Math.random() * 240);
      else later(function () { OS.close(w); chaos(); }, 900);
    };
    later(step, 500);
  }

  function chaos() {
    if (!on) return;
    root.classList.add('infected');
    if (OS.reduce.matches) root.classList.add('infected-calm');
    var start = $('#start-btn b');
    if (start) { startLabel = start.textContent; start.textContent = 'Panic'; }
    var hint = document.createElement('div');
    hint.className = 'vx-hint';
    hint.textContent = 'Press Esc to make it stop';
    document.body.appendChild(hint);
    // the error cascade, like dragging a box on a frozen computer
    var x = 40 + Math.random() * 80, y = 30 + Math.random() * 40, k = 0;
    var cascade = function () {
      if (!on || k++ > 26) return;
      spawn(x, y);
      x += 18; y += 18;
      if (y > innerHeight - 200) { y = 30 + Math.random() * 60; x = 80 + Math.random() * (innerWidth - 400); }
      later(cascade, 120);
    };
    cascade();
    if (!OS.reduce.matches) { bug(); document.addEventListener('pointermove', flee, true); }
    later(finish, 13000);
  }
  var lastDing = 0;
  function spawn(x, y) {
    if (!on || errs > 70) return;
    errs++;
    var d = document.createElement('div');
    d.className = 'vx-err raised';
    d.setAttribute('role', 'alertdialog');
    d.style.left = Math.max(0, Math.min(innerWidth - 300, x)) + 'px';
    d.style.top = Math.max(0, Math.min(innerHeight - 140, y)) + 'px';
    d.innerHTML = '<header class="titlebar"><span class="tt">Error</span></header><div class="vx-err-body">' + svg('warn') + '<p>' + esc(ERRORS[Math.floor(Math.random() * ERRORS.length)]) + '</p></div><p class="vx-btns"><button type="button" class="btn">OK</button></p>';
    // every OK brings two more
    $('button', d).addEventListener('click', function () {
      var r = d.getBoundingClientRect();
      d.parentNode.removeChild(d);
      spawn(r.left + 30 + Math.random() * 120, r.top - 40 + Math.random() * 120);
      spawn(r.left - 120 + Math.random() * 120, r.top + 40 + Math.random() * 120);
    });
    document.body.appendChild(d);
    var now = performance.now();
    if (now - lastDing > 260) { lastDing = now; OS.sound(Math.random() < 0.5 ? 'ding' : 'error'); }
  }
  // desktop icons run away from the pointer
  function flee(e) {
    $$('.dicon:not([hidden])').forEach(function (ic) {
      var r = ic.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = cx - e.clientX, dy = cy - e.clientY, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 110) return;
      var o = ic._vx || (ic._vx = { x: 0, y: 0 });
      var push = (110 - dist) * 0.9 + 20;
      o.x = Math.max(-r.left + o.x, Math.min(innerWidth - r.right + o.x, o.x + dx / (dist || 1) * push));
      o.y = Math.max(-r.top + o.y, Math.min(innerHeight - 60 - r.bottom + o.y, o.y + dy / (dist || 1) * push));
      ic.style.transform = 'translate(' + o.x + 'px,' + o.y + 'px) rotate(' + (Math.random() * 30 - 15) + 'deg)';
    });
  }
  // a bug that bounces around the screen
  function bug() {
    var b = document.createElement('div');
    b.className = 'vx-bug';
    b.innerHTML = svg('bug') + '<span>hehe</span>';
    document.body.appendChild(b);
    var px = Math.random() * (innerWidth - 80), py = Math.random() * (innerHeight - 120), vx = 3.2, vy = 2.6;
    var lines = ['hehe', 'hi!', 'oops', 'lol', ':)', 'whee'];
    var t = 0;
    var frame = function () {
      if (!on) return;
      px += vx; py += vy;
      if (px < 0 || px > innerWidth - 64) { vx = -vx; px = Math.max(0, Math.min(innerWidth - 64, px)); }
      if (py < 0 || py > innerHeight - 100) { vy = -vy; py = Math.max(0, Math.min(innerHeight - 100, py)); }
      b.style.transform = 'translate(' + px + 'px,' + py + 'px) rotate(' + (Math.atan2(vy, vx) * 57.3 + 90) + 'deg)';
      if (++t % 90 === 0) $('span', b).textContent = lines[Math.floor(Math.random() * lines.length)];
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (!on) return;
    on = false;
    timers.forEach(clearTimeout);
    timers = [];
    cancelAnimationFrame(raf);
    document.removeEventListener('pointermove', flee, true);
    root.classList.remove('infected', 'infected-calm');
    $$('.vx-err, .vx-bug, .vx-hint').forEach(function (n) { n.parentNode.removeChild(n); });
    $$('.dicon').forEach(function (ic) { ic.style.transform = ''; ic._vx = null; });
    var start = $('#start-btn b');
    if (start && startLabel) start.textContent = startLabel;
    var w = OS.find('virus');
    if (w) OS.close(w);
    errs = 0;
  }
  function finish() {
    var shown = errs;
    stop();
    OS.log('info', 'Antivirus', 1338, 'notavirus.exe finished after ' + shown + ' error boxes. Nothing was deleted, stored or sent.');
    OS.msg({
      title: 'notavirus.exe', icon: 'bug',
      text: 'Just kidding. That was not a virus.\n\nNothing was deleted, nothing was stored, nothing was sent anywhere. Security Center will tell you the same.'
    });
  }
  document.addEventListener('keydown', function (e) {
    if (on && e.key === 'Escape') { e.preventDefault(); finish(); }
  }, true);
})();
