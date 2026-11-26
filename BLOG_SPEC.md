# Site spec — as built

This document describes the current Jekyll site after the rebuild and refinements. It supersedes the initial empty-state requirements.

## Identity

- `_config.yml` keeps `title: bhanuharya@sec` and `author: harya`; added `url`, `baseurl`, `lang`, and the `/blog/:title/` permalink format.
- No Gemfile required for Pages; remains GitHub Pages-safe (minima theme, plain CSS, no unsupported gems). Local build uses `github-pages` gem if available, otherwise CI builds.

## Layouts

The site is an early-2000s desktop, "bhanuharya OS": grey 3D bevels, gradient title bars, sunken panes, a taskbar and Start menu. Apps are windows. Each URL renders the desktop with its own window open, so pages work without JavaScript; with it, links open as windows in place (fetched, then added to the desktop) and the URL follows the focused window.

- `default` — the desktop: icons (Packet Capture, Browser, Terminal, readme.txt, About, Media Player, Firewall, RSS, GitHub, LinkedIn, Recycle Bin), the window layer, Start menu (programs, Posts and Programs flyouts, Run, Log Off, Shut Down), taskbar with tray (sound, Day/Night, no-trackers shield, clock). Canonical URL, Open Graph / Twitter meta, BlogPosting JSON-LD on posts, RSS link, skip link, and a JSON block with posts and songs for the scripts.
- `home` — Packet Capture window: filter toolbar with quick filters, the packet list, a detail tree and hex dump of the selected post, status line.
- `post` / `page` — Browser window: Back, Forward, Reload, Home, Hex; address bar; the article; status bar with reading progress.
- `properties` — `/about/` as System Properties: General, Background, Statistics, Links tabs.
- `notepad` — `/readme/`, editable with JavaScript (not savable).
- `terminal` — `/terminal/`, its own full-screen page, also embedded in the Terminal window.
- `404.html` — "The page cannot be found" in the Browser.

Phones (narrow, or short with a touch screen) get full-screen windows, one-row toolbars, icon-only taskbar buttons when crowded, press-and-hold menus, a show-desktop button, and tap-twice-to-read in Packet Capture. Touch screens get larger targets; safe areas and the on-screen keyboard are respected.

Version 2 adds BIOS Setup (settings), Security Center (live request list, the enforced CSP and a blocked test request, stored data with Forget everything), Find (full-text search over `search.json`, highlights in the post), Event Viewer (session log and twelve discoveries), a Contents panel and text size in the Browser, window snapping, not-found suggestions, and an easter egg. All inline scripts moved to files (`assets/js/boot.js` runs first in `<head>`) so the Content Security Policy can forbid inline scripts.

Script-only windows: Media Player (three original synthesized songs plus files in `assets/music/`), Firewall (a game), Recycle Bin, Untitled Notepad, Run, calendar, screen saver, boot and log-on screens.

## Content

- `index.md` — layout home, the full packet list.
- `blog.md` — `/blog/` redirects to `/` (jekyll-redirect-from).
- `about.md` — `/about/`, layout properties.
- `readme.md` — `/readme/`, layout notepad: how to use the desktop.
- `terminal.md` — `/terminal/`.
- `_posts/` — seven published posts: agent access revocation, 4B vs 23B on the 3060, local 8B vs Jev, the SAST setup on SonarQube, Dart rules for SonarQube Community, Slay the Spire 2 on Android and iOS, and measuring Slay the Spire 2's performance on Android.
- `_data/protocols.yml`, `_data/filters.yml` — coloring rules and quick filters.
- `_drafts/next-article-template.md` — working template retained.

## Design & Retro Aesthetics

- Coloring rules map tags to a protocol and a colour family: security (lavender), AI (light blue), games (light green), other (white), as in classic analyzer defaults. Night mode (only when picked from the tray; Day is the default) uses dim tinted rows.
- Display filter grammar: fields `tag`, `proto`, `family`, `frame`, `title`, `year`, `len`/`words`, `min`; operators `==`, `!=`, `contains`, `matches`, `>`, `<`, `>=`, `<=`; `&&`/`and`, `||`/`or`, `!`/`not`. A bare word searches titles, excerpts and tags. Valid filters turn the bar green, invalid red, valid-but-empty yellow. Old `/blog/#tag` hashes become `tag == "…"`.
- Keyboard: Tab into the list, arrows move the selection, Enter opens the post; double-click also opens. Start menu and right-click menus take arrow keys and Escape.
- No web fonts: Tahoma (UI), Verdana (reading), Lucida Console (packets), with DejaVu fallbacks.
- Copy is deliberately plain. About is short; background sits on its own tab.
- `prefers-reduced-motion` disables transitions.
- `assets/og-image.png` is a 1200×630 render of the Day desktop.
- Earlier experiments are in git history: the Night Corridor JRPG theme (1a0670a) and the Summoning Terminal theme (47253b3, saved for obscur4.online).

## Constraints honored

- `.github/workflows/jekyll-gh-pages.yml` untouched.
- No external fonts, CDNs or third-party requests; no analytics, no cookies. A Content Security Policy makes the browser enforce this: `script-src 'self'` with no inline scripts, `connect-src 'self'`, `img-src 'self' data: blob:`, `object-src 'none'`.
- Sanitized: no secrets/IPs/hostnames in content. The Firewall game only uses documentation (RFC 5737) and private addresses.
- The `/terminal/` view keeps its own layout and styles.

## Verification

- `bundle exec jekyll build` where Ruby available; otherwise inspect front matter and generated HTML for one h1 per page, canonical/OG tags, valid internal links. No local Ruby/Jekyll required — GitHub Actions (`actions/jekyll-build-pages@v1`) is the authoritative build on push to `main`.
- Manual checks: boot and log on, drag/resize/minimize/maximize/close, taskbar, Start menu, right-click menus, Recycle Bin, Run, calendar, Media Player, Firewall, terminal window, back/forward, reduced-motion, no-JS fallback, mobile at 320/375/414/768.
- Ignored: `session-*.md`, `_site/`, `.jekyll-cache/`, `.bundle/`, `vendor/` (see `.gitignore`).
