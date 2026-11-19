# Site spec — as built

This document describes the current Jekyll site after the rebuild and refinements. It supersedes the initial empty-state requirements.

## Identity

- `_config.yml` keeps `title: bhanuharya@sec` and `author: harya`; added `url`, `baseurl`, `lang`, and the `/blog/:title/` permalink format.
- No Gemfile required for Pages; remains GitHub Pages-safe (minima theme, plain CSS, no unsupported gems). Local build uses `github-pages` gem if available, otherwise CI builds.

## Layouts

The site is styled as an early-2000s desktop protocol analyzer: grey 3D bevels, gradient caption bars, sunken panes, group boxes. Posts are packets, topics are coloring rules.

- `default` — the application window: caption bar (`bhanuharya.pcapng - Packet Capture`), menu bar with access keys (Packets, About, RSS, Terminal, View: Day/Night), and a sunken status bar (no trackers, copyright, github, linkedin). Canonical URL, Open Graph / Twitter meta, BlogPosting JSON-LD on posts, RSS link, skip link.
- `home` — "Filter: [ ] Expression… Clear Apply" toolbar with quick filter buttons, the packet list (No., Time, Source, Destination, Protocol, Length, Info; every post, newest first, each title a real link), a detail tree (`<details>` layers) and a hex dump of the selected post, and a status line with the displayed count.
- `post` — a "Follow TCP Stream" dialog: frame number and protocol, title, date and tags (each tag links to the home filter), the article in a sunken text area, a Show as ASCII / Hex Dump switch, and Previous / Next / Close buttons.
- `properties` — `/about/` as a Capture File Properties dialog with group boxes: a short comment (background collapsed), time range, statistics with protocol counts, and links as interfaces.
- `page` — plain page in the same window.
- `404.html` — an error message box: no packets matched `http.request.uri == "<path>"`.

## Content

- `index.md` — layout home, the full packet list.
- `blog.md` — `/blog/` redirects to `/` (jekyll-redirect-from).
- `about.md` — `/about/`, layout properties.
- `_posts/` — seven published posts: agent access revocation, 4B vs 23B on the 3060, local 8B vs Jev, the SAST setup on SonarQube, Dart rules for SonarQube Community, Slay the Spire 2 on Android and iOS, and measuring Slay the Spire 2's performance on Android.
- `_data/protocols.yml`, `_data/filters.yml` — coloring rules and quick filters.
- `_drafts/next-article-template.md` — working template retained.

## Design & Retro Aesthetics

- Coloring rules map tags to a protocol and a colour family: security (lavender), local LLM (light blue), games (light green), other (white), as in classic analyzer defaults. Night mode uses dim tinted rows.
- Display filter grammar: fields `tag`, `proto`, `family`, `frame`, `title`, `year`, `len`/`words`, `min`; operators `==`, `!=`, `contains`, `matches`, `>`, `<`, `>=`, `<=`; `&&`/`and`, `||`/`or`, `!`/`not`. A bare word searches titles, excerpts and tags. Valid filters turn the bar green, invalid red, valid-but-empty yellow. Old `/blog/#tag` hashes become `tag == "…"`.
- Keyboard: Tab into the list, arrows move the selection, Enter opens the post; double-click also opens.
- No web fonts: Tahoma (UI), Verdana (reading), Lucida Console (packets), with DejaVu fallbacks.
- Copy is deliberately plain. The about page is a short comment; background is collapsed.
- `prefers-reduced-motion` disables transitions.
- `assets/og-image.png` is a 1200×630 render of the Day capture view.
- Earlier experiments are in git history: the Night Corridor JRPG theme (1a0670a) and the Summoning Terminal theme (47253b3, saved for obscur4.online).

## Constraints honored

- `.github/workflows/jekyll-gh-pages.yml` untouched.
- No external fonts, CDNs or third-party requests; no analytics, no cookies.
- Sanitized: no secrets/IPs/hostnames in content.
- The `/terminal/` view keeps its own layout and styles.

## Verification

- `bundle exec jekyll build` where Ruby available; otherwise inspect front matter and generated HTML for one h1 per page, canonical/OG tags, valid internal links. No local Ruby/Jekyll required — GitHub Actions (`actions/jekyll-build-pages@v1`) is the authoritative build on push to `main`.
- Manual checks: keyboard nav (`g h`, `g b`, `g a`, `c`, `w`, `f`, `t`, `?`, `/`), reduced-motion, no-JS fallback, mobile at 320/375/414/768.
- Ignored: `session-*.md`, `_site/`, `.jekyll-cache/`, `.bundle/`, `vendor/` (see `.gitignore`).
