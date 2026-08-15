# Blog rebuild spec

Make this GitHub Pages Jekyll site look and behave like a real blog. Work in this repo only. Commit and push to main when done.

## Current state
- Jekyll site, `_config.yml` uses `theme: minima` with `minima.skin: dark`, `show_excerpts: true`
- `about.md` exists (layout: page)
- `.github/workflows/jekyll-gh-pages.yml` — GitHub Actions deploy (DO NOT modify)
- `_posts/` is now EMPTY (the security-posture post was removed deliberately — the site must look good with zero posts)

## Requirements

1. **Blog homepage** — build a proper blog index (layout: home or custom): 
   - Posts listed newest-first with title, date, and excerpt
   - Looks GREAT with zero posts: a clean hero/welcome state (e.g. "Notes on security, engineering & self-hosting — coming soon") instead of an empty page
2. **Post layout** — clean article page: title, date, body, back-to-home link
3. **Design** — mobile-first, dark theme (keep the current dark vibe: bg #0d1117-ish, accent #58a6ff-ish), good typography (system font stack), subtle borders, rounded cards. No external font/CDN dependencies.
4. **Keep it GitHub-Pages-safe**: no custom Jekyll gems beyond what github-pages supports; plain CSS in assets/; override minima via `_includes`/`assets` if needed, or use a custom layout approach. Do not add a Gemfile unless required — if Ruby/Jekyll is available locally, verify with `bundle exec jekyll build`; otherwise be careful to write valid Jekyll.
5. **About page** — keep `about.md` (layout: page), ensure it links back home.
6. **README.md** — update to reflect the blog (how to write a post: add `_posts/YYYY-MM-DD-title.md` with front matter `layout: post`, `title`, `date`).
7. **Sanitized**: no real names beyond "wishnu", no IP addresses, no hostnames, no credentials, no repo-internal paths.

## Constraints
- Do NOT modify `.github/workflows/jekyll-gh-pages.yml`
- Do NOT modify `_config.yml` site identity fields (title/author) — keep them as-is
- Commit with a clear message and push to main (the GitHub Actions workflow will build it)

## Verification
- `bundle exec jekyll build` locally if Ruby is available (check `which ruby`), else validate front matter by inspection
- Confirm the home page renders an empty-state hero when `_posts/` is empty
