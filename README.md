# bnhrya.github.io — personal blog

A Jekyll blog on GitHub Pages: dark, mobile-first, no external dependencies. Pure Markdown — write a post, push, done.

## Write a post

1. Add a file to `_posts/` named `YYYY-MM-DD-title.md`, e.g. `_posts/2026-01-01-hello-world.md`
2. Add front matter:

   ```yaml
   ---
   layout: post
   title: Hello world
   date: 2026-01-01
   ---
   ```

3. Write the body in Markdown below the front matter, then commit and push to `main`. GitHub Actions builds and deploys automatically.

Posts appear on the home page newest-first with title, date and excerpt. When there are no posts, the home page shows a "coming soon" hero instead of an empty list.

## Structure

- `_posts/` — blog posts
- `_layouts/` — custom layouts (default, home, post, page) that override the minima theme
- `assets/css/style.css` — site styles
- `index.md` — blog index (layout: home)
- `about.md` — about page
- `_config.yml` — site config (theme, title, description)
- `.github/workflows/jekyll-gh-pages.yml` — Pages deployment workflow

## Local build

If Ruby and the `github-pages` gem are installed:

```sh
bundle exec jekyll build
```

## Sanitized

This site is sanitized: no secrets, credentials, IP addresses, or network identifiers.
