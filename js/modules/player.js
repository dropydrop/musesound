/**
 * Audio Player Module (YouTube IFrame management)
 */
import { state } from './state.js';
import { utils } from './utils.js';
import { CONFIG } from './config.js';

export const player = {
    ytPlayer: null,
    ytActive: false,
    progressInterval: null,
    _seekUpdateCounter: 0,
    fadeOutInterval: null,
    isFadingOut: false,
    _keepAliveActive: false,
    _userWantsPlaying: false,
    _bgWatchdog: null,

    init() {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);

        window.onYouTubeIframeAPIReady = () => {
            this.ytPlayer = new YT.Player('yt-player-fallback', {
                height: '1', width: '1',
                playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, fs: 0, disablekb: 1 },
                events: {
                    onReady: () => {
                        if (this.ytPlayer?.setVolume) this.ytPlayer.setVolume(state.volume);
                    },
                    onStateChange: (e) => this.onPlayerStateChange(e),
                    onError: (e) => this.handleError(e)
                }
            });
        };
        document.addEventListener('visibilitychange', () => this._onVisibilityChange());
    },

    onPlayerStateChange(event) {
        const { ui } = window.MuseSound;
        if (!this.ytActive) return;
        if (event.data === YT.PlayerState.PLAYING) {
            this._userWantsPlaying = true;
            state.isPlaying = true;
            ui.updatePlayerControls();
            this.startProgressTracking();

            setTimeout(() => {
                if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
                    this.ytPlayer.setVolume(state.volume);
                }
            }, 50);

            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
                this.ytPlayer.setPlaybackQuality(state.ecoMode ? 'tiny' : 'medium');
            }
        } else if (event.data === YT.PlayerState.PAUSED) {
            if (this._userWantsPlaying && document.hidden) {
                console.log('[MuseSound] Auto-pause détectée en arrière-plan, relance forcée...');
                setTimeout(() => {
                    if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
                        this.ytPlayer.playVideo();
                    }
                }, 200);
                return;
            }
            state.isPlaying = false;
            ui.updatePlayerControls();
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        } else if (event.data === YT.PlayerState.ENDED) {
            this._userWantsPlaying = false;
            this.next(false);
        }
    },

    async handleError(error) {
        const { ui } = window.MuseSound;
        console.error("YouTube Player error:", error);
        ui.setLoading(false);

        const track = state.lastPlayedTrack;
        
        if (!track || state.isAttemptingFallback) {
            state.isAttemptingFallback = false;
            utils.showToast("Échec du fallback, passage au suivant...");
            setTimeout(() => this.next(true), 1200);
            return;
        }

        utils.showToast("Erreur de lecture. Recherche d'une alternative...");
        state.isAttemptingFallback = true;

        try {
            const artist = track.author || "";
            const title = track.title || "";
            const query = `${artist} ${title}`.trim();

            if (!query) throw new Error("Métadonnées insuffisantes");

            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&type=video&videoCategoryId=10&q=${encodeURIComponent(query)}&key=${CONFIG.YOUTUBE_API_KEY}`;
            const res = await fetch(searchUrl);
            const data = await res.json();

            if (!data.items || data.items.length === 0) {
                throw new Error("Aucune alternative trouvée sur YouTube");
            }

            const candidates = data.items.filter(item => item.id.videoId !== track.id);
            if (candidates.length === 0) throw new Error("Seul le doublon défectueux est disponible");

            let bestMatch = candidates.find(item => {
                const chTitle = item.snippet.channelTitle.toLowerCase();
                return !chTitle.includes("topic") && !chTitle.includes("vevo");
            });

            if (!bestMatch) {
                bestMatch = candidates[0];
            }

            if (!this._isCandidateRelevant(track, bestMatch.snippet)) {
                throw new Error("Alternative non pertinente");
            }

            const alternativeTrack = {
                id: bestMatch.id.videoId,
                title: bestMatch.snippet.title,
                author: bestMatch.snippet.channelTitle,
                thumbnail: bestMatch.snippet.thumbnails?.default?.url || track.thumbnail
            };

            state.lastPlayedTrack = alternativeTrack;
            
            setTimeout(() => {
                state.isAttemptingFallback = false;
                this.doPlay(alternativeTrack, 0);
            }, 1000);

        } catch (err) {
            console.error("Le Fallback Intelligent a échoué :", err);
            state.isAttemptingFallback = false;
            utils.showToast("Morceau indisponible, passage au suivant...");
            setTimeout(() => this.next(true), 1200);
        }
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
        if (this.fadeOutInterval) clearInterval(this.fadeOutInterval);
        let v = state.volume;
        this.fadeOutInterval = setInterval(() => {
            v -= 5;
            if (v <= 0) {
                clearInterval(this.fadeOutInterval);
                this.fadeOutInterval = null;
                if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
                    this.ytPlayer.setVolume(0);
                }
            } else { 
                if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
                    this.ytPlayer.setVolume(v);
                } 
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
        this._userWantsPlaying = true;
        state.lastPlayedTrack = track;

        this.startKeepAlive();

        if (this.fadeOutInterval) {
            clearInterval(this.fadeOutInterval);
            this.fadeOutInterval = null;
        }
        this.isFadingOut = false;
        
        if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
            this.ytPlayer.setVolume(state.volume);
        }

        this.ytPlayer.loadVideoById({
            videoId: track.id,
            startSeconds: startTime,
            suggestedQuality: state.ecoMode ? 'tiny' : 'medium'
        });

        if (this.ytPlayer && typeof this.ytPlayer.setPlaybackQuality === 'function') {
            this.ytPlayer.setPlaybackQuality(state.ecoMode ? 'tiny' : 'medium');
        }

        if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
            this.ytPlayer.playVideo();
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }
        ui.updateNowPlaying(track);
        this.updateMediaSession(track);
        ui.setLoading(false);
    },

    _onVisibilityChange() {
        if (document.hidden) {
            if (this._userWantsPlaying && this.ytActive) {
                console.log('[MuseSound] Page cachée, activation du watchdog arrière-plan');
                if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
                    this.ytPlayer.playVideo();
                }
                this._startBgWatchdog();
            }
        } else {
            this._stopBgWatchdog();
            if (this._userWantsPlaying && this.ytActive) {
                if (this.ytPlayer && this.ytPlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
                    this.ytPlayer.playVideo();
                }
                if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
                    this.ytPlayer.setVolume(state.volume);
                }
            }
            if (this._keepAudio && this._keepAudio.paused) {
                this._keepAudio.play().catch(() => {});
            }
            if (this._keepCtx && this._keepCtx.state === 'suspended') {
                this._keepCtx.resume().catch(() => {});
            }
        }
    },

    _startBgWatchdog() {
        this._stopBgWatchdog();
        this._bgWatchdog = setInterval(() => {
            if (!this._userWantsPlaying || !this.ytActive || !document.hidden) {
                this._stopBgWatchdog();
                return;
            }
            if (this.ytPlayer && typeof this.ytPlayer.getPlayerState === 'function') {
                const s = this.ytPlayer.getPlayerState();
                if (s !== YT.PlayerState.PLAYING && s !== YT.PlayerState.BUFFERING) {
                    console.log('[MuseSound] Watchdog: relance forcée');
                    this.ytPlayer.playVideo();
                }
            }
        }, 1000);
    },

    _stopBgWatchdog() {
        if (this._bgWatchdog) {
            clearInterval(this._bgWatchdog);
            this._bgWatchdog = null;
        }
    },

    _initKeepAlive() {
        if (this._keepAliveActive) return;
        this._keepAliveActive = true;

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            try {
                this._keepCtx = new AudioCtx();
                this._keepOsc = this._keepCtx.createOscillator();
                this._keepGain = this._keepCtx.createGain();
                this._keepGain.gain.value = 0.001;
                this._keepOsc.frequency.value = 55;
                this._keepOsc.connect(this._keepGain);
                this._keepGain.connect(this._keepCtx.destination);
                this._keepOsc.start();
            } catch (e) {}
        }

        const silentB64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/wD/AA==";
        this._keepAudio = new Audio(silentB64);
        this._keepAudio.loop = true;
        this._keepAudio.volume = 0.01;
        this._keepAudio.play().catch(() => {});
    },

    startKeepAlive() {
        if (this._keepAliveActive) return;
        this._initKeepAlive();
    },

    _isCandidateRelevant(originalTrack, snippet) {
        const origTitle = (originalTrack.title || '').toLowerCase();
        const origArtist = (originalTrack.author || '').toLowerCase();
        const candTitle = (snippet.title || '').toLowerCase();
        const candChannel = (snippet.channelTitle || '').toLowerCase();
        const tokenize = s => s.split(/[^a-z0-9]+/).filter(w => w.length > 2 && !['the','and','for','are','not','but','you','all','can','had','her','was','one','our','out','has','his','its','les','des','pas','une','que','est','sur','dans','avec','cet','aux','fait','cette','sont','leur','tout','dont','sans','rien','alors','mais','fait','bien','très','plus','très','aucun','avec'].includes(w));
        const origWords = tokenize(origTitle);
        const candWords = tokenize(candTitle);
        const artistWords = tokenize(origArtist);
        const channelWords = tokenize(candChannel);
        const hasCommonWord = (a, b) => a.length > 0 && b.length > 0 && a.some(w => b.includes(w));
        const titleMatch = hasCommonWord(origWords, candWords);
        const artistMatch = hasCommonWord(artistWords, channelWords);
        return titleMatch || artistMatch;
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

        if (state.jamActive) {
            window.MuseSound.jam.nextJamTrack();
            return;
        }

        if (!forceNext && state.repeat === 'one') {
            if (this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
                this.ytPlayer.seekTo(0, true);
                this.ytPlayer.playVideo();
                return;
            }
        }

        if (state.queue.length > 0) {
            this.nextQueue();
        } else if (state.currentPlaylist.length > 0) {
            this.nextPlaylist();
        } else {
            this.triggerRadioMix();
        }
        localStorage.setItem('MS_QUEUE', JSON.stringify(state.queue));
        ui.renderQueue();
    },

    nextQueue() {
        const { ui } = window.MuseSound;

        if (state.shuffle) {
            const unplayed = [];
            for (let i = 0; i < state.queue.length; i++) {
                if (!state.shuffleHistory.includes(i)) unplayed.push(i);
            }
            if (unplayed.length === 0) {
                state.shuffleHistory = [];
                if (state.repeat === 'all') {
                    const nextIdx = Math.floor(Math.random() * state.queue.length);
                    this.playQueueTrack(nextIdx);
                } else {
                    this.triggerRadioMix();
                }
            } else {
                const randIdx = Math.floor(Math.random() * unplayed.length);
                this.playQueueTrack(unplayed[randIdx]);
            }
        } else {
            let currentQueueIndex = state.playingQueueIndex;
            if (currentQueueIndex >= 0) {
                state.queue.splice(currentQueueIndex, 1);
            }
            const nextIdx = currentQueueIndex >= 0 ? currentQueueIndex : 0;
            if (nextIdx < state.queue.length) {
                this.playQueueTrack(nextIdx);
            } else {
                state.queue = [];
                state.playingQueueIndex = -1;
                localStorage.setItem('MS_QUEUE', JSON.stringify(state.queue));
                ui.renderQueue();
                this.triggerRadioMix();
            }
        }
        this.saveShuffleHistory();
    },

    nextPlaylist() {
        const { ui } = window.MuseSound;

        if (state.shuffle) {
            const unplayed = state.currentPlaylist.filter(
                (_, idx) => !state.shuffleHistory.includes(idx)
            );

            if (unplayed.length === 0) {
                state.shuffleHistory = [];

                if (state.repeat === 'all') {
                    const nextIdx = Math.floor(Math.random() * state.currentPlaylist.length);
                    this.playTrack(nextIdx);
                } else {
                    this.triggerRadioMix();
                }
            } else {
                const randIdx = Math.floor(Math.random() * unplayed.length);
                this.playTrack(state.currentPlaylist.indexOf(unplayed[randIdx]));
            }
        } else {
            let nextIndex = state.currentIndex + 1;

            if (nextIndex >= state.currentPlaylist.length) {
                if (state.repeat === 'all') {
                    nextIndex = 0;
                } else {
                    this.triggerRadioMix();
                    this.saveShuffleHistory();
                    return;
                }
            }

            this.playTrack(nextIndex);
        }

        this.saveShuffleHistory();
    },

    prev() {
        if (!this.ytPlayer) return;
        const cur = this.ytPlayer.getCurrentTime();
        if (cur > 3) {
            this.ytPlayer.seekTo(0, true);
            return;
        }

        if (state.playingQueueIndex >= 0) {
            if (state.shuffle) {
                const idx = state.shuffleHistory.indexOf(state.playingQueueIndex);
                if (idx > 0) {
                    this.playQueueTrack(state.shuffleHistory[idx - 1]);
                } else {
                    this.playQueueTrack(state.playingQueueIndex);
                }
            } else {
                this.playQueueTrack(state.playingQueueIndex);
            }
            return;
        }

        if (state.currentPlaylist.length > 0) {
            if (state.shuffle) {
                const idx = state.shuffleHistory.indexOf(state.currentIndex);
                if (idx > 0) {
                    this.playTrack(state.shuffleHistory[idx - 1]);
                } else {
                    this.playTrack(state.currentIndex);
                }
            } else {
                let prevIndex = state.currentIndex - 1;
                if (prevIndex < 0) {
                    if (state.repeat === 'all') prevIndex = state.currentPlaylist.length - 1;
                    else prevIndex = 0;
                }
                this.playTrack(prevIndex);
            }
        }
    },

    toggle() {
        if (!this.ytPlayer) return;
        const jam = window.MuseSound?.jam;
        if (jam?._updatingFromFirebase) return;
        const s = this.ytPlayer.getPlayerState();
        const wasPlaying = s === 1;
        if (wasPlaying) {
            this._userWantsPlaying = false;
            this._stopBgWatchdog();
            this.ytPlayer.pauseVideo();
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        } else {
            this._userWantsPlaying = true;
            this.ytPlayer.playVideo();
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }
        if (state.jamActive && state.jamIsHost) {
            jam?.updatePlaybackState(!wasPlaying);
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

    saveShuffleHistory() {
        localStorage.setItem('MS_SHUFFLE_HISTORY', JSON.stringify(state.shuffleHistory));
    },

    async triggerRadioMix() {
        const { importer, ui } = window.MuseSound;
        const track = state.lastPlayedTrack;
        if (!track || !track.author) return;
        const query = `${track.author} - ${track.title || ''}`;
        await importer.searchTracks(query);
        state.queue = state.queue.filter(t => t.id !== track.id).slice(0, 3);
        if (state.queue.length === 0) return;
        state.playingQueueIndex = -1;
        localStorage.setItem('MS_QUEUE', JSON.stringify(state.queue));
        ui.renderQueue();
        this.playQueueTrack(0);
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
