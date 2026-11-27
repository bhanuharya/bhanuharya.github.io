/* obscuraOS: Packet Capture.
   A real capture of the HTTP traffic this computer makes: every page,
   script, image, search index and video frame, read from the browser's
   own Resource Timing records as they happen. Selecting a packet fetches
   it again from the browser cache (same site only) to show its response
   headers and its actual bytes. Nothing leaves the browser; Save writes
   a .har file you can open in any browser's developer tools. */
(function () {
  'use strict';
  var OS = window.OS;
  if (!OS) return;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = OS.esc;

  var packets = [], seen = {}, skip = {}, insp = {};
  var capturing = true, startT = 0, win = null, ui = null, filt = null, sel = null;
  var REASON = { 200: 'OK', 201: 'Created', 204: 'No Content', 206: 'Partial Content', 301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect', 400: 'Bad Request', 403: 'Forbidden', 404: 'Not Found', 429: 'Too Many Requests', 500: 'Internal Server Error', 503: 'Service Unavailable' };
  var PROTO = { h2: 'HTTP/2', h3: 'HTTP/3', 'http/1.1': 'HTTP/1.1', 'http/1.0': 'HTTP/1.0' };

  function ms(x) { return (Math.round(x * 10) / 10).toFixed(1) + ' ms'; }
  function bytes(n) { return n < 1024 ? n + ' bytes' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; }
  function kind(e) {
    if (e.entryType === 'navigation') return 'document';
    var t = e.initiatorType || 'other';
    return t === 'xmlhttprequest' ? 'fetch' : t;
  }
  function toPacket(e) {
    var u = new URL(e.name);
    var method = (OS._methods && OS._methods[e.name]) || (/\/search\.json\?ping=/.test(e.name) ? 'HEAD' : 'GET');
    var p = {
      e: e, t: e.startTime, url: e.name, host: u.host, path: u.pathname + u.search, method: method,
      third: u.origin !== location.origin, type: kind(e),
      proto: PROTO[e.nextHopProtocol] || (e.nextHopProtocol ? e.nextHopProtocol.toUpperCase() : 'HTTP'),
      status: e.responseStatus || 0, len: e.transferSize || 0, size: e.decodedBodySize || e.encodedBodySize || 0,
      dur: e.duration, cached: !e.transferSize && (e.decodedBodySize > 0 || e.encodedBodySize > 0)
    };
    p.cls = p.status >= 400 ? 'r-err' : p.third ? 'r-third' : p.type === 'document' || p.type === 'fetch' || p.type === 'iframe' ? 'r-doc' : p.type === 'script' || p.type === 'link' || p.type === 'css' ? 'r-code' : 'r-media';
    return p;
  }
  function info(p) {
    var s = (p.method || 'GET') + ' ' + p.path;
    if (p.status) s += '  →  ' + p.status + ' ' + (REASON[p.status] || '');
    if (p.cached) s += '  (from cache)';
    return s;
  }

  /* ---------------- capturing ---------------- */
  function ingest(e) {
    if (!/^https?:/.test(e.name)) return;
    var k = e.name + '|' + e.startTime.toFixed(3);
    if (seen[k]) return;
    seen[k] = 1;
    if (skip[e.name] && (e.initiatorType === 'fetch')) { skip[e.name]--; return; } // our own look at a packet
    if (!capturing || e.startTime < startT) return;
    var p = toPacket(e);
    p.n = packets.length + 1;
    packets.push(p);
    if (ui) addRow(p, true);
  }
  function ingestAll() {
    try { performance.getEntriesByType('navigation').concat(performance.getEntriesByType('resource')).forEach(ingest); } catch (e) {}
    status();
  }
  try {
    new PerformanceObserver(function (list) { list.getEntries().forEach(ingest); status(); }).observe({ type: 'resource' });
  } catch (e) {}
  ingestAll();

  /* ---------------- display filter ----------------
     fields: n time host path url proto type status len size dur cached third
     ops: == != contains matches > < >= <=   joined by && || !  (and or not)
     a bare word matches the URL */
  function compile(src) {
    var toks = [], re = /\s*(?:("(?:[^"\\]|\\.)*")|(&&|\|\||==|!=|>=|<=|[()!<>])|([\w.\/:%\-]+))/y, m, i = 0;
    src = src.trim();
    if (!src) return null;
    re.lastIndex = 0;
    while (re.lastIndex < src.length) {
      var at = re.lastIndex;
      m = re.exec(src);
      if (!m || re.lastIndex === at) throw new Error('bad input near "' + src.slice(at, at + 10) + '"');
      if (m[1]) toks.push({ s: JSON.parse(m[1]) });
      else if (m[2]) toks.push({ o: m[2] });
      else toks.push({ w: m[3] });
      if (/^\s*$/.test(src.slice(re.lastIndex))) break;
    }
    var FIELDS = ['n', 'time', 'host', 'path', 'url', 'proto', 'type', 'status', 'len', 'size', 'dur', 'cached', 'third'];
    var get = function (p, f) {
      if (f === 'time') return (p.t - startT) / 1000;
      if (f === 'proto') return p.proto.toLowerCase();
      return p[f];
    };
    var peek = function () { return toks[i]; };
    var isOp = function (t, o) { return t && (t.o === o || (t.w && t.w.toLowerCase() === o)); };
    var val = function () {
      var t = toks[i++];
      if (!t) throw new Error('missing value');
      if (t.s !== undefined) return t.s;
      if (t.w !== undefined) return /^-?\d+(\.\d+)?$/.test(t.w) ? +t.w : t.w;
      throw new Error('missing value');
    };
    var primary = function () {
      var t = peek();
      if (!t) throw new Error('missing condition');
      if (t.o === '(') { i++; var e = or(); if (!toks[i] || toks[i].o !== ')') throw new Error('missing )'); i++; return e; }
      if (t.s !== undefined) { i++; var str = t.s.toLowerCase(); return function (p) { return p.url.toLowerCase().indexOf(str) !== -1; }; }
      if (t.w === undefined) throw new Error('unexpected ' + (t.o || ''));
      i++;
      var f = t.w.toLowerCase();
      if (FIELDS.indexOf(f) === -1) { return function (p) { return p.url.toLowerCase().indexOf(f) !== -1; }; }
      var o = peek();
      var op = o && (o.o || (o.w && /^(contains|matches)$/i.test(o.w) ? o.w.toLowerCase() : null));
      if (!op || op === '(' || op === ')' || op === '!' || op === '&&' || op === '||') return function (p) { return !!get(p, f); };
      i++;
      var v = val();
      if (op === 'contains') { v = String(v).toLowerCase(); return function (p) { return String(get(p, f)).toLowerCase().indexOf(v) !== -1; }; }
      if (op === 'matches') { var rx = new RegExp(String(v), 'i'); return function (p) { return rx.test(String(get(p, f))); }; }
      if (typeof v === 'string') v = v.toLowerCase();
      return function (p) {
        var a = get(p, f);
        if (typeof a === 'string') a = a.toLowerCase();
        if (typeof a === 'boolean') a = a ? 1 : 0;
        if (v === 'true' || v === 'false') v = v === 'true' ? 1 : 0;
        switch (op) { case '==': return a == v; case '!=': return a != v; case '>': return a > v; case '<': return a < v; case '>=': return a >= v; case '<=': return a <= v; }
        return false;
      };
    };
    var not = function () { if (isOp(peek(), '!') || isOp(peek(), 'not')) { i++; var e = not(); return function (p) { return !e(p); }; } return primary(); };
    var and = function () { var e = not(); while (isOp(peek(), '&&') || isOp(peek(), 'and')) { i++; var a = e, b = not(); e = function (p) { return a(p) && b(p); }; } return e; };
    var or = function () { var e = and(); while (isOp(peek(), '||') || isOp(peek(), 'or')) { i++; var a = e, b = and(); e = function (p) { return a(p) || b(p); }; } return e; };
    var fn = or();
    if (i < toks.length) throw new Error('unexpected "' + (toks[i].w || toks[i].o || toks[i].s) + '"');
    return fn;
  }

  /* ---------------- the window ---------------- */
  function addRow(p, live) {
    var tr = document.createElement('tr');
    tr.className = 'pk ' + p.cls;
    tr.tabIndex = 0;
    tr._p = p;
    tr.innerHTML = '<td class="num">' + p.n + '</td><td class="col-time">' + ((p.t - startT) / 1000).toFixed(3) + '</td><td class="col-src">client</td><td class="col-dst">' + esc(p.host) + '</td><td>' + esc(p.proto) + '</td><td class="num col-len">' + (p.len || p.size) + '</td><td class="info">' + esc(info(p)) + '</td>';
    tr.hidden = !!(filt && !filt(p));
    var list = ui.list, atEnd = list.scrollTop + list.clientHeight >= list.scrollHeight - 8;
    ui.rows.appendChild(tr);
    if (live && atEnd && !tr.hidden) list.scrollTop = list.scrollHeight;
  }
  function status() {
    if (!ui) return;
    var shown = $$('tr.pk:not([hidden])', ui.rows).length;
    ui.count.textContent = 'Packets: ' + packets.length + ' · Displayed: ' + shown;
    ui.led.className = 'seg cap-led' + (capturing ? ' on' : '');
    ui.led.title = capturing ? 'Capturing' : 'Stopped';
    ui.state.textContent = capturing ? 'Capturing from this browser. Every request this computer makes appears here as it happens.' : 'Capture stopped.';
    ui.start.disabled = capturing;
    ui.stop.disabled = !capturing;
  }
  function applyFilter(text) {
    var input = ui.input;
    try {
      filt = compile(text);
      input.classList.remove('bad');
      input.classList.toggle('ok', !!filt);
      ui.err.textContent = '';
    } catch (err) {
      filt = null;
      input.classList.remove('ok');
      input.classList.add('bad');
      ui.err.textContent = err.message;
      return;
    }
    $$('tr.pk', ui.rows).forEach(function (tr) { tr.hidden = !!(filt && !filt(tr._p)); });
    status();
  }
  function inspect(p) {
    if (p.third) return Promise.resolve(null);
    if (insp[p.url]) return Promise.resolve(insp[p.url]);
    skip[p.url] = (skip[p.url] || 0) + 1;
    return fetch(p.url, { cache: 'force-cache', credentials: 'same-origin' }).then(function (r) {
      var h = [];
      r.headers.forEach(function (v, k) { h.push([k, v]); });
      return r.arrayBuffer().then(function (buf) {
        insp[p.url] = { status: r.status, text: r.statusText, headers: h, bytes: new Uint8Array(buf), type: r.headers.get('content-type') || '' };
        return insp[p.url];
      });
    }).catch(function () { return null; });
  }
  function hexdump(b, max) {
    var out = [], n = Math.min(b.length, max);
    for (var o = 0; o < n; o += 16) {
      var hex = '', asc = '';
      for (var j = 0; j < 16; j++) {
        if (o + j < n) { var c = b[o + j]; hex += (c < 16 ? '0' : '') + c.toString(16) + ' '; asc += c >= 32 && c < 127 ? String.fromCharCode(c) : '.'; }
        else hex += '   ';
        if (j === 7) hex += ' ';
      }
      out.push('<span class="off">' + ('0000' + o.toString(16)).slice(-4) + '</span>  ' + hex + ' ' + esc(asc));
    }
    if (b.length > max) out.push('<span class="off">... ' + (b.length - max) + ' more bytes</span>');
    return out.join('\n');
  }
  function kv(k, v) { return '<div class="kv"><b>' + esc(k) + ':</b> ' + esc(v) + '</div>'; }
  function select(p) {
    sel = p;
    $$('tr.pk', ui.rows).forEach(function (tr) { tr.classList.toggle('on', tr._p === p); });
    var e = p.e, tim = e.requestStart > 0;
    var html = '<details open><summary>Frame ' + p.n + ': ' + bytes(p.len) + ' on wire, ' + bytes(p.size) + ' decoded' + (p.cached ? ', from cache' : '') + '</summary>' +
      kv('Arrival time', new Date(performance.timeOrigin + e.startTime).toLocaleTimeString('en-GB') + '.' + String(Math.floor((performance.timeOrigin + e.startTime) % 1000)).padStart(3, '0')) +
      kv('Time since capture start', ((p.t - startT) / 1000).toFixed(3) + ' s') +
      kv('Duration', ms(e.duration)) + '</details>';
    html += '<details open><summary>Timing</summary>' + (tim ?
      (e.redirectEnd ? kv('Redirect', ms(e.redirectEnd - e.redirectStart)) : '') +
      kv('DNS lookup', ms(e.domainLookupEnd - e.domainLookupStart)) +
      kv('TCP connect', ms((e.secureConnectionStart > 0 ? e.secureConnectionStart : e.connectEnd) - e.connectStart)) +
      (e.secureConnectionStart > 0 ? kv('TLS handshake', ms(e.connectEnd - e.secureConnectionStart)) : '') +
      kv('Waiting (first byte)', ms(e.responseStart - e.requestStart)) +
      kv('Content download', ms(e.responseEnd - e.responseStart)) +
      (e.connectStart === e.connectEnd ? kv('Connection', 'reused') : '') :
      '<div class="kv">' + (p.third ? 'Hidden by the other site (no Timing-Allow-Origin header).' : p.cached ? 'Served from cache: no network timing.' : 'Not available.') + '</div>') + '</details>';
    html += '<details open><summary>' + esc(p.proto) + ', ' + (p.third ? 'other site' : 'this site') + ': ' + esc(p.host) + '</summary>' +
      kv('Request', (p.method || 'GET') + ' ' + p.path) + kv('Initiator', p.type + (e.renderBlockingStatus === 'blocking' ? ' (blocked rendering)' : '')) +
      (p.status ? kv('Status', p.status + ' ' + (REASON[p.status] || '')) : '') + '<div class="hdrs"></div></details>';
    if (!p.third && p.type === 'document') html += '<div class="follow"><a href="' + esc(p.path) + '">Open in Browser →</a></div>';
    ui.tree.innerHTML = html;
    ui.hex.innerHTML = p.third ? '<span class="off">Bytes from other sites are not readable from this page.</span>' : '<span class="off">Reading from cache...</span>';
    inspect(p).then(function (r) {
      if (sel !== p || !ui) return;
      var box = $('.hdrs', ui.tree);
      if (!r) { if (!p.third) ui.hex.innerHTML = '<span class="off">Could not read this one again.</span>'; return; }
      box.innerHTML = '<details><summary>Response headers (' + r.headers.length + ')</summary>' + r.headers.map(function (h) { return kv(h[0], h[1]); }).join('') + '</details>';
      ui.hex.innerHTML = hexdump(r.bytes, 4096);
    });
  }
  function follow(p) {
    p = p || sel;
    if (!p) { OS.msg({ title: 'Follow HTTP Stream', icon: 'warn', text: 'Select a packet first.' }); return; }
    var w = OS.find('stream');
    var body = '<div class="win-body stream-body sunken"><pre class="stream"></pre></div><div class="statusline"><span class="seg grow" data-st></span></div>';
    if (!w) w = OS.makeWindow('stream', 'Follow HTTP Stream', body);
    else OS.restore(w);
    OS.setTitle(w, 'Follow HTTP Stream (' + p.path.slice(0, 40) + ')');
    OS.emit('discover', 'capture');
    var pre = $('.stream', w.el), st = $('[data-st]', w.el);
    pre.innerHTML = '<span class="req">' + esc(p.method || 'GET') + ' ' + esc(p.path) + ' ' + esc(p.proto) + '\nHost: ' + esc(p.host) + '\n(the browser does not let pages read the other request headers)\n\n</span><span class="dim">Reading...</span>';
    inspect(p).then(function (r) {
      if (!r) { pre.lastChild.textContent = p.third ? 'The response came from another site and is not readable from this page.' : 'Could not read the response again.'; return; }
      var textual = /text|json|javascript|xml|svg|css/.test(r.type);
      var res = (p.proto === 'HTTP/1.1' || p.proto === 'HTTP/1.0' ? p.proto : 'HTTP/1.1') + ' ' + r.status + ' ' + (r.text || REASON[r.status] || '') + '\n' +
        r.headers.map(function (h) { return h[0] + ': ' + h[1]; }).join('\n') + '\n\n';
      var bodyText = textual ? new TextDecoder().decode(r.bytes.subarray(0, 60000)) + (r.bytes.length > 60000 ? '\n[... ' + (r.bytes.length - 60000) + ' more bytes]' : '') : '[' + r.bytes.length + ' bytes of ' + (r.type || 'binary data') + ']';
      pre.removeChild(pre.lastChild);
      var span = document.createElement('span');
      span.className = 'res';
      span.textContent = res + bodyText;
      pre.appendChild(span);
      st.textContent = 'Client to server in red, server to client in blue · ' + r.bytes.length + ' bytes of body';
    });
  }
  function stats() {
    var by = {}, types = {}, total = 0, wire = 0, cached = 0;
    packets.forEach(function (p) {
      by[p.host] = by[p.host] || { n: 0, b: 0, d: 0 };
      by[p.host].n++; by[p.host].b += p.len; by[p.host].d += p.dur;
      types[p.type] = (types[p.type] || 0) + 1;
      total += p.size; wire += p.len; if (p.cached) cached++;
    });
    var span = packets.length ? (packets[packets.length - 1].t - packets[0].t) / 1000 : 0;
    OS.msg({
      title: 'Statistics', icon: 'capture',
      text: packets.length + ' packets over ' + span.toFixed(1) + ' s. ' + bytes(wire) + ' on the wire, ' + bytes(total) + ' after decoding, ' + cached + ' from cache.',
      html: '<table class="stat-table"><thead><tr><th>Address</th><th class="num">Packets</th><th class="num">On wire</th><th class="num">Avg time</th></tr></thead><tbody>' +
        Object.keys(by).map(function (h) { return '<tr><td>' + esc(h) + '</td><td class="num">' + by[h].n + '</td><td class="num">' + bytes(by[h].b) + '</td><td class="num">' + ms(by[h].d / by[h].n) + '</td></tr>'; }).join('') +
        '</tbody></table><p class="stat-types">' + Object.keys(types).map(function (t) { return esc(t) + ': ' + types[t]; }).join(' · ') + '</p>'
    });
  }
  function saveHar() {
    var entries = packets.map(function (p) {
      var e = p.e, r = insp[p.url], d = function (a, b) { return a > 0 && b > 0 ? Math.max(0, b - a) : -1; };
      return {
        startedDateTime: new Date(performance.timeOrigin + e.startTime).toISOString(), time: e.duration,
        request: { method: 'GET', url: p.url, httpVersion: p.proto, cookies: [], headers: [], queryString: [], headersSize: -1, bodySize: 0 },
        response: { status: p.status || (r ? r.status : 0), statusText: REASON[p.status] || '', httpVersion: p.proto, cookies: [],
          headers: r ? r.headers.map(function (h) { return { name: h[0], value: h[1] }; }) : [],
          content: { size: e.decodedBodySize || 0, mimeType: r ? r.type : '' }, redirectURL: '', headersSize: -1, bodySize: e.encodedBodySize || 0 },
        cache: {}, _initiator: p.type,
        timings: { blocked: -1, dns: d(e.domainLookupStart, e.domainLookupEnd), connect: d(e.connectStart, e.connectEnd), ssl: e.secureConnectionStart > 0 ? d(e.secureConnectionStart, e.connectEnd) : -1, send: 0, wait: d(e.requestStart, e.responseStart), receive: d(e.responseStart, e.responseEnd) }
      };
    });
    var har = { log: { version: '1.2', creator: { name: 'obscuraOS Packet Capture', version: OS.data.build || '1' }, pages: [], entries: entries } };
    var blob = new Blob([JSON.stringify(har, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'), stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
    a.href = URL.createObjectURL(blob);
    a.download = 'obscura-capture-' + stamp + '.har';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1000);
    OS.log('info', 'Packet Capture', 3, 'Saved ' + entries.length + ' packets as ' + a.download + '.');
  }

  OS.apps.capture = function (from) {
    if (win) { OS.restore(win); return; }
    win = OS.makeWindow('capture', 'Packet Capture',
      '<div class="toolbar cap-bar">' +
        '<button type="button" class="btn tool" data-c="start"><i class="g-rec"></i> Start</button>' +
        '<button type="button" class="btn tool" data-c="stop"><i class="g-stop"></i> Stop</button>' +
        '<button type="button" class="btn tool" data-c="restart">Restart</button>' +
        '<button type="button" class="btn tool" data-c="follow">Follow Stream</button>' +
        '<button type="button" class="btn tool" data-c="stats">Statistics</button>' +
        '<button type="button" class="btn tool" data-c="save">Save .har</button>' +
      '</div>' +
      '<form class="filterbar cap-filter" role="search" autocomplete="off"><label for="cap-f"><u>F</u>ilter:</label>' +
        '<input class="filter-input sunken" id="cap-f" spellcheck="false" autocapitalize="off" placeholder="type == script, status >= 400, host contains youtube, or a word">' +
        '<button class="btn small" type="submit">Apply</button><button class="btn small" type="button" data-c="clear">Clear</button>' +
        '<span class="cap-err" aria-live="polite"></span></form>' +
      '<div class="win-body capture-body">' +
        '<div class="packet-list sunken"><table class="packets cap-table" aria-label="Captured packets"><thead><tr><th class="num" scope="col">No.</th><th class="col-time" scope="col">Time</th><th class="col-src" scope="col">Source</th><th class="col-dst" scope="col">Destination</th><th scope="col">Protocol</th><th class="num col-len" scope="col">Length</th><th scope="col">Info</th></tr></thead><tbody></tbody></table></div>' +
        '<div class="panes"><div class="tree sunken" aria-live="polite"><p class="dim">Select a packet to see its layers.</p></div><div class="hex sunken"></div></div>' +
      '</div>' +
      '<div class="statusline"><span class="seg cap-led" aria-hidden="true"></span><span class="seg grow" data-cap-state></span><span class="seg" data-cap-count></span></div>', { from: from });
    var el = win.el;
    ui = { rows: $('tbody', el), list: $('.packet-list', el), tree: $('.tree', el), hex: $('.hex', el), input: $('#cap-f', el), err: $('.cap-err', el),
      count: $('[data-cap-count]', el), state: $('[data-cap-state]', el), led: $('.cap-led', el), start: $('[data-c="start"]', el), stop: $('[data-c="stop"]', el) };
    packets.forEach(function (p) { addRow(p, false); });
    ui.list.scrollTop = ui.list.scrollHeight;
    status();
    $('.cap-filter', el).addEventListener('submit', function (e) { e.preventDefault(); applyFilter(ui.input.value); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]');
      if (!b) return;
      var c = b.getAttribute('data-c');
      if (c === 'start') { capturing = true; OS.log('info', 'Packet Capture', 1, 'Capture started.'); status(); }
      else if (c === 'stop') { capturing = false; OS.log('info', 'Packet Capture', 2, 'Capture stopped after ' + packets.length + ' packets.'); status(); }
      else if (c === 'restart') { packets = []; startT = performance.now(); sel = null; ui.rows.innerHTML = ''; ui.tree.innerHTML = '<p class="dim">Select a packet to see its layers.</p>'; ui.hex.innerHTML = ''; capturing = true; status(); }
      else if (c === 'follow') follow();
      else if (c === 'stats') stats();
      else if (c === 'save') saveHar();
      else if (c === 'clear') { ui.input.value = ''; applyFilter(''); }
    });
    var lastType = 'mouse';
    ui.rows.addEventListener('pointerdown', function (e) { lastType = e.pointerType || 'mouse'; });
    ui.rows.addEventListener('click', function (e) {
      var tr = e.target.closest('tr.pk');
      if (!tr) return;
      if (lastType !== 'mouse' && tr._p === sel) { follow(sel); return; }
      select(tr._p);
    });
    ui.rows.addEventListener('dblclick', function (e) { var tr = e.target.closest('tr.pk'); if (tr) follow(tr._p); });
    ui.rows.addEventListener('keydown', function (e) {
      var tr = e.target.closest('tr.pk');
      if (!tr) return;
      var go = function (n) { while (n && n.hidden) n = e.key === 'ArrowDown' ? n.nextElementSibling : n.previousElementSibling; if (n) { n.focus(); select(n._p); } };
      if (e.key === 'ArrowDown') { e.preventDefault(); go(tr.nextElementSibling); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); go(tr.previousElementSibling); }
      else if (e.key === 'Enter') { e.preventDefault(); follow(tr._p); }
    });
    ui.rows.addEventListener('contextmenu', function (e) {
      var tr = e.target.closest('tr.pk');
      if (!tr) return;
      e.preventDefault();
      var p = tr._p;
      select(p);
      OS.menu([
        { label: 'Follow HTTP Stream', bold: true, act: function () { follow(p); } },
        { label: 'Open in Browser', disabled: p.third || p.type !== 'document', act: function () { OS.open(p.path); } },
        { sep: true },
        { label: 'Apply as Filter: host == ' + p.host, act: function () { ui.input.value = 'host == "' + p.host + '"'; applyFilter(ui.input.value); } },
        { label: 'Apply as Filter: type == ' + p.type, act: function () { ui.input.value = 'type == ' + p.type; applyFilter(ui.input.value); } },
        { label: 'Copy URL', disabled: !navigator.clipboard, act: function () { navigator.clipboard.writeText(p.url); } }
      ], e.clientX, e.clientY);
    });
    if (!OS.coarse.matches) ui.input.focus();
  };
  OS.on('close', function (w) { if (w === win) { win = null; ui = null; sel = null; } });
})();
