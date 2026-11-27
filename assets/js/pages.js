/* obscuraOS: what the website's own pages do inside the Browser.
   Home: show posts by topic or tag (?tag=...). Posts: reading progress,
   tables that scroll, copy buttons on code. Link targets show in the
   status bar on hover. os.js calls Pages.init for every Browser window. */
(function () {
  'use strict';
  var TOPICS = { sec: 'Security', ai: 'AI', game: 'Games', misc: 'Other' };
  function $$(s, el) { return Array.prototype.slice.call(el.querySelectorAll(s)); }

  function initView(win) {
    var view = win.querySelector('.page-view');
    if (!view || view.getAttribute('data-ready')) return;
    view.setAttribute('data-ready', '1');
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

  function initHome(win, url) {
    var bar = win.querySelector('.topic-bar');
    if (!bar || bar.getAttribute('data-ready')) { if (bar) apply(win, url); return; }
    bar.setAttribute('data-ready', '1');
    var counts = {};
    $$('.post-item', win).forEach(function (li) { var t = li.getAttribute('data-topic') || 'misc'; counts[t] = (counts[t] || 0) + 1; });
    var keys = Object.keys(TOPICS).filter(function (k) { return counts[k]; });
    if (keys.length > 1) {
      bar.innerHTML = '<button type="button" class="chip" data-topic="" aria-pressed="true">All</button>' +
        keys.map(function (k) { return '<button type="button" class="chip t-' + k + '" data-topic="' + k + '" aria-pressed="false">' + TOPICS[k] + ' <span>' + counts[k] + '</span></button>'; }).join('');
      bar.hidden = false;
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('[data-topic]');
        if (b) show(win, { topic: b.getAttribute('data-topic') });
      });
    }
    apply(win, url);
  }
  function apply(win, url) {
    var tag = '';
    try {
      var u = new URL(url || location.href, location.href);
      tag = u.searchParams.get('tag') || decodeURIComponent((u.hash || '').slice(1)); // old /blog/#tag links
    } catch (e) {}
    show(win, { tag: tag });
  }
  function show(win, f) {
    var any = 0;
    $$('.post-item', win).forEach(function (li) {
      var ok = f.tag ? (' ' + li.getAttribute('data-tags') + ' ').indexOf(' ' + f.tag + ' ') !== -1 : !f.topic || li.getAttribute('data-topic') === f.topic;
      li.hidden = !ok;
      if (ok) any++;
    });
    $$('.year-group', win).forEach(function (g) { g.hidden = !g.querySelector('.post-item:not([hidden])'); });
    var none = win.querySelector('.no-posts');
    if (none) none.hidden = any > 0;
    $$('.topic-bar [data-topic]', win).forEach(function (b) { b.setAttribute('aria-pressed', String(!f.tag && (b.getAttribute('data-topic') || '') === (f.topic || ''))); });
    var intro = win.querySelector('.site-intro');
    if (intro) {
      if (!intro.getAttribute('data-text')) intro.setAttribute('data-text', intro.textContent);
      intro.textContent = f.tag ? 'Posts tagged “' + f.tag + '”.' : intro.getAttribute('data-text');
    }
  }

  function initArticle(win) {
    var content = win.querySelector('.post-content');
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
            setTimeout(function () { btn.textContent = 'Copy'; }, 1400);
          }, function () {});
        });
        pre.appendChild(btn);
      });
    }
  }

  function init(win, url) {
    if (win.getAttribute('data-app') !== 'browser') return;
    initView(win);
    initHome(win, url);
    initArticle(win);
  }
  window.Pages = { init: init };
  $$('.win-app', document).forEach(function (w) { init(w); });
})();
