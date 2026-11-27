# Videos for Media Player

Put `.mp4` files here. Each one appears in obscuraOS's Media Player on the next deploy and plays in the player's screen, straight from this site (no YouTube, no permission prompt).

## Upload from github.com

1. Open this folder on GitHub: `assets/video/`.
2. **Add file → Upload files**, drop the `.mp4` in, then **Commit changes** (to `main` to publish right away).
3. The site redeploys in about a minute.

## Naming

The file name becomes the title: `tokyo-night-walk.mp4` shows as "tokyo night walk".

## What works best

- **H.264 video with AAC audio in an `.mp4`** plays in every browser. `.webm` works too, except in some older Safari versions.
- **Keep files small.** GitHub's web upload takes files up to 25 MB; pushing with git allows up to 100 MB per file. Every version of a video stays in the repository's history forever, and GitHub Pages sites should stay under 1 GB in total. For anything long, YouTube (in `_data/youtube.yml`) is the better home.
- A quick way to shrink one: `ffmpeg -i in.mov -c:v libx264 -crf 26 -preset slow -vf "scale=-2:720" -c:a aac -b:a 128k -movflags +faststart out.mp4`
- Only upload videos you have the right to publish.

This README is not a video, so Media Player ignores it.
