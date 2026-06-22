---
name: Luminous Tech
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#38393a'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#292a2a'
  surface-container-highest: '#343535'
  on-surface: '#e3e2e2'
  on-surface-variant: '#bccbb9'
  inverse-surface: '#e3e2e2'
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
  on-background: '#e3e2e2'
  surface-variant: '#343535'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is engineered for high-performance technology platforms, focusing on clarity, precision, and a high-energy "always-on" aesthetic. It utilizes a **Modern Corporate** style with **Glassmorphism** accents to create a sense of depth and technical sophistication.

The brand personality is authoritative yet innovative, catering to developers, financial analysts, and tech-savvy professionals. The goal is to evoke a feeling of reliability through deep dark backgrounds, contrasted by the vibrant energy of a tech-focused emerald green. The interface prioritizes focus by reducing visual noise, using light and transparency to guide the user's eye to critical actions and data points.

## Colors
The palette is rooted in a deep "True Dark" foundation to maximize contrast and reduce eye strain in professional environments. 

- **Primary:** A vibrant, tech-focused green (#1DB954) used exclusively for high-priority actions, active states, and progress indicators. This color should feel luminous against the dark backgrounds.
- **Surface Tiers:** The UI uses three layers of gray. The base background is `#121212`. Secondary surfaces like cards or sidebars use `#181818`. Elevated components like tooltips or popovers use `#282828`.
- **Typography:** Primary text is Pure White (#FFFFFF) at high opacity (87%+) for maximum readability. Secondary metadata and labels use the Neutral Gray (#B3B3B3) at 60% opacity.

## Typography
This design system utilizes a tiered typographic approach to separate brand identity from utility.

- **Headlines:** Uses **Geist** for a clean, technical, and slightly condensed feel that communicates precision.
- **Body:** Uses **Inter** for its exceptional readability and neutral tone, ensuring that long-form data or documentation is easy to digest.
- **Labels/Data:** Uses **JetBrains Mono** for all technical labels, code snippets, and tabular data. The monospaced nature reinforces the "tech-focused" brand pillar.

All type should be rendered with `antialiased` smoothing. For mobile, headline sizes scale down to prevent awkward line breaks while maintaining heavy weights for hierarchy.

## Layout & Spacing
The layout follows a **Fluid Grid** system based on a 4px baseline. 

- **Desktop:** A 12-column grid with 24px gutters and 40px outer margins. Content is generally max-width constrained to 1440px to ensure readability.
- **Tablet:** 8-column grid with 20px gutters and 24px margins.
- **Mobile:** 4-column grid with 16px gutters and 16px margins.

Spacing is applied using a geometric scale (4, 8, 16, 24, 32, 48, 64). Internal component padding typically uses the `md` (16px) unit for a balanced, spacious feel. Margin between sections should default to `2xl` (48px).

## Elevation & Depth
In this dark-mode system, elevation is conveyed through **Tonal Layers** and **Backdrop Blurs** rather than traditional black shadows.

- **Level 0 (Base):** `#121212`. The infinite canvas.
- **Level 1 (Cards/Sections):** `#181818`. Subtle contrast from the background.
- **Level 2 (Modals/Menus):** `#282828`. These elements should use a 20px backdrop blur and a semi-transparent border (white at 10% opacity) to simulate glass.
- **Interactive States:** When a primary element is hovered, it gains a subtle outer glow using the primary green at 20% opacity with a 15px blur.
- **Borders:** Use low-contrast outlines (White at 8% opacity) to define boundaries without adding visual weight.

## Shapes
The design system uses **Soft** geometry. This provides a professional and modern look that is more approachable than sharp corners but more "serious" than fully rounded pill shapes.

- **Buttons & Inputs:** 0.25rem (4px) corner radius.
- **Cards & Containers:** 0.5rem (8px) corner radius.
- **Large Modals:** 0.75rem (12px) corner radius.

Consistent corner rounding across all components ensures a unified, systematic appearance.

## Components
- **Primary Buttons:** Solid Tech Green (#1DB954) background with Black text. On hover, the green shifts to a slightly lighter tint.
- **Secondary Buttons:** Transparent background with a 1px border of White (20% opacity). Text is White.
- **Progress Bars:** Background track is `#282828`. The active fill is the primary Tech Green. For indeterminate states, a gradient animation of the green is used.
- **Inputs:** Dark background (#181818) with a 1px border (#282828). On focus, the border changes to Tech Green with a 2px outer glow.
- **Chips:** Small, rounded-sm containers with `#282828` background. Active chips use a Tech Green border and text.
- **Lists:** Items are separated by 1px borders (#282828). Hover states for list items use a subtle background highlight of White at 4% opacity.
- **Active States:** Any navigation item or toggle that is "on" must use the primary Tech Green as a high-contrast accent (e.g., a 2px vertical bar or a text color change).