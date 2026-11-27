# Site spec — as built

This document describes the current Jekyll site after the rebuild and refinements. It supersedes the initial empty-state requirements.

## Identity

- `_config.yml` keeps `title: bhanuharya@sec` and `author: harya`; added `url`, `baseurl`, `lang`, and the `/blog/:title/` permalink format.
- No Gemfile required for Pages; remains GitHub Pages-safe (minima theme, plain CSS, no unsupported gems). Local build uses `github-pages` gem if available, otherwise CI builds.

## Layouts

The site is a desktop OS, obscuraOS. The website (home, posts, About) is a normal web page rendered inside the OS's Browser window; the OS itself is neutral and shows the visitor's own device. Each URL renders the desktop with the Browser open on that page, so pages work without JavaScript; with it, links open in place and the URL follows the focused window.

- `default` — the desktop (Computer, Browser, Packet Capture, Terminal, Media Player, readme.txt, Recycle Bin), Start menu (Browser, Packet Capture, Terminal, Media Player, Programs, Settings, Find, Help, Run, Log Off, Shut Down), taskbar and tray. CSP, canonical URL, Open Graph, BlogPosting JSON-LD, RSS link, skip link.
- `home` — the website's home: header, intro, topic filter (Security, AI, Games from `_data/protocols.yml`), posts by year with date, excerpt, reading time and tags (`/?tag=` filters).
- `post` — the article with date, reading time, tags, older/newer links. Browser toolbar: Back, Forward, Reload, Home, Favorites, Contents, Source, text size.
- `profile` — `/about/`: name, intro, background, links (GitHub, LinkedIn, RSS, security.txt), recent posts.
- `notepad` — `/readme/`, the OS help file; `terminal` — `/terminal/`, also inside the Terminal window; `404.html` — the Browser's error page with a suggestion.

Script-only programs: Packet Capture (real HTTP capture with timing, headers, bytes, Follow Stream, statistics, HAR export), System Properties (real hardware, performance, network, ping), Setup (BIOS), Security Center, Event Viewer, Find, Media Player (synth songs, `assets/music/`, YouTube on request), Firewall (game), Notepad, Recycle Bin, Run, calendar, screen saver.

Phones (narrow, or short with a touch screen) get full-screen windows, one-row toolbars, icon-only taskbar buttons when crowded, press-and-hold menus, a show-desktop button, and tap a packet twice to follow its stream. Touch screens get larger targets; safe areas and the on-screen keyboard are respected.

Version 2 adds BIOS Setup (settings), Security Center (live request list, the enforced CSP and a blocked test request, stored data with Forget everything), Find (full-text search over `search.json`, highlights in the post), Event Viewer (session log), a Contents panel and text size in the Browser, window snapping and not-found suggestions. Version 3 moved the website into the Browser, made Packet Capture and System Properties real, and took everything personal out of the OS. All inline scripts moved to files (`assets/js/boot.js` runs first in `<head>`) so the Content Security Policy can forbid inline scripts.


## Content

- `index.md` — layout home, the full packet list.
- `blog.md` — `/blog/` redirects to `/` (jekyll-redirect-from).
- `about.md` — `/about/`, layout properties.
- `readme.md` — `/readme/`, layout notepad: how to use the desktop.
- `terminal.md` — `/terminal/`.
- `_posts/` — seven published posts: agent access revocation, 4B vs 23B on the 3060, local 8B vs Jev, the SAST setup on SonarQube, Dart rules for SonarQube Community, Slay the Spire 2 on Android and iOS, and measuring Slay the Spire 2's performance on Android.
- `_data/protocols.yml` — which tags make a post Security, AI or Games on the home page.
- `_drafts/next-article-template.md` — working template retained.

## Design & Retro Aesthetics

- The website: Georgia headings, Verdana text, a centred column, topic chips (Security, AI, Games from `_data/protocols.yml`), `/?tag=` filters; old `/blog/#tag` links still filter. Night mode (only when picked from the tray; Day is the default) applies to the website too.
- Packet Capture display filter: fields `n`, `time`, `host`, `path`, `url`, `proto`, `type`, `status`, `len`, `size`, `dur`, `cached`, `third`; operators `==`, `!=`, `contains`, `matches`, `>`, `<`, `>=`, `<=`; `&&`/`and`, `||`/`or`, `!`/`not`; a bare word matches the URL. Valid filters turn the bar green, invalid red with the reason.
- Keyboard: arrows move through packets and events, Enter follows a stream; Start menu and right-click menus take arrow keys and Escape; `/` opens Find.
- No web fonts: Tahoma (UI), Verdana (reading), Lucida Console (packets), with DejaVu fallbacks.
- Copy is deliberately plain. The OS says nothing about the author; the About page does.
- `prefers-reduced-motion` disables transitions.
- `assets/og-image.png` is a 1200×630 render of the Day desktop.
- Earlier experiments are in git history: the Night Corridor JRPG theme (1a0670a) and the Summoning Terminal theme (47253b3, saved for obscur4.online).

## Constraints honored

- `.github/workflows/jekyll-gh-pages.yml` untouched.
- No external fonts, CDNs or third-party requests; no analytics, no cookies. A Content Security Policy makes the browser enforce this: `script-src 'self'` with no inline scripts, `connect-src 'self'`, `img-src 'self' data: blob:`, `object-src 'none'`, and `frame-src 'self' https://www.youtube-nocookie.com` for Media Player's YouTube tracks, which load only after the visitor presses Play and agrees.
- Sanitized: no secrets/IPs/hostnames in content. The Firewall game only uses documentation (RFC 5737) and private addresses.
- The `/terminal/` view keeps its own layout and styles.

## Verification

- `bundle exec jekyll build` where Ruby available; otherwise inspect front matter and generated HTML for one h1 per page, canonical/OG tags, valid internal links. No local Ruby/Jekyll required — GitHub Actions (`actions/jekyll-build-pages@v1`) is the authoritative build on push to `main`.
- Manual checks: boot and log on, drag/resize/minimize/maximize/close, taskbar, Start menu, right-click menus, Recycle Bin, Run, calendar, Media Player, Firewall, terminal window, back/forward, reduced-motion, no-JS fallback, mobile at 320/375/414/768.
- Ignored: `session-*.md`, `_site/`, `.jekyll-cache/`, `.bundle/`, `vendor/` (see `.gitignore`).
