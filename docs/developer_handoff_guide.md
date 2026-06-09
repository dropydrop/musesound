# MuseSound Developer Handoff & "Vibe Coding" Guide

This document provides the necessary technical context to transform the MuseSound UI/UX designs into a functional application.

## 1. Project Overview
MuseSound is a high-fidelity audio streaming interface designed for YouTube and YouTube Music. It focuses on a "Luminous Tech" aesthetic (Dark mode + Neon Green accents).

## 2. Tech Stack Recommendations
- **Frontend:** React, Vue, or vanilla HTML/JS with **Tailwind CSS** (all designs use Tailwind utility classes).
- **Functional Wrapper:** 
  - **PWA:** For mobile installation via browser.
  - **Electron:** For a native-feeling Desktop experience.
  - **Capacitor/Tauri:** For cross-platform mobile/desktop compilation.

## 3. Core Logic: The YouTube Connection
To make the "empty shell" functional, you need to implement three main modules:

### A. Authentication (OAuth 2.0)
- **Scope:** `https://www.googleapis.com/auth/youtube.readonly`
- **Flow:** Use Google Sign-In to obtain an `access_token`. This allows the app to fetch the user's private playlists and liked songs.

### B. Data Fetching (YouTube Data API v3)
- **Endpoints to implement:**
  - `search.list`: For the Search/Discovery screen.
  - `playlists.list`: To populate "Your Library".
  - `playlistItems.list`: To fetch tracks within a selected playlist.

### C. Audio Playback (The Engine)
YouTube's TOS and technical constraints require specific handling:
- **Web/PWA:** Use the **YouTube IFrame Player API**. You can hide the video container or style it to be 1x1 pixel to focus on the audio.
- **Desktop (Advanced):** Use `yt-dlp` (via a local node.js sidecar) to extract the audio stream URL and play it through an HTML5 `<audio>` tag or a library like `Howler.js`.

## 4. Design Tokens (Luminous Tech)
- **Primary Color:** `#1db954` (Luminous Green)
- **Surface:** `#121414` (Deep Charcoal)
- **Font:** Geist or Inter (Sans-serif)
- **Border Radius:** 8px (Standard) / 4px (Tight)

## 5. File Structure
- `index.html`: Main entry point (Desktop/Mobile routing).
- `manifest.json`: PWA configuration.
- `styles.css`: Tailwind configuration and custom animations.
- `app.js`: Placeholder for API integration logic.

---
*Ready for integration with your AI coding assistant or developer of choice.*