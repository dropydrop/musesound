/**
 * Global Application State
 */
export const state = {
    currentPlaylist: JSON.parse(localStorage.getItem('MS_CURRENT_PLAYLIST')) || [],
    foundPlaylists: [],
    currentIndex: -1,
    playingQueueIndex: -1,
    isPlaying: false,
    isLoading: false,
    volume: !isNaN(parseInt(localStorage.getItem('MS_VOLUME'))) ? parseInt(localStorage.getItem('MS_VOLUME')) : 100,
    shuffle: localStorage.getItem('MS_SHUFFLE') === 'true',
    repeat: localStorage.getItem('MS_REPEAT') || 'none',
    isCinemaMode: false,
    uiMode: 'playlist',
    searchTab: 'tracks',
    ecoMode: localStorage.getItem('MS_ECO_MODE') === 'true',
    queue: JSON.parse(localStorage.getItem('MS_QUEUE')) || [],
    debounceTimer: null,
    isFadingOut: false,
    keepAliveAudio: null,
    draggedIndex: -1,
    draggedType: null,
    dragTimer: null,
    startY: 0,
    nextPageTokenTracks: null,
    nextPageTokenPlaylists: null,
    lastSearchQuery: null,
    isFetchingMore: false
};
