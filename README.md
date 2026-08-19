# bnhrya.github.io — personal site

A Jekyll site on GitHub Pages: dark terminal aesthetic, mobile-first, no external fonts or JS dependencies. Content is Markdown plus a small interactive terminal on the homepage.

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

Posts appear on `/blog/` newest-first with title, date, reading time, tags, and excerpt. The homepage shows a terminal introduction plus a "Latest note" card linking to the newest post. Drafts live in `_drafts/` and are not published.

## Structure

- `_posts/` — published posts
- `_drafts/` — unpublished template (`next-article-template.md`)
- `_layouts/` — custom layouts (default, home, post, page) that override minima
- `assets/css/style.css` — site styles (terminal + prose typography)
- `index.md` — homepage (layout: home, terminal + latest post)
- `blog.md` — blog index at `/blog/`
- `about.md` — about page at `/about/`
- `_config.yml` — site config (title, description, url, theme)
- `404.html` — custom not-found page
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

> Note: `_config.yml` has no global `permalink` on purpose — pretty URLs are not enabled so existing `*.html` post URLs stay stable. `_site/`, `.jekyll-cache/`, `.bundle/`, and `vendor/` are ignored.

## Privacy

- The visitor CLI on the homepage runs entirely in the browser; no input is sent to a server.
- Hosting/CDN access logs may still exist outside this page's control.
- This repository is sanitized: no secrets, credentials, IP addresses, hostnames, or network identifiers.

## Design notes

- Terminal chrome uses monospace; article prose uses a system sans-serif stack for readability.
- Code blocks preserve indentation with horizontal scroll; prose and tables reflow or scroll on mobile.
- Interactive elements meet 44px minimum touch targets and visible focus states.
