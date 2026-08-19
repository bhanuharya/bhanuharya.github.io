# Site spec — as built

This document describes the current Jekyll site after the rebuild and refinements. It supersedes the initial empty-state requirements.

## Identity

- `_config.yml` keeps `title: bhanuharya@sec` and `author: harya`; added `url`, `baseurl`, `lang` (no global `permalink` — pretty URLs intentionally not set so existing `*.html` post URLs are preserved).
- No Gemfile required for Pages; remains GitHub Pages-safe (minima theme, plain CSS, no unsupported gems). Local build uses `github-pages` gem if available, otherwise CI builds.

## Layouts

- `default` — HTML shell with skip link, canonical URL, Open Graph / Twitter meta, JSON-LD (WebSite for pages, BlogPosting for posts), RSS link, header nav (Blog, About), footer with RSS and privacy note.
- `home` — terminal article (banner, boot sequence decor only), whoami / interests / about, ls navigation, accessible visitor CLI (tab/arrow completion, enter to run, esc to dismiss, aria-expanded/activedescendant, button suggestions), noscript fallback, plus "Latest note" section showing newest post with reading time and tags. Includes visually-hidden h1 for SEO/a11y.
- `post` — title, meta (date, reading time, author), tags, progressive TOC from h2/h3 (hidden until JS populates; dedupes slugs, handles empty slugs, hidden via `<noscript>` when JS disabled), content, post nav (Back to blog + Home + next/previous).
- `page` — title, content, nav (Back to home, Blog).
- `404.html` — terminal-styled not-found with links home/blog.

## Content

- `index.md` — layout home (terminal + latest).
- `blog.md` — `/blog/` with lead, post cards (title, date, reading time, tags, excerpt, CTA). Empty state kept.
- `about.md` — `/about/` standalone about page; `#about` anchor still exists on home for deep link.
- `_posts/2026-08-19-...` — existing Hermes article retained, with tags and sanitized content.
- `_drafts/next-article-template.md` — working template retained.

## Design

- Dark terminal theme (bg #000, panel #0d0d0d) with restrained cli accents.
- Body monospace globally; `.post-content` and `.page-content` use system sans-serif for readability.
- Decorative animations only (banner pulse, boot reveal ~0.36s); primary content visible immediately (no 2.5–4.3s delay).
- Tables: desktop as table, mobile as block with horizontal scroll; preserves borders.
- Code: `pre` keeps `white-space: pre` with horizontal scroll and touch scrolling; inline code wraps; no aggressive break-word for blocks.
- Diagrams via `.diagram-wrap`; wide/mobile SVG swap at 640px.
- Touch targets: nav links 44px, input 44px, suggestion buttons 32px, visible focus outlines.
- Spacing standardized via wrap max 44rem, consistent card/panel padding, prose line-height 1.72.

## Constraints honored

- `.github/workflows/jekyll-gh-pages.yml` untouched.
- No external fonts/CDN, no analytics.
- Sanitized: no secrets/IPs/hostnames in content.

## Verification

- `bundle exec jekyll build` where Ruby available; otherwise inspect front matter and generated HTML for one h1 per page, canonical/OG tags, valid internal links. No local Ruby/Jekyll required — GitHub Actions (`actions/jekyll-build-pages@v1`) is the authoritative build on push to `main`.
- Manual checks: keyboard nav, reduced-motion, no-JS fallback (TOC hidden via `<noscript>` when JS disabled), mobile at 320/375/414/768.
- Ignored: `session-*.md`, `_site/`, `.jekyll-cache/`, `.bundle/`, `vendor/` (see `.gitignore`).
