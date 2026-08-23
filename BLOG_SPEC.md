# Site spec — as built

This document describes the current Jekyll site after the rebuild and refinements. It supersedes the initial empty-state requirements.

## Identity

- `_config.yml` keeps `title: bhanuharya@sec` and `author: harya`; added `url`, `baseurl`, `lang` (no global `permalink` — pretty URLs intentionally not set so existing `*.html` post URLs are preserved).
- No Gemfile required for Pages; remains GitHub Pages-safe (minima theme, plain CSS, no unsupported gems). Local build uses `github-pages` gem if available, otherwise CI builds.

## Layouts

- `default` — HTML shell with skip link, canonical URL, Open Graph / Twitter meta, JSON-LD (WebSite for pages, BlogPosting for posts), RSS link, header nav (Blog, About, CRT toggle, Theme switcher, Shortcuts modal), footer with RSS and privacy note. Includes toggleable CRT scanline overlay, the locally sourced Joy Division pulsar SVG controller (`assets/js/pulsar-waves.js`), and retro games/audio synth engine (`assets/js/terminal-games.js`).
- `home` — terminal article (window dots for close/minimize/maximize fullscreen workstation mode, Joy Division PSR B1919+21 pulsar SVG that progressively stacks its lines once per activation, banner, boot sequence decor), whoami / interests / about, ls navigation, accessible visitor CLI with playable retro mini-games (`snake`, `pong`, `hack`), rich Unix utilities (`solaris`, `cde`, `waves`, `crt`, `sound`, `cowsay`, `fortune`, `dmesg`, `cal`, `uname`), noscript fallback, plus "Latest note" section.
- `post` — title, meta (date, reading time, author), tags, progressive TOC from h2/h3 (hidden until JS populates; dedupes slugs, handles empty slugs, hidden via `<noscript>` when JS disabled), content, code copy buttons, post nav (Back to blog + Home + next/previous).
- `page` — title, content, nav (Back to home, Blog).
- `404.html` — terminal-styled not-found with links home/blog.

## Content

- `index.md` — layout home (terminal + progressively stacked pulsar waves + games + latest).
- `blog.md` — `/blog/` with lead, interactive tag filtering, post cards (title, date, reading time, tags, excerpt, CTA). Empty state kept.
- `about.md` — `/about/` standalone about page; `#about` anchor still exists on home for deep link.
- `_posts/2026-08-19-...` — existing Hermes article retained, with tags and sanitized content.
- `_drafts/next-article-template.md` — working template retained.

## Design & Retro Aesthetics

- Dark retro terminal & Unix themes: `default`, `solaris` (Sun CDE workstation), `pulsar` (stark Joy Division monochrome), `matrix` (phosphor green), `amber` (warm CRT amber), `cyber` (neon cyberpunk), and `monochrome` (silver/black).
- Joy Division *Unknown Pleasures* (PSR B1919+21) stacked radio frequency wave SVG with a one-shot top-to-bottom reveal, replayed on activation and shown immediately for reduced-motion users.
- Authentic CRT display mode: Scanline raster overlay, phosphor text bloom, tube vignette curvature, degauss flash animation, toggleable via `c` key or `crt` command.
- In-terminal 8-bit games: `snake` (high score tracking), `pong` (1P vs CPU paddle match), `hack` (memory cipher decryption).
- Web Audio API synthesizer for retro mechanical keyclicks, degauss hum, game score chimes, and beeps (opt-in / toggleable via `sound on`).
- Body monospace globally; `.post-content` and `.page-content` use system sans-serif for readability.
- Decorative animations respect `prefers-reduced-motion: reduce`.
- Touch targets: nav links 44px, input 44px, suggestion buttons 32px, visible focus outlines.

## Constraints honored

- `.github/workflows/jekyll-gh-pages.yml` untouched.
- No external fonts/CDN, zero external dependencies, no analytics.
- Sanitized: no secrets/IPs/hostnames in content.

## Verification

- `bundle exec jekyll build` where Ruby available; otherwise inspect front matter and generated HTML for one h1 per page, canonical/OG tags, valid internal links. No local Ruby/Jekyll required — GitHub Actions (`actions/jekyll-build-pages@v1`) is the authoritative build on push to `main`.
- Manual checks: keyboard nav (`g h`, `g b`, `g a`, `c`, `w`, `f`, `t`, `?`, `/`), reduced-motion, no-JS fallback, mobile at 320/375/414/768.
- Ignored: `session-*.md`, `_site/`, `.jekyll-cache/`, `.bundle/`, `vendor/` (see `.gitignore`).
