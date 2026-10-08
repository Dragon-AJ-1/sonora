# SONORA

> **Listen deeper.** A fully static, dark-themed music web app — gold accent, serif/mono/sans
> typography, working audio playback, radio, sessions, library, stats, and a professional
> 10-band equalizer. Every artist, album and story is fictional demo data.

No build step, no framework, no server-side code. Plain HTML + CSS + ES5-ish JavaScript.
Runs exclusively on **GitHub Pages**.

---

## Run locally

Any static file server works (files are referenced with **relative paths** only):

```bash
# Python
python -m http.server 8080
# → open http://localhost:8080

# or Node
npx serve .
```

> Opening `index.html` directly via `file://` works for the UI, but `audio/manifest.json`
> and some audio files may be blocked by the browser — use a local server.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. **Settings → Pages → Build and deployment**
3. Source: **Deploy from a branch**
4. Branch: **`main` / `/ (root)`** → **Save**
5. The site appears at `https://<user>.github.io/<repo>/` within a minute.

Notes:
- An empty `.nojekyll` file is included so GitHub skips Jekyll processing
  (keeps files/directories starting with `_` and everything under `/audio` untouched).
- A ready-made workflow also exists at `.github/workflows/static.yml` — if you use it,
  switch Pages source to **GitHub Actions** instead of “Deploy from a branch”.
- Deep links are client-side (`S.page` + `S.param`) — unknown URLs boot to home.

---

## PWA

- `manifest.webmanifest` + theme-color for “Add to Home Screen”.
- Basic Service Worker (`sw.js`) caches static assets and keeps the app usable offline
  for already-visited pages. Music files themselves are still network-fetched.

---

## How to add music

### Manual (three steps)

1. **Drop an `.mp3` into `/audio/`**
2. **Add ONE entry to `audio/manifest.json`:**

```json
{
  "id": "my-song-01",
  "file": "audio/my-song-01.mp3",
  "title": "My Song",
  "artist": "My Artist",
  "album": "My Album",
  "year": 2026,
  "genre": "Electronic",
  "duration": "4:12",
  "cover": "audio/covers/my-song-01.jpg"
}
```

3. **Commit + push** — the app merges the manifest with the built-in demo data,
   auto-creating artist/album entries when needed.

- Required: `id`, `file`, `title`, `artist`, `album`.
- Optional: `year`, `genre`, `duration`, `cover`.
- If `cover` is omitted (or the image 404s), **ID3 tags embedded in the mp3 are read
  automatically** — title, artist, album *and* embedded cover art (`js/id3.js`).

### From a Telegram channel

See **[docs/TELEGRAM.md](docs/TELEGRAM.md)** and the example script
`tools/telegram-add-track.example.js`.

A bot (running anywhere free — Cloudflare Worker, Railway, etc.) can receive audio
from a channel, upload the MP3 via GitHub Contents API and update `audio/manifest.json`.
No server is required for the website itself.

---

## Equalizer

Open the full player (click the track bar or press `F`) → **EQ** button (or press `E`).
10 bands (31 Hz – 16 kHz, ±15 dB), preamp, 13 presets, custom presets, live response curve,
ENABLE/BYPASS. Visual style is fully unified with the main dark + gold theme.
Changes persist in `sonora-state-v2`.

## Keyboard shortcuts

`Space` play/pause · `←/→` seek ±10s (Shift = ±30s) · `↑/↓` volume · `M` mute · `N/P` next/prev ·
`L` like · `S` shuffle · `R` repeat · `F` full player · **`E` EQ panel · `Shift+E` EQ bypass** ·
`0–9` jump to % · `⌘/Ctrl+K` search · `?` help · `Esc` close

## Persistence & reset

Everything lives under the single `localStorage` key **`sonora-state-v2`**.
Use **Reset app** in the footer to clear it (`window.clearState()`).

## Structure

```
index.html            single page + PWA meta
manifest.webmanifest  web app manifest
sw.js                 basic service worker
css/styles.css        theme, layout, components
css/fixes.css         fixes / hardening
css/eq.css            equalizer panel (unified with theme)
js/data.js            music / editorial data
js/eq.js              Web Audio EQ engine + panel UI
js/id3.js             ID3v2 reader
js/app.js             app logic, state, routing, persistence
audio/manifest.json   drop-in music manifest
audio/*.mp3           demo / user tracks
docs/TELEGRAM.md      how to wire a Telegram bot
tools/                example scripts
.nojekyll             skip Jekyll on GitHub Pages
```

All artists, releases, events and data in SONORA are invented for demo purposes.
