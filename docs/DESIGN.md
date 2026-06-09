---
name: Luminous Tech
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#37393a'
  surface-container-lowest: '#0c0f0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#bccbb9'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#869585'
  outline-variant: '#3d4a3d'
  surface-tint: '#53e076'
  primary: '#53e076'
  on-primary: '#003914'
  primary-container: '#1db954'
  on-primary-container: '#004118'
  inverse-primary: '#006e2d'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#4a4949'
  on-secondary-container: '#bab8b7'
  tertiary: '#c8c6c5'
  on-tertiary: '#303030'
  tertiary-container: '#a2a1a0'
  on-tertiary-container: '#383838'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#72fe8f'
  primary-fixed-dim: '#53e076'
  on-primary-fixed: '#002108'
  on-primary-fixed-variant: '#005320'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474746'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-label:
    fontFamily: Geist Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 280px
  player-height: 96px
  container-padding: 24px
  grid-gutter: 24px
  stack-gap: 16px
---

## Brand & Style
The design system for this desktop audio platform centers on a "Luminous Tech" aesthetic. It targets tech-savvy music enthusiasts and creators who value precision, speed, and deep immersion. The UI evokes a sense of being inside a high-end digital cockpit—dark, focused, and high-performance.

The style is **Minimalist Tech**, characterized by:
- A high-contrast dark environment that reduces eye strain and makes cover art pop.
- Precise, thin strokes and technical details that suggest a professional-grade tool.
- Expansive whitespace (or "darkspace") to ensure the interface never feels cluttered despite complex functionality.
- Subtle glows and vibrant green accents that act as the primary "energy source" within the interface.

## Colors
The palette is built on a "Deep Carbon" foundation to maximize the luminosity of the primary green.

- **Primary (#1db954):** The "Action Green." Used for playback progress, active states, and primary call-to-action buttons. It should feel electric against the dark background.
- **Surface Foundations:**
  - `Base`: #121212 (The main background color).
  - `Surface`: #181818 (Secondary containers, sidebar).
  - `Elevated`: #282828 (Cards, hover states, menus).
- **Typography & Icons:**
  - `High Emphasis`: #ffffff (100% opacity) for titles and primary icons.
  - `Medium Emphasis`: #b3b3b3 (70% opacity) for secondary text and metadata.
  - `Disabled/Hint`: #535353 (40% opacity) for borders and inactive icons.

## Typography
This design system utilizes **Geist** for its systematic, developer-centric clarity. The typeface provides a technical edge that aligns with the "Luminous Tech" narrative.

- **Display & Headlines:** Use Semi-Bold to Bold weights with tight letter spacing to create a strong visual anchor for album titles and playlists.
- **Body:** Regular weight is used for all descriptive text. Ensure a clear hierarchy by using color (White vs. Grey) rather than just size.
- **Labels:** Use Medium weight and uppercase for category headers or technical metadata (e.g., bitrates, file types) to provide a "dashboard" feel.
- **Monospaced Accents:** For technical readouts (time codes, BPM), Geist's monospaced characteristics should be emphasized to maintain alignment.

## Layout & Spacing
The desktop layout is a fixed-fluid hybrid designed for large-screen efficiency.

- **Sidebar Navigation:** A fixed 280px left-hand sidebar contains the primary navigation and library access. It uses a slightly darker shade than the main content area to provide depth.
- **Main Content Area:** A fluid grid that expands to fill the remaining width. Content should be organized in a "Spacious Grid" layout, allowing album art to be large and legible.
- **Wide Player Controls:** A fixed 96px bottom bar spanning the full width of the viewport. Controls are centered, with track info on the left and utility (volume, queue) on the right.
- **Rhythm:** An 8px base grid governs all spacing. Page margins are set to 24px (3x) to give the content room to breathe.

## Elevation & Depth
Elevation is communicated through **Tonal Layering** and **Subtle Outlines** rather than heavy shadows, maintaining the clean minimalist aesthetic.

- **Level 0 (Base):** #121212 - The canvas.
- **Level 1 (Sidebar/Cards):** #181818 - Surfaces that sit directly on the base.
- **Level 2 (Hover/Menus):** #282828 - Interactive elements that "lift" toward the user.
- **Luminous Borders:** For active elements or focused inputs, use a 1px solid border of #1db954 or a subtle 10% opacity white stroke to define edges without adding bulk.
- **The Glow:** High-priority active elements (like the current playing song thumbnail) may use a very soft, low-opacity green outer glow (spread 20px, opacity 15%).

## Shapes
The shape language is "Soft-Tech"—precise but approachable.

- **Standard Radius:** 8px for all cards, buttons, and input fields. This provides a modern, clean look that isn't as aggressive as sharp corners nor as casual as pills.
- **Container Radius:** 12px for larger modal windows or main content containers to create a "nested" feel.
- **Full Rounding:** Only used for profile avatars and specific play/pause icons within the player bar to denote their primary importance.

## Components
- **Buttons:** 
  - *Primary:* Filled with #1db954, black text, 8px radius. 
  - *Secondary:* Ghost style with 1px #535353 border, white text.
- **Cards:** 8px radius, #181818 background. On hover, the background transitions to #282828 and a green "Play" FAB (Floating Action Button) fades in.
- **Lists:** Song rows use a clear horizontal layout. On hover, the entire row highlights to #282828. The current active track displays the title in #1db954.
- **Input Fields:** 8px radius, #282828 fill, no border. On focus, a 1px #1db954 border appears.
- **Player Bar:** A full-width persistent element. The progress bar is a 4px tall track; #535353 for the rail and #1db954 for the progress. The "thumb" only appears on hover.
- **Sidebar Items:** High-legibility icons paired with Geist Semi-Bold. Active state indicated by a 4px vertical green line on the far left edge.