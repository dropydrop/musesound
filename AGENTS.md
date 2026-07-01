# AGENTS.md — MuseSound

## What this is

Vanilla JS single-page audio player for YouTube content. No build step, no package manager, no tests, no backend.

## Entry & architecture

- `index.html` → `<script type="module" src="js/app.js">` → `window.MuseSound.init()` on DOMContentLoaded
- Modules in `js/modules/`: `api.js`, `player.js`, `state.js`, `ui.js`, `utils.js`, `config.js`, `youtube-private.js`
- Init order: `ui.init()` → `player.init()` → `state.initVolume()` → `setupAuth()`
- `window.MuseSound` is the global orchestrator; modules reference each other via it

## Run / dev

Just open `index.html` in a browser — no server needed (though a local server helps for CORS in some edge cases).

## CDN dependencies (loaded in `index.html`)

- Tailwind CSS (with forms & container-queries plugins)
- Google Fonts: Geist, Geist Mono, Material Symbols
- Supabase JS v2
- YouTube IFrame API (loaded dynamically by `player.js`)

## API keys (hardcoded)

- YouTube Data API v3 key: `js/modules/config.js`
- Supabase anon key: `js/app.js`
- Keep them in sync if replaced.

## localStorage keys

| Key | Purpose |
|---|---|
| `MS_CURRENT_PLAYLIST` | Current search results |
| `MS_VOLUME` | Volume 0–100 |
| `MS_SHUFFLE` | Shuffle toggle |
| `MS_REPEAT` | `none` / `all` / `one` |
| `MS_ECO_MODE` | Eco data-saver mode |
| `MS_QUEUE` | Play queue |
| `MS_LAST_INDEX`, `MS_LAST_IS_QUEUE`, `MS_LAST_POS` | Resume position |
| `MS_SHUFFLE_HISTORY` | Shuffle history |

All prefixed `MS_`. Clear them to reset state.

## Notable quirks

- **Mobile search overlay**: `#mobile-search-overlay` is placed at `<body>` root (outside `<main>`) to avoid stacking-context conflicts with `transition-all` / `overflow`. Its trigger (`#btn-mobile-search-trigger`) uses global event delegation (`document.addEventListener('click', ..., true)`) — never re-attach direct listeners on this button, and never move the overlay back inside `<main>`. Google JSONP suggestions fall back to local title filtering after 2s timeout.
- **Search scope isolation**: The search input (`#playlist-url`) is physically moved between the header and the mobile overlay via `toggleMobileSearch()`. Event listeners persist because the DOM node is moved, not cloned. Search is only active in Discovery tabs (Morceaux/Playlists), hidden in Bibliothèque/File d'attente/Jam.

- **Eco mode**: forces YouTube player quality to `tiny` (144p) vs `medium` (360p). Toggle via eco button.
- **Keep-alive**: silent WAV audio loop prevents mobile browsers from killing the tab during playback.
- **Fade-out**: volume ramps down in the last 5 seconds of a track.
- **Resume**: banner appears when `MS_LAST_POS > 10`. Uses `MS_LAST_INDEX`, `MS_LAST_IS_QUEUE`, `MS_LAST_POS`.
- **Drag-and-drop**: pointer events with 500ms hold activation; disabled on touch.
- **Infinite scroll**: triggers `fetchMore()` when scroll is within 150px of bottom.
- **Queue auto-clean**: played queue tracks are spliced out; when queue empties, falls back to playlist.
- **Google OAuth via Supabase**: needed for private playlists and "My Library" tab. Token stored as `state.googleToken` and passed as Bearer to YouTube API.

## Existing instruction files (don't delete)

- `INDEX_PROJET.md` — plugin routing index for agent ecosystem
- `agent.md`, `agent-lite.md`, `GEMINI.md` — coding agent configuration
- `ARCHITECTURE.md` — file tree reference
- `docs/` — design tokens, roadmap, installation guide, etc.
