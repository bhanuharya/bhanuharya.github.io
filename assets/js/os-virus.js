/* obscuraOS: notavirus.exe
   A harmless joke in the style of the prank programs that went round by
   email around 2000: a security warning, a fake installer, then half a
   minute of nonsense with a polka, a toaster that wants to help, a
   dancing floppy disk and a CD in sunglasses. It only changes what is
   drawn and played. Nothing is deleted, stored or sent; speech uses only
   voices built into the device. Esc stops it at any time. No fast
   flashing; with reduced motion nothing moves around. */
(function () {
  'use strict';
  var OS = window.OS;
  if (!OS) return;
  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = OS.esc, svg = OS.svg, calm = function () { return OS.reduce.matches; };

  var ERRORS = [
    'Task failed successfully.', 'Not enough memory to display this error.', 'Keyboard not found. Press F1 to continue.',
    'Your computer has run out of fun. Please insert more fun.', 'Error 404: error message not found.',
    'The operation completed. Nothing was done.', 'You clicked OK. Click OK to continue.',
    'A fatal exception 0E has occurred at 0028:C0011E36. Probably.', 'notavirus.exe is not responding. Neither is anyone else.',
    'Please wait while we waste your time.', 'Your mouse has moved. Restart your computer for the change to take effect.',
    'The toaster has stopped working.', 'Disk A: is dancing. Please wait until it stops.'
  ];
  var FILES = [
    'Deleting C:\\My Documents\\homework_FINAL_final_v3.doc', 'Installing 37 toolbars...', 'Downloading more RAM...',
    'Deleting C:\\Program Files\\Games\\Solitaire\\high scores', 'Setting your homepage to a toaster fan site...',
    'Replacing all fonts with Comic Sans...', 'Deleting your browser history (just kidding, I can\'t read that)',
    'Teaching the floppy disk to dance...'
  ];
  var MARQUEE = '★ FREE SMILEYS ★ YOU HAVE (1) NEW FRIEND REQUEST FROM A TOASTER ★ HOT SINGLE FLOPPY DISKS IN YOUR AREA ★ ' +
    'CLICK HERE TO WIN A FREE CD-ROM ★ YOUR COMPUTER IS NOW 30% COOLER ★ BEST VIEWED IN 800x600 ★ ';
  var TOASTY = [
    'It looks like you\'re getting a virus! Would you like help?',
    'Great choice! Downloading more RAM.',
    'Please do not panic. Panic is a premium feature.',
    'I have toast. Nobody asked, but I have toast.',
    'Floppy, stop dancing. Floppy. FLOPPY.',
    'Thank you for choosing notavirus.exe!'
  ];

  /* ---------------- characters (drawn for this site; dancing on beat!) ---------------- */
  var EYES = function (x1, x2, y, r) {
    return '<g class="eyes"><circle cx="' + x1 + '" cy="' + y + '" r="' + r + '" fill="#fff" stroke="#000" stroke-width="1.5"/><circle cx="' + x2 + '" cy="' + y + '" r="' + r + '" fill="#fff" stroke="#000" stroke-width="1.5"/>' +
      '<circle class="pupil" cx="' + (x1 + 1.5) + '" cy="' + (y + 1) + '" r="' + (r * 0.45) + '"/><circle class="pupil" cx="' + (x2 + 1.5) + '" cy="' + (y + 1) + '" r="' + (r * 0.45) + '"/></g>';
  };
  var ARMS = function (lx, rx, y) {
    return '<g class="arm arm-l"><path d="M' + lx + ' ' + y + 'q-10 -2 -16 -14" stroke="#000" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="' + (lx - 17) + '" cy="' + (y - 15) + '" r="5.2" fill="#fff" stroke="#000" stroke-width="1.5"/></g>' +
      '<g class="arm arm-r"><path d="M' + rx + ' ' + y + 'q10 -2 16 -14" stroke="#000" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="' + (rx + 17) + '" cy="' + (y - 15) + '" r="5.2" fill="#fff" stroke="#000" stroke-width="1.5"/></g>';
  };
  var LEGS = function (x1, x2, y) {
    return '<g class="legs">' +
      '<g class="leg leg-l"><path d="M' + x1 + ' ' + y + 'v15" stroke="#000" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="' + (x1 - 4) + '" cy="' + (y + 16) + '" rx="7.5" ry="3.8" fill="#c02020" stroke="#000" stroke-width="1.4"/></g>' +
      '<g class="leg leg-r"><path d="M' + x2 + ' ' + y + 'v15" stroke="#000" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="' + (x2 + 4) + '" cy="' + (y + 16) + '" rx="7.5" ry="3.8" fill="#c02020" stroke="#000" stroke-width="1.4"/></g>' +
    '</g>';
  };
  var CHARS = {
    toasty: '<svg viewBox="-26 -18 152 132" class="vx-svg">' +
      '<ellipse class="vx-floor" cx="50" cy="103" rx="34" ry="7"/>' +
      '<g class="vx-body"><g class="toast"><rect x="20" y="6" width="16" height="24" rx="3" fill="#e8b062" stroke="#7a4a1a" stroke-width="2"/><rect x="62" y="6" width="16" height="24" rx="3" fill="#e8b062" stroke="#7a4a1a" stroke-width="2"/></g>' +
      '<rect x="6" y="20" width="88" height="64" rx="18" fill="#c8ccd2" stroke="#000" stroke-width="2.5"/><rect x="12" y="24" width="76" height="10" rx="5" fill="#fff" opacity=".5"/>' +
      '<rect x="94" y="42" width="10" height="6" rx="2" fill="#222"/>' + EYES(36, 62, 50, 9) +
      '<path d="M36 67q14 13 28 0" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/>' + ARMS(8, 92, 60) + '</g>' + LEGS(32, 68, 84) + '</svg>',
    floppy: '<svg viewBox="-24 -16 132 130" class="vx-svg">' +
      '<ellipse class="vx-floor" cx="43" cy="101" rx="30" ry="6.5"/>' +
      '<g class="vx-body"><path d="M6 4h62l12 12v66H6z" fill="#2a3a8a" stroke="#000" stroke-width="2.5"/><rect x="22" y="4" width="34" height="22" fill="#c8ccd2" stroke="#000" stroke-width="1.5"/><rect x="42" y="8" width="8" height="14" fill="#2a3a8a"/>' +
      '<rect x="14" y="40" width="58" height="38" fill="#fff" stroke="#000" stroke-width="1.5"/>' + EYES(32, 54, 52, 7) +
      '<path d="M34 66q9 8 18 0" stroke="#000" stroke-width="2.5" fill="none" stroke-linecap="round"/>' + ARMS(6, 80, 50) + '</g>' + LEGS(26, 60, 82) + '</svg>',
    cd: '<svg viewBox="-24 -16 128 130" class="vx-svg">' +
      '<ellipse class="vx-floor" cx="40" cy="99" rx="29" ry="6.5"/>' +
      '<g class="vx-body"><circle cx="40" cy="42" r="38" fill="#dcdfe6" stroke="#000" stroke-width="2.5"/><path d="M40 4a38 38 0 0 1 33 19L40 42z" fill="#b7dcff" opacity=".8"/><path d="M73 61a38 38 0 0 1-33 19V42z" fill="#e7c9ff" opacity=".8"/><path d="M7 61A38 38 0 0 1 7 23l33 19z" fill="#c9f2b0" opacity=".8"/>' +
      '<circle cx="40" cy="42" r="9" fill="#fff" stroke="#000" stroke-width="1.5"/>' +
      '<g class="shades"><rect x="14" y="22" width="22" height="12" rx="4" fill="#000"/><rect x="44" y="22" width="22" height="12" rx="4" fill="#000"/><path d="M36 27h8" stroke="#000" stroke-width="3"/><path d="M17 25h8" stroke="#fff" stroke-width="2" opacity=".6"/></g>' +
      '<path d="M26 58q14 10 28 0" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/>' + ARMS(4, 76, 46) + '</g>' + LEGS(28, 52, 80) + '</svg>',
    bug: '<svg viewBox="-24 -22 128 136" class="vx-svg">' +
      '<ellipse class="vx-floor" cx="40" cy="99" rx="28" ry="6.5"/>' +
      '<g class="vx-body">' +
      '<g class="ant ant-l"><path d="M32 18q-8 -16 -18 -18" stroke="#000" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="13" cy="0" r="4" fill="#ffd34d" stroke="#000" stroke-width="1.4"/></g>' +
      '<g class="ant ant-r"><path d="M48 18q8 -16 18 -18" stroke="#000" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="67" cy="0" r="4" fill="#ffd34d" stroke="#000" stroke-width="1.4"/></g>' +
      '<ellipse cx="40" cy="52" rx="28" ry="30" fill="#d42020" stroke="#000" stroke-width="2.5"/>' +
      '<path d="M40 24v56" stroke="#000" stroke-width="2" opacity=".55"/>' +
      '<circle cx="24" cy="46" r="4.5" fill="#1a1a1a"/><circle cx="56" cy="46" r="4.5" fill="#1a1a1a"/>' +
      '<circle cx="27" cy="64" r="3.8" fill="#1a1a1a"/><circle cx="53" cy="64" r="3.8" fill="#1a1a1a"/>' +
      '<ellipse cx="40" cy="24" rx="18" ry="13" fill="#222" stroke="#000" stroke-width="2"/>' +
      EYES(32, 48, 24, 6.2) +
      '<path d="M32 33q8 6 16 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      ARMS(12, 68, 50) + '</g>' + LEGS(28, 52, 80) + '</svg>'
  };
  var STYLES = ['dance-disco', 'dance-boogie', 'dance-groove'];
  function character(kind, cls) {
    var d = document.createElement('div');
    var style = STYLES[Math.floor(Math.random() * STYLES.length)];
    d.className = 'vx-char ' + kind + ' ' + style + (cls ? ' ' + cls : '');
    d.innerHTML = CHARS[kind] + '<span class="vx-notes" aria-hidden="true"><i>♪</i><i>♫</i></span>';
    d.addEventListener('click', function () {
      if (d.classList.contains('vx-spin')) return;
      d.classList.add('vx-spin');
      OS.sound('pop');
      say(d, ['woo!', '♪ boogie! ♪', 'disco!', 'can\'t stop!'][Math.floor(Math.random() * 4)], 1600);
      setTimeout(function () { d.classList.remove('vx-spin'); }, 700);
    });
    document.body.appendChild(d);
    return d;
  }
  function say(el, text, ms) {
    var b = $('.vx-say', el);
    if (!b) { b = document.createElement('div'); b.className = 'vx-say'; el.appendChild(b); }
    b.textContent = text;
    b.hidden = false;
    if (ms) later(function () { b.hidden = true; }, ms);
    return b;
  }

  /* ---------------- the polka (written for this; played by the browser) ---------------- */
  var BPM = 168, STEP = 60 / BPM / 2;
  var MEL = [76, 79, 76, 79, 84, 0, 83, 81, 79, 0, 76, 0, 72, 0, 76, 79, 77, 81, 77, 81, 86, 0, 84, 83, 84, 0, 79, 0, 76, 0, 72, 0,
    81, 84, 81, 84, 89, 0, 88, 86, 84, 0, 79, 0, 76, 79, 84, 0, 83, 0, 86, 0, 89, 0, 86, 83, 84, 0, 0, 0, 72, 0, 0, 0];
  var ROOTS = [48, 48, 43, 48, 53, 48, 43, 48];
  var music = null;
  function note(ctx, out, f, t, len, type, vol, bend) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (bend) o.frequency.exponentialRampToValueAtTime(f * bend, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + len + 0.02);
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function effGain() { return OS.effectiveVolume ? OS.effectiveVolume() : (OS.soundOn() ? 0.8 : 0); }
  function startMusic() {
    var eg = effGain();
    if (!eg) return;
    var ctx = OS.audio();
    if (!ctx) return;
    var out = ctx.createGain(), lp = ctx.createBiquadFilter();
    out.gain.value = 0.5 * eg;
    lp.type = 'lowpass'; lp.frequency.value = 3200;
    out.connect(lp); lp.connect(ctx.destination);
    var t0 = ctx.currentTime + 0.1, step = 0;
    music = { ctx: ctx, out: out, lp: lp };
    var noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate), nd = noise.getChannelData(0);
    for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    var hit = function (t, hp, v, len) {
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; f.type = 'highpass'; f.frequency.value = hp;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + len + 0.02);
    };
    music.timer = setInterval(function () {
      while (t0 + step * STEP < ctx.currentTime + 0.25) {
        var t = t0 + step * STEP, i = step % 64, bar = Math.floor(i / 8), b = i % 8, r = ROOTS[bar];
        if (MEL[i]) { note(ctx, out, hz(MEL[i]), t, STEP * 0.9, 'square', 0.05); note(ctx, out, hz(MEL[i]) * 1.006, t, STEP * 0.9, 'sawtooth', 0.025); }
        if (b % 2 === 0) note(ctx, out, hz(b % 4 === 0 ? r - 12 : r - 5), t, STEP * 0.8, 'triangle', 0.22);
        else { [r + 4, r + 7, r + 12].forEach(function (m) { note(ctx, out, hz(m), t, STEP * 0.45, 'square', 0.018); }); }
        if (b === 0 || b === 4) note(ctx, out, 140, t, 0.16, 'sine', 0.35, 0.3);
        if (b === 2 || b === 6) hit(t, 1500, 0.18, 0.12);
        if (b % 2) hit(t, 7000, 0.05, 0.04);
        if (i === 31 || i === 63) note(ctx, out, 500, t, 0.5, 'sine', 0.12, 2.6); // slide whistle up
        if (i === 47) note(ctx, out, 1300, t, 0.6, 'sine', 0.1, 0.35);           // and down
        step++;
      }
    }, 30);
  }
  function syncAudio() {
    var eg = effGain();
    if (music && music.out) {
      try { music.out.gain.setTargetAtTime(eg ? 0.5 * eg : 0.0001, music.ctx.currentTime, 0.03); } catch (e) {}
    }
    if (!eg) { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {} }
  }
  OS.on('sound', syncAudio);
  OS.on('volume', syncAudio);
  function stopMusic(sad) {
    if (!music) return;
    clearInterval(music.timer);
    var m = music, ctx = m.ctx, t = ctx.currentTime + 0.05;
    music = null;
    if (sad && effGain()) { // wah wah wah waaah
      [[62, 0, 0.45], [61, 0.5, 0.45], [60, 1.0, 0.45], [59, 1.5, 1.4]].forEach(function (n) {
        note(ctx, m.out, hz(n[0]), t + n[1], n[2], 'sawtooth', 0.09, n[0] === 59 ? 0.94 : 0.97);
      });
      setTimeout(function () { try { m.out.disconnect(); } catch (e) {} }, 3300);
    } else {
      m.out.gain.setTargetAtTime(0.0001, t, 0.05);
      setTimeout(function () { try { m.out.disconnect(); } catch (e) {} }, 400);
    }
  }

  /* ---------------- talking, with a voice on this device only ---------------- */
  var voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return null;
    var vs = speechSynthesis.getVoices().filter(function (v) { return v.localService && /^en/i.test(v.lang); });
    return vs[0] || null;
  }
  function speak(text) {
    if (!voice) voice = pickVoice();
    var eg = effGain();
    if (!eg || !voice) return;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.voice = voice; u.pitch = 1.7; u.rate = 1.15; u.volume = Math.min(1, 0.9 * eg);
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ---------------- the run ---------------- */
  var on = false, timers = [], raf = 0, errs = 0, startLabel = '', clockTimer = 0, cast = [], installWin = null, toastyEl = null;
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

  OS.apps.virus = function () {
    if (on) return;
    OS.msg({
      title: 'Open File - Security Warning', icon: 'warn',
      text: 'The publisher could not be verified. Are you sure you want to run this software?\n\nName: notavirus.exe\nPublisher: Unknown Publisher\nType: Application, 640 KB\nFrom: a forum signature, probably',
      buttons: ['Run', 'Cancel']
    }).then(function (i) { if (i === 0) install(); });
  };

  function startDanceFloor() {
    if (toastyEl) return;
    toastyEl = character('toasty', 'vx-toasty');
    cast.push(toastyEl);
    say(toastyEl, 'Warming up the dance floor!', 2400);
    conga();
    if (!calm()) {
      bug();
    } else {
      var staticBug = character('bug', 'vx-bug');
      staticBug.style.left = '28px';
      staticBug.style.bottom = 'calc(var(--tb-h) + 18px)';
      staticBug.style.top = 'auto';
      cast.push(staticBug);
    }
  }

  function install() {
    on = true;
    voice = pickVoice();
    var who = 'guest';
    try { who = sessionStorage.getItem('os-user') || 'guest'; } catch (e) {}
    OS.log('warn', 'Antivirus', 1337, 'notavirus.exe was run by ' + who + '.');
    if (OS.player && OS.player.pause) OS.player.pause();
    if (!calm()) root.classList.add('vx-rumble');
    else root.classList.add('infected-calm');
    startMusic();
    startDanceFloor();
    var w = installWin = OS.makeWindow('virus', 'notavirus.exe', '<div class="win-body vx-install">' +
      '<p><b>Installing notavirus.exe</b><br>Please do not turn off your computer.</p>' +
      '<div class="vx-bar sunken"><i></i></div><p class="vx-file dim"></p></div>', { noMax: true });
    var onCloseInstall = function (o) {
      if (o === w) {
        OS.off('close', onCloseInstall);
        if (installWin === w && on) { installWin = null; stop(false); OS.log('info', 'Antivirus', 1339, 'notavirus.exe installation cancelled.'); }
      }
    };
    OS.on('close', onCloseInstall);
    var bar = $('.vx-bar i', w.el), file = $('.vx-file', w.el), n = 0, steps = FILES.length + 1;
    var step = function () {
      if (!on) return;
      n++;
      bar.style.width = Math.min(100, n / steps * 100) + '%';
      file.textContent = n <= FILES.length ? FILES[n - 1] : 'Done. Enjoy your new computer.';
      if (n < steps) later(step, calm() ? 200 : 230 + Math.random() * 140);
      else later(function () { installWin = null; OS.off('close', onCloseInstall); OS.close(w, true); chaos(); }, 500);
    };
    later(step, 260);
  }

  function chaos() {
    if (!on) return;
    root.classList.remove('vx-rumble');
    root.classList.add('infected', 'vx-comic');
    if (calm()) root.classList.add('infected-calm');
    if (!music) startMusic();
    startDanceFloor();
    var start = $('#start-btn b');
    if (start) { startLabel = start.textContent; start.textContent = 'Panic'; }
    var hint = document.createElement('div');
    hint.className = 'vx-hint';
    hint.textContent = 'Press Esc to make it stop';
    document.body.appendChild(hint);
    // the clock runs backwards
    var clock = $('#clock'), back = new Date();
    clockTimer = setInterval(function () { back = new Date(back.getTime() - 61000); if (clock) clock.textContent = String(back.getHours()).padStart(2, '0') + ':' + String(back.getMinutes()).padStart(2, '0'); }, 400);
    // error cascade
    var x = 40 + Math.random() * 80, y = 30 + Math.random() * 40, k = 0;
    var cascade = function () {
      if (!on || k++ > 18) return;
      spawn(x, y);
      x += 18; y += 18;
      if (y > innerHeight - 200) { y = 30 + Math.random() * 60; x = 80 + Math.random() * (innerWidth - 400); }
      later(cascade, 130);
    };
    cascade();
    var toasty = toastyEl;
    later(function () { say(toasty, TOASTY[0]); speak(TOASTY[0]); askToasty(toasty); }, 600);
    marquee();
    later(function () { ad(); later(ad, 1400); }, 3600);
    if (!calm()) {
      later(function () { document.addEventListener('pointermove', glitter, true); document.addEventListener('pointermove', flee, true); }, 2500);
      later(melt, 8000);
    }
    var line = 1;
    var chatter = function () { if (!on || line >= TOASTY.length - 1) return; say(toasty, TOASTY[line]); speak(TOASTY[line]); line++; later(chatter, 3400); };
    later(chatter, 5500);
    later(finale, 24000);
  }
  function askToasty(t) {
    var q = document.createElement('div');
    q.className = 'vx-ask';
    q.innerHTML = '<button type="button" class="btn small">Yes</button><button type="button" class="btn small">Also yes</button>';
    say(t, TOASTY[0]).appendChild(q);
    $$('button', q).forEach(function (b) {
      b.addEventListener('click', function () {
        q.parentNode.removeChild(q);
        say(t, 'Helping!', 2000);
        speak('Helping!');
        for (var i = 0; i < 6; i++) spawn(innerWidth / 2 - 150 + (Math.random() - 0.5) * 500, innerHeight / 2 - 80 + (Math.random() - 0.5) * 300);
      });
    });
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
    $('button', d).addEventListener('click', function () { // every OK brings two more
      var r = d.getBoundingClientRect();
      d.parentNode.removeChild(d);
      spawn(r.left + 30 + Math.random() * 120, r.top - 40 + Math.random() * 120);
      spawn(r.left - 120 + Math.random() * 120, r.top + 40 + Math.random() * 120);
    });
    document.body.appendChild(d);
    var now = performance.now();
    if (now - lastDing > 300) { lastDing = now; OS.sound(Math.random() < 0.5 ? 'ding' : 'error'); }
  }
  function marquee() {
    if (!on) return;
    var m = document.createElement('div');
    m.className = 'vx-marquee';
    m.innerHTML = '<span>' + esc(MARQUEE + MARQUEE) + '</span>';
    document.body.appendChild(m);
  }
  function ad() {
    if (!on) return;
    var a = document.createElement('div');
    a.className = 'vx-ad raised';
    a.style.left = (20 + Math.random() * Math.max(10, innerWidth - 380)) + 'px';
    a.style.top = (40 + Math.random() * Math.max(10, innerHeight - 320)) + 'px';
    a.innerHTML = '<header class="titlebar"><span class="tt">Congratulations!!!</span></header><div class="vx-ad-body"><p class="vx-blink">YOU ARE THE<br><b>1,000,000th</b><br>VISITOR!</p><button type="button" class="btn">CLAIM YOUR PRIZE</button></div>';
    $('button', a).addEventListener('click', function () {
      $('.vx-ad-body', a).innerHTML = '<p>Your prize:<br><b>nothing</b>.<br>Congratulations again!</p>';
      OS.sound('ding');
    });
    document.body.appendChild(a);
  }
  function conga() {
    if (!on) return;
    ['floppy', 'cd', 'bug', 'floppy', 'cd'].forEach(function (k, i) {
      var c = character(k, 'vx-conga');
      // negative delays place the entire conga crew visibly across the screen immediately
      c.style.setProperty('--d', (-1.0 - i * 1.8) + 's');
      if (calm()) c.style.left = (110 + i * 110) + 'px'; // standing still, in a row
      cast.push(c);
    });
  }
  function melt() {
    if (!on) return;
    $$('.windows .window').forEach(function (w) { w.style.setProperty('--r', (Math.random() * 16 - 8) + 'deg'); });
    root.classList.add('vx-melt');
  }
  function flee(e) {
    $$('.dicon:not([hidden])').forEach(function (ic) {
      var r = ic.getBoundingClientRect(), dx = r.left + r.width / 2 - e.clientX, dy = r.top + r.height / 2 - e.clientY, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 110) return;
      var o = ic._vx || (ic._vx = { x: 0, y: 0 }), push = (110 - dist) * 0.9 + 20;
      o.x = Math.max(-r.left + o.x, Math.min(innerWidth - r.right + o.x, o.x + dx / (dist || 1) * push));
      o.y = Math.max(-r.top + o.y, Math.min(innerHeight - 60 - r.bottom + o.y, o.y + dy / (dist || 1) * push));
      ic.style.transform = 'translate(' + o.x + 'px,' + o.y + 'px) rotate(' + (Math.random() * 30 - 15) + 'deg)';
    });
  }
  var sparks = 0;
  function glitter(e) {
    if (sparks > 40) return;
    sparks++;
    var s = document.createElement('i');
    s.className = 'vx-spark';
    s.textContent = '✦';
    s.style.left = (e.clientX + Math.random() * 16 - 8) + 'px';
    s.style.top = (e.clientY + Math.random() * 16 - 8) + 'px';
    s.style.color = ['#ff6ad5', '#ffd34d', '#7af0ff', '#b6f09a', '#c9a4ff'][Math.floor(Math.random() * 5)];
    document.body.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); sparks--; }, 900);
  }
  function bug() {
    if (!on) return;
    var b = character('bug', 'vx-bug');
    cast.push(b);
    var px = Math.max(80, innerWidth * 0.28), py = Math.max(120, innerHeight * 0.55), vx = 3.4, vy = 2.7, t = 0;
    var lines = ['hehe', 'party!', 'boogie!', 'lol', '♪♫', 'whee'];
    say(b, 'party!');
    var frame = function () {
      if (!on) return;
      px += vx; py += vy;
      if (px < 0 || px > innerWidth - 88) { vx = -vx; px = Math.max(0, Math.min(innerWidth - 88, px)); }
      if (py < 0 || py > innerHeight - 120) { vy = -vy; py = Math.max(0, Math.min(innerHeight - 120, py)); }
      b.style.transform = 'translate(' + px + 'px,' + py + 'px)';
      if (++t % 85 === 0) say(b, lines[Math.floor(Math.random() * lines.length)]);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }
  function finale() {
    if (!on) return;
    stopMusic(true);
    root.classList.remove('vx-melt');
    $$('.vx-err, .vx-ad').forEach(function (n) { n.parentNode.removeChild(n); });
    cast.forEach(function (c) { c.classList.add('vx-bow'); });
    var t = toastyEl || cast[0];
    if (t) { say(t, TOASTY[TOASTY.length - 1]); speak(TOASTY[TOASTY.length - 1]); }
    later(function () { finish(true); }, 2600);
  }

  function stop(sadDone) {
    if (!on) return;
    on = false;
    timers.forEach(clearTimeout);
    timers = [];
    clearInterval(clockTimer);
    cancelAnimationFrame(raf);
    if (!sadDone) stopMusic(false);
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
    document.removeEventListener('pointermove', flee, true);
    document.removeEventListener('pointermove', glitter, true);
    root.classList.remove('infected', 'infected-calm', 'vx-rumble', 'vx-comic', 'vx-melt');
    $$('.vx-err, .vx-ad, .vx-char, .vx-hint, .vx-marquee, .vx-spark').forEach(function (n) { n.parentNode.removeChild(n); });
    $$('.dicon').forEach(function (ic) { ic.style.transform = ''; ic._vx = null; });
    $$('.windows .window').forEach(function (w) { w.style.removeProperty('--r'); });
    cast = [];
    toastyEl = null;
    var start = $('#start-btn b');
    if (start && startLabel) start.textContent = startLabel;
    var clock = $('#clock'), d = new Date();
    if (clock) clock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    installWin = null;
    var w = OS.find('virus');
    if (w) OS.close(w, true);
  }
  function finish(sadDone) {
    var shown = errs;
    stop(sadDone);
    errs = 0;
    OS.log('info', 'Antivirus', 1338, 'notavirus.exe finished after ' + shown + ' error boxes. Nothing was deleted, stored or sent.');
    OS.emit('discover', 'virus');
    OS.msg({
      title: 'notavirus.exe', icon: 'bug',
      text: 'Just kidding. That was not a virus.\n\nNothing was deleted, nothing was stored, nothing was sent anywhere. Security Center will tell you the same.'
    });
  }
  document.addEventListener('keydown', function (e) {
    if (on && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
  }, true);
})();
