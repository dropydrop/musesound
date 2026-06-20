/**
 * Audio Player Module (YouTube IFrame management)
 */
import { state } from './state.js';
import { utils } from './utils.js';

export const player = {
    ytPlayer: null,
    ytActive: false,
    progressInterval: null,
    isFadingOut: false,
    keepAliveAudio: null,

    init() {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);

        window.onYouTubeIframeAPIReady = () => {
            this.ytPlayer = new YT.Player('yt-player-fallback', {
                height: '0', width: '0',
                playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, fs: 0, disablekb: 1 },
                events: {
                    onReady: () => { if (this.ytPlayer?.setVolume) this.ytPlayer.setVolume(state.volume); },
                    onStateChange: (e) => this.onPlayerStateChange(e),
                    onError: (e) => this.handleError(e)
                }
            });
        };
    },

    onPlayerStateChange(event) {
        const { ui } = window.MuseSound;
        if (!this.ytActive) return;
        if (event.data === YT.PlayerState.PLAYING) {
            state.isPlaying = true;
            ui.updatePlayerControls();
            this.startProgressTracking();
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
                this.ytPlayer.setPlaybackQuality(state.ecoMode ? 'tiny' : 'medium');
            }
        } else if (event.data === YT.PlayerState.PAUSED) {
            state.isPlaying = false;
            ui.updatePlayerControls();
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        } else if (event.data === YT.PlayerState.ENDED) {
            this.next(false);
        }
    },

    handleError(error) {
        const { ui } = window.MuseSound;
        console.error("YouTube Player error:", error);
        ui.setLoading(false);
        utils.showToast("Morceau non disponible, passage au suivant...");
        setTimeout(() => this.next(true), 1500);
    },

    startProgressTracking() {
        if (this.progressInterval) clearInterval(this.progressInterval);
        this.progressInterval = setInterval(() => {
            if (this.ytActive && this.ytPlayer?.getCurrentTime) {
                const cur = this.ytPlayer.getCurrentTime();
                const dur = this.ytPlayer.getDuration();
                if (dur > 0) {
                    const progress = (cur / dur) * 100;
                    document.querySelectorAll('.player-progress-bar').forEach(el => el.style.width = progress + '%');
                    document.querySelectorAll('.player-current-time').forEach(el => el.textContent = utils.formatTime(cur));
                    document.querySelectorAll('.player-duration').forEach(el => el.textContent = utils.formatTime(dur));
                    
                    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
                        navigator.mediaSession.setPositionState({ duration: dur, playbackRate: 1, position: cur });
                    }

                    if (dur - cur <= 5 && !this.isFadingOut) {
                        this.isFadingOut = true;
                        this.fadeOut();
                    }
                    if (dur - cur > 6) this.isFadingOut = false;

                    if (Math.floor(cur) % 5 === 0) {
                        const activeIdx = state.playingQueueIndex >= 0 ? state.playingQueueIndex : state.currentIndex;
                        const isQueue = state.playingQueueIndex >= 0;
                        localStorage.setItem('MS_LAST_INDEX', activeIdx);
                        localStorage.setItem('MS_LAST_IS_QUEUE', isQueue);
                        localStorage.setItem('MS_LAST_POS', cur);
                    }
                }
            }
        }, 500);
    },

    fadeOut() {
        let v = state.volume;
        const interval = setInterval(() => {
            v -= 5;
            if (v <= 0) {
                clearInterval(interval);
                if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') this.ytPlayer.setVolume(0);
            } else { 
                if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') this.ytPlayer.setVolume(v); 
            }
        }, 200);
    },

    playQueueTrack(index, startTime = 0) {
        const { ui } = window.MuseSound;
        if (index < 0 || index >= state.queue.length) return;
        state.playingQueueIndex = index;
        state.currentIndex = -1;
        const track = state.queue[index];
        this.doPlay(track, startTime);
        ui.renderQueue();
    },

    playTrack(index, startTime = 0) {
        const { ui } = window.MuseSound;
        if (index < 0 || index >= state.currentPlaylist.length) return;
        state.currentIndex = index;
        state.playingQueueIndex = -1;
        const track = state.currentPlaylist[index];
        ui.setLoading(true);
        if (this.ytPlayer && typeof this.ytPlayer.stopVideo === 'function') this.ytPlayer.stopVideo();
        this.ytActive = false;
        
        if (!this.ytPlayer || typeof this.ytPlayer.loadVideoById !== 'function') {
            const waitForPlayer = setInterval(() => {
                if (this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
                    clearInterval(waitForPlayer);
                    this.doPlay(track, startTime);
                }
            }, 100);
            setTimeout(() => clearInterval(waitForPlayer), 5000);
            return;
        }
        this.doPlay(track, startTime);
    },

        doPlay(track, startTime = 0) {
        const { ui } = window.MuseSound;
        this.ytActive = true;
        this.isFadingOut = false;
        // Forçage du volume avant lecture
        if (this.ytPlayer?.setVolume) this.ytPlayer.setVolume(state.volume > 0 ? state.volume : 100);

        
        this.ytPlayer.loadVideoById({
            videoId: track.id,
            startSeconds: startTime,
            suggestedQuality: state.ecoMode ? 'tiny' : 'medium'
        });

        // Forçage immédiat
        if (this.ytPlayer && typeof this.ytPlayer.setPlaybackQuality === 'function') {
            this.ytPlayer.setPlaybackQuality(state.ecoMode ? 'tiny' : 'medium');
        }

        setTimeout(() => {
            if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
                this.ytPlayer.playVideo();
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
            }
        }, 150);

        this.startKeepAlive();
        ui.updateNowPlaying(track);
        this.updateMediaSession(track);
        ui.setLoading(false);
    },

    startKeepAlive() {
        if (this.keepAliveAudio) return;
        const silentB64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/wD/AA==";
        this.keepAliveAudio = new Audio(silentB64);
        this.keepAliveAudio.loop = true;
        this.keepAliveAudio.play().catch(() => { this.keepAliveAudio = null; });
    },

    updateMediaSession(track) {
        if (!('mediaSession' in navigator) || !track) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title || 'Sans titre',
            artist: track.author || 'Artiste inconnu',
            album: 'MuseSound',
            artwork: [
                { src: track.thumbnail, sizes: '96x96', type: 'image/jpeg' },
                { src: track.thumbnail, sizes: '128x128', type: 'image/jpeg' },
                { src: track.thumbnail, sizes: '192x192', type: 'image/jpeg' },
                { src: track.thumbnail, sizes: '256x256', type: 'image/jpeg' },
                { src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }
            ]
        });
        navigator.mediaSession.setActionHandler('play', () => this.toggle());
        navigator.mediaSession.setActionHandler('pause', () => this.toggle());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.next(true));
        navigator.mediaSession.setActionHandler('stop', () => {
            if (this.ytPlayer && this.ytActive) this.ytPlayer.pauseVideo();
        });
    },

    addToQueue(track) {
        const { ui } = window.MuseSound;
        if (!track) return;
        state.queue.push(track);
        localStorage.setItem('MS_QUEUE', JSON.stringify(state.queue));
        ui.renderQueue();
        utils.showToast("Ajouté à la file d'attente");
    },

        next(forceNext = false) {
        const { ui } = window.MuseSound;
        
        let currentQueueIndex = state.playingQueueIndex;
        
        if (state.queue.length > 0) {
            let nextIndex = (currentQueueIndex >= 0) ? currentQueueIndex + 1 : 0;
            
            if (nextIndex < state.queue.length) {
                // Supprimer le morceau terminé ET jouer le suivant (qui est maintenant à la position currentQueueIndex après splice)
                if (currentQueueIndex >= 0) state.queue.splice(currentQueueIndex, 1);
                this.playQueueTrack(currentQueueIndex >= 0 ? currentQueueIndex : 0);
            } else {
                // Queue terminée, vider et passer à la playlist
                state.queue = [];
                state.playingQueueIndex = -1;
                localStorage.setItem('MS_QUEUE', JSON.stringify(state.queue));
                ui.renderQueue();
                
                // Transition automatique vers playlist si disponible
                if (state.currentPlaylist.length > 0) {
                    this.playTrack(state.currentIndex + 1 >= state.currentPlaylist.length ? 0 : state.currentIndex + 1);
                }
            }
        } else if (state.currentPlaylist.length > 0) {
            // Logique de playlist standard
            if (!forceNext && state.repeat === 'one') {
                if (this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
                    this.ytPlayer.seekTo(0, true);
                    this.ytPlayer.playVideo();
                    return;
                }
            }

            let nextIndex = state.currentIndex + 1;
            if (state.shuffle) {
                state.shuffleHistory.push(state.currentIndex);
                nextIndex = Math.floor(Math.random() * state.currentPlaylist.length);
            }
            if (nextIndex >= state.currentPlaylist.length) {
                if (state.repeat === 'all') nextIndex = 0;
                else { if (this.ytPlayer) this.ytPlayer.stopVideo(); this.ytActive = false; return; }
            }
            this.playTrack(nextIndex);
        } else if (this.ytPlayer) {
            this.ytPlayer.stopVideo();
            this.ytActive = false;
        }
        localStorage.setItem('MS_QUEUE', JSON.stringify(state.queue));
        ui.renderQueue();
    },


    prev() {
        if (!this.ytPlayer) return;
        const cur = this.ytPlayer.getCurrentTime();
        if (cur > 3) {
            this.ytPlayer.seekTo(0, true);
            return;
        }
        if (state.playingQueueIndex < 0 && state.currentPlaylist.length > 0) {
            let prevIndex = state.currentIndex - 1;
            if (state.shuffle && state.shuffleHistory.length > 0) {
                prevIndex = state.shuffleHistory.pop();
            }
            if (prevIndex < 0) {
                if (state.repeat === 'all') prevIndex = state.currentPlaylist.length - 1;
                else prevIndex = 0;
            }
            this.playTrack(prevIndex);
        }
    },

    toggle() {
        if (!this.ytPlayer) return;
        const s = this.ytPlayer.getPlayerState();
        if (s === 1) {
            this.ytPlayer.pauseVideo();
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        } else {
            this.ytPlayer.playVideo();
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }
    },

    removeFromQueue(index) {
        const { ui } = window.MuseSound;
        state.queue.splice(index, 1);
        if (state.playingQueueIndex === index) state.playingQueueIndex = -1;
        else if (state.playingQueueIndex > index) state.playingQueueIndex--;
        localStorage.setItem('MS_QUEUE', JSON.stringify(state.queue));
        ui.renderQueue();
    },

    clearQueue() {
        const { ui } = window.MuseSound;
        state.queue = [];
        state.playingQueueIndex = -1;
        localStorage.removeItem('MS_QUEUE');
        ui.renderQueue();
        utils.showToast("File d'attente vidée");
        setTimeout(() => {
            state.uiMode = 'playlist';
            ui.syncTabs();
        }, 1000);
    },

    setVolume(val) {
        const { ui } = window.MuseSound;
        state.volume = val;
        localStorage.setItem('MS_VOLUME', val);
        if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
            this.ytPlayer.setVolume(val);
        }
        ui.updateVolumeUI();
    },

    exportQueueToFile() {
        if (state.queue.length === 0) {
            utils.showToast("La file d'attente est vide !");
            return;
        }
        const data = { version: 1, exportedAt: new Date().toISOString(), tracks: state.queue };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.getHours().toString().padStart(2, '0') + '-' + now.getMinutes().toString().padStart(2, '0');
        const filename = `musesound_playlist_${dateStr}_${timeStr}.json`;
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        utils.showToast("Exportation réussie");
    },

    async importQueueFromFile(event) {
        const { ui } = window.MuseSound;
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.tracks || !Array.isArray(data.tracks)) throw new Error("Format invalide");
                state.queue = data.tracks;
                localStorage.setItem('MS_QUEUE', JSON.stringify(state.queue));
                state.playingQueueIndex = -1;
                utils.showToast(`File d'attente importée (${data.tracks.length} titres)`);
                state.uiMode = 'queue';
                ui.syncTabs();
                if (data.tracks.length > 0) this.playQueueTrack(0);
            } catch (err) {
                console.error("Erreur import:", err);
                utils.showToast("Erreur : Fichier invalide");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
};
