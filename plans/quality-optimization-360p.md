# Quality Optimization: Switching Default HQ to 360p

## Context
The user wants to optimize bandwidth while maintaining maximum audio quality. 360p (`medium`) is the threshold where YouTube typically serves its high-quality audio stream (Opus 160kbps).

## Strategy
1. Modify `js/modules/player.js` to replace all occurrences of `'large'` (480p) with `'medium'` (360p).
2. Modify `js/modules/ui.js` to update the user-facing toast message from `480p` to `360p`.

## Proposed Changes

### `js/modules/player.js`
- Change `setPlaybackQuality` and `suggestedQuality` values from `'large'` to `'medium'`.

### `js/modules/ui.js`
- Change the text "Mode HQ (480p)" to "Mode HQ (360p)".
