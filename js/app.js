/**
 * MuseSound - YouTube IFrame Edition (V7.2 - Mobile-First & Audio Optimized)
 */

const MuseSound = {
    // ⚠️ REMPLACEZ CETTE CLÉ PAR LA VÔTRE ⚠️
    YOUTUBE_API_KEY: 'AIzaSyAVwOsusFT9y3w5qd_C0JoGz0DbUi22yGE',
    
    config: {},
    
    state: {
        currentPlaylist: JSON.parse(localStorage.getItem('MS_CURRENT_PLAYLIST')) || [],
        currentIndex: -1,
        isPlaying: false,
        isLoading: false,
        volume: !isNaN(parseInt(localStorage.getItem('MS_VOLUME'))) ? parseInt(localStorage.getItem('MS_VOLUME')) : 100,
        shuffle: localStorage.getItem('MS_SHUFFLE') === 'true',
        repeat: localStorage.getItem('MS_REPEAT') || 'none', // 'none', 'all', 'one'
        isCinemaMode: false,
        uiMode: 'playlist', // 'playlist' or 'queue'
        ecoMode: localStorage.getItem('MS_ECO_MODE') === 'true',
        playingQueueIndex: -1,
        shuffleHistory: [],
        queue: JSON.parse(localStorage.getItem('MS_QUEUE')) || []
    },

    init() {
        console.log("MuseSound V7.2 - Mobile-First & Audio Optimized");
        this.ui.init();
        this.player.init();
        
        if (this.state.currentPlaylist.length > 0) {
            this.ui.renderPlaylist();
            this.ui.checkResumeState();
        }
    },

    showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'bg-primary text-background px-4 py-2 rounded-lg shadow-lg font-bold text-sm animate-bounce z-[100]';
        toast.textContent = message;
        
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('animate-bounce');
            toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => toast.remove(), 500);
        }, 2000);
    },

    importer: {
        async processInput(input) {
            const cleanInput = input.trim();
            if (!cleanInput) return;

            // Normalisation YouTube Music -> YouTube
            const normalizedInput = cleanInput.replace("music.youtube.com", "www.youtube.com");

            if (MuseSound.YOUTUBE_API_KEY === 'VOTRE_CLE_API_ICI') {
                alert("🔑 Clé API YouTube manquante.\n\nObtenez-en une gratuite sur :\nhttps://console.cloud.google.com/apis/credentials\n\nActivez YouTube Data API v3, puis copiez la clé dans le code.");
                MuseSound.ui.setLoading(false);
                return;
            }

            MuseSound.ui.setLoading(true);
            
            try {
                let success = false;
                
                // Étape 1 : Priorité PLAYLIST (si 'list=' est présent)
                if (normalizedInput.includes("list=")) {
                    try {
                        const urlObj = new URL(normalizedInput.includes('http') ? normalizedInput : `https://${normalizedInput}`);
                        const playlistId = urlObj.searchParams.get("list");
                        if (playlistId) {
                            success = await this.fetchPlaylist(playlistId);
                        }
                    } catch (e) {
                        const listMatch = normalizedInput.match(/[?&]list=([^#&?]+)/);
                        if (listMatch) success = await this.fetchPlaylist(listMatch[1]);
                    }
                } 
                
                // Étape 2 : Sinon Vidéo unique
                if (!success && (normalizedInput.includes("youtube.com") || normalizedInput.includes("youtu.be"))) {
                    const videoIdRegex = /(?:v=|\/v\/|embed\/|shorts\/|youtu\.be\/|\/watch\?v=)([^#&?]{11})/;
                    const match = normalizedInput.match(videoIdRegex);
                    if (match && match[1]) {
                        success = await this.fetchSingleVideo(match[1]);
                    }
                }

                // Étape 3 : Sinon Recherche textuelle brute
                if (!success) {
                    // Pour une recherche, on passe false à updateState pour ne pas injecter dans la queue si non vide
                    await this.searchTracks(cleanInput);
                    success = true; 
                }
            } catch (error) {
                console.error("Erreur Importer:", error);
                await this.searchTracks(cleanInput);
            }

            MuseSound.ui.setLoading(false);
        },

        async fetchPlaylist(playlistId) {
            const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${MuseSound.YOUTUBE_API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) return false;
            
            const data = await response.json();
            if (!data.items || data.items.length === 0) return false;
            
            const tracks = data.items.map(item => ({
                id: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                author: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                duration: 0 
            }));
            
            const tracksWithDuration = await this.fetchDurations(tracks);
            this.updateState(tracksWithDuration, true); // true = append to queue
            return true;
        },

        async fetchDurations(tracks) {
            if (tracks.length === 0) return tracks;
            const ids = tracks.map(t => t.id).join(',');
            const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${MuseSound.YOUTUBE_API_KEY}`;
            
            try {
                const response = await fetch(url);
                if (!response.ok) return tracks;
                const data = await response.json();
                
                const durationMap = {};
                data.items.forEach(item => {
                    durationMap[item.id] = this.parseISO8601Duration(item.contentDetails.duration);
                });
                
                return tracks.map(t => ({
                    ...t,
                    duration: durationMap[t.id] || 0
                }));
            } catch (e) {
                console.error("Error fetching durations:", e);
                return tracks;
            }
        },

        parseISO8601Duration(duration) {
            const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (!match) return 0;
            const hours = parseInt(match[1]) || 0;
            const minutes = parseInt(match[2]) || 0;
            const seconds = parseInt(match[3]) || 0;
            return hours * 3600 + minutes * 60 + seconds;
        },

        async fetchSingleVideo(videoId) {
            const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${MuseSound.YOUTUBE_API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) return false;
            
            const data = await response.json();
            if (!data.items || data.items.length === 0) return false;
            
            const item = data.items[0];
            const track = {
                id: videoId,
                title: item.snippet.title,
                author: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                duration: this.parseISO8601Duration(item.contentDetails.duration)
            };
            
            this.updateState([track], true); // true = append to queue
            return true;
        },

        async searchTracks(query) {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&type=video&q=${encodeURIComponent(query)}&key=${MuseSound.YOUTUBE_API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) return false;
            
            const data = await response.json();
            if (!data.items || data.items.length === 0) return false;
            
            const tracks = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                author: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                duration: 0
            }));
            
            const tracksWithDuration = await this.fetchDurations(tracks);
            this.updateState(tracksWithDuration, false); // false = append to queue ONLY IF empty
            return true;
        },

        updateState(tracks, alwaysAppendToQueue) {
            // Mise à jour de la playlist (remplacement visuel)
            MuseSound.state.currentPlaylist = tracks;
            localStorage.setItem('MS_CURRENT_PLAYLIST', JSON.stringify(tracks));
            MuseSound.state.shuffleHistory = [];
            
            // Logique de routage vers la file d'attente (Queue)
            if (alwaysAppendToQueue) {
                // Pour les playlists : on ajoute à la suite
                MuseSound.state.queue = [...MuseSound.state.queue, ...tracks];
            } else {
                // Pour les recherches : on ajoute QUE si la file est vide
                if (MuseSound.state.queue.length === 0) {
                    MuseSound.state.queue = [...tracks];
                }
            }
            
            localStorage.setItem('MS_QUEUE', JSON.stringify(MuseSound.state.queue));
            
            MuseSound.ui.renderQueue();
            MuseSound.ui.renderPlaylist();
            
            // On ne lance la lecture QUE si rien n'est déjà en cours
            if (!MuseSound.player.ytActive && tracks.length > 0) {
                MuseSound.player.playTrack(0);
            } else if (alwaysAppendToQueue) {
                MuseSound.showToast(`${tracks.length} titres ajoutés à la file d'attente`);
            }
        }
    },

    player: {
        ytPlayer: null,
        ytActive: false,
        progressInterval: null,
        isFadingOut: false,
        keepAliveAudio: null,

        init() {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0] || document.scripts[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            window.onYouTubeIframeAPIReady = () => {
                this.ytPlayer = new YT.Player('yt-player-fallback', {
                    height: '0',
                    width: '0',
                    playerVars: {
                        autoplay: 0,
                        controls: 0,
                        modestbranding: 1,
                        rel: 0,
                        fs: 0,
                        disablekb: 1,
                    },
                    events: {
                        onReady: () => {
                            console.log("YouTube IFrame Player prêt");
                            this.ytPlayer.setVolume(MuseSound.state.volume);
                        },
                        onStateChange: (event) => {
                            if (!this.ytActive) return;
                            
                            if (event.data === YT.PlayerState.PLAYING) {
                                MuseSound.state.isPlaying = true;
                                MuseSound.ui.updatePlayerControls();
                                this.startProgressTracking();
                                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
                                
                                // FORÇAGE QUALITÉ HD POUR AUDIO MAX
                                if (typeof this.ytPlayer.setPlaybackQuality === 'function') {
                                    this.ytPlayer.setPlaybackQuality(MuseSound.state.ecoMode ? 'tiny' : 'hd720');
                                }
                            } else if (event.data === YT.PlayerState.PAUSED) {
                                MuseSound.state.isPlaying = false;
                                MuseSound.ui.updatePlayerControls();
                                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
                            } else if (event.data === YT.PlayerState.ENDED) {
                                MuseSound.player.next(false);
                            }
                        },
                        onError: (error) => {
                            console.error("YouTube Player error:", error);
                            MuseSound.ui.setLoading(false);
                            MuseSound.showToast("Piste indisponible, passage à la suivante...");
                            setTimeout(() => {
                                MuseSound.player.next(true);
                            }, 2000);
                        }
                    }
                });
            };
        },

        startProgressTracking() {
            if (this.progressInterval) clearInterval(this.progressInterval);
            
            this.progressInterval = setInterval(() => {
                if (this.ytActive && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
                    const currentTime = this.ytPlayer.getCurrentTime();
                    const duration = this.ytPlayer.getDuration();
                    
                    if (duration && duration > 0) {
                        const progress = (currentTime / duration) * 100;
                        document.querySelectorAll('.player-progress-bar').forEach(el => el.style.width = progress + '%');
                        document.querySelectorAll('.player-current-time').forEach(el => el.textContent = MuseSound.ui.formatTime(currentTime));
                        document.querySelectorAll('.player-duration').forEach(el => el.textContent = MuseSound.ui.formatTime(duration));

                        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
                            navigator.mediaSession.setPositionState({
                                duration: duration,
                                playbackRate: 1,
                                position: currentTime
                            });
                        }

                        // DJ Crossfade (Fade-out 5s avant la fin)
                        if (duration - currentTime <= 5 && !this.isFadingOut) {
                            this.isFadingOut = true;
                            let currentVol = MuseSound.state.volume;
                            const fadeInterval = setInterval(() => {
                                currentVol -= 5;
                                if (currentVol <= 0) {
                                    clearInterval(fadeInterval);
                                    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
                                        this.ytPlayer.setVolume(0);
                                    }
                                } else {
                                    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
                                        this.ytPlayer.setVolume(currentVol);
                                    }
                                }
                            }, 200);
                        }

                        if (duration - currentTime > 6) {
                            this.isFadingOut = false;
                        }

                        if (Math.floor(currentTime) % 5 === 0) {
                            localStorage.setItem('MS_LAST_INDEX', MuseSound.state.currentIndex);
                            localStorage.setItem('MS_LAST_POS', currentTime);
                        }
                    }
                }
            }, 500);
        },

        async playTrack(index, startTime = 0) {
            if (index < 0 || index >= MuseSound.state.currentPlaylist.length) return;
            
            MuseSound.state.currentIndex = index;
            const track = MuseSound.state.currentPlaylist[index];

            MuseSound.ui.setLoading(true);
            if (this.ytPlayer && typeof this.ytPlayer.stopVideo === 'function') {
                this.ytPlayer.stopVideo();
            }
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
            this.ytActive = true;
            this.isFadingOut = false;
            
            if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
                this.ytPlayer.setVolume(MuseSound.state.volume);
            }

            this.ytPlayer.loadVideoById({
                videoId: track.id,
                startSeconds: startTime,
                suggestedQuality: MuseSound.state.ecoMode ? 'tiny' : 'hd720'
            });
            
            // Forçage immédiat
            if (this.ytPlayer && typeof this.ytPlayer.setPlaybackQuality === 'function') {
                this.ytPlayer.setPlaybackQuality(MuseSound.state.ecoMode ? 'tiny' : 'hd720');
            }
            
            setTimeout(() => {
                if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
                    this.ytPlayer.playVideo();
                }
            }, 150);

            this.startKeepAlive();
            MuseSound.ui.updateNowPlaying(track);
            this.updateMediaSession(track);
            MuseSound.ui.setLoading(false);
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
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next(true)); // forceNext=true
            navigator.mediaSession.setActionHandler('stop', () => {
                if (this.ytPlayer && this.ytActive) this.ytPlayer.pauseVideo();
            });
        },

        addToQueue(track) {
            MuseSound.state.queue.push(track);
            localStorage.setItem('MS_QUEUE', JSON.stringify(MuseSound.state.queue));
            MuseSound.ui.renderQueue();
            MuseSound.showToast("Ajouté à la file d'attente");
        },

        playQueueTrack(index) {
            const track = MuseSound.state.queue[index];
            MuseSound.state.playingQueueIndex = index;
            MuseSound.state.currentIndex = -1;
            this.doPlay(track);
            MuseSound.ui.renderQueue();
        },

        removeFromQueue(index) {
            MuseSound.state.queue.splice(index, 1);
            if (MuseSound.state.playingQueueIndex === index) MuseSound.state.playingQueueIndex = -1;
            else if (MuseSound.state.playingQueueIndex > index) MuseSound.state.playingQueueIndex--;
            
            localStorage.setItem('MS_QUEUE', JSON.stringify(MuseSound.state.queue));
            MuseSound.ui.renderQueue();
        },

        clearQueue() {
            MuseSound.state.queue = [];
            MuseSound.state.playingQueueIndex = -1;
            localStorage.removeItem('MS_QUEUE');
            MuseSound.ui.renderQueue();
        },

        toggle() {
            if (!this.ytPlayer) return;
            if (this.ytActive) {
                const state = this.ytPlayer.getPlayerState();
                if (state === YT.PlayerState.PLAYING) {
                    this.ytPlayer.pauseVideo();
                } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.CUED) {
                    this.ytPlayer.playVideo();
                }
            } else if (MuseSound.state.currentIndex >= 0) {
                this.playTrack(MuseSound.state.currentIndex);
            } else if (MuseSound.state.playingQueueIndex >= 0) {
                this.playQueueTrack(MuseSound.state.playingQueueIndex);
            }
        },

        next(forceNext = false) { 
            if (MuseSound.state.playingQueueIndex >= 0 || MuseSound.state.queue.length > 0) {
                if (MuseSound.state.playingQueueIndex >= 0) {
                    MuseSound.state.queue.splice(MuseSound.state.playingQueueIndex, 1);
                    MuseSound.state.playingQueueIndex = -1;
                }
                if (MuseSound.state.queue.length > 0) {
                    const nextTrack = MuseSound.state.queue[0];
                    MuseSound.state.playingQueueIndex = 0;
                    localStorage.setItem('MS_QUEUE', JSON.stringify(MuseSound.state.queue));
                    MuseSound.ui.renderQueue();
                    MuseSound.state.currentIndex = -1;
                    this.doPlay(nextTrack);
                    return;
                }
            }

            if (MuseSound.state.currentPlaylist.length === 0) return;
            if (!forceNext && MuseSound.state.repeat === 'one') {
                if (this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
                    this.ytPlayer.seekTo(0, true);
                    this.ytPlayer.playVideo();
                    return;
                }
            }

            let nextIndex = MuseSound.state.currentIndex + 1;
            if (MuseSound.state.shuffle) {
                MuseSound.state.shuffleHistory.push(MuseSound.state.currentIndex);
                nextIndex = Math.floor(Math.random() * MuseSound.state.currentPlaylist.length);
            }
            if (nextIndex >= MuseSound.state.currentPlaylist.length) {
                if (MuseSound.state.repeat === 'all') nextIndex = 0;
                else { if (this.ytPlayer) this.ytPlayer.stopVideo(); return; }
            }
            this.playTrack(nextIndex); 
        },

        prev() { 
            if (MuseSound.state.currentPlaylist.length === 0) return;
            if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function' && this.ytPlayer.getCurrentTime() > 3) {
                this.ytPlayer.seekTo(0, true);
                return;
            }
            let prevIndex = MuseSound.state.currentIndex - 1;
            if (MuseSound.state.shuffle && MuseSound.state.shuffleHistory.length > 0) {
                prevIndex = MuseSound.state.shuffleHistory.pop();
            }
            if (prevIndex < 0) {
                if (MuseSound.state.repeat === 'all') prevIndex = MuseSound.state.currentPlaylist.length - 1;
                else prevIndex = 0;
            }
            this.playTrack(prevIndex); 
        },

        setVolume(val) {
            MuseSound.state.volume = val;
            localStorage.setItem('MS_VOLUME', val);
            if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
                this.ytPlayer.setVolume(val);
            }
            MuseSound.ui.updateVolumeUI();
        }
    },

    ui: {
        init() {
            const importBtn = document.getElementById('btn-import');
            const urlInput = document.getElementById('playlist-url');
            if (importBtn && urlInput) {
                importBtn.addEventListener('click', () => MuseSound.importer.processInput(urlInput.value));
                urlInput.addEventListener('keypress', (e) => e.key === 'Enter' && MuseSound.importer.processInput(urlInput.value));
            }
            
            document.getElementById('play-pause-btn')?.addEventListener('click', () => MuseSound.player.toggle());
            document.getElementById('next-btn')?.addEventListener('click', () => MuseSound.player.next(true));
            document.getElementById('prev-btn')?.addEventListener('click', () => MuseSound.player.prev());
            
            const progressContainer = document.getElementById('progress-container');
            if (progressContainer) {
                progressContainer.addEventListener('click', (e) => {
                    if (!MuseSound.player.ytPlayer || !MuseSound.player.ytActive) return;
                    const rect = progressContainer.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    const duration = MuseSound.player.ytPlayer.getDuration();
                    if (duration) MuseSound.player.ytPlayer.seekTo(duration * percent, true);
                });
            }

            const volSlider = document.getElementById('volume-slider');
            const volIcon = document.getElementById('volume-icon');
            if (volSlider) {
                volSlider.value = MuseSound.state.volume;
                volSlider.addEventListener('input', (e) => MuseSound.player.setVolume(parseInt(e.target.value)));
            }
            if (volIcon) {
                volIcon.addEventListener('click', () => { MuseSound.player.setVolume(MuseSound.state.volume > 0 ? 0 : 100); });
            }

            document.getElementById('shuffle-btn')?.addEventListener('click', () => {
                MuseSound.state.shuffle = !MuseSound.state.shuffle;
                localStorage.setItem('MS_SHUFFLE', MuseSound.state.shuffle);
                this.updateShuffleRepeatUI();
            });

            document.getElementById('repeat-btn')?.addEventListener('click', () => {
                const modes = ['none', 'all', 'one'];
                const idx = modes.indexOf(MuseSound.state.repeat);
                MuseSound.state.repeat = modes[(idx + 1) % 3];
                localStorage.setItem('MS_REPEAT', MuseSound.state.repeat);
                this.updateShuffleRepeatUI();
            });

            document.getElementById('clear-queue-btn')?.addEventListener('click', () => MuseSound.player.clearQueue());

            document.getElementById('btn-resume-ignore')?.addEventListener('click', () => this.hideResumeBanner());
            document.getElementById('btn-resume-play')?.addEventListener('click', () => {
                const index = parseInt(localStorage.getItem('MS_LAST_INDEX'));
                const pos = parseFloat(localStorage.getItem('MS_LAST_POS'));
                this.hideResumeBanner();
                if (!isNaN(index) && index >= 0) MuseSound.player.playTrack(index, pos);
            });

            document.getElementById('tab-playlist')?.addEventListener('click', () => this.showPlaylist());
            document.getElementById('tab-queue')?.addEventListener('click', () => this.showQueue());

            document.getElementById('fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());
            document.addEventListener('fullscreenchange', () => {
                if (!document.fullscreenElement && MuseSound.state.isCinemaMode) this.toggleFullscreen(true);
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && MuseSound.state.isCinemaMode) this.toggleFullscreen(true);
            });

            document.getElementById('eco-btn')?.addEventListener('click', () => {
                MuseSound.state.ecoMode = !MuseSound.state.ecoMode;
                localStorage.setItem('MS_ECO_MODE', MuseSound.state.ecoMode);
                this.updateEcoUI();
                if (MuseSound.player.ytPlayer && typeof MuseSound.player.ytPlayer.setPlaybackQuality === 'function') {
                    MuseSound.player.ytPlayer.setPlaybackQuality(MuseSound.state.ecoMode ? 'tiny' : 'hd720');
                }
                MuseSound.showToast(MuseSound.state.ecoMode ? "Mode Éco Data activé (144p)" : "Mode Éco désactivé (HD)");
            });

            this.updateShuffleRepeatUI();
            this.updateVolumeUI();
            this.updateEcoUI();
            this.renderQueue();
            this.renderPlaylist();
        },

        updateEcoUI() {
            const btn = document.getElementById('eco-btn');
            if (btn) {
                btn.classList.toggle('bg-primary', MuseSound.state.ecoMode);
                btn.classList.toggle('text-background', MuseSound.state.ecoMode);
                btn.classList.toggle('border-primary', MuseSound.state.ecoMode);
            }
        },

        showPlaylist() {
            MuseSound.state.uiMode = 'playlist';
            document.getElementById('playlist-container')?.classList.remove('hidden');
            document.getElementById('queue-view')?.classList.add('hidden');
            document.getElementById('tab-playlist')?.classList.add('border-primary', 'text-primary');
            document.getElementById('tab-playlist')?.classList.remove('border-transparent', 'text-on-surface-variant');
            document.getElementById('tab-queue')?.classList.remove('border-primary', 'text-primary');
            document.getElementById('tab-queue')?.classList.add('border-transparent', 'text-on-surface-variant');
            this.renderPlaylist();
        },

        showQueue() {
            MuseSound.state.uiMode = 'queue';
            document.getElementById('playlist-container')?.classList.add('hidden');
            document.getElementById('queue-view')?.classList.remove('hidden');
            document.getElementById('tab-queue')?.classList.add('border-primary', 'text-primary');
            document.getElementById('tab-queue')?.classList.remove('border-transparent', 'text-on-surface-variant');
            document.getElementById('tab-playlist')?.classList.remove('border-primary', 'text-primary');
            document.getElementById('tab-playlist')?.classList.add('border-transparent', 'text-on-surface-variant');
            this.renderQueue();
        },

        checkResumeState() {
            const index = parseInt(localStorage.getItem('MS_LAST_INDEX'));
            const pos = parseFloat(localStorage.getItem('MS_LAST_POS'));
            const playlist = MuseSound.state.currentPlaylist;
            if (!isNaN(index) && index >= 0 && index < playlist.length && pos > 10) {
                const track = playlist[index];
                const banner = document.getElementById('resume-banner');
                const title = document.getElementById('resume-track-title');
                if (banner && title) {
                    title.textContent = `${track.title} (${this.formatTime(pos)})`;
                    banner.classList.remove('hidden');
                    setTimeout(() => banner.classList.add('visible'), 100);
                }
            }
        },

        hideResumeBanner() {
            const banner = document.getElementById('resume-banner');
            if (banner) {
                banner.classList.remove('visible');
                setTimeout(() => banner.classList.add('hidden'), 500);
            }
            localStorage.removeItem('MS_LAST_INDEX');
            localStorage.removeItem('MS_LAST_POS');
        },

        toggleFullscreen(forceClose = false) {
            const isNativeFs = !!document.fullscreenElement;
            const shouldBeFs = forceClose ? false : !MuseSound.state.isCinemaMode;
            MuseSound.state.isCinemaMode = shouldBeFs;
            const body = document.body;
            const fsBtn = document.getElementById('fullscreen-btn');
            if (shouldBeFs) {
                body.classList.add('is-cinema-mode');
                if (fsBtn) fsBtn.textContent = 'close_fullscreen';
                if (!isNativeFs) document.documentElement.requestFullscreen().catch(() => {});
            } else {
                body.classList.remove('is-cinema-mode');
                if (fsBtn) fsBtn.textContent = 'open_in_full';
                if (isNativeFs) document.exitFullscreen().catch(() => {});
            }
        },

        setLoading(loading) {
            const btn = document.getElementById('btn-import');
            if (btn) {
                btn.innerHTML = loading ? '<span class="animate-spin material-symbols-outlined">sync</span>' : '<span class="material-symbols-outlined">search</span>';
                btn.disabled = loading;
            }
        },

        renderPlaylist() {
            const container = document.getElementById('playlist-container');
            if (!container) return;
            if (MuseSound.state.uiMode === 'playlist') {
                const countSpan = document.getElementById('track-count');
                if (countSpan) countSpan.textContent = MuseSound.state.currentPlaylist.length;
                const durationSpan = document.getElementById('total-duration');
                if (durationSpan) durationSpan.textContent = this.calculateTotalDuration(MuseSound.state.currentPlaylist);
            }
            if (MuseSound.state.currentPlaylist.length === 0) {
                container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-50"><span class="material-symbols-outlined text-6xl mb-4">queue_music</span><p>No playlist imported yet.</p></div>`;
                return;
            }
            container.innerHTML = MuseSound.state.currentPlaylist.map((t, i) => `
                <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container-high cursor-pointer transition-colors group" 
                     draggable="true" ondragstart="MuseSound.ui.handleDragStart(event, ${i}, 'playlist')" ondragover="MuseSound.ui.handleDragOver(event)" ondrop="MuseSound.ui.handleDrop(event, ${i}, 'playlist')"
                     onclick="MuseSound.player.playTrack(${i})">
                    <img src="${t.thumbnail}" class="w-12 h-12 rounded object-cover" onerror="this.src='https://placehold.co/48x48?text=Music'">
                    <div class="flex-1 min-w-0">
                        <div class="font-body-md text-on-surface truncate font-medium ${i === MuseSound.state.currentIndex ? 'text-primary' : ''}">${this.escapeHtml(t.title)}</div>
                        <div class="font-label-md text-on-surface-variant truncate">${this.escapeHtml(t.author)}</div>
                    </div>
                    <button class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-primary/10 transition-all opacity-60 hover:opacity-100" 
                            onclick="event.stopPropagation(); MuseSound.player.addToQueue(${JSON.stringify(t).replace(/"/g, '&quot;')})">
                        <span class="material-symbols-outlined text-primary">playlist_add</span>
                    </button>
                </div>
            `).join('');
        },

        renderQueue() {
            const list = document.getElementById('queue-list');
            const badge = document.getElementById('queue-badge');
            const clearBtn = document.getElementById('clear-queue-btn');
            if (!list) return;
            const count = MuseSound.state.queue.length;
            if (badge) { badge.textContent = count; badge.classList.toggle('hidden', count === 0); }
            if (clearBtn) clearBtn.innerHTML = '<span class="material-symbols-outlined text-sm">delete_sweep</span> Tout supprimer';
            if (MuseSound.state.uiMode === 'queue') {
                const countSpan = document.getElementById('track-count');
                if (countSpan) countSpan.textContent = count;
                const durationSpan = document.getElementById('total-duration');
                if (durationSpan) durationSpan.textContent = this.calculateTotalDuration(MuseSound.state.queue);
            }
            if (count === 0) {
                list.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-on-surface-variant opacity-50"><span class="material-symbols-outlined text-4xl mb-2">queue_play_next</span><p class="text-sm">La file d'attente est vide.</p></div>`;
                return;
            }
            list.innerHTML = MuseSound.state.queue.map((t, i) => `
                <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-container-high cursor-pointer transition-colors ${i === MuseSound.state.playingQueueIndex ? 'border border-primary bg-primary/5' : ''}" 
                     draggable="true" ondragstart="MuseSound.ui.handleDragStart(event, ${i}, 'queue')" ondragover="MuseSound.ui.handleDragOver(event)" ondrop="MuseSound.ui.handleDrop(event, ${i}, 'queue')"
                     onclick="MuseSound.player.playQueueTrack(${i})">
                    <img src="${t.thumbnail}" class="w-10 h-10 rounded object-cover ${i === MuseSound.state.playingQueueIndex ? 'animate-pulse' : ''}" onerror="this.src='https://placehold.co/40x40?text=Music'">
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium truncate ${i === MuseSound.state.playingQueueIndex ? 'text-primary' : ''}">${this.escapeHtml(t.title)}</div>
                        <div class="text-[10px] text-on-surface-variant truncate">${this.escapeHtml(t.author)}</div>
                    </div>
                    <button class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-red-400/10 transition-all opacity-60 hover:opacity-100" 
                            onclick="event.stopPropagation(); MuseSound.player.removeFromQueue(${i})">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            `).join('');
        },

        handleDragStart(e, index, type) {
            e.dataTransfer.setData('text/plain', JSON.stringify({ index, type }));
            e.dataTransfer.effectAllowed = 'move';
        },
        handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; },
        handleDrop(e, toIndex, type) {
            e.preventDefault();
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type !== type) return;
            const fromIndex = data.index;
            if (fromIndex === toIndex) return;
            const list = type === 'playlist' ? MuseSound.state.currentPlaylist : MuseSound.state.queue;
            const [movedItem] = list.splice(fromIndex, 1);
            list.splice(toIndex, 0, movedItem);
            if (type === 'playlist') {
                if (MuseSound.state.currentIndex === fromIndex) MuseSound.state.currentIndex = toIndex;
                else if (fromIndex < MuseSound.state.currentIndex && toIndex >= MuseSound.state.currentIndex) MuseSound.state.currentIndex--;
                else if (fromIndex > MuseSound.state.currentIndex && toIndex <= MuseSound.state.currentIndex) MuseSound.state.currentIndex++;
                localStorage.setItem('MS_CURRENT_PLAYLIST', JSON.stringify(list));
                this.renderPlaylist();
            } else {
                if (MuseSound.state.playingQueueIndex === fromIndex) MuseSound.state.playingQueueIndex = toIndex;
                else if (fromIndex < MuseSound.state.playingQueueIndex && toIndex >= MuseSound.state.playingQueueIndex) MuseSound.state.playingQueueIndex--;
                else if (fromIndex > MuseSound.state.playingQueueIndex && toIndex <= MuseSound.state.playingQueueIndex) MuseSound.state.playingQueueIndex++;
                localStorage.setItem('MS_QUEUE', JSON.stringify(list));
                this.renderQueue();
            }
        },

        calculateTotalDuration(tracks) {
            const totalSeconds = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
            if (totalSeconds === 0) return "";
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            if (hours > 0) return `• ${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            return `• ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        },
        escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); },

        updateNowPlaying(track) {
            document.querySelectorAll('.current-title').forEach(el => el.textContent = track.title);
            document.querySelectorAll('.current-artist').forEach(el => el.textContent = track.author);
            document.querySelectorAll('.current-art').forEach(el => { if (el.tagName === 'IMG') { el.src = track.thumbnail; el.style.display = 'block'; } });
            this.renderPlaylist();
        },

        updatePlayerControls() {
            const icon = document.getElementById('play-pause-btn')?.querySelector('.material-symbols-outlined');
            if (icon) icon.textContent = MuseSound.state.isPlaying ? 'pause' : 'play_arrow';
        },

        updateShuffleRepeatUI() {
            const shuffleBtn = document.getElementById('shuffle-btn');
            if (shuffleBtn) shuffleBtn.classList.toggle('text-primary', MuseSound.state.shuffle);
            const repeatIcon = document.getElementById('repeat-icon');
            const repeatBtn = document.getElementById('repeat-btn');
            if (repeatIcon && repeatBtn) {
                const map = { none: ['repeat', false], all: ['repeat', true], one: ['repeat_one', true] };
                const [icon, active] = map[MuseSound.state.repeat];
                repeatIcon.textContent = icon;
                repeatBtn.classList.toggle('text-primary', active);
            }
        },

        updateVolumeUI() {
            const volIcon = document.getElementById('volume-icon');
            const volSlider = document.getElementById('volume-slider');
            const vol = MuseSound.state.volume;
            if (volSlider && volSlider.value != vol) volSlider.value = vol;
            if (!volIcon) return;
            if (vol === 0) volIcon.textContent = 'volume_off';
            else if (vol < 50) volIcon.textContent = 'volume_down';
            else volIcon.textContent = 'volume_up';
        },

        formatTime(s) { if (!s || isNaN(s)) return '0:00'; const min = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${min}:${sec < 10 ? '0' : ''}${sec}`; }
    }
};

document.addEventListener('DOMContentLoaded', () => MuseSound.init());
