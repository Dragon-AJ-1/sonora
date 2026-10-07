# SONORA

> **Listen deeper.** A fully static, dark-themed music web app — gold accent, serif/mono/sans
> typography, working audio playback, radio, sessions, library, stats, and a professional
> 10-band equalizer. Every artist, album and story is fictional demo data.

No build step, no framework, no server-side code. Plain HTML + CSS + ES5-ish JavaScript.

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
5. The site appears at `https://<user>.<repo>.github.io/<repo>/` within a minute.

Notes:
- An empty `.nojekyll` file is included so GitHub skips Jekyll processing
  (keeps files/directories starting with `_` and everything under `/audio` untouched).
- A ready-made workflow also exists at `.github/workflows/static.yml` — if you use it,
  switch Pages source to **GitHub Actions** instead of “Deploy from a branch”.
- Deep links are not routed (client-side `S.page` + `S.param` only) — unknown URLs boot to home.

---

## How to add music

Three steps, no code editing:

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
  automatically** — title, artist, album *and* embedded cover art (`js/id3.js`, dependency-free,
  ID3v2.3 / ID3v2.4). The results are cached in `localStorage`.
- If `audio/manifest.json` is missing entirely, the app silently uses only the built-in demo data.
- Bundled demo audio: `audio/track1.mp3` … `track8.mp3` (SoundHelix, soundhelix.com) is used as
  the playback fallback for any track file that doesn’t exist.

Demo data itself (artists, albums, playlists, stories, events, stations…) lives in **`js/data.js`**
— edit music data there; **`js/app.js`** contains only logic.

## Equalizer

Open the full player (click the track bar or press `F`) → **EQ** button in the top bar (or press
`E`). 10 bands (31 Hz – 16 kHz, ±15 dB), preamp, 13 presets, custom presets, live response curve,
ENABLE/BYPASS. Changes persist in `sonora-state-v2`.

## Keyboard shortcuts

`Space` play/pause · `←/→` seek ±10s (Shift = ±30s) · `↑/↓` volume · `M` mute · `N/P` next/prev ·
`L` like · `S` shuffle · `R` repeat · `F` full player · **`E` EQ panel · `Shift+E` EQ bypass** ·
`0–9` jump to % · `⌘/Ctrl+K` search · `?` help · `Esc` close

## Persistence & reset

Everything (likes, follows, saved albums/playlists, history, recents, player position, volume,
shuffle/repeat, EQ, last tabs) lives under the single `localStorage` key **`sonora-state-v2`**.
Old `sonora-state` / `sonora-vol` keys are migrated automatically, then deleted.
Use **Reset app** in the footer to clear it (`window.clearState()`).

## Browser support

- **Web Audio (EQ + live waveform)** — Chrome/Edge 66+, Firefox 75+, Safari 14.1+.
  `AudioContext` is created on the first user gesture; before that, playback and the
  visualizer fall back to the plain `<audio>` element and a decorative sine wave.
- **ID3v2 tag reading** — all evergreen browsers (pure JS, streams only the tag bytes).
- **Manifest fetch** — browsers with `fetch` (all evergreen). Missing manifest = graceful no-op.
- Older browsers: everything degrades — playback still works via the `<audio>` element.

## Structure

```
index.html            single page, <base href="./"> for GitHub Pages
css/styles.css        theme, layout, components
css/fixes.css         fixes/additions (no new rules required by EQ)
css/eq.css            equalizer panel only
js/data.js            ALL music/editorial data + SONORA_DATA export
js/eq.js              Web Audio EQ engine + panel UI  (window.EQ)
js/id3.js             dependency-free ID3v2 reader     (window.ID3)
js/app.js             app logic, state, routing, persistence
audio/manifest.json   drop-in music manifest
audio/*.mp3           fallback demo audio
.nojekyll             skip Jekyll on GitHub Pages
```

All artists, releases, events and data in SONORA are invented for demo purposes.
