/* obscuraOS: Media Player.
   Three short songs are written below as notes and played by the browser's
   own synthesizer, so they need no files. Audio files placed in
   assets/music/ join the playlist on the next build, and "Open..." plays a
   file from the visitor's computer without uploading it anywhere.
   YouTube videos listed in _data/youtube.yml (or pasted with "Open URL...")
   play in the player's screen, loaded only after the visitor agrees. */
(function () {
  'use strict';
  var OS = window.OS;
  if (!OS) return;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var esc = OS.esc;

  /* ---------------- the songs (original, written for this site) ---------------- */
  var SONGS = [
    {
      t: 'Handshake', bpm: 118,
      inst: {
        lead: { wave: 'square', vol: 0.05, cut: 2600 },
        bass: { wave: 'triangle', vol: 0.22 },
        pad: { wave: 'triangle', vol: 0.06 }
      },
      sections: {
        A: { pad: 'C4 E4 G4 E4 C4 E4 G4 E4 | A3 C4 E4 C4 A3 C4 E4 C4 | F3 A3 C4 A3 F3 A3 C4 A3 | G3 B3 D4 B3 G3 B3 D4 B3',
             bass: 'C3 . C3 . G2 . C3 . | A2 . A2 . E2 . A2 . | F2 . F2 . C3 . F2 . | G2 . G2 . D3 . G2 .',
             drums: 'h . . . h . . . | h . . . h . . . | h . . . h . . . | h . . . h . h h' },
        B: { lead: 'E5 . G5 . C6 - G5 E5 | A5 - G5 E5 C5 - E5 . | F5 . A5 . C6 - A5 F5 | G5 - F5 D5 B4 - D5 .',
             pad: 'C4 E4 G4 E4 C4 E4 G4 E4 | A3 C4 E4 C4 A3 C4 E4 C4 | F3 A3 C4 A3 F3 A3 C4 A3 | G3 B3 D4 B3 G3 B3 D4 B3',
             bass: 'C3 . C3 . G2 . C3 . | A2 . A2 . E2 . A2 . | F2 . F2 . C3 . F2 . | G2 . G2 . D3 . G2 .',
             drums: 'k h s h k h s h | k h s h k h s h | k h s h k h s h | k h s h k k s s' },
        C: { lead: 'G5 - E5 - C5 - E5 G5 | A5 - - G5 E5 - - . | F5 - A5 - C6 - D6 C6 | B5 - G5 - D5 - . .',
             pad: 'C4 E4 G4 E4 C4 E4 G4 E4 | A3 C4 E4 C4 A3 C4 E4 C4 | F3 A3 C4 A3 F3 A3 C4 A3 | G3 B3 D4 B3 G3 B3 D4 B3',
             bass: 'C3 . C3 . G2 . C3 . | A2 . A2 . E2 . A2 . | F2 . F2 . C3 . F2 . | G2 . G2 . D3 . G2 .',
             drums: 'k h s h k h s h | k h s h k h s h | k h s h k h s h | k h s h k s s s' },
        E: { lead: 'C6 - - - - - - .', pad: 'C4 - - - - - - .', bass: 'C3 - - - - - - .', drums: 'k . . . . . . .' }
      },
      order: 'A B C B C E'
    },
    {
      t: 'Night Shift', bpm: 84,
      inst: {
        lead: { wave: 'triangle', vol: 0.16 },
        bass: { wave: 'sine', vol: 0.3 },
        pad: { wave: 'sine', vol: 0.07 }
      },
      sections: {
        A: { pad: 'A3 C4 E4 A4 E4 C4 A3 C4 | F3 A3 C4 F4 C4 A3 F3 A3 | C4 E4 G4 C5 G4 E4 C4 E4 | E3 G#3 B3 E4 B3 G#3 E3 G#3',
             bass: 'A2 - - - - - E2 - | F2 - - - - - C3 - | C3 - - - - - G2 - | E2 - - - - - B2 -',
             drums: 'h . . . h . . . | h . . . h . . . | h . . . h . . . | h . . . h . . .' },
        B: { lead: 'A4 - - C5 E5 - D5 C5 | A4 - - - F4 - - . | G4 - C5 - E5 - G5 - | E5 - D5 - B4 - G#4 -',
             pad: 'A3 C4 E4 A4 E4 C4 A3 C4 | F3 A3 C4 F4 C4 A3 F3 A3 | C4 E4 G4 C5 G4 E4 C4 E4 | E3 G#3 B3 E4 B3 G#3 E3 G#3',
             bass: 'A2 - - - - - E2 - | F2 - - - - - C3 - | C3 - - - - - G2 - | E2 - - - - - B2 -',
             drums: 'k . h . s . h . | k . h . s . h . | k . h . s . h . | k . h . s . h h' },
        C: { lead: 'A4 - - C5 E5 - A5 - | G5 - F5 - E5 - D5 - | C5 - E5 - G5 - E5 C5 | B4 - - G#4 E4 - - .',
             pad: 'A3 C4 E4 A4 E4 C4 A3 C4 | F3 A3 C4 F4 C4 A3 F3 A3 | C4 E4 G4 C5 G4 E4 C4 E4 | E3 G#3 B3 E4 B3 G#3 E3 G#3',
             bass: 'A2 - - - - - E2 - | F2 - - - - - C3 - | C3 - - - - - G2 - | E2 - - - - - B2 -',
             drums: 'k . h . s . h . | k . h . s . h . | k . h . s . h . | k . h . s s h .' },
        E: { lead: 'A4 - - - - - - .', pad: 'A3 - - - - - - .', bass: 'A2 - - - - - - .', drums: '. . . . . . . .' }
      },
      order: 'A B C A E'
    },
    {
      t: 'Packet Loss', bpm: 136,
      inst: {
        lead: { wave: 'sawtooth', vol: 0.05, cut: 2200 },
        bass: { wave: 'square', vol: 0.07, cut: 700 },
        pad: { wave: 'triangle', vol: 0.05 }
      },
      sections: {
        A: { bass: 'E2 E3 E2 E3 E2 E3 E2 E3 | C2 C3 C2 C3 C2 C3 C2 C3 | D2 D3 D2 D3 D2 D3 D2 D3 | B1 B2 B1 B2 B1 B2 B1 B2',
             drums: 'h h h h h h h h | h h h h h h h h | h h h h h h h h | h h h h h h g g' },
        B: { lead: 'E5 . E5 G5 . E5 B5 . | C6 . B5 . G5 . E5 . | D5 . D5 F#5 . A5 D6 . | B5 . A5 . F#5 . D5 .',
             bass: 'E2 E3 E2 E3 E2 E3 E2 E3 | C2 C3 C2 C3 C2 C3 C2 C3 | D2 D3 D2 D3 D2 D3 D2 D3 | B1 B2 B1 B2 B1 B2 B1 B2',
             drums: 'k h s h k k s h | k h s h k k s h | k h s h k k s h | k h s h k k s g' },
        C: { lead: 'G5 - F#5 - E5 - B4 - | C5 - E5 - G5 - B5 - | A5 - F#5 - D5 - A4 - | B4 - D5 - F#5 - B5 -',
             pad: 'E4 G4 B4 G4 E4 G4 B4 G4 | C4 E4 G4 E4 C4 E4 G4 E4 | D4 F#4 A4 F#4 D4 F#4 A4 F#4 | B3 D4 F#4 D4 B3 D4 F#4 D4',
             bass: 'E2 E3 E2 E3 E2 E3 E2 E3 | C2 C3 C2 C3 C2 C3 C2 C3 | D2 D3 D2 D3 D2 D3 D2 D3 | B1 B2 B1 B2 B1 B2 B1 B2',
             drums: 'k h s g k h s h | k h s g k h s h | k h s g k h s h | k g s g k g g g' },
        E: { lead: 'E5 - - - . . . .', bass: 'E2 - - - . . . .', drums: 'k . . . g . g .' }
      },
      order: 'A B C B C E'
    }
  ];

  var SEMI = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  function hz(n) {
    var m = /^([A-G][#b]?)(-?\d)$/.exec(n);
    if (!m) return 0;
    return 440 * Math.pow(2, ((+m[2] + 1) * 12 + SEMI[m[1]] - 69) / 12);
  }
  function toks(s) { return s.split(/\s+/).filter(function (x) { return x && x !== '|'; }); }
  // turn a song into a flat, timed list of notes and drum hits
  function compile(song) {
    var step = 60 / song.bpm / 2, at = 0, ev = [];
    song.order.split(' ').forEach(function (name) {
      var sec = song.sections[name], len = 0;
      Object.keys(sec).forEach(function (ch) {
        var tk = toks(sec[ch]);
        len = Math.max(len, tk.length);
        if (ch === 'drums') { tk.forEach(function (d, i) { if (d !== '.') ev.push({ t: (at + i) * step, drum: d }); }); return; }
        var cur = null;
        tk.forEach(function (x, i) {
          if (x === '-') { if (cur) cur.d += step; return; }
          cur = null;
          if (x === '.') return;
          cur = { t: (at + i) * step, d: step, f: hz(x), ch: ch };
          ev.push(cur);
        });
      });
      at += len;
    });
    ev.sort(function (a, b) { return a.t - b.t; });
    return { ev: ev, dur: at * step + 0.6 };
  }

  /* ---------------- audio graph ---------------- */
  var ctx = null, master = null, analyser = null, noise = null, mediaEl = null, mediaSrc = null;
  function graph() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    ctx = OS.audio();
    if (!ctx) return null;
    master = ctx.createGain();
    master.gain.value = effVol();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    master.connect(analyser);
    analyser.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noise.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  var live = [];
  function keep(node, until) { live.push({ n: node, u: until }); }
  function hush() {
    live.forEach(function (x) { try { x.n.stop(); } catch (e) {} });
    live = [];
  }
  function playNote(e, t, inst) {
    var o = ctx.createOscillator(), g = ctx.createGain(), out = g, v = inst.vol || 0.1;
    o.type = inst.wave || 'square';
    o.frequency.setValueAtTime(e.f, t);
    var end = t + e.d * 0.94;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);
    g.gain.setValueAtTime(v * 0.75, Math.max(t + 0.013, end - 0.04));
    g.gain.exponentialRampToValueAtTime(0.0001, end + 0.06);
    o.connect(g);
    if (inst.cut) { var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = inst.cut; g.connect(f); out = f; }
    out.connect(master);
    o.start(t); o.stop(end + 0.08);
    keep(o, end + 0.08);
  }
  function playDrum(kind, t) {
    if (kind === 'k') {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(0.55, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.3);
      keep(o, t + 0.3);
      return;
    }
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), n = ctx.createGain();
    s.buffer = noise;
    var len = 0.05, v = 0.07;
    if (kind === 's') { f.type = 'highpass'; f.frequency.value = 1200; len = 0.16; v = 0.22; }
    else if (kind === 'h') { f.type = 'highpass'; f.frequency.value = 7000; len = 0.04; v = 0.07; }
    else { f.type = 'bandpass'; f.frequency.value = 400 + Math.random() * 3000; f.Q.value = 8; len = 0.07; v = 0.35; }
    n.gain.setValueAtTime(v, t);
    n.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(n); n.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
    keep(s, t + len + 0.02);
  }

  /* ---------------- player state ---------------- */
  // playlist order: your videos (in _data/videos.yml order), then music, then YouTube
  var list = [], first = 0, firstVid = -1;
  (OS.data.videos || []).forEach(function (v) {
    list.push({ t: v.t, by: v.by || 'assets/video', vid: v.u, dur: 0 });
    if (v.d && firstVid === -1) firstVid = list.length - 1; // _data/videos.yml: default: true
  });
  SONGS.forEach(function (s) { var c = compile(s); list.push({ t: s.t, by: 'obscuraOS', synth: s, ev: c.ev, dur: c.dur }); });
  (OS.data.songs || []).forEach(function (s) { list.push({ t: s.t, by: 'assets/music', url: s.u, dur: 0 }); });
  (OS.data.yt || []).forEach(function (v) {
    if (!/^[\w-]{11}$/.test(v.id || '')) return;
    list.push({ t: v.t || 'YouTube video', by: v.by || 'YouTube', yt: v.id, dur: 0 });
    if (v.d && !first) first = list.length - 1; // _data/youtube.yml: default: true
  });
  if (firstVid !== -1) first = firstVid; // your own default video wins over a YouTube one
  var cur = first, playing = false, pos = 0, t0 = 0, idx = 0, timer = null, vol = 0.8, shuffle = false, repeat = true, mode = 0;
  var win = null, ui = {};

  /* ---------------- YouTube, only when asked ----------------
     A YouTube track loads YouTube's own player (from youtube-nocookie.com)
     in the player's screen, and only after the visitor presses Play and
     agrees. Stop, or moving to another track, removes it again. The
     buttons here drive it through YouTube's postMessage interface, so no
     YouTube script ever runs in this page. */
  var YT = 'https://www.youtube-nocookie.com';
  var yt = { frame: null, id: null, time: 0, ready: false, asking: null };
  function ytRemembered() { try { return sessionStorage.getItem('yt-ok') === '1'; } catch (e) { return false; } }
  function ytPost(msg) { if (yt.frame && yt.frame.contentWindow) yt.frame.contentWindow.postMessage(JSON.stringify(msg), YT); }
  function ytCmd(func, args) { ytPost({ event: 'command', func: func, args: args || [], id: 'mp', channel: 'widget' }); }
  function ytIdFrom(text) {
    var s = String(text || '').trim(), m;
    if (/^[\w-]{11}$/.test(s)) return s;
    var u;
    try { u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); } catch (e) { return null; }
    var host = u.hostname.replace(/^(www|m|music)\./, '');
    if (host === 'youtu.be') m = u.pathname.slice(1).split('/')[0];
    else if (/(^|\.)youtube(-nocookie)?\.com$/.test(host)) m = u.searchParams.get('v') || (u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/) || [])[1];
    return m && /^[\w-]{11}$/.test(m) ? m : null;
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== YT || !yt.frame || e.source !== yt.frame.contentWindow) return;
    var d;
    try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (x) { return; }
    if (!d || typeof d !== 'object') return;
    var item = list[cur];
    if (d.event === 'onReady' || d.event === 'initialDelivery') {
      if (!yt.ready) { yt.ready = true; applyOutputVol(); }
    }
    var info = d.info;
    if (d.event === 'onStateChange' && typeof info === 'number') ytState(info);
    if (info && typeof info === 'object') {
      if (typeof info.currentTime === 'number') yt.time = info.currentTime;
      if (item && item.yt === yt.id) {
        if (typeof info.duration === 'number' && info.duration > 0 && !item.dur) { item.dur = info.duration; draw(); }
        if (info.videoData && info.videoData.title && item.auto) { item.t = info.videoData.title; item.auto = false; draw(); }
      }
      if (typeof info.playerState === 'number') ytState(info.playerState);
    }
  });
  function ytState(s) {
    if (s === yt.state) return;
    yt.state = s;
    if (s === 1) { playing = true; setStatus('Playing from YouTube'); }
    else if (s === 2) { playing = false; setStatus('Paused'); }
    else if (s === 0) { playing = false; ended(); return; }
    else if (s === 3) setStatus('Buffering...');
    draw();
  }
  function ytLoad(s, at) {
    ytUnload();
    yt.id = s.yt;
    var f = document.createElement('iframe');
    f.className = 'yt-frame';
    f.title = 'YouTube video: ' + s.t;
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.src = YT + '/embed/' + encodeURIComponent(s.yt) + '?enablejsapi=1&autoplay=1&playsinline=1&rel=0&iv_load_policy=3' +
      (at ? '&start=' + Math.floor(at) : '') + '&origin=' + encodeURIComponent(location.origin);
    f.addEventListener('load', function () {
      var n = 0;
      var hello = function () { if (yt.frame !== f || yt.ready || n++ > 12) return; ytPost({ event: 'listening', id: 'mp', channel: 'widget' }); setTimeout(hello, 400); };
      hello();
    });
    yt.frame = f;
    if (ui.video) { ui.video.innerHTML = ''; ui.video.appendChild(f); }
    playing = true;
    setStatus('Loading from YouTube...');
    OS.log('warn', 'Media Player', 2, 'Loaded YouTube\'s player for "' + s.t + '" at your request. From here YouTube (Google) can see this visit.');
    OS.emit('discover', 'music');
    draw();
  }
  function ytUnload() {
    if (yt.frame && yt.frame.parentNode) yt.frame.parentNode.removeChild(yt.frame);
    yt = { frame: null, id: null, time: 0, ready: false, asking: null, state: -1 };
  }
  function ytAsk(s, at) {
    yt.asking = s.yt;
    playing = false;
    if (!ui.video) return;
    ui.video.innerHTML = '<div class="yt-ask"><p><b>This one plays from YouTube.</b></p>' +
      '<p>Pressing Play loads YouTube\'s player (from youtube-nocookie.com). From then on YouTube, which is Google, can see your IP address and may store data in your browser. Nothing has loaded yet.</p>' +
      '<p class="yt-btns"><button type="button" class="btn" data-yt="ok">Play from YouTube</button>' +
      '<a class="btn" href="https://www.youtube.com/watch?v=' + encodeURIComponent(s.yt) + '" target="_blank" rel="noopener noreferrer">Open on youtube.com</a></p>' +
      '<label class="yt-remember"><input type="checkbox" data-yt-remember> Don\'t ask again until I close this tab</label></div>';
    $('[data-yt="ok"]', ui.video).addEventListener('click', function () {
      var r = $('[data-yt-remember]', ui.video);
      if (r && r.checked) { try { sessionStorage.setItem('yt-ok', '1'); } catch (e) {} }
      ytLoad(s, at);
    });
    setStatus('Waiting for you');
    draw();
  }
  /* videos from assets/video play in the screen, straight from this site */
  var vid = null;
  function vidFor(s) {
    if (!ui.video) return null;
    if (!vid || vid._u !== s.vid || !ui.video.contains(vid)) {
      ui.video.innerHTML = '';
      vid = document.createElement('video');
      vid.className = 'yt-frame';
      vid.preload = 'metadata';
      vid.playsInline = true;
      vid.setAttribute('playsinline', '');
      vid.src = s.vid;
      vid._u = s.vid;
      vid.volume = effVol();
      vid.muted = effVol() === 0;
      vid.title = s.t;
      vid.addEventListener('loadedmetadata', function () { var it = list[cur]; if (it.vid === this._u && isFinite(this.duration)) { it.dur = this.duration; draw(); } });
      vid.addEventListener('ended', function () { if (list[cur].vid === this._u) { playing = false; ended(); } });
      vid.addEventListener('error', function () { if (list[cur].vid === this._u) { playing = false; setStatus('Could not play ' + list[cur].t + '. Is it an H.264 .mp4?'); draw(); } });
      vid.addEventListener('click', function () { if (playing) pause(); else play(pos); });
      vid.addEventListener('dblclick', function () { if (this.requestFullscreen) this.requestFullscreen().catch(function () {}); });
      ui.video.appendChild(vid);
    }
    return vid;
  }
  function screenFor(s) {
    if (!ui.video) return;
    ui.screen.classList.toggle('video', !!(s.yt || s.vid));
    fitCompact();
    if (s.vid) { vidFor(s); return; }
    if (!s.yt) return;
    if (yt.frame && yt.id === s.yt) return;
    if (yt.asking === s.yt) return;
    ui.video.innerHTML = '<div class="yt-idle"><b>' + esc(s.t) + '</b><span>YouTube video. Press Play when you want it; nothing loads before that.</span></div>';
  }

  function now() {
    var s = list[cur];
    if (s.vid) return vid && vid._u === s.vid ? vid.currentTime : pos;
    if (s.yt) return yt.id === s.yt ? yt.time : pos;
    if (!playing) return pos;
    if (s.url) return mediaEl ? mediaEl.currentTime : 0;
    return ctx.currentTime - t0;
  }
  function fmt(x) { if (!isFinite(x) || x <= 0) return '0:00'; x = Math.floor(x); return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); }
  function pump() {
    var s = list[cur];
    if (!playing || s.url || s.yt) return;
    var horizon = ctx.currentTime + 0.15;
    while (idx < s.ev.length && s.ev[idx].t + t0 < horizon) {
      var e = s.ev[idx++], when = Math.max(ctx.currentTime, e.t + t0);
      if (e.drum) playDrum(e.drum, when);
      else playNote(e, when, s.synth.inst[e.ch]);
    }
    live = live.filter(function (x) { return x.u > ctx.currentTime; });
    if (ctx.currentTime - t0 >= s.dur) ended();
  }
  function play(at) {
    var s = list[cur];
    if (s.vid) {
      clearInterval(timer); timer = null; hush();
      if (mediaEl) mediaEl.pause();
      if (yt.frame || yt.asking) ytUnload();
      var v = vidFor(s);
      if (!v) return;
      pos = Math.max(0, at || 0);
      if (Math.abs(v.currentTime - pos) > 0.5) { try { v.currentTime = pos; } catch (e) {} }
      v.volume = effVol();
      v.muted = effVol() === 0;
      playing = true;
      var pr = v.play();
      if (pr && pr.catch) pr.catch(function (err) { playing = false; setStatus(err && err.name === 'NotAllowedError' ? 'Press Play to start.' : 'Could not play ' + s.t + '.'); draw(); });
      setStatus('Playing');
      draw();
      OS.log('info', 'Media Player', 1, 'Playing ' + s.t + '.');
      return;
    }
    if (s.yt) {
      clearInterval(timer); timer = null; hush();
      if (mediaEl) mediaEl.pause();
      pos = Math.max(0, at || 0);
      if (yt.frame && yt.id === s.yt) {
        if (at !== undefined && Math.abs(at - yt.time) > 1) ytCmd('seekTo', [at, true]);
        ytCmd('playVideo');
        playing = true;
        draw();
      } else if (ytRemembered()) ytLoad(s, pos);
      else ytAsk(s, pos);
      return;
    }
    if (!graph()) { OS.msg({ title: 'Media Player', icon: 'warn', text: 'This browser cannot play sound here.' }); return; }
    stopAll();
    pos = Math.max(0, at || 0);
    playing = true;
    if (s.url) {
      if (!mediaEl) {
        mediaEl = new Audio();
        mediaEl.preload = 'metadata';
        mediaSrc = ctx.createMediaElementSource(mediaEl);
        mediaSrc.connect(master);
        mediaEl.addEventListener('ended', ended);
        mediaEl.addEventListener('loadedmetadata', function () { var it = list[cur]; if (it.url && it.url === mediaEl._u) { it.dur = mediaEl.duration; draw(); } });
        mediaEl.addEventListener('error', function () { if (playing) { playing = false; draw(); setStatus('Could not play ' + list[cur].t + '.'); } });
      }
      if (mediaEl._u !== s.url) { mediaEl.src = s.url; mediaEl._u = s.url; }
      try { mediaEl.currentTime = pos; } catch (e) {}
      var p = mediaEl.play();
      if (p && p.catch) p.catch(function () { playing = false; draw(); setStatus('Could not play ' + s.t + '.'); });
    } else {
      t0 = ctx.currentTime + 0.06 - pos;
      idx = 0;
      while (idx < s.ev.length && s.ev[idx].t < pos) idx++;
      timer = setInterval(pump, 25);
      pump();
    }
    setStatus('Playing');
    draw();
    OS.log('info', 'Media Player', 1, 'Playing ' + s.t + '.');
    OS.emit('discover', 'music');
  }
  function stopAll() {
    clearInterval(timer); timer = null;
    hush();
    if (mediaEl) mediaEl.pause();
    if (vid) vid.pause();
    if (yt.frame || yt.asking) ytUnload();
  }
  function pause() {
    var s = list[cur];
    if (s.yt && yt.frame) { ytCmd('pauseVideo'); pos = yt.time; playing = false; setStatus('Paused'); draw(); return; }
    pos = now(); playing = false; stopAll(); setStatus('Paused'); draw();
  }
  var pickTimer = null;
  function stop() { clearTimeout(pickTimer); playing = false; pos = 0; stopAll(); if (vid) { try { vid.currentTime = 0; } catch (e) {} } setStatus('Stopped'); if (win) screenFor(list[cur]); draw(); }
  function go(i, autoplay) {
    clearTimeout(pickTimer);
    cur = (i + list.length) % list.length;
    pos = 0;
    stopAll();
    playing = false;
    if (win) screenFor(list[cur]);
    if (autoplay) play(0); else draw();
  }
  function next(auto) {
    if (shuffle && list.length > 1) { var j; do { j = Math.floor(Math.random() * list.length); } while (j === cur); go(j, true); return; }
    if (auto && !repeat && cur === list.length - 1) { stop(); return; }
    // a YouTube track still asks first (see play) unless the visitor said not to
    go(cur + 1, true);
  }
  function ended() { next(true); }
  function setStatus(t) { if (ui.status) ui.status.textContent = t; }

  /* ---------------- window ---------------- */
  function rows() {
    return list.map(function (s, i) {
      return '<li role="option" data-i="' + i + '" aria-selected="' + (i === cur) + '" tabindex="' + (i === cur ? 0 : -1) + '"' + (s.yt ? ' class="yt"' : '') + '>' +
        '<span class="n">' + (i + 1) + '.</span><span class="tt">' + esc(s.t) + '</span><span class="by">' + esc(s.by) + '</span><span class="du">' + (s.dur ? fmt(s.dur) : '--:--') + '</span></li>';
    }).join('');
  }
  var renderedKey = '';
  function listKey() {
    return list.map(function (s, i) { return i + ':' + s.t + ':' + (s.yt ? 1 : 0); }).join('|');
  }
  function syncList() {
    if (!ui.list) return;
    var k = listKey();
    if (k !== renderedKey) {
      ui.list.innerHTML = rows();
      renderedKey = k;
      return;
    }
    var lis = ui.list.querySelectorAll('li[data-i]');
    for (var i = 0; i < lis.length; i++) {
      var li = lis[i], s = list[i];
      li.setAttribute('aria-selected', String(i === cur));
      li.tabIndex = i === cur ? 0 : -1;
      var du = li.querySelector('.du');
      if (du && s) du.textContent = s.dur ? fmt(s.dur) : '--:--';
    }
  }
  function draw() {
    if (!win) return;
    var s = list[cur];
    ui.title.textContent = (cur + 1) + '. ' + s.t;
    ui.play.innerHTML = playing ? '<i class="g-pause"></i>' : '<i class="g-play"></i>';
    ui.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    ui.shuffle.setAttribute('aria-pressed', String(shuffle));
    ui.repeat.setAttribute('aria-pressed', String(repeat));
    syncList();
    ui.count.textContent = list.length + ' tracks';
    OS.setTitle(win, (playing ? s.t + ' - ' : '') + 'Media Player');
    tickUI();
  }
  function tickUI() {
    if (!win) return;
    var s = list[cur], n = now(), d = s.dur || (s.url && mediaEl && mediaEl._u === s.url ? mediaEl.duration : 0);
    ui.time.textContent = fmt(n) + ' / ' + (d ? fmt(d) : '--:--');
    if (ui.ytime) ui.ytime.textContent = s.yt || s.vid ? fmt(n) + ' / ' + (d ? fmt(d) : '--:--') : '';
    if (!ui.seeking) ui.seek.value = d ? Math.min(1000, Math.round(n / d * 1000)) : 0;
  }
  var raf = 0;
  function paint() {
    raf = requestAnimationFrame(paint);
    if (!win || win.el.classList.contains('minimized')) return;
    tickUI();
    if (list[cur].yt || list[cur].vid) return;
    var c = ui.canvas, g = c.getContext('2d');
    var W = c.width = c.clientWidth * (window.devicePixelRatio || 1), H = c.height = c.clientHeight * (window.devicePixelRatio || 1);
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.strokeStyle = g.fillStyle = '#62f2a0';
    if (!analyser || !playing) {
      g.globalAlpha = 0.5; g.fillRect(0, H / 2, W, Math.max(1, H / 90)); g.globalAlpha = 1;
      return;
    }
    if (mode === 0) {
      var f = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(f);
      var bars = 40, bw = W / bars;
      for (var i = 0; i < bars; i++) {
        var v = f[Math.floor(Math.pow(i / bars, 1.6) * f.length * 0.7)] / 255, h = Math.max(2, v * H * 0.92);
        for (var y = H - 3; y > H - h; y -= 5 * (window.devicePixelRatio || 1)) g.fillRect(i * bw + 1, y - 3, bw - 2, 3 * (window.devicePixelRatio || 1));
      }
    } else {
      var w = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(w);
      g.lineWidth = 2 * (window.devicePixelRatio || 1);
      g.beginPath();
      for (var j = 0; j < w.length; j++) { var x = j / (w.length - 1) * W, yy = (w[j] / 255) * H; if (j) g.lineTo(x, yy); else g.moveTo(x, yy); }
      g.stroke();
    }
  }
  function openUrl() {
    OS.msg({
      title: 'Open URL', icon: 'player',
      text: 'Paste a YouTube link. It is added to this playlist until you close the tab, and nothing loads from YouTube until you press Play.',
      html: '<label class="run-row"><span>URL:</span><input class="field sunken" id="mp-url" spellcheck="false" autocapitalize="off" placeholder="https://www.youtube.com/watch?v=..."></label>',
      buttons: ['Add', 'Cancel'],
      onDone: function (i, bg) { if (i === 0) openUrl.v = bg.querySelector('#mp-url').value; }
    }).then(function (i) {
      if (i !== 0 || !openUrl.v || !openUrl.v.trim()) return;
      var id = ytIdFrom(openUrl.v);
      if (!id) {
        OS.sound('error');
        OS.msg({ title: 'Open URL', icon: 'warn', text: 'That doesn\'t look like a YouTube video link.\n\nThese work: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...' });
        return;
      }
      var at = -1;
      list.forEach(function (s, j) { if (s.yt === id) at = j; });
      if (at === -1) { list.push({ t: 'YouTube video ' + id, by: 'YouTube (yours)', yt: id, dur: 0, auto: true }); at = list.length - 1; }
      go(at, true);
    });
  }

  var lastVol = vol;
  function effVol() {
    var sys = OS.effectiveVolume ? OS.effectiveVolume() : (OS.soundOn() ? 1 : 0);
    return Math.max(0, Math.min(1, vol * sys));
  }
  function applyOutputVol() {
    var g = effVol();
    if (master) master.gain.value = g;
    if (vid) { vid.volume = g; vid.muted = g === 0; }
    if (yt.frame) {
      ytCmd(g === 0 ? 'mute' : 'unMute');
      ytCmd('setVolume', [Math.round(g * 100)]);
    }
    if (ui.mute) {
      var muted = g === 0;
      ui.mute.setAttribute('aria-pressed', String(muted));
      ui.mute.title = vol === 0 ? 'Unmute player' : muted ? 'System muted in taskbar tray' : 'Mute player';
      var u = ui.mute.querySelector('use');
      if (u) u.setAttribute('href', muted ? '#i-mute' : '#i-speaker');
    }
  }
  function setVol(v) {
    vol = Math.max(0, Math.min(1, v));
    if (vol > 0) lastVol = vol;
    if (ui.vol) ui.vol.value = String(Math.round(vol * 100));
    applyOutputVol();
  }
  OS.on('volume', applyOutputVol);
  OS.on('sound', applyOutputVol);

  OS.player = { playing: function () { return playing; }, pause: function () { if (playing) pause(); } };
  // right after log on, Media Player opens on the default track. Your own
  // video starts playing (the log-on click lets the browser allow sound);
  // a YouTube one waits for Play, since it asks before loading.
  // compact: a small floating player with the video and the main buttons;
  // drag it by its title bar (phones too)
  var full = null, sideBr = null;
  function releaseSideBr() {
    if (!sideBr) return;
    if (!sideBr.hasAttribute('data-pinned') && !sideBr.classList.contains('maximized')) sideBr.style.width = '';
    sideBr = null;
  }
  function fitBesideBrowser(allowCompact) {
    if (!win || OS.phone.matches || win.el.classList.contains('compact')) return;
    releaseSideBr();
    var br = document.querySelector('.win-app[data-app="browser"]:not(.minimized)');
    var r1 = br && br.getBoundingClientRect(), r2 = win.el.getBoundingClientRect();
    if (r1 && r2.left < r1.right && r2.right > r1.left && r2.top < r1.bottom && r2.bottom > r1.top && !br.classList.contains('maximized') && !br.hasAttribute('data-pinned')) {
      var room = Math.floor(r2.left - 8 - r1.left);
      if (room >= 640) { br.style.width = room + 'px'; sideBr = br; }
      else if (allowCompact) setCompact(true);
    }
  }
  // keep the compact player on screen when its video area changes size
  function fitCompact() {
    if (!win || !win.el.classList.contains('compact')) return;
    var el = win.el, desk = document.getElementById('desktop');
    var maxL = desk.clientWidth - el.offsetWidth - 8, maxT = desk.clientHeight - el.offsetHeight - 8;
    if (el.offsetLeft > maxL) el.style.left = Math.max(0, maxL) + 'px';
    if (el.offsetTop > maxT) el.style.top = Math.max(0, maxT) + 'px';
  }
  function setCompact(on) {
    if (!win) return;
    var el = win.el, desk = document.getElementById('desktop');
    if (on === el.classList.contains('compact')) return;
    if (on) {
      releaseSideBr();
      full = { l: el.style.left, t: el.style.top, w: el.style.width, h: el.style.height, p: el.getAttribute('data-pinned') };
      el.classList.remove('maximized');
      el.classList.add('compact');
      el.style.width = ''; el.style.height = '';
      el.style.left = Math.max(0, desk.clientWidth - el.offsetWidth - 8) + 'px';
      el.style.top = Math.max(0, desk.clientHeight - el.offsetHeight - 8) + 'px';
      el.setAttribute('data-pinned', '1');
    } else {
      el.classList.remove('compact');
      el.style.left = full ? full.l : ''; el.style.top = full ? full.t : ''; el.style.width = full ? full.w : ''; el.style.height = full ? full.h : '';
      if (!full || !full.p) el.removeAttribute('data-pinned');
      fitBesideBrowser(false);
    }
    var b = el.querySelector('[data-p="mini"]');
    if (b) { b.textContent = on ? 'Full' : 'Mini'; b.setAttribute('aria-pressed', String(on)); b.title = on ? 'Full player' : 'Compact player'; }
  }
  OS.player.compact = setCompact;
  window.addEventListener('resize', function () { fitCompact(); fitBesideBrowser(false); });
  OS.on('login', function () {
    setTimeout(function () {
      if (win) return;
      cur = first;
      OS.apps.player();
      // phones get the small floating player; desktops open full when Browser keeps >=640px beside it, else compact
      if (OS.phone.matches) setCompact(true);
      else fitBesideBrowser(true);
      if (list[cur] && list[cur].vid) play(0);
    }, 1200);
  });
  OS.apps.player = function (from) {
    if (win) { OS.restore(win); return; }
    renderedKey = '';
    win = OS.makeWindow('player', 'Media Player',
      '<div class="win-body player-body">' +
        '<div class="player-screen"><canvas aria-hidden="true" title="Click to change the view"></canvas><div class="lcd"><span data-title></span><span data-time>0:00</span></div><div class="player-video"></div></div>' +
        '<input class="slider" type="range" min="0" max="1000" value="0" aria-label="Position" data-seek>' +
        '<div class="player-ctrls">' +
          '<button type="button" class="btn tool" data-p="prev" aria-label="Previous"><i class="g-prev"></i></button>' +
          '<button type="button" class="btn tool" data-p="play" aria-label="Play"><i class="g-play"></i></button>' +
          '<button type="button" class="btn tool" data-p="stop" aria-label="Stop"><i class="g-stop"></i></button>' +
          '<button type="button" class="btn tool" data-p="next" aria-label="Next"><i class="g-next"></i></button>' +
          '<button type="button" class="btn tool" data-p="mini" title="Compact player" aria-pressed="false">Mini</button>' +
          '<span class="yt-time" data-ytime></span><span class="sp"></span>' +
          '<button type="button" class="btn tool" data-p="shuffle" aria-pressed="false">Shuffle</button>' +
          '<button type="button" class="btn tool" data-p="repeat" aria-pressed="true">Repeat</button>' +
          '<span class="vol"><button type="button" class="tray-btn" data-p="mute" aria-label="Mute player" title="Mute player">' + OS.svg(effVol() === 0 ? 'mute' : 'speaker') + '</button><input class="slider" type="range" min="0" max="100" value="' + Math.round(vol * 100) + '" aria-label="Volume" data-vol></span>' +
        '</div>' +
        '<ul class="playlist sunken" role="listbox" aria-label="Playlist"></ul>' +
        '<div class="player-foot"><button type="button" class="btn small" data-p="open">Open…</button><button type="button" class="btn small" data-p="url">Open URL…</button><input type="file" accept="audio/*" multiple hidden data-file>' +
          '<span class="dim">Your own files play here and are not uploaded. YouTube links load only when you press Play.</span></div>' +
      '</div>' +
      '<div class="statusline"><span class="seg grow" data-status>Stopped</span><span class="seg" data-count></span></div>', { from: from, noMax: true });
    var el = win.el;
    ui = { canvas: $('canvas', el), title: $('[data-title]', el), time: $('[data-time]', el), seek: $('[data-seek]', el),
      play: $('[data-p="play"]', el), shuffle: $('[data-p="shuffle"]', el), repeat: $('[data-p="repeat"]', el),
      list: $('.playlist', el), status: $('[data-status]', el), file: $('[data-file]', el), count: $('[data-count]', el),
      screen: $('.player-screen', el), video: $('.player-video', el), ytime: $('[data-ytime]', el),
      vol: $('[data-vol]', el), mute: $('[data-p="mute"]', el) };
    applyOutputVol();
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-p]');
      if (!b) return;
      var p = b.getAttribute('data-p');
      if (p === 'play') { if (playing) pause(); else play(pos); }
      else if (p === 'stop') stop();
      else if (p === 'next') next(false);
      else if (p === 'prev') { if (now() > 3) play(0); else go(cur - 1, playing); }
      else if (p === 'shuffle') { shuffle = !shuffle; draw(); }
      else if (p === 'repeat') { repeat = !repeat; draw(); }
      else if (p === 'mute') {
        if (effVol() > 0) setVol(0);
        else {
          if (vol === 0) setVol(lastVol || 0.8);
          if (OS.effectiveVolume && OS.effectiveVolume() === 0) OS.setSound(true);
        }
      }
      else if (p === 'open') ui.file.click();
      else if (p === 'url') openUrl();
      else if (p === 'mini') setCompact(!win.el.classList.contains('compact'));
    });
    el.addEventListener('keydown', function (e) {
      if (e.target.closest('input, button, [role="option"]')) return;
      if (e.key === ' ') { e.preventDefault(); if (playing) pause(); else play(pos); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var s = list[cur], d = s.dur || (mediaEl && mediaEl.duration) || 0;
        if (!d) return;
        e.preventDefault();
        var at = Math.max(0, Math.min(d, now() + (e.key === 'ArrowRight' ? 5 : -5)));
        if (s.yt) { if (yt.frame) { ytCmd('seekTo', [at, true]); yt.time = at; } else pos = at; }
        else if (s.vid) { var v = vidFor(s); if (v) { try { v.currentTime = at; } catch (x) {} } pos = at; }
        else if (playing) play(at); else pos = at;
        tickUI();
      }
    });
    ui.canvas.addEventListener('click', function () { mode = (mode + 1) % 2; });
    ui.list.addEventListener('click', function (e) {
      var r = e.target.closest('[data-i]');
      if (!r) return;
      var i = +r.getAttribute('data-i');
      if (i === cur) return;
      clearTimeout(pickTimer);
      var wasVid = !!(list[cur] && (list[cur].vid || list[cur].yt));
      var nowVid = !!(list[i] && (list[i].vid || list[i].yt));
      if (!playing && wasVid !== nowVid) {
        cur = i; pos = 0; stopAll(); draw();
        pickTimer = setTimeout(function () { if (win) { screenFor(list[cur]); draw(); } }, 260);
      } else {
        go(i, playing);
      }
    });
    ui.list.addEventListener('dblclick', function (e) {
      clearTimeout(pickTimer);
      var r = e.target.closest('[data-i]');
      if (r) go(+r.getAttribute('data-i'), true);
    });
    ui.list.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); go(cur + (e.key === 'ArrowDown' ? 1 : -1), false); var r = $('[aria-selected="true"]', ui.list); if (r) r.focus(); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(0); }
    });
    ui.seek.addEventListener('input', function () { ui.seeking = true; });
    ui.seek.addEventListener('change', function () {
      ui.seeking = false;
      var s = list[cur], d = s.dur || (mediaEl && mediaEl.duration) || 0;
      var at = +ui.seek.value / 1000 * d;
      if (s.yt) { if (yt.frame) { ytCmd('seekTo', [at, true]); yt.time = at; } else pos = at; tickUI(); return; }
      if (s.vid) { var v = vidFor(s); if (v) { try { v.currentTime = at; } catch (x) {} } pos = at; tickUI(); return; }
      if (playing) play(at); else { pos = at; tickUI(); }
    });
    ui.vol.addEventListener('input', function (e) { setVol(+e.target.value / 100); });
    ui.file.addEventListener('change', function () {
      var first = list.length;
      Array.prototype.forEach.call(ui.file.files, function (f) {
        list.push({ t: f.name.replace(/\.[a-z0-9]+$/i, ''), by: 'your file', url: URL.createObjectURL(f), dur: 0 });
      });
      ui.file.value = '';
      if (list.length > first) go(first, true);
    });
    screenFor(list[cur]);
    draw();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(paint);
  };
  OS.on('close', function (w) {
    if (!win || w !== win) return;
    win = null;
    releaseSideBr();
    stop();
    cancelAnimationFrame(raf);
    ui = {};
    vid = null;
  });
})();
