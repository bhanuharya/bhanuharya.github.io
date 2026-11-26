/* obscuraOS: runs in <head>, before the page paints.
   Applies saved display settings, counts anything the Content Security
   Policy blocks (Security Center shows it), and decides whether this tab
   boots. Kept in a file, not inline, so the CSP can forbid inline scripts. */
(function () {
  'use strict';
  var root = document.documentElement;
  function get(store, k) { try { return window[store].getItem(k); } catch (e) { return null; } }

  // Day unless Night was picked
  if (get('localStorage', 'theme') === 'dark') root.setAttribute('data-theme', 'dark');

  // settings from BIOS Setup
  var s = {};
  try { s = JSON.parse(get('localStorage', 'os-settings') || '{}') || {}; } catch (e) {}
  if (s.wallpaper && s.wallpaper !== 'blue') root.setAttribute('data-wall', s.wallpaper);
  if (s.depth && s.depth !== 'true') root.setAttribute('data-depth', s.depth);
  if (s.text && s.text !== 'm') root.setAttribute('data-text', s.text);
  if (s.crt) root.classList.add('crt');
  if (s.font === 'large') root.classList.add('large');
  root.classList.add('js');

  // iOS zooms into small text fields on focus; this stops that (pinch zoom still works there)
  if (/iP(hone|od|ad)/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    var v = document.querySelector('meta[name="viewport"]');
    if (v) v.setAttribute('content', v.getAttribute('content') + ', maximum-scale=1');
  }

  // everything the policy blocks, from the first moment
  window.OSBlocked = [];
  document.addEventListener('securitypolicyviolation', function (e) {
    window.OSBlocked.push({ d: e.effectiveDirective || e.violatedDirective, u: e.blockedURI || '', t: Date.now() });
  });

  // first visit in this tab boots; search engines and link previews go straight in
  var user = get('sessionStorage', 'os-user');
  var bot = /bot|crawl|spider|slurp|lighthouse|facebookexternalhit|embedly|whatsapp|telegram|discord|preview/i.test(navigator.userAgent);
  if (!user && !bot) {
    root.classList.add('boot-pending');
    // if the OS scripts never arrive, show the page anyway
    setTimeout(function () { if (!window.OSBoot) root.classList.remove('boot-pending'); }, 5000);
  }
})();
