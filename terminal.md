---
layout: terminal
title: "Terminal"
permalink: /terminal/
---

<h1 class="visually-hidden">harya, information security, systems, and self hosting</h1>

<article class="term" aria-label="Terminal introduction">
  <div class="term-bar">
    <div class="term-controls" aria-label="Terminal window controls">
      <button type="button" class="term-dot term-dot-close" id="term-close-btn" title="Reset terminal" aria-label="Reset terminal"></button>
      <button type="button" class="term-dot term-dot-min" id="term-min-btn" title="Minimize / toggle terminal" aria-label="Minimize terminal"></button>
      <button type="button" class="term-dot term-dot-max" id="term-max-btn" title="Maximize / fullscreen workstation (press 'f')" aria-label="Maximize terminal"></button>
    </div>
    <span class="term-title">bhanuharya@sec : zsh (tty1)</span>
    <div class="term-actions">
      <span class="term-badge">tty</span>
    </div>
  </div>

  <div class="term-body">
    <pre class="banner" aria-hidden="true">┌──────────────────────────────┐
│  &gt;_ init_session <span class="banner-status">--status 200</span>│
│  [<span class="banner-progress">■■■■■■■■■■■■■■■</span>□□] 85%     │
└──────────────────────────────┘</pre>

    <pre class="boot-sequence" aria-hidden="true"><span class="boot-line boot-line-1">[ boot ] personal workspace</span>
<span class="boot-line boot-line-2">[ load ] interests and notes</span>
<span class="boot-line boot-line-3">[ link ] <span class="boot-spinner" aria-hidden="true"><span>|</span><span>/</span><span>_</span><span>\</span></span> ready</span></pre>

    <div class="line">
      <span class="prompt">bhanuharya@sec</span><span class="loc">:~$</span> <span class="cmd">whoami</span>
    </div>

    <div class="out">
      <p>harya / wishnu. information security and systems.</p>
    </div>

    <div class="line">
      <span class="prompt">bhanuharya@sec</span><span class="loc">:~$</span> <span class="cmd">cat interests.txt</span>
    </div>

    <div class="out">
      <pre class="ascii-tree">├── infosec
│   └── computer security and network security
├── privacy
├── Linux and open source software
├── AI and agentic systems
├── financial markets and economics
└── security, intelligence, and geopolitics</pre>
    </div>

    <div class="line">
      <span class="prompt">bhanuharya@sec</span><span class="loc">:~$</span> <span class="cmd">cat outside_work.txt</span>
    </div>

    <div class="out">
      <pre class="ascii-tree">├── music
└── tinkering with things that probably did not need tinkering</pre>
    </div>

    <section id="about" class="about-section" aria-labelledby="about-heading">
      <div class="line">
        <span class="prompt">bhanuharya@sec</span><span class="loc">:~$</span> <span class="cmd">cat about.txt</span>
      </div>

      <div class="out about-copy">
        <h2 id="about-heading" class="visually-hidden">about</h2>
        <p>Hi, I’m Harya / Wishnu. I work in information security, mostly around financial systems and the infrastructure behind them. I got into security by tinkering with Linux and computers, and never really stopped.</p>
        <p>I studied computer science/informatics at Bandung Institute of Technology (ITB). My interests include AI, privacy, open source, self-hosting, music, and computers.</p>
        <p>This site is for notes, experiments, and things I want to remember :-)</p>
        <p class="about-links"><a href="https://github.com/bhanuharya" rel="me">github.com/bhanuharya</a><br><a href="https://www.linkedin.com/in/wishnumurti" rel="me">linkedin.com/in/wishnumurti</a></p>
      </div>

      <pre class="about-signal" aria-hidden="true"><span>.[</span><span class="signal-frame">=</span><span>] ready</span></pre>
    </section>

    <div class="line">
      <span class="prompt">bhanuharya@sec</span><span class="loc">:~$</span> <span class="cmd">ls</span>
    </div>

    <div class="out">
      <div class="cmdlist">
        <div class="entry"><span class="idx">[1]</span> <a href="{{ '/about/' | relative_url }}">about</a><span class="dim"> : more about me</span></div>
        <div class="entry"><span class="idx">[2]</span> <a href="{{ '/blog/' | relative_url }}">blog</a><span class="dim"> : notes and experiments</span></div>
      </div>
    </div>

    <form class="visitor-cli" data-visitor-cli autocomplete="off" novalidate>
      <div class="visitor-history" data-visitor-history aria-live="polite"></div>
      <div class="line visitor-cli-line visitor-cli-current">
        <label class="prompt cli-prefix" for="visitor-command">visitor@sec:~$</label>
        <input id="visitor-command" role="combobox" name="command" type="text" spellcheck="false" autocapitalize="none" autocomplete="off" maxlength="128" aria-autocomplete="list" aria-controls="visitor-suggestions" aria-describedby="visitor-cli-help visitor-privacy" placeholder="type help or search...">
      </div>
      <div id="visitor-cli-help" class="visitor-cli-help">tab / ↑↓ : history &amp; complete · enter : run · esc : dismiss · type <span>help</span> for commands</div>
      <div id="visitor-suggestions" class="visitor-suggestions" role="listbox" aria-label="Command suggestions"></div>
      <p id="visitor-privacy" class="visitor-privacy dim">runs locally in your browser. no input is sent anywhere. hosting logs might still exist, but not from this page :-)</p>
      <noscript><p class="dim" style="margin-top:0.5rem">javascript is off. use the links above: <a href="{{ '/about/' | relative_url }}">about</a> · <a href="{{ '/blog/' | relative_url }}">blog</a></p></noscript>
    </form>

    <div class="pulsar-wrap" data-pulsar-waves hidden aria-label="Pulsar PSR B1919+21 radio wave profile">
      <svg
        class="pulsar-svg"
        data-source="{{ '/assets/unknown-pleasures/index.html' | relative_url }}"
        viewBox="0 0 630 810"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      ></svg>
      <div class="pulsar-caption">
        <span><kbd style="font:inherit;color:var(--cli-amber)">w</kbd> or <code style="font:inherit;color:var(--cli-cyan)">waves</code> to toggle</span>
        <span class="pulsar-credit">svg source: <a href="https://codepen.io/jessenwells/pen/pJrJjp" rel="noopener noreferrer">jessenwells on codepen</a> · <a href="{{ '/assets/unknown-pleasures/LICENSE.txt' | relative_url }}">mit license</a></span>
      </div>
    </div>
  </div>
</article>

{% assign recent = site.posts | limit: 3 %}
<section class="latest" aria-labelledby="latest-heading">
  <div class="latest-head">
    <h2 id="latest-heading" class="latest-title">latest notes</h2>
    <a class="latest-all" href="{{ '/blog/' | relative_url }}">view all →</a>
  </div>
  {% if recent.size > 0 %}
    <ul class="latest-list">
      {% for post in recent %}
        {% assign words = post.content | number_of_words %}
        {% assign mins = words | divided_by: 200 %}
        {% if mins == 0 %}{% assign mins = 1 %}{% endif %}
        <li class="latest-item">
          {% if forloop.first %}
            <article class="latest-card">
              <h3 class="latest-card-title"><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></h3>
              <div class="latest-meta">
                <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: '%b %-d, %Y' }}</time>
                <span aria-hidden="true"> · </span><span>{{ mins }} min read</span>
                {% if post.tags and post.tags.size > 0 %}<span aria-hidden="true"> · </span><span class="latest-tags">{{ post.tags | join: ', ' }}</span>{% endif %}
              </div>
              <div class="latest-excerpt">{{ post.excerpt | strip_html | truncatewords: 28 }}</div>
              <a class="latest-cta" href="{{ post.url | relative_url }}">read →</a>
            </article>
          {% else %}
            <article class="latest-row">
              <h3 class="latest-row-title"><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></h3>
              <div class="latest-meta">
                <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: '%b %-d, %Y' }}</time>
                <span aria-hidden="true"> · </span><span>{{ mins }} min read</span>
                {% if post.tags and post.tags.size > 0 %}<span aria-hidden="true"> · </span><span class="latest-tags">{{ post.tags | join: ', ' }}</span>{% endif %}
              </div>
            </article>
          {% endif %}
        </li>
      {% endfor %}
    </ul>
  {% else %}
    <p class="dim">no posts yet. check back soon :-)</p>
  {% endif %}
</section>

<script>
(() => {
  const form = document.querySelector('[data-visitor-cli]');
  if (!form) return;

  const input = form.querySelector('#visitor-command');
  const suggestions = form.querySelector('#visitor-suggestions');
  const historyContainer = form.querySelector('[data-visitor-history]');
  const blogUrl = "{{ '/blog/' | relative_url }}";
  const aboutUrl = "{{ '/about/' | relative_url }}";
  const startTime = Date.now();

  const sitePosts = [
    {% for p in site.posts %}
    {
      title: {{ p.title | jsonify }},
      url: {{ p.url | relative_url | jsonify }},
      date: "{{ p.date | date: '%b %-d, %Y' }}",
      tags: {{ p.tags | jsonify }}
    }{% unless forloop.last %},{% endunless %}
    {% endfor %}
  ];

  const commands = [
    'about', 'cal', 'cat', 'cde', 'clear', 'cowsay', 'crt', 'date', 'dmesg',
    'echo', 'fetch', 'fortune', 'fullscreen', 'game', 'games', 'hack', 'help',
    'history', 'interests', 'ip', 'latest', 'ls', 'matrix', 'maximize', 'neofetch',
    'outside_work', 'pong', 'posts', 'pulsar', 'search', 'skills', 'snake',
    'solaris', 'sound', 'stack', 'status', 'sudo', 'theme', 'tree', 'uname',
    'uptime', 'visitor', 'wargame', 'waves', 'whoami'
  ];

  const files = ['about.txt', 'interests.txt', 'outside_work.txt', 'skills.txt', 'sys_config.json'];
  const themeList = ['default', 'solaris', 'pulsar', 'matrix', 'amber', 'cyber', 'monochrome'];

  let history = [];
  let historyIdx = -1;
  let matches = [];
  let matchIndex = -1;

  // Window titlebar control buttons
  const termEl = document.querySelector('.term');
  const closeBtn = document.getElementById('term-close-btn');
  const minBtn = document.getElementById('term-min-btn');
  const maxBtn = document.getElementById('term-max-btn');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (historyContainer) historyContainer.replaceChildren();
      if (window.TerminalGames && window.TerminalGames.stopActiveGame) window.TerminalGames.stopActiveGame();
      if (window.TerminalGames && window.TerminalGames.Sound) window.TerminalGames.Sound.degauss();
      input.value = '';
      matches = [];
      matchIndex = -1;
      renderSuggestions();
      input.focus();
    });
  }

  if (minBtn && termEl) {
    minBtn.addEventListener('click', () => {
      termEl.classList.toggle('is-minimized');
      if (window.TerminalGames && window.TerminalGames.Sound) window.TerminalGames.Sound.click();
    });
  }

  if (maxBtn && termEl) {
    maxBtn.addEventListener('click', () => {
      termEl.classList.toggle('is-maximized');
      if (window.TerminalGames && window.TerminalGames.Sound) window.TerminalGames.Sound.click();
    });
  }

  const createVisitorCommandLine = (cmdText) => {
    const cmdLine = document.createElement('div');
    cmdLine.className = 'line';

    const prompt = document.createElement('span');
    prompt.className = 'prompt';
    prompt.textContent = 'visitor@sec';

    const location = document.createElement('span');
    location.className = 'loc';
    location.textContent = ':~$';

    const command = document.createElement('span');
    command.className = 'cmd';
    command.textContent = cmdText;

    cmdLine.append(prompt, location, document.createTextNode(' '), command);
    return cmdLine;
  };

  const scrollToVisitorPrompt = () => {
    const reducedMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    input.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  };

  const appendEntry = (cmdText, lines = [], links = []) => {
    const entry = document.createElement('div');
    entry.className = 'visitor-history-entry';
    entry.appendChild(createVisitorCommandLine(cmdText));

    if (lines.length || links.length) {
      const out = document.createElement('div');
      out.className = 'visitor-cli-output';

      if (lines.length) {
        const block = document.createElement('pre');
        block.className = 'visitor-cli-block';
        block.textContent = lines.join('\n');
        out.appendChild(block);
      }

      links.forEach(({ label, href }) => {
        const link = document.createElement('a');
        link.href = href;
        link.textContent = label;
        out.appendChild(link);
      });
      entry.appendChild(out);
    }

    historyContainer.appendChild(entry);
    scrollToVisitorPrompt();
  };

  const updateAria = () => {
    if (matches.length) {
      input.setAttribute('aria-expanded', 'true');
      const activeId = matchIndex >= 0 ? `suggestion-${matchIndex}` : '';
      if (activeId) input.setAttribute('aria-activedescendant', activeId);
      else input.removeAttribute('aria-activedescendant');
    } else {
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }
  };

  const renderSuggestions = () => {
    suggestions.replaceChildren();
    matches.forEach((command, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.id = `suggestion-${index}`;
      item.className = 'visitor-suggestion';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', index === matchIndex ? 'true' : 'false');
      item.textContent = command;
      if (index === matchIndex) item.classList.add('is-selected');
      item.addEventListener('click', () => {
        input.value = command;
        matches = [];
        matchIndex = -1;
        renderSuggestions();
        updateAria();
        input.focus();
      });
      suggestions.appendChild(item);
    });
    updateAria();
  };

  const run = () => {
    const raw = input.value.trim();
    if (!raw) return;

    history.push(raw);
    historyIdx = history.length;

    const parts = raw.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    if (cmd === 'clear') {
      historyContainer.replaceChildren();
      if (window.TerminalGames && window.TerminalGames.stopActiveGame) window.TerminalGames.stopActiveGame();
      input.value = '';
      matches = [];
      matchIndex = -1;
      renderSuggestions();
      return;
    }

    switch (cmd) {
      case 'help':
      case '?':
        appendEntry(raw, [
          'AVAILABLE COMMANDS & UTILITIES:',
          '',
          'NAVIGATION & IDENTITY',
          '  whoami / about       Identify author & systems engineering background',
          '  skills / stack       Technical capabilities, tools & security matrix',
          '  interests            Research focus & low-level computing topics',
          '  outside_work         Offline pursuits and hacking interests',
          '  posts / blog         List all published notes and articles',
          '  latest               Show newest note and summary',
          '  search <term>        Search notes and tags (e.g. search agent)',
          '  ls [-la]             List virtual filesystem directory contents',
          '  cat <filename>       Print file contents (e.g. cat skills.txt)',
          '  tree                 Display virtual filesystem hierarchy tree',
          '',
          'EXPERIMENTS & SIGNALS',
          '  snake                Play classic 8-bit Snake inside the terminal',
          '  pong                 Play 1-Player Pong paddle match vs CPU',
          '  hack / wargame       Cipher memory puzzle',
          '  game / games         Show retro terminal arcade games list',
          '  waves / pulsar       Toggle Joy Division pulsar wave line visualizer',
          '  matrix               Cascading terminal signal stream',
          '',
          'SYSTEM, DISPLAY & WORKSTATION',
          '  crt [on|off]         Toggle retro CRT scanlines & phosphor monitor glow',
          '  theme <name>         Switch theme (solaris|pulsar|matrix|amber|cyber|default)',
          '  sound [on|off]       Toggle synthesized 8-bit keystroke audio & beeps',
          '  solaris / cde        Display SunOS Solaris CDE workstation details',
          '  fullscreen / max     Toggle terminal fullscreen workstation mode',
          '  neofetch / fetch     Display system dashboard & specs',
          '  history              Show session command history',
          '  fortune              Display hacker/Unix engineering aphorism',
          '  cowsay <text>        ASCII cow speaker banner',
          '  dmesg / cal / uname  Unix kernel log, month calendar, OS info',
          '  ip / status          Session environment & strict privacy info',
          '  clear                Clear the terminal scrollback'
        ]);
        break;

      case 'game':
      case 'games':
        appendEntry(raw, [
          '┌─────────────────────────────────────────────────────────────┐',
          '│                 TERMINAL EXPERIMENTS                        │',
          '├───────────────┬─────────────────────────────────────────────┤',
          '│ snake         │ Classic 8-bit Snake with high score saving  │',
          '│ pong          │ Arcade 1-Player Pong paddle match vs CPU    │',
          '│ hack          │ Cipher memory puzzle                        │',
          '│ matrix        │ Cascading terminal signal stream            │',
          '│ waves         │ Joy Division pulsar wave line visualizer    │',
          '└───────────────┴─────────────────────────────────────────────┘',
          'Type any command above (e.g. "snake" or "pong") to launch.'
        ]);
        break;

      case 'snake':
        {
          const entry = document.createElement('div');
          entry.className = 'visitor-history-entry';
          entry.appendChild(createVisitorCommandLine(raw));
          const gameContainer = document.createElement('div');
          entry.appendChild(gameContainer);
          historyContainer.appendChild(entry);
          scrollToVisitorPrompt();
          if (window.TerminalGames) {
            window.TerminalGames.startSnake(gameContainer, (finalScore) => {
              appendEntry('snake [exit]', [`Snake session finished. Final Score: ${finalScore}`]);
              input.focus();
            });
          }
        }
        break;

      case 'pong':
        {
          const entry = document.createElement('div');
          entry.className = 'visitor-history-entry';
          entry.appendChild(createVisitorCommandLine(raw));
          const gameContainer = document.createElement('div');
          entry.appendChild(gameContainer);
          historyContainer.appendChild(entry);
          scrollToVisitorPrompt();
          if (window.TerminalGames) {
            window.TerminalGames.startPong(gameContainer, (score) => {
              appendEntry('pong [exit]', [`Pong match ended. Your score: ${score}`]);
              input.focus();
            });
          }
        }
        break;

      case 'hack':
      case 'wargame':
        {
          const entry = document.createElement('div');
          entry.className = 'visitor-history-entry';
          entry.appendChild(createVisitorCommandLine(raw));
          const gameContainer = document.createElement('div');
          entry.appendChild(gameContainer);
          historyContainer.appendChild(entry);
          scrollToVisitorPrompt();
          if (window.TerminalGames) {
            window.TerminalGames.startHack(gameContainer, () => {
              appendEntry('hack [exit]', ['Memory override session terminated.']);
              input.focus();
            });
          }
        }
        break;

      case 'crt':
        if (args === 'on') {
          if (window.setCRT) window.setCRT(true);
          appendEntry(raw, ['CRT monitor scanline mode ENABLED.']);
        } else if (args === 'off') {
          if (window.setCRT) window.setCRT(false);
          appendEntry(raw, ['CRT monitor scanline mode DISABLED.']);
        } else {
          if (window.toggleCRT) window.toggleCRT();
          const isNow = localStorage.getItem('term-crt') === '1';
          appendEntry(raw, [`CRT monitor mode toggled: ${isNow ? 'ON' : 'OFF'}`]);
        }
        break;

      case 'waves':
      case 'pulsar':
        if (args.startsWith('lines')) {
          const n = parseInt(args.split(/\s+/)[1], 10);
          if (window.PulsarWaves) window.PulsarWaves.setLines(n);
          appendEntry(raw, [`Pulsar wave lines updated to: ${n || 46}`]);
        } else if (args === 'off' || args === 'hide') {
          const pw = document.querySelector('[data-pulsar-waves]');
          if (pw) { pw.setAttribute('hidden', ''); pw.style.display = 'none'; }
          if (window.PulsarWaves) window.PulsarWaves.stop();
          appendEntry(raw, ['Joy Division pulsar wave visualization HIDDEN.']);
        } else if (args === 'on' || args === 'show') {
          const pw = document.querySelector('[data-pulsar-waves]');
          if (pw) { pw.removeAttribute('hidden'); pw.style.display = 'block'; }
          if (window.PulsarWaves) { window.PulsarWaves.start(); }
          appendEntry(raw, ['Joy Division pulsar wave visualization ACTIVE.']);
        } else {
          const pw = document.querySelector('[data-pulsar-waves]');
          let shown = false;
          if (window.PulsarWaves) {
            shown = window.PulsarWaves.toggle();
          } else if (pw) {
            shown = pw.hasAttribute('hidden') || pw.style.display === 'none';
            pw.toggleAttribute('hidden', !shown);
            pw.style.display = shown ? 'block' : 'none';
            pw.classList.toggle('is-paused', !shown);
            if (shown) pw.classList.add('is-user-activated');
          }
          appendEntry(raw, [`Joy Division Pulsar wave toggled: ${shown ? 'SHOWN' : 'HIDDEN'}`]);
        }
        break;

      case 'solaris':
      case 'cde':
        appendEntry(raw, [
          '  .--------------------------------------------------.',
          ' /  +----------------------------------------------+  \\',
          '|   |  SunOS Release 5.11 Generic (Solaris CDE)    |   |',
          '|   |  Architecture: sun4u / SPARC-Enterprise-M4000|   |',
          '|   |  Kernel: SunOS 5.11 64-bit multi-user        |   |',
          '|   |  CDE Desktop Manager: Session 1.6 (Online)   |   |',
          ' \\  +----------------------------------------------+  /',
          '  \'--------------------------------------------------\'',
          'Workstation status: Normal · Secure enclave active.'
        ]);
        break;

      case 'sound':
      case 'audio':
        if (args === 'on') {
          if (window.TerminalGames && window.TerminalGames.Sound) window.TerminalGames.Sound.setEnabled(true);
          appendEntry(raw, ['Synthesized retro audio ENABLED. Enjoy the 8-bit clicks and chimes!']);
        } else if (args === 'off') {
          if (window.TerminalGames && window.TerminalGames.Sound) window.TerminalGames.Sound.setEnabled(false);
          appendEntry(raw, ['Synthesized audio MUTED.']);
        } else {
          const current = window.TerminalGames && window.TerminalGames.Sound && window.TerminalGames.Sound.isEnabled();
          const next = !current;
          if (window.TerminalGames && window.TerminalGames.Sound) window.TerminalGames.Sound.setEnabled(next);
          appendEntry(raw, [`Terminal audio: ${next ? 'ON (clicks & beeps enabled)' : 'OFF (muted)'}`]);
        }
        break;

      case 'fullscreen':
      case 'maximize':
      case 'max':
        if (termEl) {
          termEl.classList.toggle('is-maximized');
          const isMax = termEl.classList.contains('is-maximized');
          appendEntry(raw, [`Terminal workstation fullscreen: ${isMax ? 'ENABLED (press F or ESC to exit)' : 'NORMAL'}`]);
        }
        break;

      case 'cowsay':
        {
          const msg = args || 'harya@sec: keep tinkering and stay curious.';
          const borderLen = msg.length + 2;
          const topBorder = ' ' + '_'.repeat(borderLen);
          const botBorder = ' ' + '-'.repeat(borderLen);
          appendEntry(raw, [
            topBorder,
            `< ${msg} >`,
            botBorder,
            '        \\   ^__^',
            '         \\  (oo)\\_______',
            '            (__)\\       )\\/\\',
            '                ||----w |',
            '                ||     ||'
          ]);
        }
        break;

      case 'fortune':
        {
          const fortunes = [
            '"There are 10 types of people in the world: those who understand binary, and those who don\'t."',
            '"Simplicity is prerequisite for reliability." - Edsger W. Dijkstra',
            '"The quieter you become, the more you are able to hear." - Kali Linux motif',
            '"UNIX is basically a simple operating system, but you have to be a genius to understand the simplicity." - Dennis Ritchie',
            '"Any sufficiently advanced technology is indistinguishable from magic." - Arthur C. Clarke',
            '"Programs must be written for people to read, and only incidentally for machines to execute." - Abelson & Sussman',
            '"The only truly secure system is one that is powered off, cast in a block of concrete and sealed in a lead-lined room." - Gene Spafford'
          ];
          const picked = fortunes[Math.floor(Math.random() * fortunes.length)];
          appendEntry(raw, [picked]);
        }
        break;

      case 'dmesg':
        appendEntry(raw, [
          '[    0.000000] Linux version 6.8.0-generic (buildd@lcy02-amd64) (gcc-13)',
          '[    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz root=UUID=7f3a... ro quiet splash',
          '[    0.142890] Initializing cgroup subsys memory, cpu, pids',
          '[    0.412039] ACPI: Core revision 20240322',
          '[    0.912440] NetFilter: WAF inspection tables active',
          '[    1.240501] Security subsystem: AppArmor + strict sandbox initialized',
          '[    1.802110] Pulsar wave generator: PSR B1919+21 synchronized',
          '[    2.105420] visitor-cli: ready on tty1'
        ]);
        break;

      case 'cal':
        {
          const now = new Date();
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          const month = now.getMonth();
          const year = now.getFullYear();
          const header = `    ${monthNames[month]} ${year}`;
          const daysRow = 'Su Mo Tu We Th Fr Sa';
          const firstDay = new Date(year, month, 1).getDay();
          const totalDays = new Date(year, month + 1, 0).getDate();
          let curRow = '   '.repeat(firstDay);
          const calLines = [header, daysRow];
          for (let day = 1; day <= totalDays; day++) {
            const dayStr = day.toString().padStart(2, ' ');
            const isToday = (day === now.getDate());
            curRow += (isToday ? `[${dayStr.trim()}]` : `${dayStr} `);
            if ((firstDay + day) % 7 === 0 || day === totalDays) {
              calLines.push(curRow);
              curRow = '';
            }
          }
          appendEntry(raw, calLines);
        }
        break;

      case 'uname':
        appendEntry(raw, ['SunOS solaris-ws1 5.11 11.4.0.15.0 sun4u sparc SUNW,SPARC-Enterprise / Linux 6.8.0-generic']);
        break;

      case 'whoami':
        appendEntry(raw, [
          'harya / wishnu',
          'information security, low-level systems, and self-hosted AI agents.'
        ], [{ label: 'view full bio (/about/) →', href: aboutUrl }]);
        break;

      case 'about':
        appendEntry(raw, [
          'hi, i’m harya / wishnu.',
          'i work in information security, mostly around financial systems and infrastructure.',
          'i studied computer science/informatics at itb, where i built a python compiler for a 32 bit risc v processor.'
        ], [{ label: 'open about page →', href: aboutUrl }]);
        break;

      case 'skills':
      case 'stack':
        appendEntry(raw, [
          '┌───────────────────┬───────────────────────────────────────────┐',
          '│ DOMAIN            │ TOOLS & CAPABILITIES                      │',
          '├───────────────────┼───────────────────────────────────────────┤',
          '│ Security          │ WAF, Network, IR, AppSec, IAM, Governance │',
          '│ Systems & Linux   │ Ubuntu, Kernel tuning, Homelab, Systemd   │',
          '│ AI & Agents       │ Hermes, Tool calling, Routing, Fallbacks  │',
          '│ Low-Level         │ RISC-V, Python compilers, C/Assembly      │',
          '└───────────────────┴───────────────────────────────────────────┘'
        ]);
        break;

      case 'interests':
        appendEntry(raw, [
          '├── infosec & network security',
          '├── privacy & self-hosting',
          '├── Linux & open-source infrastructure',
          '├── AI agent architectures & safety',
          '├── financial markets & systems',
          '└── security & intelligence'
        ]);
        break;

      case 'outside_work':
        appendEntry(raw, [
          '├── music',
          '└── tinkering with systems that probably did not need tinkering'
        ]);
        break;

      case 'neofetch':
      case 'fetch':
        const theme = window.getSiteTheme ? window.getSiteTheme() : 'default';
        const minsUptime = Math.floor((Date.now() - startTime) / 60000);
        const secsUptime = Math.floor(((Date.now() - startTime) % 60000) / 1000);
        appendEntry(raw, [
          '       ___       bhanuharya@sec',
          '     /     \\     --------------',
          '    | () () |    OS: Ubuntu 24.04 LTS x86_64 / Solaris SunOS',
          '     \\  _  /     Host: ThinkPad homelab (Ryzen 5 PRO)',
          '      \\___/      Kernel: Linux 6.8.0-generic',
          `                 Uptime: session ${minsUptime}m ${secsUptime}s`,
          '                 Shell: zsh 5.9 (visitor-cli)',
          `                 Theme: ${theme}`,
          '                 Focus: Security / Low-Level / AI Agents'
        ]);
        break;

      case 'ls':
        if (args.includes('-l') || args.includes('-la')) {
          appendEntry(raw, [
            'total 32',
            'drwxr-xr-x  2 visitor sec  4096 Aug 19 00:00 about/',
            'drwxr-xr-x  2 visitor sec  4096 Aug 19 00:00 blog/',
            '-rw-r--r--  1 visitor sec  2287 Aug 19 00:00 about.txt',
            '-rw-r--r--  1 visitor sec   420 Aug 19 00:00 interests.txt',
            '-rw-r--r--  1 visitor sec   380 Aug 19 00:00 skills.txt',
            '-rw-r--r--  1 visitor sec   150 Aug 19 00:00 outside_work.txt',
            '-rw-r--r--  1 visitor sec   218 Aug 19 00:00 sys_config.json'
          ]);
        } else {
          appendEntry(raw, [
            'about/  blog/  about.txt  interests.txt  skills.txt  outside_work.txt  sys_config.json'
          ]);
        }
        break;

      case 'cat':
        if (!args) {
          appendEntry(raw, ['usage: cat <filename>', 'available: ' + files.join(', ')]);
        } else {
          const target = args.toLowerCase();
          if (target === 'about.txt') {
            appendEntry(raw, [
              'hi, i’m harya / wishnu.',
              'i work in information security, mostly around financial systems and infrastructure.',
              'undergraduate work involved designing a python compiler for a 32 bit risc v processor.',
              'outside work: privacy, open source, self hosting, music, and computers.'
            ], [{ label: 'read more on /about/ →', href: aboutUrl }]);
          } else if (target === 'interests.txt') {
            appendEntry(raw, [
              '├── infosec & network security',
              '├── privacy',
              '├── Linux & open source',
              '├── AI & agentic systems',
              '└── financial markets & security'
            ]);
          } else if (target === 'skills.txt') {
            appendEntry(raw, [
              'security: waf, firewalls, network isolation, incident response, iam',
              'systems: linux (ubuntu/debian), systemd, virtualization, homelab',
              'agents: hermes agent framework, tool calling, memory management',
              'languages: python, c, bash, sql, riscv assembly'
            ]);
          } else if (target === 'outside_work.txt') {
            appendEntry(raw, [
              '├── music',
              '└── tinkering with things that probably did not need tinkering'
            ]);
          } else if (target === 'sys_config.json') {
            appendEntry(raw, [
              '{',
              '  "author": "bhanuharya",',
              '  "env": "production",',
              '  "analytics": false,',
              '  "tracking": false,',
              '  "security_mode": "strict"',
              '}'
            ]);
          } else {
            appendEntry(raw, [`cat: ${args}: No such file or directory`]);
          }
        }
        break;

      case 'tree':
        appendEntry(raw, [
          '.',
          '├── about/',
          '│   └── index.html',
          '├── blog/',
          ...sitePosts.map(p => `│   └── ${p.title}`),
          '├── about.txt',
          '├── interests.txt',
          '├── skills.txt',
          '└── outside_work.txt'
        ]);
        break;

      case 'matrix':
      case 'cmatrix':
        const matrixChars = '01#$*+-%!><[]{}ABCDEF';
        let matrixLines = [];
        for (let i = 0; i < 5; i++) {
          let line = '';
          for (let j = 0; j < 34; j++) {
            line += matrixChars[Math.floor(Math.random() * matrixChars.length)] + ' ';
          }
          matrixLines.push(line);
        }
        appendEntry(raw, ['[ MATRIX STREAM INITIALIZED ]', ...matrixLines, '[ STREAM COMPLETE ]']);
        break;

      case 'posts':
      case 'blog':
        if (sitePosts.length) {
          const lines = ['published notes and experiments:'];
          const links = sitePosts.map(p => ({ label: `→ [${p.date}] ${p.title}`, href: p.url }));
          appendEntry(raw, lines, links);
        } else {
          appendEntry(raw, ['no notes published yet.']);
        }
        break;

      case 'latest':
        if (sitePosts.length) {
          appendEntry(raw, [
            `LATEST NOTE: ${sitePosts[0].title}`,
            `Date: ${sitePosts[0].date}`,
            `Tags: ${sitePosts[0].tags ? sitePosts[0].tags.join(', ') : 'none'}`
          ], [{ label: 'read note →', href: sitePosts[0].url }]);
        } else {
          appendEntry(raw, ['no notes published yet.']);
        }
        break;

      case 'search':
        if (!args) {
          appendEntry(raw, ['usage: search <keyword>', 'example: search agent']);
        } else {
          const q = args.toLowerCase();
          const hits = sitePosts.filter(p =>
            p.title.toLowerCase().includes(q) ||
            (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
          );
          if (hits.length) {
            const lines = [`found ${hits.length} note(s) matching "${q}":`];
            const links = hits.map(p => ({ label: `→ [${p.date}] ${p.title}`, href: p.url }));
            appendEntry(raw, lines, links);
          } else {
            appendEntry(raw, [`no notes found matching "${q}".`]);
          }
        }
        break;

      case 'theme':
        if (!args || args === 'list') {
          appendEntry(raw, [
            'available themes: ' + themeList.join(', '),
            'usage: theme <name> (e.g. theme solaris, theme pulsar, theme matrix)'
          ]);
        } else {
          const t = args.toLowerCase();
          if (themeList.includes(t)) {
            if (window.setSiteTheme) window.setSiteTheme(t);
            appendEntry(raw, [`theme changed to: ${t}`]);
          } else {
            appendEntry(raw, [`unknown theme: ${t}`, 'available: ' + themeList.join(', ')]);
          }
        }
        break;

      case 'history':
        if (!history.length) {
          appendEntry(raw, ['no command history.']);
        } else {
          const lines = history.map((c, i) => `  ${(i + 1).toString().padStart(3, ' ')}  ${c}`);
          appendEntry(raw, ['COMMAND HISTORY:', ...lines]);
        }
        break;

      case 'date':
        appendEntry(raw, [
          `Local: ${new Date().toString()}`,
          `UTC:   ${new Date().toUTCString()}`
        ]);
        break;

      case 'uptime':
        const sec = Math.floor((Date.now() - startTime) / 1000);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        appendEntry(raw, [`session uptime: ${m}m ${s}s (host: github-pages)`]);
        break;

      case 'status':
      case 'visitor':
        appendEntry(raw, [
          'visitor session:',
          `  language:  ${navigator.language || 'unknown'}`,
          `  timezone:  ${Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'}`,
          `  viewport:  ${window.innerWidth}x${window.innerHeight}`,
          `  online:     ${navigator.onLine ? 'yes' : 'no'}`,
          `  theme:      ${window.getSiteTheme ? window.getSiteTheme() : 'default'}`,
          `  crt_mode:   ${localStorage.getItem('term-crt') === '1' ? 'enabled' : 'disabled'}`
        ]);
        break;

      case 'ip':
        appendEntry(raw, [
          'public IP lookup: disabled',
          'this site does not query third-party IP lookups or store user identifiers.',
          'hosting/CDN logs may exist separately at the network edge.'
        ]);
        break;

      case 'echo':
        appendEntry(raw, [args]);
        break;

      case 'sudo':
      case 'su':
        appendEntry(raw, [
          `visitor is not in the sudoers file. This incident will be reported.`
        ]);
        break;

      default:
        appendEntry(raw, [
          `command not found: ${cmd}`,
          'type help to see available commands'
        ]);
    }

    input.value = '';
    matches = [];
    matchIndex = -1;
    renderSuggestions();
  };

  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });

  input.addEventListener('keydown', (event) => {
    if (window.TerminalGames && window.TerminalGames.Sound) {
      window.TerminalGames.Sound.click();
    }

    if (event.key === 'Tab') {
      const v = input.value.trim().toLowerCase();
      const pool = [
        ...commands,
        ...files.map(f => 'cat ' + f),
        ...themeList.map(t => 'theme ' + t)
      ];
      matches = pool.filter((c) => c.startsWith(v));
      if (matches.length) {
        event.preventDefault();
        matchIndex = (matchIndex + (event.shiftKey ? -1 : 1) + matches.length) % matches.length;
        input.value = matches[matchIndex];
        renderSuggestions();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (history.length && historyIdx > 0) {
        historyIdx--;
        input.value = history[historyIdx];
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIdx < history.length - 1) {
        historyIdx++;
        input.value = history[historyIdx];
      } else {
        historyIdx = history.length;
        input.value = '';
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run();
    } else if (event.key === 'Escape') {
      matches = [];
      matchIndex = -1;
      renderSuggestions();
      input.blur();
    }
  });

  input.addEventListener('input', () => {
    const v = input.value.trim().toLowerCase();
    if (!v) { matches = []; matchIndex = -1; renderSuggestions(); return; }
    matches = commands.filter((c) => c.startsWith(v));
    matchIndex = -1;
    renderSuggestions();
  });

  document.addEventListener('click', (e) => {
    if (!form.contains(e.target)) { matches = []; matchIndex = -1; renderSuggestions(); }
  });
})();
</script>

<script>
// --- terminal typing animation ---
(function() {
  var termBody = document.querySelector('.term-body');
  if (!termBody) return;

  var lines = termBody.querySelectorAll('.line');
  if (!lines.length) return;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !('IntersectionObserver' in window)) return;

  var typingSpeed = 22;
  var lineDelay = 100;
  var outputDelay = 120;
  var bootWait = 250;
  var started = false;

  // Build pairs: each .line + its associated output elements
  var pairs = [];
  lines.forEach(function(line) {
    var cmdSpan = line.querySelector('.cmd');
    if (!cmdSpan) return; // skip visitor-cli line (has input, not .cmd)

    var parent = line.parentElement;
    var fullText = cmdSpan.textContent.trim();
    cmdSpan.setAttribute('data-text', fullText);
    cmdSpan.textContent = '';

    // Add blinking cursor after the command
    var cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    line.appendChild(cursor);

    // Collect associated output elements
    var outs = [];
    if (parent === termBody) {
      var el = line.nextElementSibling;
      while (el && !el.classList.contains('line') && !el.classList.contains('visitor-cli')) {
        if (el.classList.contains('out')) outs.push(el);
        el = el.nextElementSibling;
      }
    } else if (parent.classList.contains('about-section')) {
      var sectionOut = parent.querySelector('.out');
      var sectionSignal = parent.querySelector('.about-signal');
      if (sectionOut) outs.push(sectionOut);
      if (sectionSignal) outs.push(sectionSignal);
    }

    // Initially hide outputs
    outs.forEach(function(o) { o.style.opacity = '0'; });

    pairs.push({ line: line, cmdSpan: cmdSpan, cursor: cursor, fullText: fullText, outs: outs });
  });

  if (!pairs.length) return;

  function typeCommand(pair, callback) {
    var cmdSpan = pair.cmdSpan;
    var cursor = pair.cursor;
    var fullText = pair.fullText;
    var i = 0;
    cursor.classList.add('is-typing');

    function type() {
      if (i < fullText.length) {
        cmdSpan.textContent += fullText[i];
        i++;
        var jitter = Math.floor(Math.random() * 16) - 8;
        setTimeout(type, typingSpeed + jitter);
      } else {
        cursor.classList.remove('is-typing');
        cursor.classList.add('is-done');
        setTimeout(callback, lineDelay);
      }
    }
    type();
  }

  function revealOutputs(outs, callback) {
    if (!outs.length) { callback(); return; }
    outs.forEach(function(o) {
      o.classList.add('is-revealing');
      o.addEventListener('animationend', function handler() {
        o.removeEventListener('animationend', handler);
        o.style.opacity = '1';
      }, { once: true });
      o.style.opacity = '1';
    });
    setTimeout(callback, outputDelay);
  }

  function runSequence(index) {
    if (index >= pairs.length) return;
    var pair = pairs[index];
    typeCommand(pair, function() {
      revealOutputs(pair.outs, function() {
        runSequence(index + 1);
      });
    });
  }

  var observer = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting && !started) {
      started = true;
      setTimeout(function() { runSequence(0); }, bootWait);
    }
  }, { threshold: 0.15 });

  observer.observe(termBody);
})();
</script>
