# Site spec — as built

This document describes the current Jekyll site after the rebuild and refinements. It supersedes the initial empty-state requirements.

## Identity

- `_config.yml` keeps `title: bhanuharya@sec` and `author: harya`; added `url`, `baseurl`, `lang`, and the `/blog/:title/` permalink format.
- No Gemfile required for Pages; remains GitHub Pages-safe (minima theme, plain CSS, no unsupported gems). Local build uses `github-pages` gem if available, otherwise CI builds.

## Layouts

The site is themed as a late-90s occult JRPG: every panel is a "window" (gradient fill, silver bevel), menus have a blinking triangle cursor, and posts are "quests".

- `default` — HTML shell with skip link, canonical URL, Open Graph / Twitter meta, BlogPosting JSON-LD on posts, RSS link. Header window with the menu (Quest Log, Status, Terminal, RSS, Config), a fixed backdrop (slowly turning summoning circle, `assets/img/circle.svg`, tinted per window colour, plus scanlines behind the windows), the Config dialog, and a "save point" footer. Loads `assets/js/rpg.js` and `assets/js/visits.js`.
- `home` — title screen: a first-person corridor drawn live on a 320×180 canvas (`assets/js/dungeon.js`), the title, Location and moon-phase HUD windows, and a typewriter dialog box (click or Enter to advance). Below it: the Command menu (arrow keys move the cursor, a help bar describes the highlighted command), the Party window, and the six latest quests.
- `post` — header window (quest number, B*n*F floor, date, word count, tags), the article in a reading window, an EXP gauge at the top of the viewport that tracks reading progress, code copy buttons, tables wrapped for sideways scroll, previous/next quest navigation.
- `page` — header window with optional `floor` and `lead` front matter; content in a reading window unless `bare: true`.
- `status` — the about page as a character sheet: tarot card (IX, The Hermit, `_includes/hermit.svg`), HP/SP/EXP, stats, Profile (the page content), Skills and Equipment. Values live in `_data/party.yml`.
- `404.html` — a random encounter with a Broken Link, with Flee / Search / Report choices.
- `_includes/quest.html` — one post as a quest card, shared by home and the blog index.

## Content

- `index.md` — layout home (title screen, command menu, party window, latest quests).
- `blog.md` — `/blog/`, the Quest Log: an "Affinity" tag filter (hash-linkable, announces counts), quest cards (number, title, date, reading time, tags, excerpt, NEW / CLEARED badges). Empty state kept.
- `about.md` — `/about/`, layout status; the prose is the Profile window.
- `_posts/` — seven published posts: agent access revocation, 4B vs 23B on the 3060, local 8B vs Jev, the SAST setup on SonarQube, Dart rules for SonarQube Community, Slay the Spire 2 on Android and iOS, and measuring Slay the Spire 2's performance on Android.
- `_drafts/next-article-template.md` — working template retained.

## Design & Retro Aesthetics

- Fonts are self-hosted in `assets/fonts/` (SIL OFL, licences alongside): DotGothic16 for menus, labels and headings; Cinzel 700 for the title. Post and page prose uses the system sans-serif stack for readability.
- Window colours, chosen in Config and stored per browser (`localStorage` key `rpg-config`): Indigo (default), Crimson, Jade, Parchment (a light, paper-coloured window). `?theme=<name>` previews one.
- Config also sets text speed (slow / normal / instant), sound effects (off by default; Web Audio square-wave blips), scanlines and animation.
- The corridor is ray-cast per pixel against a straight hallway and dithered to 15-bit colour; it runs at 24 fps only while visible and draws one still frame when animation is off or `prefers-reduced-motion: reduce` is set.
- The moon phase and time of day in the HUD come from the visitor's clock. Posts read to the end are marked CLEARED on the quest lists (`localStorage` key `rpg-cleared`).
- Decorative animations respect `prefers-reduced-motion: reduce` and the Animation setting. Menu targets are at least 40px tall with a gold focus ring.
- `assets/og-image.png` is a 1200×630 render of the title screen.

## Constraints honored

- `.github/workflows/jekyll-gh-pages.yml` untouched.
- No external fonts, CDNs or third-party requests; no analytics.
- Sanitized: no secrets/IPs/hostnames in content.
- The `/terminal/` view keeps its own layout and styles.

## Verification

- `bundle exec jekyll build` where Ruby available; otherwise inspect front matter and generated HTML for one h1 per page, canonical/OG tags, valid internal links. No local Ruby/Jekyll required — GitHub Actions (`actions/jekyll-build-pages@v1`) is the authoritative build on push to `main`.
- Manual checks: keyboard nav (`g h`, `g b`, `g a`, `c`, `w`, `f`, `t`, `?`, `/`), reduced-motion, no-JS fallback, mobile at 320/375/414/768.
- Ignored: `session-*.md`, `_site/`, `.jekyll-cache/`, `.bundle/`, `vendor/` (see `.gitignore`).
