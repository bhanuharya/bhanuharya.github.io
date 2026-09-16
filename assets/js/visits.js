/* first party visit counter.
   Endpoint comes from <html data-visits-endpoint>. Empty means the counter is
   not deployed yet and this file does nothing.
   Counts at most one hit per browser per day, stores a single integer server
   side, no cookies, no identifier sent. */
(function () {
  var root = document.documentElement;
  var endpoint = (root.getAttribute('data-visits-endpoint') || '').replace(/\/+$/, '');
  var box = document.getElementById('visits');
  var out = document.getElementById('visit-count');
  if (!endpoint || !box || !out) return;

  var today = new Date().toISOString().slice(0, 10);
  var seen = null;
  try { seen = localStorage.getItem('vc-day'); } catch (e) {}
  var counting = seen !== today;

  fetch(endpoint + '/', { method: counting ? 'POST' : 'GET', mode: 'cors', cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || typeof data.hits !== 'number') return;
      try { if (counting) localStorage.setItem('vc-day', today); } catch (e) {}
      out.textContent = data.hits.toLocaleString('en-US');
      box.hidden = false;
    })
    .catch(function () {
      /* endpoint down or blocked: show nothing rather than a broken number */
    });
})();
