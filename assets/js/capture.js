/* bhanuharya.pcapng
   - light/dark toggle (an explicit choice is saved; otherwise the system decides)
   - home: display filter, packet selection, detail tree and hex dump
   - posts: hovered paragraph's bytes in a side hex pane, copy buttons, reading gauge
   Nothing leaves the browser. */
(function () {
  'use strict';
  var root = document.documentElement;

  /* ---------------- theme ---------------- */
  var toggle = document.getElementById('theme-toggle');
  function dark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function label() { if (toggle) toggle.textContent = dark() ? 'Light' : 'Dark'; }
  if (toggle) {
    label();
    toggle.addEventListener('click', function () {
      var next = dark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      label();
    });
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', label);
    }
  }

  /* ---------------- bytes + hex ---------------- */
  var enc = window.TextEncoder ? new TextEncoder() : null;
  function bytesOf(s) {
    if (enc) return Array.prototype.slice.call(enc.encode(s));
    return s.split('').map(function (c) { return c.charCodeAt(0) & 255; });
  }
  function h2(n) { return (n < 16 ? '0' : '') + n.toString(16); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dump(bytes, perRow, maxRows, from, to, withAscii, startOff) {
    var lines = [], base = startOff || 0;
    for (var r = 0; r < maxRows; r++) {
      var off = r * perRow;
      if (off >= bytes.length) break;
      var hx = [], asc = '';
      for (var i = 0; i < perRow; i++) {
        var b = bytes[off + i];
        if (b === undefined) { hx.push('  '); asc += ' '; continue; }
        var on = from !== undefined && off + i >= from && off + i < to;
        var cell = h2(b), ch = b >= 32 && b < 127 ? esc(String.fromCharCode(b)) : '.';
        hx.push(on ? '<span class="hl">' + cell + '</span>' : '<span class="b">' + cell + '</span>');
        asc += on ? '<span class="hl">' + ch + '</span>' : ch;
      }
      var half = perRow / 2;
      var row = '<span class="off">' + ('000' + (base + off).toString(16)).slice(-4) + '</span>  ' +
        (perRow > 8 ? hx.slice(0, half).join(' ') + '  ' + hx.slice(half).join(' ') : hx.join(' '));
      if (withAscii) row += '  <span class="asc">' + asc + '</span>';
      lines.push(row);
    }
    return lines.join('\n');
  }

  /* ---------------- capture (home) ---------------- */
  var tbody = document.getElementById('packets');
  if (tbody) {
    var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr.pk'));
    var packets = rows.map(function (tr) {
      var a = tr.querySelector('td.info a');
      return {
        tr: tr, n: +tr.getAttribute('data-n'), title: a ? a.textContent : '', url: tr.getAttribute('data-url'),
        proto: tr.getAttribute('data-proto'), family: tr.getAttribute('data-family'),
        tags: (tr.getAttribute('data-tags') || '').split(' ').filter(Boolean),
        date: tr.getAttribute('data-date'), words: +tr.getAttribute('data-words'), mins: +tr.getAttribute('data-mins'),
        excerpt: tr.getAttribute('data-excerpt') || ''
      };
    });
    var input = document.getElementById('filter'), form = document.getElementById('filter-form');
    var help = document.getElementById('filter-help'), count = document.getElementById('pk-count');
    var noMatch = document.getElementById('no-match');
    var panes = document.getElementById('panes'), tree = document.getElementById('tree'), hex = document.getElementById('hex');
    var quick = Array.prototype.slice.call(document.querySelectorAll('.quick button'));
    var selected = packets.length ? packets[0] : null;
    var PROTOS = {};
    packets.forEach(function (p) { PROTOS[p.proto.toLowerCase()] = true; });

    /* display filter: field op value, joined with && / ||, negated with ! */
    function unq(v) { v = v.trim(); return (/^"(.*)"$/.test(v) || /^'(.*)'$/.test(v)) ? v.slice(1, -1) : v; }
    function term(t) {
      t = t.trim();
      var neg = false;
      while (/^(!|not\s+)/i.test(t)) { neg = !neg; t = t.replace(/^(!|not\s+)/i, '').trim(); }
      if (/^\(.*\)$/.test(t)) t = t.slice(1, -1).trim();
      var m = /^(tag|tags|proto|protocol|family|frame|title|year|len|length|words|min|mins)\s*(==|!=|contains|matches|>=|<=|>|<|eq|ne)\s*(.+)$/i.exec(t);
      var fn;
      if (m) {
        var field = m[1].toLowerCase(), op = m[2].toLowerCase(), raw = unq(m[3]), v = raw.toLowerCase();
        if (op === 'eq') op = '=='; if (op === 'ne') op = '!=';
        var num = parseFloat(raw), re = null;
        if (op === 'matches') { try { re = new RegExp(raw, 'i'); } catch (e) { return null; } }
        var cmp = function (x) {
          if (op === '==') return x === v; if (op === '!=') return x !== v;
          if (op === 'contains') return x.indexOf(v) !== -1; if (op === 'matches') return re.test(x);
          return null;
        };
        var ncmp = function (x) {
          if (isNaN(num)) return null;
          return op === '==' ? x === num : op === '!=' ? x !== num : op === '>' ? x > num : op === '<' ? x < num : op === '>=' ? x >= num : op === '<=' ? x <= num : null;
        };
        if (field === 'tag' || field === 'tags') {
          if (op === '!=') fn = function (p) { return p.tags.indexOf(v) === -1; };
          else if (/^(>|<|>=|<=)$/.test(op)) return null;
          else fn = function (p) { return p.tags.some(function (x) { return cmp(x); }); };
        } else if (field === 'proto' || field === 'protocol') {
          if (/^(>|<|>=|<=)$/.test(op)) return null;
          fn = function (p) { return cmp(p.proto.toLowerCase()); };
        } else if (field === 'family') {
          if (/^(>|<|>=|<=)$/.test(op)) return null;
          fn = function (p) { return cmp(p.family); };
        } else if (field === 'frame' || field === 'title') {
          if (/^(>|<|>=|<=)$/.test(op)) return null;
          fn = function (p) { return cmp((field === 'title' ? p.title : p.title + ' ' + p.excerpt + ' ' + p.tags.join(' ')).toLowerCase()); };
        } else if (field === 'year') {
          if (isNaN(num)) return null;
          fn = function (p) { return ncmp(+p.date.slice(0, 4)); };
        } else if (field === 'len' || field === 'length' || field === 'words') {
          if (isNaN(num)) return null;
          fn = function (p) { return ncmp(p.words); };
        } else {
          if (isNaN(num)) return null;
          fn = function (p) { return ncmp(p.mins); };
        }
      } else if (/^[\w.\- ]+$/.test(t)) {
        var w = t.toLowerCase();
        fn = PROTOS[w] ? function (p) { return p.proto.toLowerCase() === w; }
          : function (p) { return (p.title + ' ' + p.excerpt + ' ' + p.tags.join(' ')).toLowerCase().indexOf(w) !== -1; };
      } else {
        return null;
      }
      return neg ? function (p) { return !fn(p); } : fn;
    }
    function compile(expr) {
      expr = (expr || '').trim();
      if (!expr) return function () { return true; };
      var ors = expr.split(/\s*(?:\|\||\bor\b)\s*/i), groups = [];
      for (var i = 0; i < ors.length; i++) {
        var ands = ors[i].split(/\s*(?:&&|\band\b)\s*/i), fns = [];
        for (var j = 0; j < ands.length; j++) {
          if (!ands[j].trim()) return null;
          var f = term(ands[j]);
          if (!f) return null;
          fns.push(f);
        }
        groups.push(fns);
      }
      return function (p) { return groups.some(function (g) { return g.every(function (f) { return f(p); }); }); };
    }

    function select(p, focus) {
      selected = p;
      packets.forEach(function (q) { q.tr.classList.toggle('on', q === p); q.tr.tabIndex = q === p ? 0 : -1; });
      if (!p) { panes.hidden = true; return; }
      panes.hidden = false;
      var t = p.title, ex = p.excerpt;
      tree.innerHTML =
        '<details><summary>Frame ' + p.n + ': ' + p.words + ' words on wire (about ' + p.mins + ' min)</summary>' +
          '<div class="kv">Arrival date: <b>' + p.date + '</b></div><div class="kv">Frame number: <b>' + p.n + '</b></div><div class="kv">Protocols in frame: <b>eth:ip:tcp:' + esc(p.proto.toLowerCase()) + '</b></div></details>' +
        '<details><summary>Ethernet II, Src: harya, Dst: you</summary><div class="kv">Type: <b>IPv4 (0x0800)</b></div></details>' +
        '<details><summary>Transmission Control Protocol, Src Port: 443, Len: ' + p.words + '</summary><div class="kv">Stream index: <b>' + p.n + '</b></div><div class="kv">Flags: <b>PSH, ACK</b></div></details>' +
        '<details open><summary>' + esc(p.proto) + ': ' + esc(t) + '</summary>' +
          '<div class="kv" data-bytes="title">Title: <b>' + esc(t) + '</b></div>' +
          '<div class="kv">Tags: <b>' + esc(p.tags.join(', ')) + '</b></div>' +
          (ex ? '<div class="kv" data-bytes="excerpt">Payload: ' + esc(ex) + '</div>' : '') +
          '<div class="kv"><a class="follow" href="' + esc(p.url) + '">Follow TCP stream →</a></div></details>';
      var tb = bytesOf(t), eb = bytesOf(ex), all = tb.concat([10], eb);
      var draw = function (from, to) { hex.innerHTML = dump(all, 16, 9, from, to, true); };
      draw();
      Array.prototype.forEach.call(tree.querySelectorAll('[data-bytes]'), function (el) {
        var isTitle = el.getAttribute('data-bytes') === 'title';
        el.addEventListener('mouseenter', function () { draw(isTitle ? 0 : tb.length + 1, isTitle ? tb.length : all.length); });
        el.addEventListener('mouseleave', function () { draw(); });
      });
      if (focus) p.tr.focus();
    }

    var current = '';
    function apply(expr, push) {
      var f = compile(expr);
      input.classList.remove('ok', 'bad', 'empty');
      if (!f) { input.classList.add('bad'); if (help) help.hidden = false; return; }
      current = (expr || '').trim();
      var shown = packets.filter(function (p) { var ok = f(p); p.tr.hidden = !ok; return ok; });
      if (current) input.classList.add(shown.length ? 'ok' : 'empty');
      if (help) help.hidden = true;
      noMatch.hidden = shown.length > 0;
      count.textContent = 'Packets: ' + packets.length + ' · Displayed: ' + shown.length + ' (' + (packets.length ? (shown.length / packets.length * 100).toFixed(1) : '0.0') + '%)';
      quick.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-expr') === current && current !== '')); });
      if (!selected || selected.tr.hidden) select(shown[0] || null);
      if (push && window.history && history.replaceState) {
        var url = window.location.pathname + (current ? '?filter=' + encodeURIComponent(current) : '');
        history.replaceState(null, '', url);
      }
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); apply(input.value, true); });
    input.addEventListener('input', function () {
      var f = compile(input.value);
      input.classList.remove('ok', 'bad', 'empty');
      if (!input.value.trim()) { apply('', true); return; }
      input.classList.add(f ? 'ok' : 'bad');
      if (f) apply(input.value, true);
    });
    quick.forEach(function (b) {
      b.addEventListener('click', function () {
        var expr = b.getAttribute('data-expr');
        input.value = expr;
        apply(expr, true);
      });
    });

    tbody.addEventListener('click', function (e) {
      var tr = e.target.closest('tr.pk');
      if (!tr || e.target.closest('a')) return;
      select(packets[rows.indexOf(tr)]);
    });
    tbody.addEventListener('dblclick', function (e) {
      var tr = e.target.closest('tr.pk');
      if (tr) window.location.href = tr.getAttribute('data-url');
    });
    tbody.addEventListener('keydown', function (e) {
      var tr = e.target.closest('tr.pk');
      if (!tr) return;
      var visible = packets.filter(function (p) { return !p.tr.hidden; });
      var i = visible.indexOf(packets[rows.indexOf(tr)]);
      if (e.key === 'ArrowDown' && i < visible.length - 1) { e.preventDefault(); select(visible[i + 1], true); }
      else if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); select(visible[i - 1], true); }
      else if (e.key === 'Home') { e.preventDefault(); select(visible[0], true); }
      else if (e.key === 'End') { e.preventDefault(); select(visible[visible.length - 1], true); }
      else if (e.key === 'Enter') { e.preventDefault(); window.location.href = tr.getAttribute('data-url'); }
    });

    // start: ?filter=..., or an old /blog/#tag link
    var start = '';
    try { start = new URLSearchParams(window.location.search).get('filter') || ''; } catch (e) {}
    if (!start && window.location.hash.length > 1) {
      var h = decodeURIComponent(window.location.hash.slice(1));
      if (/^[\w.\-]+$/.test(h)) start = 'tag == "' + h + '"';
    }
    input.value = start;
    select(selected);
    apply(start, false);
  }

  /* ---------------- post ---------------- */
  var content = document.getElementById('post-content');
  if (content) {
    // tables: scroll sideways on small screens, drop header rows that are all blank
    Array.prototype.forEach.call(content.querySelectorAll('table'), function (t) {
      if (t.tHead && !t.tHead.textContent.trim()) t.tHead.classList.add('is-blank');
      var wrap = document.createElement('div');
      wrap.className = 'table-scroll';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
    // copy buttons
    if (navigator.clipboard) {
      Array.prototype.forEach.call(content.querySelectorAll('pre'), function (pre) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'code-copy-btn';
        btn.textContent = 'copy';
        btn.addEventListener('click', function () {
          var code = pre.querySelector('code');
          navigator.clipboard.writeText(code ? code.innerText : pre.innerText).then(function () {
            btn.textContent = 'copied';
            setTimeout(function () { btn.textContent = 'copy'; }, 1400);
          }, function () {});
        });
        pre.appendChild(btn);
      });
    }
    // the side pane shows the bytes of the block under the pointer
    var side = document.getElementById('side-hex');
    var blocks = Array.prototype.slice.call(content.children);
    if (side && blocks.length) {
      var hot = null;
      var show = function (i) {
        var b = blocks[i];
        if (hot) hot.classList.remove('is-hot');
        hot = b; b.classList.add('is-hot');
        var text = b.textContent.replace(/\s+/g, ' ').trim();
        var bytes = bytesOf(text);
        side.innerHTML = '<span class="cap">offset 0x' + ('000' + (i * 64).toString(16)).slice(-4) + ' · ' + bytes.length + ' bytes</span>' +
          dump(bytes, 8, 30, undefined, undefined, false, i * 64);
      };
      blocks.forEach(function (b, i) { b.addEventListener('mouseenter', function () { show(i); }); });
      content.addEventListener('mouseleave', function () { if (hot) hot.classList.remove('is-hot'); });
      show(0);
      if (hot) hot.classList.remove('is-hot');
    }
    // reading gauge
    var gauge = document.createElement('div');
    gauge.className = 'read-gauge';
    gauge.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('i');
    gauge.appendChild(fill);
    document.body.appendChild(gauge);
    var onScroll = function () {
      var r = content.getBoundingClientRect(), total = r.height - window.innerHeight * 0.6;
      var done = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
      fill.style.width = (done * 100).toFixed(1) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }
})();
