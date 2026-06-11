/**
 * MuseSound - YouTube IFrame Edition (V7.3 - Professional Digging Tool)
 */

const MuseSound = {
    // ⚠️ REMPLACEZ CETTE CLÉ PAR LA VÔTRE ⚠️
    YOUTUBE_API_KEY: 'AIzaSyAVwOsusFT9y3w5qd_C0JoGz0DbUi22yGE',
    
    state: {
        currentPlaylist: JSON.parse(localStorage.getItem('MS_CURRENT_PLAYLIST')) || [], // Résultats Morceaux
        foundPlaylists: [], // Résultats Playlists
        currentIndex: -1,
        playingQueueIndex: -1,
        isPlaying: false,
        isLoading: false,
        volume: !isNaN(parseInt(localStorage.getItem('MS_VOLUME'))) ? parseInt(localStorage.getItem('MS_VOLUME')) : 100,
        shuffle: localStorage.getItem('MS_SHUFFLE') === 'true',
        repeat: localStorage.getItem('MS_REPEAT') || 'none',
        isCinemaMode: false,
        uiMode: 'playlist', // 'playlist' (Morceaux), 'playlists' (PL Results), 'queue'
        searchTab: 'tracks', // 'tracks' or 'playlists'
        ecoMode: localStorage.getItem('MS_ECO_MODE') === 'true',
        queue: JSON.parse(localStorage.getItem('MS_QUEUE')) || [],
        debounceTimer: null,
        isFadingOut: false,
        keepAliveAudio: null
    },

    init() {
        console.log("MuseSound V7.3 - Pro Digging & Radio");
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
            toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => toast.remove(), 500);
        }, 2500);
    },

    importer: {
        async processInput(input, forceSearch = false) {
            const cleanInput = input.trim();
            if (!cleanInput) return;

            // 1. Normalisation YouTube Music -> YouTube
            const normalizedInput = cleanInput.replace("music.youtube.com", "www.youtube.com");
            MuseSound.ui.setLoading(true);
            
            try {
                let success = false;
                
                // Étape 1 : Priorité PLAYLIST (si 'list=' est présent)
                if (!forceSearch && normalizedInput.includes("list=")) {
                    const urlObj = new URL(normalizedInput.includes('http') ? normalizedInput : `https://${normalizedInput}`);
                    const playlistId = urlObj.searchParams.get("list");
                    if (playlistId) {
                        MuseSound.state.queue = []; // Vider la queue pour import direct PL
                        success = await this.fetchPlaylist(playlistId, true);
                        if (success) {
                            MuseSound.state.uiMode = 'queue';
                            MuseSound.player.playQueueTrack(0);
                        }
                    }
                } 
                
                // Étape 2 : Sinon Vidéo unique (Insertion chirurgicale)
                if (!success && !forceSearch && (normalizedInput.includes("youtube.com") || normalizedInput.includes("youtu.be"))) {
                    const videoIdRegex = /(?:v=|\/v\/|embed\/|shorts\/|youtu\.be\/|\/watch\?v=)([^#&?]{11})/;
                    const match = normalizedInput.match(videoIdRegex);
                    if (match && match[1]) {
                        const track = await this.getTrackInfo(match[1]);
                        if (track) {
                            const insertPos = MuseSound.state.playingQueueIndex >= 0 ? MuseSound.state.playingQueueIndex + 1 : 0;
                            MuseSound.state.queue.splice(insertPos, 0, track);
                            MuseSound.state.uiMode = 'queue';
                            MuseSound.player.playQueueTrack(insertPos);
                            success = true;
                        }
                    }
                }

                // Étape 3 : Sinon Recherche par mot-clé
                if (!success) {
                    if (MuseSound.state.searchTab === 'tracks') {
                        success = await this.searchTracks(cleanInput);
                        MuseSound.state.uiMode = 'playlist';
                    } else {
                        success = await this.searchPlaylists(cleanInput);
                        MuseSound.state.uiMode = 'playlists';
                    }
                }
            } catch (error) { console.error("Importer Error:", error); }
            MuseSound.ui.setLoading(false);
            MuseSound.ui.syncTabs();
        },

        async getTrackInfo(videoId) {
            const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${MuseSound.YOUTUBE_API_KEY}`;
            const resp = await fetch(url);
            const data = await resp.json();
            if (!data.items?.length) return null;
            const item = data.items[0];
            return {
                id: videoId,
                title: item.snippet.title,
                author: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                duration: this.parseISO8601Duration(item.contentDetails.duration)
            };
        },

        async searchTracks(query) {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&type=video&q=${encodeURIComponent(query)}&key=${MuseSound.YOUTUBE_API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();
            if (!data.items?.length) return false;

            const tracks = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                author: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                duration: 0,
                views: 0
            }));

            const enrichedTracks = await this.enrichTracksData(tracks);
            MuseSound.state.currentPlaylist = enrichedTracks;
            localStorage.setItem('MS_CURRENT_PLAYLIST', JSON.stringify(enrichedTracks));
            
            if (MuseSound.state.queue.length === 0) {
                MuseSound.state.queue = [...enrichedTracks];
                localStorage.setItem('MS_QUEUE', JSON.stringify(MuseSound.state.queue));
                if (!MuseSound.player.ytActive) MuseSound.player.playQueueTrack(0);
            }
            
            MuseSound.ui.renderPlaylist();
            return true;
        },

        async searchPlaylists(query) {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&type=playlist&q=${encodeURIComponent(query)}&key=${MuseSound.YOUTUBE_API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();
            if (!data.items?.length) return false;

            MuseSound.state.foundPlaylists = data.items.map(item => ({
                id: item.id.playlistId,
                title: item.snippet.title,
                author: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url
            }));
            MuseSound.ui.renderPlaylistsResults();
            return true;
        },

        async fetchPlaylist(playlistId, isQuiet = false) {
            const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${MuseSound.YOUTUBE_API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();
            if (!data.items?.length) return false;

            const tracks = data.items.map(item => ({
                id: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                author: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                duration: 0
            }));

            const enriched = await this.enrichTracksData(tracks);
            
            if (isQuiet) {
                MuseSound.state.queue = [...MuseSound.state.queue, ...enriched];
            } else {
                MuseSound.state.queue = [...MuseSound.state.queue, ...enriched];
                MuseSound.state.uiMode = 'queue';
                MuseSound.ui.syncTabs();
                MuseSound.showToast(`${enriched.length} titres ajoutés à la file`);
            }
            
            localStorage.setItem('MS_QUEUE', JSON.stringify(MuseSound.state.queue));
            MuseSound.ui.renderQueue();
            return true;
        },

        async fetchRadio(track) {
            MuseSound.ui.setLoading(true);
            MuseSound.showToast(`Génération de la radio : ${track.author}`);
            
            // Simulation Radio via Recherche Mix Artiste
            const query = `"${track.author} mix"`;
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&type=playlist&q=${encodeURIComponent(query)}&key=${MuseSound.YOUTUBE_API_KEY}`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                if (data.items?.length > 0) {
                    MuseSound.state.queue = []; // On purge pour la radio
                    await this.fetchPlaylist(data.items[0].id.playlistId, true);
                    if (MuseSound.state.queue.length < 20 && data.items[1]) {
                        await this.fetchPlaylist(data.items[1].id.playlistId, true);
                    }
                    MuseSound.state.uiMode = 'queue';
                    MuseSound.ui.syncTabs();
                    MuseSound.player.playQueueTrack(0);
                } else {
                    MuseSound.showToast("Radio indisponible pour cet artiste.");
                }
            } catch (e) { console.error("Radio Error:", e); }
            MuseSound.ui.setLoading(false);
        },

        async enrichTracksData(tracks) {
            if (!tracks.length) return tracks;
            const ids = tracks.map(t => t.id).join(',');
            const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${ids}&key=${MuseSound.YOUTUBE_API_KEY}`;
            try {
                const response = await fetch(url);
                const data = await response.json();
                const dataMap = {};
                data.items.forEach(item => {
                    dataMap[item.id] = {
                        duration: this.parseISO8601Duration(item.contentDetails.duration),
                        views: parseInt(item.statistics.viewCount) || 0
                    };
                });
                return tracks.map(t => ({
                    ...t,
                    duration: dataMap[t.id]?.duration || 0,
                    views: dataMap[t.id]?.views || 0
                }));
            } catch (e) { return tracks; }
        },

        parseISO8601Duration(duration) {
            const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (!match) return 0;
            return (parseInt(match[1]) || 0) * 3600 + (parseInt(match[2]) || 0) * 60 + (parseInt(match[3]) || 0);
        }
    },

    player: {
        ytPlayer: null,
        ytActive: false,
        progressInterval: null,
        isFadingOut: false,

        init() {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            document.body.appendChild(tag);

            window.onYouTubeIframeAPIReady = () => {
                this.ytPlayer = new YT.Player('yt-player-fallback', {
                    height: '0', width: '0',
                    playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, fs: 0, disablekb: 1 },
                    events: {
                        onReady: () => { this.ytPlayer.setVolume(MuseSound.state.volume); },
                        onStateChange: (e) => this.onPlayerStateChange(e),
                        onError: (e) => this.handleError(e)
                    }
                });
            };
        },

        onPlayerStateChange(event) {
            if (!this.ytActive) return;
            if (event.data === YT.PlayerState.PLAYING) {
                MuseSound.state.isPlaying = true;
                MuseSound.ui.updatePlayerControls();
                this.startProgressTracking();
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = 'playing';
                    this.ytPlayer.setPlaybackQuality(MuseSound.state.ecoMode ? 'tiny' : 'hd720');
                }
            } else if (event.data === YT.PlayerState.PAUSED) {
                MuseSound.state.isPlaying = false;
                MuseSound.ui.updatePlayerControls();
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
            } else if (event.data === YT.PlayerState.ENDED) {
                this.next(false);
            }
        },

        handleError(error) {
            console.error("YouTube Player error:", error);
            MuseSound.ui.setLoading(false);
            
            // Notification discrète
            MuseSound.showToast("Morceau non disponible, passage au suivant...");
            
            // Passage immédiat au suivant après un très court délai visuel
            setTimeout(() => {
                this.next(true);
            }, 1500);
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
                        document.querySelectorAll('.player-current-time').forEach(el => el.textContent = MuseSound.ui.formatTime(cur));
                        document.querySelectorAll('.player-duration').forEach(el => el.textContent = MuseSound.ui.formatTime(dur));
                        
                        if ('mediaSession' in navigator) {
                            navigator.mediaSession.setPositionState({ duration: dur, playbackRate: 1, position: cur });
                        }

                        // DJ Crossfade 5s
                        if (dur - cur <= 5 && !this.isFadingOut) {
                            this.isFadingOut = true;
                            this.fadeOut();
                        }
                        if (dur - cur > 6) this.isFadingOut = false;

                        if (Math.floor(cur) % 5 === 0) {
                            // On stocke l'index actif (soit queue, soit playlist)
                            const activeIdx = MuseSound.state.playingQueueIndex >= 0 ? MuseSound.state.playingQueueIndex : MuseSound.state.currentIndex;
                            const isQueue = MuseSound.state.playingQueueIndex >= 0;
                            localStorage.setItem('MS_LAST_INDEX', activeIdx);
                            localStorage.setItem('MS_LAST_IS_QUEUE', isQueue);
                            localStorage.setItem('MS_LAST_POS', cur);
                        }
                    }
                }
            }, 500);
        },

        fadeOut() {
            let v = MuseSound.state.volume;
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
            if (index < 0 || index >= MuseSound.state.queue.length) return;
            MuseSound.state.playingQueueIndex = index;
            MuseSound.state.currentIndex = -1;
            const track = MuseSound.state.queue[index];
            this.doPlay(track, startTime);
            MuseSound.ui.renderQueue();
        },

        doPlay(track, startTime = 0) {
            this.ytActive = true;
            this.isFadingOut = false;
            if (this.ytPlayer?.setVolume) this.ytPlayer.setVolume(MuseSound.state.volume);
            
            this.ytPlayer.loadVideoById({
                videoId: track.id,
                startSeconds: startTime,
                suggestedQuality: MuseSound.state.ecoMode ? 'tiny' : 'hd720'
            });

            // Update metadata early for responsive UI
            this.updateMediaSession(track);

            setTimeout(() => {
                if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
                    this.ytPlayer.playVideo();
                    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
                }
            }, 150);
            
            MuseSound.ui.updateNowPlaying(track);
            MuseSound.ui.setLoading(false);
        },

        updateMediaSession(track) {
            if (!('mediaSession' in navigator) || !track) return;

            // Nettoyage et Initialisation
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

            // Action Handlers
            navigator.mediaSession.setActionHandler('play', () => this.toggle());
            navigator.mediaSession.setActionHandler('pause', () => this.toggle());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next(true));
            navigator.mediaSession.setActionHandler('stop', () => {
                if (this.ytPlayer && this.ytActive) this.ytPlayer.pauseVideo();
            });
        },

        next(forceNext = false) {
            if (MuseSound.state.playingQueueIndex >= 0) {
                MuseSound.state.queue.splice(MuseSound.state.playingQueueIndex, 1);
                MuseSound.state.playingQueueIndex = -1;
            }
            if (MuseSound.state.queue.length > 0) {
                this.playQueueTrack(0);
            } else if (this.ytPlayer) {
                this.ytPlayer.stopVideo();
                this.ytActive = false;
            }
            localStorage.setItem('MS_QUEUE', JSON.stringify(MuseSound.state.queue));
            MuseSound.ui.renderQueue();
        },

        prev() {
            if (!this.ytPlayer) return;
            const cur = this.ytPlayer.getCurrentTime();
            if (cur > 3) {
                this.ytPlayer.seekTo(0, true);
                return;
            }
            
            // Si on est dans la playlist principale (pas dans la queue)
            if (MuseSound.state.playingQueueIndex < 0 && MuseSound.state.currentPlaylist.length > 0) {
                let prevIndex = MuseSound.state.currentIndex - 1;
                if (MuseSound.state.shuffle && MuseSound.state.shuffleHistory.length > 0) {
                    prevIndex = MuseSound.state.shuffleHistory.pop();
                }
                if (prevIndex < 0) {
                    if (MuseSound.state.repeat === 'all') prevIndex = MuseSound.state.currentPlaylist.length - 1;
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
            MuseSound.showToast("File d'attente vidée");
            
            // Retour automatique à la playlist si la queue est vide
            setTimeout(() => {
                MuseSound.state.uiMode = 'playlist';
                MuseSound.ui.syncTabs();
            }, 1000);
        },

        exportQueueToFile() {
            if (MuseSound.state.queue.length === 0) {
                MuseSound.showToast("La file d'attente est vide !");
                return;
            }

            const data = {
                version: 1,
                exportedAt: new Date().toISOString(),
                tracks: MuseSound.state.queue
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.getHours().toString().padStart(2, '0') + '-' + now.getMinutes().toString().padStart(2, '0');
            const filename = `musesound_playlist_${dateStr}_${timeStr}.json`;

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            MuseSound.showToast("Exportation réussie");
        },

        async importQueueFromFile(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data.tracks || !Array.isArray(data.tracks)) {
                        throw new Error("Format invalide");
                    }

                    // On remplace intégralement
                    MuseSound.state.queue = data.tracks;
                    localStorage.setItem('MS_QUEUE', JSON.stringify(MuseSound.state.queue));
                    MuseSound.state.playingQueueIndex = -1;

                    MuseSound.showToast(`File d'attente importée (${data.tracks.length} titres)`);
                    
                    // On bascule sur la vue queue
                    MuseSound.state.uiMode = 'queue';
                    MuseSound.ui.syncTabs();
                    
                    // Lecture automatique du premier titre
                    if (data.tracks.length > 0) {
                        this.playQueueTrack(0);
                    }
                } catch (err) {
                    console.error("Erreur import:", err);
                    MuseSound.showToast("Erreur : Fichier invalide");
                }
            };
            reader.readAsText(file);
            // Reset input
            event.target.value = '';
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
            const input = document.getElementById('playlist-url');
            const btn = document.getElementById('btn-import');
            
            // SUGGESTIONS & DEBOUNCE (444ms)
            input?.addEventListener('input', (e) => {
                clearTimeout(MuseSound.state.debounceTimer);
                MuseSound.state.debounceTimer = setTimeout(() => this.fetchSuggestions(e.target.value), 444);
            });

            btn?.addEventListener('click', () => MuseSound.importer.processInput(input.value));
            input?.addEventListener('keypress', (e) => e.key === 'Enter' && MuseSound.importer.processInput(input.value));

            // View Tabs Events
            document.getElementById('tab-playlist')?.addEventListener('click', () => { MuseSound.state.uiMode = 'playlist'; MuseSound.state.searchTab = 'tracks'; this.syncTabs(); });
            document.getElementById('tab-playlists')?.addEventListener('click', () => { MuseSound.state.uiMode = 'playlists'; MuseSound.state.searchTab = 'playlists'; this.syncTabs(); });
            document.getElementById('tab-queue')?.addEventListener('click', () => { MuseSound.state.uiMode = 'queue'; this.syncTabs(); });

            // Radio Button Now Playing
            document.getElementById('nowplaying-radio-btn')?.addEventListener('click', () => {
                const track = MuseSound.state.queue[MuseSound.state.playingQueueIndex] || MuseSound.state.currentPlaylist[MuseSound.state.currentIndex];
                if (track) MuseSound.importer.fetchRadio(track);
            });

            // Handle suggestions closure
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#playlist-url')) this.hideSuggestions();
            });

            // Resume Banner Listeners
            document.getElementById('btn-resume-ignore')?.addEventListener('click', () => this.hideResumeBanner());
            document.getElementById('btn-resume-play')?.addEventListener('click', () => {
                const index = parseInt(localStorage.getItem('MS_LAST_INDEX'));
                const pos = parseFloat(localStorage.getItem('MS_LAST_POS'));
                const isQueue = localStorage.getItem('MS_LAST_IS_QUEUE') === 'true';
                this.hideResumeBanner();
                if (!isNaN(index) && index >= 0) {
                    if (isQueue) MuseSound.player.playQueueTrack(index, pos);
                    else MuseSound.player.playTrack(index, pos);
                }
            });

            this.initStaticControls();
            this.syncTabs();
        },

        async fetchSuggestions(q) {
            if (q.length < 2) { this.hideSuggestions(); return; }
            const script = document.createElement('script');
            script.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}&callback=MuseSound.ui.handleSuggestions`;
            document.body.appendChild(script);
        },

        handleSuggestions(data) {
            const suggestions = data[1];
            const container = document.getElementById('suggestions-container') || this.createSuggestionsContainer();
            container.innerHTML = suggestions.map(s => `<div class="p-3 hover:bg-primary/10 cursor-pointer text-sm border-b border-outline-variant/30">${s[0]}</div>`).join('');
            container.classList.remove('hidden');
            container.querySelectorAll('div').forEach((el, i) => {
                el.onclick = () => {
                    const q = suggestions[i][0];
                    document.getElementById('playlist-url').value = q;
                    this.hideSuggestions();
                    MuseSound.importer.processInput(q, true);
                };
            });
        },

        createSuggestionsContainer() {
            const input = document.getElementById('playlist-url');
            const div = document.createElement('div');
            div.id = 'suggestions-container';
            div.className = 'absolute top-full left-0 right-0 bg-surface-container-high z-[110] rounded-b-lg shadow-xl border border-outline-variant max-h-60 overflow-y-auto hidden';
            input.parentNode.style.position = 'relative';
            input.parentNode.appendChild(div);
            return div;
        },

        hideSuggestions() { document.getElementById('suggestions-container')?.classList.add('hidden'); },

        syncTabs() {
            const m = MuseSound.state.uiMode;
            const containers = { playlist: 'playlist-container', playlists: 'playlists-results', queue: 'queue-view' };
            Object.keys(containers).forEach(key => {
                const el = document.getElementById(containers[key]);
                const tab = document.getElementById('tab-' + (key === 'playlist' ? 'playlist' : key === 'playlists' ? 'playlists' : 'queue'));
                if (el) el.classList.toggle('hidden', m !== key);
                if (tab) {
                    tab.classList.toggle('border-primary', m === key);
                    tab.classList.toggle('text-primary', m === key);
                    tab.classList.toggle('border-transparent', m !== key);
                    tab.classList.toggle('text-on-surface-variant', m !== key);
                }
            });
            this.renderPlaylist();
            this.renderQueue();
            if (m === 'playlists') this.renderPlaylistsResults();
        },

        renderPlaylist() {
            const container = document.getElementById('playlist-container');
            if (!container || MuseSound.state.uiMode !== 'playlist') return;
            this.updateStats(MuseSound.state.currentPlaylist);

            if (MuseSound.state.currentPlaylist.length === 0) {
                container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-50"><span class="material-symbols-outlined text-6xl mb-4">search</span><p>Cherchez des morceaux ou collez une URL.</p></div>`;
                return;
            }

            container.innerHTML = MuseSound.state.currentPlaylist.map((t, i) => `
                <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container-high cursor-pointer group" 
                     draggable="true" 
                     ondragstart="MuseSound.ui.handleDragStart(event, ${i}, 'playlist')" 
                     ondragover="MuseSound.ui.handleDragOver(event)" 
                     ondrop="MuseSound.ui.handleDrop(event, ${i}, 'playlist')">
                    
                    <img src="${t.thumbnail}" class="w-12 h-12 rounded object-cover" 
                         onclick="event.stopPropagation(); MuseSound.ui.playResultNow(${i})">
                    
                    <div class="flex-1 min-w-0" onclick="MuseSound.ui.playResultNow(${i})">
                        <div class="font-medium truncate">${this.escapeHtml(t.title)}</div>
                        <div class="text-xs text-on-surface-variant truncate">${this.escapeHtml(t.author)} • ${this.formatViews(t.views)} écoutes</div>
                    </div>

                    <div class="flex items-center gap-1">
                        <button class="w-11 h-11 flex items-center justify-center opacity-60 hover:opacity-100" 
                                onclick='event.stopPropagation(); MuseSound.importer.fetchRadio(MuseSound.state.currentPlaylist[${i}])'>
                            <span class="material-symbols-outlined text-primary">radio</span>
                        </button>
                        <button class="w-11 h-11 flex items-center justify-center opacity-60 hover:opacity-100" 
                                onclick='event.stopPropagation(); MuseSound.player.addToQueue(MuseSound.state.currentPlaylist[${i}])'>
                            <span class="material-symbols-outlined text-primary">playlist_add</span>
                        </button>
                    </div>
                </div>
            `).join('');
        },

        renderQueue() {
            const list = document.getElementById('queue-list');
            const badge = document.getElementById('queue-badge');
            if (!list) return;
            const count = MuseSound.state.queue.length;
            if (badge) { badge.textContent = count; badge.classList.toggle('hidden', count === 0); }
            if (MuseSound.state.uiMode === 'queue') this.updateStats(MuseSound.state.queue);

            if (count === 0) {
                list.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-on-surface-variant opacity-50"><span class="material-symbols-outlined text-4xl mb-2">queue_play_next</span><p class="text-sm">La file d'attente est vide.</p></div>`;
                return;
            }

            list.innerHTML = MuseSound.state.queue.map((t, i) => `
                <div class="flex items-center gap-3 p-3 rounded-lg transition-colors ${i === MuseSound.state.playingQueueIndex ? 'bg-primary/10 border border-primary/20' : ''}"
                     draggable="true" 
                     ondragstart="MuseSound.ui.handleDragStart(event, ${i}, 'queue')" 
                     ondragover="MuseSound.ui.handleDragOver(event)" 
                     ondrop="MuseSound.ui.handleDrop(event, ${i}, 'queue')">
                    
                    <img src="${t.thumbnail}" class="w-10 h-10 rounded object-cover ${i === MuseSound.state.playingQueueIndex ? 'animate-pulse' : ''}" 
                         onclick="MuseSound.player.playQueueTrack(${i})">
                    
                    <div class="flex-1 min-w-0" onclick="MuseSound.player.playQueueTrack(${i})">
                        <div class="text-sm font-medium truncate ${i === MuseSound.state.playingQueueIndex ? 'text-primary' : ''}">${this.escapeHtml(t.title)}</div>
                        <div class="text-[10px] text-on-surface-variant truncate">${this.escapeHtml(t.author)}</div>
                    </div>
                    <div class="flex items-center">
                        <button class="w-10 h-10 flex items-center justify-center opacity-60 hover:opacity-100" 
                                onclick='event.stopPropagation(); MuseSound.importer.fetchRadio(MuseSound.state.queue[${i}])'>
                            <span class="material-symbols-outlined text-sm">radio</span>
                        </button>
                        <button class="w-10 h-10 flex items-center justify-center opacity-60 hover:opacity-100" 
                                onclick="event.stopPropagation(); MuseSound.player.removeFromQueue(${i})">
                            <span class="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                </div>
            `).join('');
        },

        playResultNow(index) {
            const track = MuseSound.state.currentPlaylist[index];
            if (!track) return;
            // On l'ajoute à la queue (si elle est vide, on l'injecte, sinon on l'ajoute à la fin)
            // Mais pour une lecture "Maintenant", on veut souvent que ce soit prioritaire.
            // On va l'insérer juste après le morceau actuel si on écoute déjà quelque chose
            const insertPos = MuseSound.state.playingQueueIndex >= 0 ? MuseSound.state.playingQueueIndex + 1 : 0;
            MuseSound.state.queue.splice(insertPos, 0, track);
            
            localStorage.setItem('MS_QUEUE', JSON.stringify(MuseSound.state.queue));
            MuseSound.state.uiMode = 'queue';
            this.syncTabs();
            MuseSound.player.playQueueTrack(insertPos);
        },

        renderPlaylistsResults() {
            const container = document.getElementById('playlists-results');
            if (!container) return;
            if (MuseSound.state.foundPlaylists.length === 0) {
                container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-50"><span class="material-symbols-outlined text-6xl mb-4">featured_play_list</span><p>Aucune playlist trouvée.</p></div>`;
                return;
            }
            container.innerHTML = MuseSound.state.foundPlaylists.map(pl => `
                <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container-high cursor-pointer" onclick="MuseSound.importer.fetchPlaylist('${pl.id}')">
                    <div class="relative">
                        <img src="${pl.thumbnail}" class="w-16 h-16 rounded object-cover shadow-lg">
                        <div class="absolute inset-0 bg-black/40 flex items-center justify-center"><span class="material-symbols-outlined text-white">playlist_play</span></div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-bold truncate">${this.escapeHtml(pl.title)}</div>
                        <div class="text-xs text-primary">${this.escapeHtml(pl.author)}</div>
                    </div>
                </div>
            `).join('');
        },

        initStaticControls() {
            // Playback Buttons
            document.getElementById('play-pause-btn')?.addEventListener('click', () => MuseSound.player.toggle());
            document.getElementById('next-btn')?.addEventListener('click', () => MuseSound.player.next(true));
            document.getElementById('prev-btn')?.addEventListener('click', () => MuseSound.player.prev());

            // Progress Bar (Click to Seek)
            const progressContainer = document.getElementById('progress-container');
            if (progressContainer) {
                progressContainer.addEventListener('click', (e) => {
                    if (!MuseSound.player.ytActive || !MuseSound.player.ytPlayer) return;
                    
                    const rect = progressContainer.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const width = rect.width;
                    const percent = clickX / width;
                    const duration = MuseSound.player.ytPlayer.getDuration();
                    
                    if (duration && !isNaN(duration)) {
                        const seekTime = percent * duration;
                        MuseSound.player.ytPlayer.seekTo(seekTime, true);
                    }
                });
            }

            document.getElementById('shuffle-btn')?.addEventListener('click', () => { MuseSound.state.shuffle = !MuseSound.state.shuffle; localStorage.setItem('MS_SHUFFLE', MuseSound.state.shuffle); this.updateShuffleRepeatUI(); });
            document.getElementById('repeat-btn')?.addEventListener('click', () => {
                const modes = ['none', 'all', 'one'];
                MuseSound.state.repeat = modes[(modes.indexOf(MuseSound.state.repeat) + 1) % 3];
                localStorage.setItem('MS_REPEAT', MuseSound.state.repeat);
                this.updateShuffleRepeatUI();
            });
            document.getElementById('clear-queue-btn')?.addEventListener('click', () => MuseSound.player.clearQueue());

            // Export / Import Queue
            document.getElementById('export-queue-btn')?.addEventListener('click', () => MuseSound.player.exportQueueToFile());
            document.getElementById('import-queue-btn')?.addEventListener('click', () => {
                document.getElementById('queue-file-input')?.click();
            });
            document.getElementById('queue-file-input')?.addEventListener('change', (e) => MuseSound.player.importQueueFromFile(e));

            document.getElementById('eco-btn')?.addEventListener('click', () => {
                MuseSound.state.ecoMode = !MuseSound.state.ecoMode;
                localStorage.setItem('MS_ECO_MODE', MuseSound.state.ecoMode);
                this.updateEcoUI();
                MuseSound.showToast(MuseSound.state.ecoMode ? "Mode Éco (144p)" : "Mode HD (720p)");
            });

            // Fullscreen
            document.getElementById('fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());

            // Volume
            const volSlider = document.getElementById('volume-slider');
            if (volSlider) {
                volSlider.value = MuseSound.state.volume;
                volSlider.addEventListener('input', (e) => MuseSound.player.setVolume(parseInt(e.target.value)));
            }
            document.getElementById('volume-icon')?.addEventListener('click', () => {
                MuseSound.player.setVolume(MuseSound.state.volume > 0 ? 0 : 100);
            });

            this.updateShuffleRepeatUI();
            this.updateVolumeUI();
            this.updateEcoUI();
        },

        updateStats(list) {
            const c = document.getElementById('track-count'), d = document.getElementById('total-duration');
            if (c) c.textContent = list.length;
            if (d) {
                const total = list.reduce((sum, t) => sum + (t.duration || 0), 0);
                d.textContent = total > 0 ? ` • ${this.formatTime(total)}` : "";
            }
        },

        updateNowPlaying(track) {
            document.querySelectorAll('.current-title').forEach(el => el.textContent = track.title);
            document.querySelectorAll('.current-artist').forEach(el => el.textContent = track.author);
            document.querySelectorAll('.current-art').forEach(el => { if (el.tagName === 'IMG') { el.src = track.thumbnail; el.style.display = 'block'; } });
        },

        updatePlayerControls() {
            const icon = document.getElementById('play-pause-btn')?.querySelector('.material-symbols-outlined');
            if (icon) icon.textContent = MuseSound.state.isPlaying ? 'pause' : 'play_arrow';
        },

        updateShuffleRepeatUI() {
            const s = document.getElementById('shuffle-btn'), r = document.getElementById('repeat-btn'), ri = document.getElementById('repeat-icon');
            if (s) s.classList.toggle('text-primary', MuseSound.state.shuffle);
            if (ri && r) {
                const map = { none: ['repeat', false], all: ['repeat', true], one: ['repeat_one', true] };
                const [icon, active] = map[MuseSound.state.repeat];
                ri.textContent = icon;
                r.classList.toggle('text-primary', active);
            }
        },

        updateVolumeUI() {
            const i = document.getElementById('volume-icon'), s = document.getElementById('volume-slider'), v = MuseSound.state.volume;
            if (s) s.value = v;
            if (i) {
                if (v === 0) i.textContent = 'volume_off';
                else if (v < 50) i.textContent = 'volume_down';
                else i.textContent = 'volume_up';
            }
        },

        formatViews(v) { if (v >= 1e6) return (v/1e6).toFixed(1)+'M'; if (v >= 1e3) return (v/1e3).toFixed(0)+'K'; return v; },
        formatTime(s) { const m=Math.floor(s/60),sec=Math.floor(s%60); return `${m}:${sec<10?'0':''}${sec}`; },
        escapeHtml(s) { return s ? s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])) : ''; },
        safeString(obj) { return JSON.stringify(obj).replace(/'/g, "&apos;").replace(/"/g, '&quot;'); },
        setLoading(l) {
            const b = document.getElementById('btn-import');
            if (b) {
                b.innerHTML = l ? '<span class="animate-spin material-symbols-outlined">sync</span>' : '<span class="material-symbols-outlined">search</span>';
                b.disabled = l;
            }
        },
        updateEcoUI() {
            const b = document.getElementById('eco-btn');
            if (b) {
                b.classList.toggle('bg-primary', MuseSound.state.ecoMode);
                b.classList.toggle('text-background', MuseSound.state.ecoMode);
                b.classList.toggle('border-primary', MuseSound.state.ecoMode);
            }
        },
        checkResumeState() {
            const i = parseInt(localStorage.getItem('MS_LAST_INDEX'));
            const p = parseFloat(localStorage.getItem('MS_LAST_POS'));
            const isQueue = localStorage.getItem('MS_LAST_IS_QUEUE') === 'true';
            
            const list = isQueue ? MuseSound.state.queue : MuseSound.state.currentPlaylist;

            if (!isNaN(i) && i >= 0 && i < list.length && p > 10) {
                const t = list[i];
                const b = document.getElementById('resume-banner'), tt = document.getElementById('resume-track-title');
                if (b && tt) { 
                    tt.textContent = `${t.title} (${this.formatTime(p)})`; 
                    b.classList.remove('hidden'); 
                    setTimeout(() => b.classList.add('visible'), 100); 
                }
            }
        },
        hideResumeBanner() {
            const b = document.getElementById('resume-banner');
            if (b) { b.classList.remove('visible'); setTimeout(() => b.classList.add('hidden'), 500); }
            localStorage.removeItem('MS_LAST_INDEX'); localStorage.removeItem('MS_LAST_POS');
        },
        toggleFullscreen(f = false) {
            const n = !!document.fullscreenElement, s = f ? false : !MuseSound.state.isCinemaMode;
            MuseSound.state.isCinemaMode = s;
            const b = document.body, fs = document.getElementById('fullscreen-btn');
            if (s) {
                b.classList.add('is-cinema-mode'); if (fs) fs.textContent = 'close_fullscreen';
                if (!n) document.documentElement.requestFullscreen().catch(() => {});
            } else {
                b.classList.remove('is-cinema-mode'); if (fs) fs.textContent = 'open_in_full';
                if (n) document.exitFullscreen().catch(() => {});
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => MuseSound.init());
