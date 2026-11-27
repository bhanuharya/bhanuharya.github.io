# bhanuharya.github.io — personal site

A Jekyll site on GitHub Pages that runs as a small desktop operating system, **obscuraOS**: a boot screen, a log-on box with no password, windows you can drag, snap and resize, a taskbar and a Start menu. The website itself (the posts and the About page) is an ordinary web page shown in the OS's Browser window. Everything is local CSS and JavaScript, with no external fonts, libraries or requests.

Every page is still a real page: without JavaScript each URL renders as the desktop with the Browser open on it.

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

## Add songs to the Media Player

The player comes with three short songs written as notes in `assets/js/os-player.js`; the browser plays them with its own synthesizer, so they need no files.

To add your own:

1. Put audio files in `assets/music/` (`.mp3`, `.ogg`, `.m4a`, `.opus`, `.wav` or `.flac`). Only use songs you have the rights to share: your own, or ones with a licence that allows it.
2. Name them how they should appear: `night-drive.mp3` shows up as "night drive".
3. Commit and push. They join the playlist on the next build. Keep files small (a few MB each); GitHub refuses files over 100 MB.

Visitors can also play a file from their own computer with Open… in the player. It stays in their browser and is not uploaded.

### Your own videos

Upload `.mp4` files to `assets/video/` (on github.com: open the folder, **Add file → Upload files**). They appear in Media Player and play in its screen, served from this site. Use H.264 video with AAC audio, keep files small (web upload limit 25 MB, git push limit 100 MB, and every version stays in the history); `assets/video/README.md` has an ffmpeg line for shrinking one.

Titles come from the file name, or from `_data/videos.yml` (`file`, `title`, `by`). The entry with `default: true` is what Media Player opens on right after log on, and it starts playing (the log-on click lets the browser allow sound). Without a default video, it opens on the YouTube default and waits for Play.

### YouTube

YouTube videos play inside the player's screen. List them in `_data/youtube.yml` (a title and the 11-character video id), or paste any YouTube link with **Open URL…** in the player (that one lasts until the tab closes).

Nothing loads from YouTube until a visitor presses Play on a YouTube track and agrees (they can tick "don't ask again until I close this tab"). It loads from `youtube-nocookie.com`, the only site the Content Security Policy lets the page frame. Stop, or moving to another track, removes YouTube's player again. The player's own buttons drive it through YouTube's postMessage interface, so no YouTube script runs in the page itself. Once loaded, YouTube (Google) can see the visitor's IP address and may store data in their browser; the Security Center and Event Viewer say so when it happens.

## Structure

- `_posts/` — published posts; `_drafts/` — unpublished template
- `_layouts/default.html` — the OS: desktop icons, taskbar, Start menu, security policy, the JSON the scripts read
- `_layouts/home.html`, `post.html`, `profile.html`, `page.html` — the website, each inside a Browser window; `_includes/site-header.html` is its header (name, Posts, About, RSS)
- `about.md` — your profile (`person`, the intro text, `background`); links are in `_layouts/profile.html`
- `_layouts/notepad.html` + `readme.md` — the OS help file; `_layouts/terminal.html` — the terminal
- `_includes/` — `icons.svg`, `titlebar.html`, `browser-top.html`, `packet-vars.html` (topic and reading time of a post)
- `_data/protocols.yml` — which tags put a post under Security, AI or Games on the home page
- `_data/youtube.yml` — YouTube tracks for Media Player; `assets/music/` and `assets/video/` — your own audio and video files for it
- `search.json` — full text of the posts, for Find
- `assets/js/boot.js` (first, in `<head>`), `os.js` (window manager), `os-apps.js` (boot, log on, Run, calendar, screen saver, Notepad, Firewall), `os-extras.js` (Setup, System Properties, Security Center, Find, Event Viewer, Browser extras), `os-capture.js` (Packet Capture), `os-player.js` (Media Player), `pages.js` (the website's own behaviour)
- `assets/css/style.css` — the OS and the website, Day and Night
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

- Everything runs in the browser; no input is sent to a server. No analytics, no cookies.
- Every page carries a strict Content Security Policy (with one opt-in exception, YouTube's no-cookie player, see above) (a `<meta>` tag in `_layouts/default.html` and `_layouts/terminal.html`): scripts, styles, images, audio and requests only from this site, no inline scripts, no plugins. The browser refuses anything else before it is sent. The Security Center (the shield in the tray) shows the policy, every request the page made, and a button that tries to load example.com so you can watch it get blocked.
- Because of that policy, keep JavaScript in files under `assets/js/` (no `<script>` blocks with code, no `onclick=`), and keep images and other media in this repository. JSON data blocks (`<script type="application/json">`) are fine. If a post ever needs something from another site, the policy has to be loosened for it on purpose.
- Saved in the visitor's browser: Day or Night, sounds on or off, Setup choices, the terminal's colours (localStorage), and the name typed at log on, the event log and discoveries (sessionStorage, gone when the tab closes). Security Center lists all of it and has a Forget everything button.
- Songs opened from the visitor's own computer are played from memory and not uploaded.
- Hosting/CDN access logs may still exist outside this page's control.
- This repository is sanitized: no secrets, credentials, IP addresses, hostnames, or network identifiers.

## Design notes

- The OS doesn't talk about the site's author. Your profile lives on the About web page; the desktop, Start menu, boot screen and System Properties are about the computer.
- Packet Capture is real: it lists every HTTP request the page makes, live, from the browser's Resource Timing records (time, address, protocol, size, status, DNS/connect/TLS/first-byte timing). Selecting a packet reads it again from the browser cache to show its real response headers and bytes; Follow Stream shows the response; Save writes a `.har` file; the display filter takes `type == script`, `status >= 400`, `host contains youtube`, `len > 10000`, `cached`, `third`, joined with `&&`, `||`, `!`.
- System Properties and the boot screen show the device's real hardware as the browser reports it (processors, memory, display, graphics, network), live performance (frame rate, memory, elements, requests, storage) and a ping to the server.

- Start > Settings (or DEL / F2 while booting, or the Setup button on touch screens) opens a text-mode BIOS Setup that changes real settings: Day/Night, wallpaper (blue, teal, packets, graph paper, hex dump, black), color depth (true color, 256, 16, green screen), CRT effect, interface font, reading text size, sounds, quick boot, screen saver delay, mouse trails. Arrow keys, Enter, F9, F10, Esc, or click/tap.
- Find (Start > Find, Run `find word`, or press `/`) searches the full text of every post from `search.json`, which is built with the site and fetched only when someone searches. Opening a result highlights the matches in the post.
- Posts with three or more headings get a Contents panel in the Browser (open by default for long posts on wide screens); the Aa button changes the reading text size.
- Drag a window to the top edge to maximize it, or to the left or right edge to fill that half; drag it away to restore.
- Event Viewer (Start > Programs) is a log of this visit: log on, windows opened, Run commands, Firewall breaches, blocked requests. It also counts discoveries: twelve things to find around the desktop.
- The not-found page suggests the closest post and offers to search for the words in the address.
- Search engines and link previews skip the boot screen.

- First visit in a tab: a short BIOS-style screen (any key skips), a splash, then Log On. There is no password. `root` and `admin` get a joke and become guest. Later page loads in the same tab go straight to the desktop.
- Double-click icons to open them (tap on a phone). Drag windows by the title bar, resize from the edges, double-click a title bar to maximize. Right-click the desktop, icons, title bars and taskbar buttons for menus. Drag icons onto the Recycle Bin, and restore them from it.
- Start > Run takes commands: program names, a post number, words from a title, a display filter, or a web address. `help` lists them.
- The clock opens a calendar; days with posts are coloured and link to them.
- Phones and tablets: on phones (and phones turned sideways) every window fills the screen. Tap to open, press and hold for the right-click menus, and the button next to Start shows the desktop. In Packet Capture, tap a row for details and tap it again to read. Touch screens get bigger buttons, the browser toolbar and filter bar shrink to one row, windows stay above the on-screen keyboard, and the taskbar keeps clear of the iPhone home bar. Tablets keep draggable, resizable windows.
- After two minutes without input a screen saver runs (packets drifting past). Not on touch screens, not while a post is open, not while music plays.
- Sounds are made with the Web Audio API, nothing is downloaded. The speaker in the tray mutes them.
- The Packet Capture display filter is real: `tag == "sast"`, `proto == AI`, `len > 1500`, `year == 2026`, `frame contains "sonar"`, joined with `&&` / `||`, negated with `!`, or just type a word. Filters are kept in the URL as `?filter=`.
- Day (classic grey) is the default. Night is only used when picked from the tray.
- No web fonts: period system fonts (Tahoma for the interface, Verdana for reading, Lucida Console for packets) with DejaVu fallbacks.
- `prefers-reduced-motion` turns off the opening animations and the screen saver.
