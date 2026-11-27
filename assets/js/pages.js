/* obscuraOS: what the website's own pages do inside the Browser.
   Home: show posts by topic or tag (?tag=...) with a clearable tag pill.
   Posts: reading progress + time left, heading anchors, image lightbox,
   tables that scroll, copy buttons on code. Link targets show in the
   status bar on hover. os.js calls Pages.init for every Browser tab/pane. */
(function () {
  'use strict';
  var TOPICS = { sec: 'Security', ai: 'AI', game: 'Games', misc: 'Other' };
  function $$(s, el) { return Array.prototype.slice.call(el.querySelectorAll(s)); }

  function openLightbox(img) {
    var old = document.querySelector('.img-lightbox');
    if (old) old.remove();
    var fig = img.closest('figure');
    var capEl = fig ? fig.querySelector('figcaption') : null;
    var caption = (capEl && capEl.textContent.trim()) || img.alt || '';
    var bg = document.createElement('div');
    bg.className = 'modal-bg img-lightbox';
    bg.setAttribute('role', 'dialog');
    bg.setAttribute('aria-modal', 'true');
    bg.setAttribute('aria-label', caption || 'Image preview');
    var dims = img.naturalWidth && img.naturalHeight ? ' (' + img.naturalWidth + ' × ' + img.naturalHeight + ')' : '';
    bg.innerHTML =
      '<div class="window raised img-box">' +
        '<header class="titlebar"><span class="tt"></span><span class="tbtns"><button type="button" class="tbtn" data-lb-x aria-label="Close"><i class="g-close"></i></button></span></header>' +
        '<div class="img-stage sunken"><img alt=""></div>' +
        '<div class="statusline"><span class="seg grow" data-lb-cap></span><span class="seg" data-lb-dim></span></div>' +
      '</div>';
    bg.querySelector('.tt').textContent = (img.alt || img.src.split('/').pop() || 'Image') + ' - Picture Viewer';
    var full = bg.querySelector('.img-stage img');
    full.src = img.currentSrc || img.src;
    full.alt = img.alt || '';
    bg.querySelector('[data-lb-cap]').textContent = caption || (img.src.split('/').pop() || 'Image');
    bg.querySelector('[data-lb-dim]').textContent = dims ? dims.slice(2, -1) : 'Image';
    var prev = document.activeElement;
    var close = function () {
      bg.remove();
      document.removeEventListener('keydown', onKey, true);
      if (prev && prev.focus && document.contains(prev)) prev.focus();
    };
    var onKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    bg.addEventListener('click', function (e) { if (e.target === bg || e.target.closest('[data-lb-x]')) close(); });
    document.body.appendChild(bg);
    bg.querySelector('[data-lb-x]').focus();
  }

  function initView(scope, win) {
    var view = scope.querySelector('.page-view');
    if (!view || view.getAttribute('data-ready')) return;
    view.setAttribute('data-ready', '1');
    var totalMins = 0;
    var meta = scope.querySelector('.post-meta');
    if (meta) {
      var m = /(\d+)\s+min\s+read/.exec(meta.textContent || '');
      if (m) totalMins = +m[1];
    }
    var hovering = false;
    var syncMeter = function () {
      var pane = view.closest('.browser-pane');
      if ((pane && pane.hidden) || scope.hidden) return;
      var meter = win.querySelector('[data-meter]'), status = win.querySelector('[data-status]');
      var total = view.scrollHeight - view.clientHeight;
      var pct = total > 0 ? Math.min(1, Math.max(0, view.scrollTop / total)) : 1;
      if (meter) meter.style.width = (pct * 100).toFixed(1) + '%';
      if (status && totalMins > 1 && !hovering && !win.classList.contains('loading')) {
        if (pct > 0.04 && pct < 0.96) {
          var left = Math.max(1, Math.ceil(totalMins * (1 - pct)));
          status.textContent = 'Reading · ~' + left + ' min left (' + Math.round(pct * 100) + '%)';
        } else if (pct >= 0.96) {
          status.textContent = 'Done (end of post)';
        } else {
          status.textContent = 'Done';
        }
      }
    };
    view._syncMeter = syncMeter;
    view.addEventListener('scroll', syncMeter, { passive: true });
    syncMeter();
    view.addEventListener('mouseover', function (e) {
      var a = e.target.closest('a[href]');
      var status = win.querySelector('[data-status]');
      if (a && status) { hovering = true; status.textContent = a.href; }
    });
    view.addEventListener('mouseout', function (e) {
      if (e.target.closest('a[href]')) {
        hovering = false;
        var status = win.querySelector('[data-status]');
        if (status) status.textContent = 'Done';
        syncMeter();
      }
    });
  }

  function initHome(scope, url) {
    var bar = scope.querySelector('.topic-bar');
    if (!bar || bar.getAttribute('data-ready')) { if (bar) apply(scope, url); return; }
    bar.setAttribute('data-ready', '1');
    var counts = {};
    $$('.post-item', scope).forEach(function (li) { var t = li.getAttribute('data-topic') || 'misc'; counts[t] = (counts[t] || 0) + 1; });
    var keys = Object.keys(TOPICS).filter(function (k) { return counts[k]; });
    if (keys.length > 1) {
      bar.innerHTML = '<button type="button" class="chip" data-topic="" aria-pressed="true">All</button>' +
        keys.map(function (k) { return '<button type="button" class="chip t-' + k + '" data-topic="' + k + '" aria-pressed="false">' + TOPICS[k] + ' <span>' + counts[k] + '</span></button>'; }).join('');
      bar.hidden = false;
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('[data-topic]');
        if (b) show(scope, { topic: b.getAttribute('data-topic') });
      });
    }
    apply(scope, url);
  }
  function apply(scope, url) {
    var tag = '';
    try {
      var u = new URL(url || location.href, location.href);
      tag = u.searchParams.get('tag') || decodeURIComponent((u.hash || '').slice(1)); // old /blog/#tag links
    } catch (e) {}
    show(scope, { tag: tag });
  }
  function show(scope, f) {
    var any = 0;
    $$('.post-item', scope).forEach(function (li) {
      var ok = f.tag ? (' ' + li.getAttribute('data-tags') + ' ').indexOf(' ' + f.tag + ' ') !== -1 : !f.topic || li.getAttribute('data-topic') === f.topic;
      li.hidden = !ok;
      if (ok) any++;
    });
    $$('.year-group', scope).forEach(function (g) { g.hidden = !g.querySelector('.post-item:not([hidden])'); });
    var none = scope.querySelector('.no-posts');
    if (none) none.hidden = any > 0;
    $$('.topic-bar [data-topic]', scope).forEach(function (b) { b.setAttribute('aria-pressed', String(!f.tag && (b.getAttribute('data-topic') || '') === (f.topic || ''))); });
    var intro = scope.querySelector('.site-intro');
    if (intro) {
      if (!intro.getAttribute('data-text')) intro.setAttribute('data-text', intro.textContent);
      intro.textContent = intro.getAttribute('data-text');
    }
    var oldPill = scope.querySelector('.tag-pill-bar');
    if (oldPill) oldPill.remove();
    if (f.tag && intro) {
      var pill = document.createElement('div');
      pill.className = 'tag-pill-bar';
      var lbl = document.createElement('span');
      lbl.textContent = 'Filtered by tag #' + f.tag + ' (' + any + ' post' + (any === 1 ? '' : 's') + ')';
      var clr = document.createElement('button');
      clr.type = 'button';
      clr.className = 'btn small';
      clr.textContent = 'Clear filter ×';
      clr.addEventListener('click', function () {
        show(scope, { topic: '' });
        if (location.pathname === '/' && (location.search || location.hash)) history.replaceState(null, '', '/');
      });
      pill.appendChild(lbl);
      pill.appendChild(clr);
      intro.insertAdjacentElement('afterend', pill);
    }
  }

  function initArticle(scope, win) {
    var content = scope.querySelector('.post-content');
    if (!content || content.getAttribute('data-ready')) return;
    content.setAttribute('data-ready', '1');
    $$('table', content).forEach(function (t) {
      if (t.tHead && !t.tHead.textContent.trim()) t.tHead.classList.add('is-blank');
      var wrap = document.createElement('div');
      wrap.className = 'table-scroll';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
    if (navigator.clipboard) {
      $$('pre', content).forEach(function (pre) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn code-copy-btn';
        btn.textContent = 'Copy';
        btn.addEventListener('click', function () {
          var code = pre.querySelector('code');
          navigator.clipboard.writeText(code ? code.innerText : pre.innerText).then(function () {
            btn.textContent = 'Copied';
            var st = win.querySelector('[data-status]');
            if (st) st.textContent = 'Copied code to clipboard';
            setTimeout(function () { btn.textContent = 'Copy'; }, 1400);
          }, function () {});
        });
        pre.appendChild(btn);
      });
      $$('h2[id], h3[id]', content).forEach(function (h) {
        var a = document.createElement('button');
        a.type = 'button';
        a.className = 'h-anchor';
        a.setAttribute('aria-label', 'Copy link to section ' + h.textContent.trim());
        a.title = 'Copy link to this section';
        a.textContent = '#';
        a.addEventListener('click', function () {
          var base = location.origin + location.pathname;
          var link = base + '#' + encodeURIComponent(h.id);
          navigator.clipboard.writeText(link).then(function () {
            a.textContent = '✓';
            var st = win.querySelector('[data-status]');
            if (st) st.textContent = 'Copied link: #' + h.id;
            setTimeout(function () { a.textContent = '#'; }, 1400);
          }, function () {});
        });
        h.appendChild(a);
      });
    }
    $$('img', content).forEach(function (img) {
      img.classList.add('zoomable');
      img.title = img.title || 'Click to view full size';
      img.addEventListener('click', function () { openLightbox(img); });
    });
  }

  function init(scope, url, win) {
    win = win || scope;
    if (win.getAttribute('data-app') !== 'browser') return;
    initView(scope, win);
    initHome(scope, url);
    initArticle(scope, win);
  }
  window.Pages = { init: init, openLightbox: openLightbox };
  $$('.win-app', document).forEach(function (w) { init(w); });
})();
