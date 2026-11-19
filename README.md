# bhanuharya.github.io — personal site

A Jekyll site on GitHub Pages with custom layouts and a separate interactive terminal view at `/terminal/`. The rendered pages use local CSS and JavaScript, with no external fonts or JavaScript libraries.

## Write a post

1. Add a file to `_posts/` named `YYYY-MM-DD-title.md`, e.g. `_posts/2026-01-01-hello-world.md`
2. Add front matter:

   ```yaml
   ---
   layout: post
   title: Hello world
   date: 2026-01-01
   author: bhanuharya
   tags: [notes, systems]
   ---
   ```

3. Write the body in Markdown below the front matter, then commit and push to `main`. GitHub Actions builds and deploys automatically.

The homepage is the whole archive: every post is a row in a packet list, coloured by topic. Its protocol comes from its tags via `_data/protocols.yml`; set `proto:` (and `family:`) in front matter to override. `/terminal/` is a separate interactive view. Drafts live in `_drafts/` and are not published.

## Structure

- `_posts/` — published posts
- `_drafts/` — unpublished template (`next-article-template.md`)
- `_layouts/` — default (the analyzer window), home (the packet list), post (a followed stream), properties (`/about/`), page, terminal
- `_includes/packet-vars.html` — works out a post's protocol, colour family, word count and reading time
- `_data/protocols.yml` — coloring rules: which tags make a post SAST, ACL, LLM, PERF, PORT…
- `_data/filters.yml` — the quick filter buttons above the packet list
- `assets/css/style.css` — site styles, light and dark
- `assets/js/capture.js` — display filter, packet details and hex dump, theme toggle, post extras
- `index.md` — homepage (layout: home)
- `blog.md` — `/blog/` redirects to the homepage, which lists every post
- `about.md` — `/about/`, laid out as capture file properties
- `_config.yml` — site config (title, description, url, theme)
- `404.html` — "no packets match"
- `.github/workflows/jekyll-gh-pages.yml` — Pages deployment workflow (do not modify)

## Local build

GitHub Actions is the authoritative build (`actions/jekyll-build-pages@v1` on push to `main`). No Gemfile is committed — the site builds on Pages without one.

If you want a local render:

**Option A — Ruby (when installed):**
```sh
gem install bundler github-pages
bundle init
bundle add github-pages
bundle exec jekyll build
# or preview at http://localhost:4000
bundle exec jekyll serve
```
Remove the generated `Gemfile`/`Gemfile.lock` before committing (they are not needed on Pages), or keep them ignored.

**Option B — Docker (no Ruby needed):**
```sh
docker run --rm -v "$PWD:/srv/jekyll" -p 4000:4000 jekyll/jekyll:pages jekyll serve
```

**No Ruby available?** Validate front matter and generated HTML structure by inspection (one h1 per page, canonical/OG tags, valid internal links); CI will still build on push.

> Note: posts use the `/blog/:title/` permalink format. `_site/`, `.jekyll-cache/`, `.bundle/`, and `vendor/` are ignored, as are exported `pi-session-*.html` files.

## Privacy

- The terminal view and the display filter run entirely in the browser; no input is sent to a server. Only the light/dark choice is stored, in localStorage.
- Hosting/CDN access logs may still exist outside this page's control.
- This repository is sanitized: no secrets, credentials, IP addresses, hostnames, or network identifiers.

## Design notes

- The site looks like an old desktop packet analyzer: grey 3D bevels, a gradient title bar, a menu bar with underlined access keys, sunken panes. Posts are packets; clicking a row opens its layers and a hex dump; a post opens in a "Follow TCP Stream" dialog that can also show the post as a hex dump.
- The display filter is real: `tag == "sast"`, `proto == LLM`, `len > 1500`, `year == 2026`, `frame contains "sonar"`, joined with `&&` / `||`, negated with `!`, or just type a word. Filters are kept in the URL as `?filter=`.
- About is kept short on purpose; background sits in a collapsed section.
- No web fonts: period system fonts (Tahoma for the interface, Verdana for reading, Lucida Console for packets) with DejaVu fallbacks.
- Day (classic grey) and Night follow the system; View in the menu bar saves an explicit choice in this browser.
- Code blocks scroll sideways; tables scroll inside their own box on narrow screens.
- No analytics, no cookies. Theme choice is the only thing stored, in localStorage.
