/* obscuraOS: app code for the Packet Capture and Browser windows.
   Exposes window.Capture.init(windowEl, url) so os.js can start a window it
   just opened; windows already on the page are started here.
   Nothing leaves the browser. */
(function () {
  'use strict';

  /* ---------------- bytes + hex ---------------- */
  var enc = window.TextEncoder ? new TextEncoder() : null;
  function bytesOf(s) {
    if (enc) return Array.prototype.slice.call(enc.encode(s));
    return s.split('').map(function (c) { return c.charCodeAt(0) & 255; });
  }
  function h2(n) { return (n < 16 ? '0' : '') + n.toString(16); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dump(bytes, perRow, maxRows, from, to) {
    var lines = [];
    for (var r = 0; r < maxRows; r++) {
      var off = r * perRow;
      if (off >= bytes.length) break;
      var hx = [], asc = '';
      for (var i = 0; i < perRow; i++) {
        var b = bytes[off + i];
        if (b === undefined) { hx.push('  '); asc += ' '; continue; }
        var on = from !== undefined && off + i >= from && off + i < to;
        var cell = h2(b), ch = b >= 32 && b < 127 ? esc(String.fromCharCode(b)) : '.';
        hx.push(on ? '<span class="hl">' + cell + '</span>' : cell);
        asc += on ? '<span class="hl">' + ch + '</span>' : ch;
      }
      var half = perRow / 2;
      lines.push('<span class="off">' + ('000' + off.toString(16)).slice(-4) + '</span>  ' + hx.slice(0, half).join(' ') + '  ' + hx.slice(half).join(' ') + '  ' + asc);
    }
    return lines.join('\n');
  }
  function go(url) {
    if (window.OS && window.OS.open) window.OS.open(url);
    else window.location.href = url;
  }

  /* ---------------- display filter ---------------- */
  function compiler(packets) {
    var PROTOS = {};
    packets.forEach(function (p) { PROTOS[p.proto.toLowerCase()] = true; });
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
        var num = parseFloat(raw), re = null, ordered = /^(>|<|>=|<=)$/.test(op);
        if (op === 'matches') { try { re = new RegExp(raw, 'i'); } catch (e) { return null; } }
        var cmp = function (x) {
          if (op === '==') return x === v; if (op === '!=') return x !== v;
          if (op === 'contains') return x.indexOf(v) !== -1; if (op === 'matches') return re.test(x);
          return null;
        };
        var ncmp = function (x) {
          return op === '==' ? x === num : op === '!=' ? x !== num : op === '>' ? x > num : op === '<' ? x < num : op === '>=' ? x >= num : op === '<=' ? x <= num : null;
        };
        if (field === 'tag' || field === 'tags') {
          if (ordered) return null;
          fn = op === '!=' ? function (p) { return p.tags.indexOf(v) === -1; } : function (p) { return p.tags.some(cmp); };
        } else if (field === 'proto' || field === 'protocol') {
          if (ordered) return null;
          fn = function (p) { return cmp(p.proto.toLowerCase()); };
        } else if (field === 'family') {
          if (ordered) return null;
          fn = function (p) { return cmp(p.family); };
        } else if (field === 'frame' || field === 'title') {
          if (ordered) return null;
          fn = function (p) { return cmp((field === 'title' ? p.title : p.title + ' ' + p.excerpt + ' ' + p.tags.join(' ')).toLowerCase()); };
        } else {
          if (isNaN(num) || op === 'contains' || op === 'matches') return null;
          var pick = field === 'year' ? function (p) { return +p.date.slice(0, 4); }
            : (field === 'min' || field === 'mins') ? function (p) { return p.mins; } : function (p) { return p.words; };
          fn = function (p) { return ncmp(pick(p)); };
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
    return function (expr) {
      expr = (expr || '').trim();
      if (!expr) return function () { return true; };
      var groups = [];
      var ors = expr.split(/\s*(?:\|\||\bor\b)\s*/i);
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
    };
  }

  /* ---------------- Packet Capture ---------------- */
  function initCapture(win, url) {
    var tbody = win.querySelector('#packets');
    if (!tbody) return;
    if (tbody.getAttribute('data-ready')) { setFilterFrom(win, url); return; }
    tbody.setAttribute('data-ready', '1');
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
    var compile = compiler(packets);
    var input = win.querySelector('#filter'), form = win.querySelector('#filter-form');
    var help = win.querySelector('#filter-help'), count = win.querySelector('#pk-count');
    var noMatch = win.querySelector('#no-match');
    var panes = win.querySelector('#panes'), tree = win.querySelector('#tree'), hex = win.querySelector('#hex');
    var quick = Array.prototype.slice.call(win.querySelectorAll('.filterbar [data-expr]'));
    var exprBtn = win.querySelector('#expr-btn');
    var selected = packets.length ? packets[0] : null;
    var showHelp = function (on) { help.hidden = !on; if (exprBtn) exprBtn.setAttribute('aria-expanded', String(on)); };
    if (exprBtn) exprBtn.addEventListener('click', function () { showHelp(help.hidden); });

    function select(p, focus) {
      selected = p;
      packets.forEach(function (q) { q.tr.classList.toggle('on', q === p); q.tr.tabIndex = q === p ? 0 : -1; });
      if (!p) { panes.hidden = true; return; }
      panes.hidden = false;
      var t = p.title, ex = p.excerpt;
      tree.innerHTML =
        '<details><summary>Frame ' + p.n + ': ' + p.words + ' words on wire (about ' + p.mins + ' min)</summary>' +
          '<div class="kv">Arrival date: <b>' + p.date + '</b></div><div class="kv">Protocols in frame: <b>eth:ip:tcp:' + esc(p.proto.toLowerCase()) + '</b></div></details>' +
        '<details><summary>Ethernet II, Src: harya, Dst: you</summary><div class="kv">Type: <b>IPv4 (0x0800)</b></div></details>' +
        '<details><summary>Transmission Control Protocol, Src Port: 443, Len: ' + p.words + '</summary><div class="kv">Stream index: <b>' + p.n + '</b></div></details>' +
        '<details open><summary>' + esc(p.proto) + ': ' + esc(t) + '</summary>' +
          '<div class="kv" data-bytes="title">Title: <b>' + esc(t) + '</b></div>' +
          '<div class="kv">Tags: <b>' + esc(p.tags.join(', ')) + '</b></div>' +
          (ex ? '<div class="kv" data-bytes="excerpt">Payload: ' + esc(ex) + '</div>' : '') +
          '<div class="kv"><a class="follow" href="' + esc(p.url) + '">Open in Browser →</a></div></details>';
      var tb = bytesOf(t), eb = bytesOf(ex), all = tb.concat([10], eb);
      var draw = function (from, to) { hex.innerHTML = dump(all, 16, 12, from, to); };
      draw();
      Array.prototype.forEach.call(tree.querySelectorAll('[data-bytes]'), function (el) {
        var isTitle = el.getAttribute('data-bytes') === 'title';
        el.addEventListener('mouseenter', function () { draw(isTitle ? 0 : tb.length + 1, isTitle ? tb.length : all.length); });
        el.addEventListener('mouseleave', function () { draw(); });
      });
      if (focus) p.tr.focus();
    }

    var current = '';
    function apply(expr) {
      var f = compile(expr);
      input.classList.remove('ok', 'bad', 'empty');
      if (!f) { input.classList.add('bad'); showHelp(true); return; }
      current = (expr || '').trim();
      var shown = packets.filter(function (p) { var ok = f(p); p.tr.hidden = !ok; return ok; });
      if (current) input.classList.add(shown.length ? 'ok' : 'empty');
      noMatch.hidden = shown.length > 0;
      count.textContent = 'P: ' + packets.length + ' D: ' + shown.length + ' M: 0';
      quick.forEach(function (b) { if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(b.getAttribute('data-expr') === current && current !== '')); });
      if (!selected || selected.tr.hidden) select(shown[0] || null);
    }
    win._applyFilter = function (expr) { input.value = expr; apply(expr); };

    form.addEventListener('submit', function (e) { e.preventDefault(); apply(input.value); });
    input.addEventListener('input', function () {
      var f = compile(input.value);
      input.classList.remove('ok', 'bad', 'empty');
      if (!input.value.trim()) { apply(''); return; }
      input.classList.add(f ? 'ok' : 'bad');
      if (f) apply(input.value);
    });
    quick.forEach(function (b) {
      b.addEventListener('click', function () { var expr = b.getAttribute('data-expr'); input.value = expr; apply(expr); });
    });
    // touch: first tap shows the details, a second tap on the same row opens it
    var lastPointer = 'mouse';
    tbody.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType || 'mouse'; });
    tbody.addEventListener('click', function (e) {
      var tr = e.target.closest('tr.pk');
      if (!tr || e.target.closest('a')) return;
      if (lastPointer !== 'mouse' && tr.classList.contains('on')) { go(tr.getAttribute('data-url')); return; }
      select(packets[rows.indexOf(tr)]);
    });
    tbody.addEventListener('dblclick', function (e) {
      var tr = e.target.closest('tr.pk');
      if (tr) go(tr.getAttribute('data-url'));
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
      else if (e.key === 'Enter') { e.preventDefault(); go(tr.getAttribute('data-url')); }
    });
    select(selected);
    setFilterFrom(win, url);
  }
  function setFilterFrom(win, url) {
    var start = '';
    try { start = new URL(url || window.location.href, window.location.href).searchParams.get('filter') || ''; } catch (e) {}
    if (!start && !url && window.location.hash.length > 1) {
      var h = decodeURIComponent(window.location.hash.slice(1));
      if (/^[\w.\-]+$/.test(h)) start = 'tag == "' + h + '"';
    }
    if (win._applyFilter) win._applyFilter(start);
  }

  /* ---------------- Browser (a post) ---------------- */
  function initPost(win) {
    var content = win.querySelector('.post-content');
    var view = win.querySelector('.page-view');
    if (view && !view.getAttribute('data-ready')) {
      view.setAttribute('data-ready', '1');
      // reading progress in the status bar, link targets on hover
      var meter = win.querySelector('[data-meter]'), status = win.querySelector('[data-status]');
      var onScroll = function () {
        if (!meter) return;
        var total = view.scrollHeight - view.clientHeight;
        meter.style.width = (total > 0 ? Math.min(100, view.scrollTop / total * 100) : 100).toFixed(1) + '%';
      };
      view.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      if (status) {
        view.addEventListener('mouseover', function (e) { var a = e.target.closest('a[href]'); if (a) status.textContent = a.href; });
        view.addEventListener('mouseout', function (e) { if (e.target.closest('a[href]')) status.textContent = 'Done'; });
      }
    }
    if (!content || content.getAttribute('data-ready')) return;
    content.setAttribute('data-ready', '1');
    Array.prototype.forEach.call(content.querySelectorAll('table'), function (t) {
      if (t.tHead && !t.tHead.textContent.trim()) t.tHead.classList.add('is-blank');
      var wrap = document.createElement('div');
      wrap.className = 'table-scroll';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
    if (navigator.clipboard) {
      Array.prototype.forEach.call(content.querySelectorAll('pre'), function (pre) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn code-copy-btn';
        btn.textContent = 'Copy';
        btn.addEventListener('click', function () {
          var code = pre.querySelector('code');
          navigator.clipboard.writeText(code ? code.innerText : pre.innerText).then(function () {
            btn.textContent = 'Copied';
            setTimeout(function () { btn.textContent = 'Copy'; }, 1400);
          }, function () {});
        });
        pre.appendChild(btn);
      });
    }
    // View as hex dump
    var hexBtn = win.querySelector('[data-act="hex"]'), hexview = win.querySelector('.hexview');
    if (hexBtn && hexview) {
      var built = false;
      hexBtn.hidden = false;
      hexBtn.addEventListener('click', function () {
        var on = hexBtn.getAttribute('aria-pressed') !== 'true';
        if (on && !built) { hexview.innerHTML = dump(bytesOf(content.innerText.replace(/\s+/g, ' ').trim()), 16, 100000); built = true; }
        hexBtn.setAttribute('aria-pressed', String(on));
        content.hidden = on;
        hexview.hidden = !on;
      });
    }
  }

  function init(win, url) {
    initCapture(win, url);
    initPost(win);
  }
  window.Capture = { init: init };
  Array.prototype.forEach.call(document.querySelectorAll('.win-app'), function (w) { init(w); });
})();
