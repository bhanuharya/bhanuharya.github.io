/**
 * Native controller for the attributed Unknown Pleasures SVG line animation.
 * Loads only path data from the local MIT-licensed standalone asset.
 */
(function() {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var container = null;
  var svg = null;
  var isRunning = false;
  var customLinesCount = null;
  var loadPromise = null;
  var lineTimer = null;
  var lineIndex = -1;
  var lineInterval = 35;
  var reducedMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getVisiblePaths() {
    if (!svg) return [];
    return Array.prototype.filter.call(svg.querySelectorAll('path'), function(path) {
      return !path.hasAttribute('hidden');
    });
  }

  function clearLineClasses() {
    if (!svg) return;
    svg.querySelectorAll('.is-signal-visible, .is-signal-active, .is-signal-trail').forEach(function(path) {
      path.classList.remove('is-signal-visible', 'is-signal-active', 'is-signal-trail');
    });
  }

  function stopLineSequence() {
    if (lineTimer) {
      window.clearInterval(lineTimer);
      lineTimer = null;
    }
  }

  function showNextLine(paths) {
    if (lineIndex >= paths.length) {
      stopLineSequence();
      return;
    }

    paths[lineIndex].classList.add('is-signal-visible');
    lineIndex += 1;

    if (lineIndex >= paths.length) stopLineSequence();
  }

  function startLineSequence() {
    stopLineSequence();
    clearLineClasses();
    lineIndex = 0;

    var paths = getVisiblePaths();
    if (!paths.length) return;

    if (reducedMotion) {
      paths.forEach(function(path) { path.classList.add('is-signal-visible'); });
      return;
    }

    showNextLine(paths);
    if (lineIndex < paths.length) {
      lineTimer = window.setInterval(function() { showNextLine(paths); }, lineInterval);
    }
  }

  function applyLineCount() {
    if (!svg) return;
    var paths = svg.querySelectorAll('path');
    var visibleCount = customLinesCount === null
      ? paths.length
      : Math.max(3, Math.min(paths.length, customLinesCount));

    paths.forEach(function(path, index) {
      path.toggleAttribute('hidden', index >= visibleCount);
    });

  }

  function loadPaths() {
    if (!svg) return Promise.resolve();
    if (svg.querySelector('path')) return Promise.resolve();
    if (loadPromise) return loadPromise;

    var sourceUrl = svg.getAttribute('data-source');
    if (!sourceUrl) return Promise.reject(new Error('missing pulsar source'));

    loadPromise = fetch(sourceUrl, { credentials: 'same-origin' })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('pulsar source request failed: ' + response.status);
        }
        return response.text();
      })
      .then(function(markup) {
        var sourceDocument = new DOMParser().parseFromString(markup, 'text/html');
        var sourceSvg = sourceDocument.querySelector('#box svg');
        if (!sourceSvg) throw new Error('pulsar source svg not found');

        var sourcePaths = sourceSvg.querySelectorAll('path');
        if (!sourcePaths.length) throw new Error('pulsar source paths not found');

        var linesGroup = document.createElementNS(SVG_NS, 'g');
        linesGroup.setAttribute('class', 'pulsar-lines');
        sourcePaths.forEach(function(sourcePath) {
          var pathData = sourcePath.getAttribute('d');
          if (!pathData) return;

          var path = document.createElementNS(SVG_NS, 'path');
          path.setAttribute('d', pathData);
          linesGroup.appendChild(path);
        });

        svg.replaceChildren(linesGroup);
        svg.setAttribute('viewBox', sourceSvg.getAttribute('viewBox') || '0 0 630 810');
        applyLineCount();
      })
      .catch(function(error) {
        container.classList.add('is-unavailable');
        console.error(error);
        throw error;
      });

    return loadPromise;
  }

  function start() {
    if (!container || !svg) return;
    container.classList.add('is-user-activated');
    container.classList.remove('is-paused');
    isRunning = true;
    loadPaths().then(function() {
      if (isRunning && !container.hasAttribute('hidden') && container.style.display !== 'none') {
        startLineSequence();
      }
    }).catch(function() {});
  }

  function stop() {
    if (!container) return;
    container.classList.add('is-paused');
    isRunning = false;
    stopLineSequence();
    clearLineClasses();
  }

  function init(containerEl) {
    container = containerEl || document.querySelector('[data-pulsar-waves]');
    if (!container) return;

    svg = container.querySelector('.pulsar-svg');
    if (!svg) return;

    if (container.hasAttribute('hidden')) {
      stop();
    } else {
      start();
    }

    loadPaths().catch(function() {});
  }

  function toggle() {
    if (!container) return false;

    var isHidden = container.hasAttribute('hidden')
      || container.style.display === 'none';
    if (isHidden) {
      container.removeAttribute('hidden');
      container.style.display = 'block';
      start();
      return true;
    }

    container.setAttribute('hidden', '');
    container.style.display = 'none';
    stop();
    return false;
  }

  window.PulsarWaves = {
    init: init,
    start: start,
    stop: stop,
    toggle: toggle,
    setLines: function(n) {
      customLinesCount = n
        ? Math.max(10, Math.min(100, parseInt(n, 10) || 46))
        : null;
      applyLineCount();
      if (isRunning) startLineSequence();
    },
    setColor: function(color) {
      if (svg) svg.style.color = color || '';
    },
    isRunning: function() {
      return isRunning;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      init(document.querySelector('[data-pulsar-waves]'));
    });
  } else {
    init(document.querySelector('[data-pulsar-waves]'));
  }
})();
