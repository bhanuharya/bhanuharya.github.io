/* interactive terminal : core loop */
(function () {
  'use strict';

  var DATA = window.TERM_DATA || { posts: [], site: {} };
  var screen = document.getElementById('screen');
  var typedEl = document.getElementById('typed');
  var promptEl = document.getElementById('prompt');
  var crt = document.getElementById('crt');
  var catcher = document.getElementById('keycatcher');

  var state = {
    cwd: '~',
    buffer: '',
    history: [],
    hIndex: 0,
    alive: true,
    busy: false
  };

  function promptText() {
    return 'bhanuharya@sec:' + state.cwd + '$ ';
  }

  function renderPrompt() {
    promptEl.textContent = promptText();
    typedEl.textContent = state.buffer;
  }

  function addLine(text, cls) {
    var el = document.createElement('div');
    el.className = 'line' + (cls ? ' ' + cls : '');
    el.textContent = text === undefined ? '' : text;
    screen.appendChild(el);
    scrollDown();
    return el;
  }

  function addHTML(html, cls) {
    var el = document.createElement('div');
    el.className = 'line' + (cls ? ' ' + cls : '');
    el.innerHTML = html;
    screen.appendChild(el);
    scrollDown();
    return el;
  }

  function addBlob(text, cls) {
    var el = document.createElement('pre');
    el.className = 'blob' + (cls ? ' ' + cls : '');
    el.textContent = text;
    screen.appendChild(el);
    scrollDown();
    return el;
  }

  function scrollDown() {
    crt.scrollTop = crt.scrollHeight;
  }

  function clearScreen() {
    screen.innerHTML = '';
  }

  function echoCommand(line) {
    var el = document.createElement('div');
    el.className = 'line';
    el.textContent = promptText() + line;
    screen.appendChild(el);
  }

  /* ---- input handling -------------------------------------------------- */

  function insertText(text) {
    if (!state.alive || state.busy) return;
    state.buffer += text.replace(/[\r\n\t]/g, '');
    renderPrompt();
  }

  function backspace() {
    if (!state.buffer) return;
    state.buffer = state.buffer.slice(0, -1);
    renderPrompt();
  }

  function historyUp() {
    if (!state.history.length) return;
    state.hIndex = Math.max(0, state.hIndex - 1);
    state.buffer = state.history[state.hIndex] || '';
    renderPrompt();
  }

  function historyDown() {
    if (!state.history.length) return;
    state.hIndex = Math.min(state.history.length, state.hIndex + 1);
    state.buffer = state.history[state.hIndex] || '';
    renderPrompt();
  }

  function focusCatcher() {
    try { catcher.focus({ preventScroll: true }); } catch (e) { catcher.focus(); }
  }

  catcher.addEventListener('input', function () {
    var val = catcher.value;
    catcher.value = '';
    if (val) insertText(val);
  });

  function onKey(e) {
    if (!state.alive) return;
    var k = e.key;

    if (e.ctrlKey && (k === 'c' || k === 'C')) {
      e.preventDefault();
      addLine(promptText() + state.buffer + '^C');
      state.buffer = '';
      state.busy = false;
      renderPrompt();
      return;
    }
    if (e.ctrlKey && (k === 'l' || k === 'L')) {
      e.preventDefault();
      clearScreen();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (k === 'Enter') {
      e.preventDefault();
      submit();
    } else if (k === 'Backspace') {
      e.preventDefault();
      backspace();
    } else if (k === 'Tab') {
      e.preventDefault();
      complete();
    } else if (k === 'ArrowUp') {
      e.preventDefault();
      historyUp();
    } else if (k === 'ArrowDown') {
      e.preventDefault();
      historyDown();
    } else if (k === 'Escape') {
      closeSession();
    } else if (k.length === 1) {
      e.preventDefault();
      insertText(k);
    }
  }

  document.addEventListener('keydown', onKey);

  crt.addEventListener('click', function (e) {
    if (e.target.closest('a, button')) return;
    focusCatcher();
  });

  window.addEventListener('resize', scrollDown);

  function submit() {
    var line = state.buffer;
    state.buffer = '';
    echoCommand(line);
    renderPrompt();
    var trimmed = line.trim();
    if (trimmed) {
      state.history.push(trimmed);
      state.hIndex = state.history.length;
      run(trimmed);
    }
    scrollDown();
  }

  window.__term = {
    run: function (line) { echoCommand(line); run(line); },
    addLine: addLine,
    addHTML: addHTML,
    addBlob: addBlob,
    clear: clearScreen,
    state: state,
    data: DATA,
    close: function () { closeSession(); }
  };
  /* ---- paths and a very small filesystem ------------------------------- */

  var ROOT_POSTS = '~/posts';
  var ROOT_TAGS = '~/tags';

  function normPath(p) {
    var parts = p.split('/');
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      if (seg === '' || seg === '.' || seg === '~') continue;
      if (seg === '..') { out.pop(); continue; }
      out.push(seg);
    }
    return '~' + (out.length ? '/' + out.join('/') : '');
  }

  function resolve(arg) {
    if (!arg || arg === '~') return '~';
    if (arg.charAt(0) === '~') return normPath(arg);
    if (arg.charAt(0) === '/') return normPath('~/' + arg.replace(/^\/+/, ''));
    return normPath(state.cwd + '/' + arg);
  }

  var LOCAL_FILES = {
    'about.txt': { size: 1284, date: '2026-08-20' },
    'notes.txt': { size: 372, date: '2026-08-20' },
    'links.txt': { size: 246, date: '2026-08-20' },
    '.plan': { size: 214, date: '2026-09-16', hidden: true }
  };

  function meta(path) {
    var out = [];
    if (path === '~') {
      Object.keys(LOCAL_FILES).forEach(function (n) {
        var f = LOCAL_FILES[n];
        out.push({ name: n, type: 'f', size: f.size, date: f.date, hidden: !!f.hidden });
      });
      out.push({ name: 'posts', type: 'd', size: DATA.posts.length, date: '2026-09-14' });
      out.push({ name: 'tags', type: 't', size: allTags().length, date: '2026-09-14' });
      return out;
    }
    if (path === ROOT_POSTS) {
      return DATA.posts.map(function (p) {
        return { name: slug(p.url) + '.md', type: 'f', size: (p.words || 0) * 6, date: p.date };
      });
    }
    if (path === ROOT_TAGS) {
      return allTags().map(function (t) { return { name: t, type: 't', size: 1, date: '2026-09-14' }; });
    }
    return null;
  }

  function dirs() {
    var map = {};
    ['~', ROOT_POSTS, ROOT_TAGS].forEach(function (p) {
      var m = meta(p) || [];
      map[p] = m.filter(function (e) { return !e.hidden; }).map(function (e) {
        return e.name + (e.type === 'd' ? '/' : '');
      });
    });
    return map;
  }

  function slug(url) {
    return String(url).replace(/\/+$/, '').split('/').pop();
  }

  function allTags() {
    var seen = {};
    DATA.posts.forEach(function (p) {
      (p.tags || []).forEach(function (t) { seen[t] = true; });
    });
    return Object.keys(seen).sort();
  }

  function fileAt(path) {
    var name = path.split('/').pop();
    if (path.indexOf('/posts/') === 0) {
      var found = DATA.posts.filter(function (p) { return slug(p.url) + '.md' === name; })[0];
      return found || null;
    }
    return { name: name, path: path };
  }

  /* ---- remote text for about.txt and post files ------------------------ */

  function fetchText(path, done) {
    fetch(path).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var main = doc.querySelector('.page-content, .post-content, article, main') || doc.body;
      var junk = main.querySelectorAll('nav, .page-prompt, .post-nav, .post-meta, .post-tags, .post-card-cta, .tag-filter-bar, script, style');
      Array.prototype.forEach.call(junk, function (n) { n.remove(); });
      Array.prototype.forEach.call(main.querySelectorAll('br'), function (b) { b.replaceWith('\n'); });
      var text = (main.textContent || '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
      done(text);
    }).catch(function () {
      addLine('cat: read error: could not load ' + path, 'err');
    });
  }

  function numberLines(t) {
    return t.split('\n').map(function (l, i) { return pad(String(i + 1), 6) + l; }).join('\n');
  }

  function readFile(path, cb) {
    if (path === '~/about.txt') { fetchText('/about/', cb); return; }
    if (path === '~/notes.txt') { cb(notesText); return; }
    if (path === '~/links.txt') { cb(linksText); return; }
    if (path === '~/.plan') { cb(planText); return; }
    if (path.indexOf(ROOT_POSTS + '/') === 0) {
      var name = path.split('/').pop();
      var post = DATA.posts.filter(function (p) { return slug(p.url) + '.md' === name; })[0];
      if (!post) { cb(null, 'cat: ' + name + ': no such file or directory'); return; }
      fetchText(post.url, function (t) {
        cb(t + '\n\nopen it in the browser: read ' + (DATA.posts.indexOf(post) + 1));
      });
      return;
    }
    cb(null, 'cat: ' + path.replace('~/', '') + ': no such file or directory');
  }

  function cat(path, opts) {
    opts = opts || {};
    if (path === '~' || dirs()[path]) {
      addLine('cat: ' + path.replace('~/', '') + ': is a directory', 'err');
      return;
    }
    readFile(path, function (text, err) {
      if (err) { addLine(err, 'err'); return; }
      addBlob(opts.n ? numberLines(text) : text);
    });
  }
  /* ---- static text ----------------------------------------------------- */

  var ART = window.TERM_ART || { harya: [], cat: [], monitor: [] };

  var tagline = 'security, systems, ai, thoughts.';

  function bannerLines() {
    return (ART.harya || ['bhanuharya@sec']).slice().concat(['']);
  }

  var notesText = [
    'this site is notes, experiments, and things i want to remember:',
    'security work, self hosting, small programs, and the occasional',
    'machine that refuses to cooperate.',
    '',
    'nothing here is a product announcement and nothing here is advice.',
    'it is a plain page on purpose: it loads fast, it reads on anything,',
    'and it will still open in ten years.'
  ].join('\n');

  var planText = [
    '.plan, the old finger convention. mine says:',
    '',
    '  read more source, write fewer abstractions, keep the notes.',
    '  ship the small tool, then delete half of it.',
    '',
    'this file never shows up in a plain ls. try ls -la :-)'
  ].join('\n');

  var linksText = [
    'github     https://github.com/bhanuharya',
    'linkedin   https://www.linkedin.com/in/wishnumurti',
    'rss        https://bhanuharya.github.io/feed.xml',
    'blog       https://bhanuharya.github.io/blog/',
    'about      https://bhanuharya.github.io/about/'
  ].join('\n');

  function helpText() {
    return [
      'available commands',
      '',
      '  help              this list',
      '  ls [-laRh] [dir]  list files: -l long, -a hidden, -R recursive, -h sizes',
      '  cd <dir>          change directory, cd - goes back',
      '  cat [-n] <file>   print a file: about.txt, notes.txt, links.txt, .plan',
      '  head/tail [-n N]  first or last lines of a file',
      '  wc [-lwc] <file>  count lines, words, characters',
      '  grep [-i] <pat>   search: grep rust posts, grep -n ssrf notes.txt',
      '  pwd               print working directory',
      '  posts             list notes with numbers',
      '  read <n>          open note n in the browser',
      '  tags              list tags',
      '  links             contact and feeds',
      '  whoami            who runs this shell',
      '  uname             system info',
      '  neofetch          this shell, in a box',
      '  date              current date and time',
      '  theme [color]     green | amber | white',
      '  crt on|off        scanline texture',
      '  history           previous commands',
      '  clear             clear the screen (or ctrl+l)',
      '  pulsar            play the pulsar',
      '  banner / art      the ascii art again',
      '  exit              leave the terminal (or esc)',
      '',
      'tab completes, up and down walk history, ctrl+c cancels a line.'
    ].join('\n');
  }

  function welcomeLines() {
    var lines = [
      'getting started',
      '',
      '  1.  ls               list what is here',
      '  2.  cat about.txt    read about me',
      '  3.  posts            list the notes, then read 1',
      '  4.  neofetch         this shell in a box',
      '  5.  theme amber      try another phosphor',
      '  6.  exit             back to the plain site',
      '',
      'type help for every command. tab completes, up and down walk history.'
    ];
    var last = DATA.posts[0];
    if (last) {
      lines.push('');
      lines.push('latest note: ' + last.title + ' (' + last.date + ')  ->  read 1');
    }
    return lines;
  }

  /* ---- tiny helpers --------------------------------------------------- */

  function nowStamp() {
    var d = new Date();
    return d.toDateString() + ' ' + d.toTimeString().slice(0, 8);
  }

  function pad(s, n) {
    s = String(s);
    while (s.length < n) s += ' ';
    return s;
  }

  function wordCount() {
    var total = 0;
    DATA.posts.forEach(function (p) { total += p.words || 0; });
    return total;
  }
  /* ---- commands -------------------------------------------------------- */

  function human(n) {
    if (n === undefined || n === null) return '';
    if (n < 1024) return n + 'B';
    if (n < 1048576) return (n / 1024).toFixed(1) + 'K';
    return (n / 1048576).toFixed(1) + 'M';
  }

  function longLine(e, hum) {
    var perm = e.type === 'f' ? '-rw-r--r--' : 'drwxr-xr-x';
    return pad(perm, 12) + pad('1 harya harya', 15) +
           pad(hum ? human(e.size) : String(e.size), 8) + pad(e.date, 12) +
           e.name + (e.type === 'd' ? '/' : '');
  }

  function listDir(path, opts) {
    var m = meta(path);
    if (!m) return false;
    var items = m.filter(function (e) { return opts.all || !e.hidden; });
    if (opts.all) {
      items = [{ name: '.', type: 'd', size: 0, date: '' },
               { name: '..', type: 'd', size: 0, date: '' }].concat(items);
    }
    if (opts.long) {
      addLine('total ' + items.length, 'dim');
      items.forEach(function (e) { addLine(longLine(e, opts.human)); });
    } else {
      addLine(items.map(function (e) { return e.name + (e.type === 'd' ? '/' : ''); }).join('   '));
    }
    return true;
  }

  function cmdLs(args) {
    var flags = '', targets = [];
    args.forEach(function (a) {
      if (a.charAt(0) === '-' && a.length > 1) flags += a.slice(1);
      else targets.push(a);
    });
    var opts = {
      all: flags.indexOf('a') !== -1,
      long: flags.indexOf('l') !== -1,
      human: flags.indexOf('h') !== -1,
      rec: flags.indexOf('R') !== -1
    };
    var path = resolve(targets[0] || state.cwd);
    if (!meta(path)) {
      addLine('ls: ' + (targets[0] || path).replace('~/', '') + ': no such directory', 'err');
      return;
    }
    listDir(path, opts);
    if (opts.rec && path === '~') {
      ['~/posts', '~/tags'].forEach(function (sub) {
        addLine('');
        addLine(sub + ':', 'dim');
        listDir(sub, { all: false, long: opts.long, human: opts.human });
      });
    }
  }

  function cmdCd(args) {
    if (args[0] === '-') {
      var prev = state.prev || '~';
      state.prev = state.cwd;
      state.cwd = prev;
      renderPrompt();
      addLine(state.cwd);
      return;
    }
    var path = resolve(args[0]);
    if (!dirs()[path]) {
      addLine('cd: ' + (args[0] || '') + ': no such directory', 'err');
      return;
    }
    state.prev = state.cwd;
    state.cwd = path;
    renderPrompt();
  }

  function cmdPosts() {
    if (!DATA.posts.length) { addLine('no notes yet.', 'dim'); return; }
    DATA.posts.forEach(function (p, i) {
      addLine(pad(String(i + 1) + '.', 4) + pad(p.date, 13) + p.title);
      addLine('    ' + (p.tags || []).map(function (t) { return '#' + t; }).join(' ') +
              '  ·  ' + Math.max(1, Math.round((p.words || 0) / 200)) + ' min', 'dim');
    });
    addLine('');
    addLine('read 1  reads the newest note, read 2 the next one.', 'dim');
  }

  function cmdRead(args) {
    var n = parseInt(args[0], 10);
    if (args[0] === 'last') n = DATA.posts.length;
    if (!n || n < 1 || n > DATA.posts.length) {
      addLine('read: pick a number between 1 and ' + DATA.posts.length + ' (see posts)', 'err');
      return;
    }
    var post = DATA.posts[n - 1];
    addLine('opening ' + post.title, 'dim');
    addLine(post.url, 'dim');
    setTimeout(function () { window.location.href = post.url; }, 550);
  }

  function cmdTags() {
    var counts = {};
    DATA.posts.forEach(function (p) {
      (p.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    });
    var names = Object.keys(counts).sort();
    if (!names.length) { addLine('no tags yet.', 'dim'); return; }
    addLine(names.map(function (t) { return '#' + t + '(' + counts[t] + ')'; }).join('  '));
    addLine('');
    addLine('the blog page filters by tag: ' + location.origin + '/blog/', 'dim');
  }

  function cmdLinks() {
    var items = [
      ['github.com/bhanuharya', 'https://github.com/bhanuharya'],
      ['linkedin.com/in/wishnumurti', 'https://www.linkedin.com/in/wishnumurti'],
      ['/blog/', '/blog/'],
      ['/about/', '/about/'],
      ['rss', '/feed.xml']
    ];
    items.forEach(function (it) {
      addHTML(pad(it[0], 26) + '<a href="' + it[1] + '">' + it[1] + '</a>');
    });
  }

  function cmdWhoami() {
    addLine('harya, information security. builds small tools, reads too much, keeps notes here.');
  }

  function cmdUname() {
    addLine('bhanuharya.github.io static-site 2026 x86_64 (jekyll, no javascript framework)');
  }

  function cmdNeofetch() {
    var art = (ART.monitor || []).slice();
    var info = [
      'bhanuharya@sec',
      '---------------',
      'site     bhanuharya.github.io',
      'shell    terminal.js',
      'theme    ' + (document.documentElement.getAttribute('data-term') || 'green'),
      'notes    ' + DATA.posts.length + ' (' + wordCount().toLocaleString() + ' words)',
      'tags     ' + allTags().length,
      'hosting  github pages',
      'uptime   since 2026 :-)'
    ];
    var rows = Math.max(art.length, info.length);
    for (var i = 0; i < rows; i++) {
      addLine(pad(art[i] || '', 21) + (info[i] || ''));
    }
  }

  function cmdTheme(args) {
    var name = (args[0] || '').toLowerCase();
    if (['green', 'amber', 'white'].indexOf(name) === -1) {
      addLine('theme: green | amber | white', 'dim');
      return;
    }
    document.documentElement.setAttribute('data-term', name);
    try { localStorage.setItem('term-theme', name); } catch (e) {}
    addLine('theme set to ' + name);
  }

  function cmdCrt(args) {
    var v = (args[0] || '').toLowerCase();
    if (v !== 'on' && v !== 'off') { addLine('crt: on | off', 'dim'); return; }
    document.documentElement.setAttribute('data-crt', v);
    try { localStorage.setItem('term-crt', v); } catch (e) {}
    addLine('crt ' + v);
  }

  function cmdSudo(args) {
    addLine('harya is not in the sudoers file. this incident has been reported :-)', 'err');
    if (args.length) addLine('(it has not, there is nowhere to report it, this is a static page)', 'dim');
  }

  function cmdPulsar() {
    var rows = 7, cols = 58, phase = 0;
    var el = addBlob('', 'dim');
    var timer = setInterval(function () {
      var out = [];
      for (var r = 0; r < rows; r++) {
        var line = '';
        for (var c = 0; c < cols; c++) {
          var v = (Math.sin(c / cols * Math.PI * 4 + phase + r * 0.45) + 1) / 2;
          line += (rows - 1 - r) <= v * rows ? '#' : ' ';
        }
        out.push(line);
      }
      el.textContent = out.join('\n');
      scrollDown();
      phase += 0.22;
    }, 95);
    setTimeout(function () {
      clearInterval(timer);
      addLine('pulsar PSR B1919+21, 1.337 seconds, drawn in ascii. :-)', 'dim');
    }, 5200);
  }
  function parseFlags(args) {
    var flags = '', rest = [];
    args.forEach(function (a) {
      if (a.charAt(0) === '-' && a.length > 1) flags += a.slice(1);
      else rest.push(a);
    });
    return { flags: flags, args: rest };
  }

  function cmdWc(args) {
    var f = parseFlags(args);
    var target = f.args[0];
    if (!target) { addLine('wc: usage: wc [-l] [-w] [-c] <file>', 'err'); return; }
    readFile(resolve(target), function (text, err) {
      if (err) { addLine(err, 'err'); return; }
      var all = !f.flags;
      var out = [];
      if (all || f.flags.indexOf('l') !== -1) out.push(pad(String(text.split('\n').length), 7) + 'lines');
      if (all || f.flags.indexOf('w') !== -1) out.push(pad(String(text.split(/\s+/).filter(Boolean).length), 7) + 'words');
      if (all || f.flags.indexOf('c') !== -1) out.push(pad(String(text.length), 7) + 'chars');
      addLine(out.join('  ') + '   ' + target);
    });
  }

  function cmdHeadTail(args, mode) {
    var f = parseFlags(args);
    var rest = f.args.slice();
    var n = 10;
    if (rest.length > 1 && /^\d+$/.test(rest[rest.length - 1])) n = parseInt(rest.pop(), 10);
    else if (rest.length > 1 && /^\d+$/.test(rest[0])) n = parseInt(rest.shift(), 10);
    var target = rest[0];
    if (!target) { addLine(mode + ': usage: ' + mode + ' [-n N] <file>', 'err'); return; }
    readFile(resolve(target), function (text, err) {
      if (err) { addLine(err, 'err'); return; }
      var lines = text.split('\n');
      addBlob((mode === 'head' ? lines.slice(0, n) : lines.slice(-n)).join('\n'));
    });
  }

  function cmdGrep(args) {
    var f = parseFlags(args);
    var pattern = f.args[0];
    var target = f.args[1];
    if (!pattern) { addLine('grep: usage: grep [-i] <pattern> [file | posts | tags]', 'err'); return; }
    var rx;
    try {
      rx = new RegExp(pattern, f.flags.indexOf('i') !== -1 ? 'i' : '');
    } catch (e) {
      addLine('grep: bad pattern', 'err');
      return;
    }

    function scan(name, text) {
      var hits = text.split('\n').filter(function (l) { return rx.test(l); })
        .map(function (l) { return l.trim(); })
        .filter(function (l) { return l.length; });
      if (hits.length) {
        addLine(name, 'dim');
        hits.slice(0, 10).forEach(function (l) { addLine('  ' + l.slice(0, 110)); });
        if (hits.length > 10) addLine('  ... ' + (hits.length - 10) + ' more matching lines', 'dim');
      }
      return hits.length;
    }

    if (!target || target === 'posts' || target === '~/posts') {
      var total = 0, i = 0;
      (function next() {
        if (i >= DATA.posts.length) {
          if (!total) { addLine('no matches in ' + DATA.posts.length + ' notes', 'dim'); }
          return;
        }
        var p = DATA.posts[i++];
        fetchText(p.url, function (t) {
          total += scan(slug(p.url) + '.md', t);
          next();
        });
      })();
      return;
    }
    if (target === 'tags' || target === '~/tags') {
      var hits = allTags().filter(function (t) { return rx.test(t); });
      addLine(hits.length ? hits.join('   ') : 'no matching tags');
      return;
    }
    readFile(resolve(target), function (text, err) {
      if (err) { addLine(err, 'err'); return; }
      if (!scan(resolve(target).replace('~/', ''), text)) addLine('no matches', 'dim');
    });
  }

  /* ---- dispatch -------------------------------------------------------- */

  var CMDS = {
    help: function () { addBlob(helpText()); },
    banner: function () { bannerLines().forEach(function (l) { addLine(l, 'banner'); }); },
    art: function () { (ART.cat || []).forEach(function (l) { addLine(l, 'banner'); }); },
    ls: cmdLs,
    dir: cmdLs,
    cd: cmdCd,
    pwd: function () { addLine(state.cwd); },
    posts: cmdPosts,
    notes: cmdPosts,
    read: cmdRead,
    open: cmdRead,
    tags: cmdTags,
    wc: cmdWc,
    grep: cmdGrep,
    head: function (a) { cmdHeadTail(a, 'head'); },
    tail: function (a) { cmdHeadTail(a, 'tail'); },
    links: cmdLinks,
    contact: cmdLinks,
    whoami: cmdWhoami,
    uname: cmdUname,
    neofetch: cmdNeofetch,
    date: function () { addLine(nowStamp()); },
    theme: cmdTheme,
    crt: cmdCrt,
    sudo: cmdSudo,
    pulsar: cmdPulsar,
    clear: function () { clearScreen(); },
    cls: function () { clearScreen(); },
    history: function () {
      state.history.forEach(function (h, i) { addLine(pad(String(i + 1), 5) + h); });
    },
    echo: function (args) { addLine(args.join(' ')); },
    exit: function () { closeSession(); },
    quit: function () { closeSession(); },
    logout: function () { closeSession(); }
  };

  function run(line) {
    var parts = line.split(/\s+/);
    var name = (parts[0] || '').toLowerCase();
    var args = parts.slice(1);
    if (!name) return;

    if (name === 'cat' || name === 'less' || name === 'more') {
      var cf = parseFlags(args);
      if (!cf.args.length) {
        addLine('cat: missing operand', 'err');
        (ART.cat || []).forEach(function (l) { addLine(l, 'banner'); });
        addLine('have a cat instead. try cat about.txt or cat notes.txt', 'dim');
        return;
      }
      cat(resolve(cf.args[0]), { n: cf.flags.indexOf('n') !== -1 });
      return;
    }
    var fn = CMDS[name];
    if (!fn) {
      addLine('command not found: ' + name, 'err');
      addLine('type help for what exists here.', 'dim');
      return;
    }
    try {
      fn(args);
    } catch (err) {
      addLine('error: ' + (err && err.message ? err.message : 'something broke'), 'err');
    }
  }

  /* ---- tab completion -------------------------------------------------- */

  function complete() {
    var buf = state.buffer;
    var trailingSpace = /\s$/.test(buf);
    var parts = buf.split(/\s+/).filter(Boolean);

    if (parts.length <= 1 && !trailingSpace) {
      var prefix = parts[0] || '';
      var hits = Object.keys(CMDS).filter(function (k) { return k.indexOf(prefix) === 0; });
      if (hits.length === 1) state.buffer = hits[0] + ' ';
      else if (hits.length > 1) { addLine(promptText() + buf); addLine(hits.join('   ')); }
      renderPrompt();
      return;
    }

    var last = trailingSpace ? '' : parts[parts.length - 1];
    var parent = resolve(parts.length > 1 ? parts.slice(1, -1).join('/') : '');
    var map = dirs();
    var entries = map[parent] || [];
    var hits2 = entries.filter(function (e) { return e.indexOf(last) === 0; });
    if (hits2.length === 1) {
      var head = parts.slice(0, -1).join(' ') + (parts.length > 1 ? ' ' : '');
      state.buffer = head + hits2[0];
      if (/\/$/.test(hits2[0])) state.buffer = state.buffer.replace(/\/$/, '');
      renderPrompt();
    } else if (hits2.length > 1) {
      addLine(promptText() + buf);
      addLine(hits2.join('   '));
      renderPrompt();
    }
  }

  /* ---- leaving --------------------------------------------------------- */

  function closeSession() {
    if (!state.alive) return;
    state.alive = false;
    addLine('logout', 'dim');
    addLine('closing session, back to the plain page...', 'dim');
    setTimeout(function () { window.location.href = '/'; }, 600);
  }

  /* ---- boot ------------------------------------------------------------ */

  function restorePrefs() {
    try {
      var t = localStorage.getItem('term-theme');
      if (t) document.documentElement.setAttribute('data-term', t);
      var c = localStorage.getItem('term-crt');
      if (c) document.documentElement.setAttribute('data-crt', c);
    } catch (e) {}
  }

  function boot() {
    restorePrefs();
    bannerLines().forEach(function (l) { addLine(l, 'banner'); });
    if (!(ART.harya || []).length) { addLine('bhanuharya@sec', 'banner'); }
    addLine('terminal.js v1.0, a small shell over a static site', 'dim');
    addLine('');
    welcomeLines().forEach(function (l) { addLine(l, l ? '' : 'dim'); });
    addLine('');
    renderPrompt();
    focusCatcher();
  }

  boot();

  /* debug and screenshot hook: /terminal/?cmd=help;posts */
  try {
    var scripted = new URLSearchParams(window.location.search).get('cmd');
    if (scripted) {
      scripted.split(';').forEach(function (c) {
        if (c.trim()) { echoCommand(c.trim()); run(c.trim()); }
      });
      renderPrompt();
    }
  } catch (e) {}
})();
