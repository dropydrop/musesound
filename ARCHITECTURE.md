C:.

│   .gitattributes

│   .gitignore

│   agent-lite.md

│   agent.md

│   AGENTS.md

│   ARCHITECTURE.md

│   firebase.json

│   GEMINI.md

│   index.html

│   INDEX\_PROJET.md

│   LICENSE

│   manifest.json

│   README.md

│   service-worker.js

│

├───docs

│   │   DESIGN.md

│   │   developer\_handoff\_guide.md

│   │   guide\_d\_installation\_android.md

│   │   roadmap\_technique\_musesound.md

│   │

│   └───desktop app designs

│       │   manifest.json

│       │

│       ├───accueil\_desktop

│       │       code.html

│       │       screen.png

│       │

│       ├───file\_d\_attente\_vert

│       │       code.html

│       │       screen.png

│       │

│       ├───lecteur\_audio\_vert

│       │       code.html

│       │       screen.png

│       │

│       ├───login\_desktop

│       │       code.html

│       │       screen.png

│       │

│       ├───luminous\_tech

│       │       DESIGN.md

│       │

│       ├───ma\_biblioth\_que\_desktop

│       │       code.html

│       │       screen.png

│       │

│       ├───ma\_biblioth\_que\_vert

│       │       code.html

│       │       screen.png

│       │

│       ├───param\_tres\_api\_desktop

│       │       code.html

│       │       screen.png

│       │

│       ├───recherche\_desktop

│       │       code.html

│       │       screen.png

│       │

│       ├───recherche\_d\_couverte\_vert

│       │       code.html

│       │       screen.png

│       │

│       └───three.js

│               code.html

│

└───js

&#x20;   │   app.js

&#x20;   │

&#x20;   └───modules

&#x20;           api.js

&#x20;           config.js

&#x20;           jam.js

&#x20;           player.js

&#x20;           qrcode.min.js

&#x20;           state.js

&#x20;           ui.js

&#x20;           utils.js

&#x20;           youtube-private.js

## UI / Navigation

### Mobile search overlay

- `#mobile-search-overlay` is injected at `<body>` root (outside `<main>`) to avoid stacking-context conflicts with `<main>`'s `transition-all` and `overflow-hidden` CSS properties.
- Triggered by `#btn-mobile-search-trigger` (formerly `#tab-search-icon`) via **global event delegation** on `document` in capture phase — immune to DOM re-renders.
- The search input (`#playlist-url`) is physically moved between `#header-search-container` and `#mobile-search-input-wrapper` by `toggleMobileSearch()` preserving all listeners.
- On close, the input and import button are prepended back to `#header-search-container`.
- Suggestions: Google JSONP with 2s timeout fallback to local filtering of `state.currentPlaylist` and `state.foundPlaylists` titles.
- Search is only visible on **Morceaux** and **Playlists** tabs. Hidden on Bibliothèque, File d'attente, Jam.

