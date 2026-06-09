/**
 * MuseSound - YouTube IFrame Edition (V7.1 - API Officielle + Nouvelles UI)
 */

const MuseSound = {
    // ⚠️ REMPLACEZ CETTE CLÉ PAR LA VÔTRE ⚠️
    YOUTUBE_API_KEY: 'VOTRE_CLE_API_ICI',
    
    config: {},
    
    state: {
        currentPlaylist: JSON.parse(localStorage.getItem('MS_CURRENT_PLAYLIST')) || [],
        currentIndex: -1,
        isPlaying: false,
        isLoading: false,
        volume: !isNaN(parseInt(localStorage.getItem('MS_VOLUME'))) ? parseInt(localStorage.getItem('MS_VOLUME')) : 100,
        shuffle: localStorage.getItem('MS_SHUFFLE') === 'true',
        repeat: localStorage.getItem('MS_REPEAT') || 'none', // 'none', 'one', 'all'
        isCinemaMode: false,
        shuffleHistory: []
    },

    init() {
        console.log("MuseSound V7.1 - UI Upgrades");
        this.ui.init();
        this.player.init();
        
        if (this.state.currentPlaylist.length > 0) {
            this.ui.renderPlaylist();
        }
    },

    importer: {
        extractId(url) {
            const plRegex = /[&?]list=([^&]+)/;
            const videoRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
            
            const plMatch = url.match(plRegex);
            if (plMatch) return { id: plMatch[1], type: 'playlist' };

            const videoMatch = url.match(videoRegex);
            if (videoMatch) return { id: videoMatch[1], type: 'video' };

            return null;
        },

        async processInput(input) {
            const cleanInput = input.trim();
            if (!cleanInput) return;

            if (MuseSound.YOUTUBE_API_KEY === 'VOTRE_CLE_API_ICI') {
                alert("🔑 Clé API YouTube manquante.\n\nObtenez-en une gratuite sur :\nhttps://console.cloud.google.com/apis/credentials\n\nActivez YouTube Data API v3, puis copiez la clé dans le code.");
                MuseSound.ui.setLoading(false);
                return;
            }

            MuseSound.ui.setLoading(true);
            const target = this.extractId(cleanInput);

            try {
                let success = false;
                
                if (target && target.type === 'playlist') {
                    success = await this.fetchPlaylist(target.id);
                } else if (target && target.type === 'video') {
                    success = await this.fetchSingleVideo(target.id);
                } else {
                    success = await this.searchTracks(cleanInput);
                }

                if (!success) {
                    alert("Aucun résultat trouvé.");
                }
            } catch (error) {
                console.error("Erreur API YouTube:", error);
                alert("Erreur lors de l'import. Vérifiez votre clé API.");
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
            
            this.updateState(tracks);
            return true;
        },

        async fetchSingleVideo(videoId) {
            const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${MuseSound.YOUTUBE_API_KEY}`;
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
                duration: 0
            };
            
            this.updateState([track]);
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
            
            this.updateState(tracks);
            return true;
        },

        updateState(tracks) {
            MuseSound.state.currentPlaylist = tracks;
            localStorage.setItem('MS_CURRENT_PLAYLIST', JSON.stringify(tracks));
            MuseSound.state.shuffleHistory = [];
            MuseSound.ui.renderPlaylist();
            
            if (tracks.length > 0) {
                MuseSound.player.playTrack(0);
            }
        }
    },

    player: {
        ytPlayer: null,
        ytActive: false,
        progressInterval: null,

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
                            } else if (event.data === YT.PlayerState.PAUSED) {
                                MuseSound.state.isPlaying = false;
                                MuseSound.ui.updatePlayerControls();
                            } else if (event.data === YT.PlayerState.ENDED) {
                                // Fin naturelle -> on ne force pas le next
                                MuseSound.player.next(false);
                            }
                        },
                        onError: (error) => {
                            console.error("YouTube Player error:", error);
                            MuseSound.ui.setLoading(false);
                            alert("Erreur de lecture. La vidéo est peut-être restreinte ou supprimée.");
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
                    }
                }
            }, 500);
        },

        async playTrack(index) {
            if (index < 0 || index >= MuseSound.state.currentPlaylist.length) return;
            
            MuseSound.state.currentIndex = index;
            const track = MuseSound.state.currentPlaylist[index];

            MuseSound.ui.setLoading(true);
            
            if (this.ytPlayer && typeof this.ytPlayer.stopVideo === 'function') {
                this.ytPlayer.stopVideo();
            }
            
            this.ytActive = false;
            
            if (!this.ytPlayer || typeof this.ytPlayer.cueVideoById !== 'function') {
                const waitForPlayer = setInterval(() => {
                    if (this.ytPlayer && typeof this.ytPlayer.cueVideoById === 'function') {
                        clearInterval(waitForPlayer);
                        this.doPlay(track);
                    }
                }, 100);
                setTimeout(() => clearInterval(waitForPlayer), 5000);
                return;
            }
            
            this.doPlay(track);
        },
        
        doPlay(track) {
            this.ytActive = true;
            this.ytPlayer.cueVideoById(track.id);
            this.ytPlayer.playVideo();
            MuseSound.ui.updateNowPlaying(track);
            MuseSound.ui.setLoading(false);
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
            }
        },

        next(forceNext = false) { 
            if (MuseSound.state.currentPlaylist.length === 0) return;
            
            // Si on est en repeat ONE et que l'utilisateur n'a pas cliqué sur next (fin naturelle)
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
                if (MuseSound.state.repeat === 'all') {
                    nextIndex = 0;
                } else {
                    if (this.ytPlayer) this.ytPlayer.stopVideo();
                    return; // Fin de playlist
                }
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
                if (MuseSound.state.repeat === 'all') {
                    prevIndex = MuseSound.state.currentPlaylist.length - 1;
                } else {
                    prevIndex = 0;
                }
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
            // Import / Search
            const importBtn = document.getElementById('btn-import');
            const urlInput = document.getElementById('playlist-url');
            if (importBtn && urlInput) {
                importBtn.addEventListener('click', () => MuseSound.importer.processInput(urlInput.value));
                urlInput.addEventListener('keypress', (e) => e.key === 'Enter' && MuseSound.importer.processInput(urlInput.value));
            }
            
            // Player Controls
            document.getElementById('play-pause-btn')?.addEventListener('click', () => MuseSound.player.toggle());
            document.getElementById('next-btn')?.addEventListener('click', () => MuseSound.player.next(true));
            document.getElementById('prev-btn')?.addEventListener('click', () => MuseSound.player.prev());
            
            // Clickable Progress Bar
            const progressContainer = document.getElementById('progress-container');
            if (progressContainer) {
                progressContainer.addEventListener('click', (e) => {
                    if (!MuseSound.player.ytPlayer || !MuseSound.player.ytActive) return;
                    const rect = progressContainer.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    const duration = MuseSound.player.ytPlayer.getDuration();
                    if (duration) {
                        MuseSound.player.ytPlayer.seekTo(duration * percent, true);
                    }
                });
            }

            // Volume Controls
            const volSlider = document.getElementById('volume-slider');
            const volIcon = document.getElementById('volume-icon');
            if (volSlider) {
                volSlider.value = MuseSound.state.volume;
                volSlider.addEventListener('input', (e) => MuseSound.player.setVolume(parseInt(e.target.value)));
            }
            if (volIcon) {
                volIcon.addEventListener('click', () => {
                    MuseSound.player.setVolume(MuseSound.state.volume > 0 ? 0 : 100);
                });
            }

            // Shuffle & Repeat
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

            // Cinema Mode (Fullscreen)
            document.getElementById('fullscreen-btn')?.addEventListener('click', () => {
                this.toggleFullscreen();
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && MuseSound.state.isCinemaMode) {
                    this.toggleFullscreen(true);
                }
            });

            this.updateShuffleRepeatUI();
            this.updateVolumeUI();
            this.renderPlaylist();
        },

        toggleFullscreen(forceClose = false) {
            MuseSound.state.isCinemaMode = forceClose ? false : !MuseSound.state.isCinemaMode;
            const body = document.body;
            const fsBtn = document.getElementById('fullscreen-btn');
            
            if (MuseSound.state.isCinemaMode) {
                body.classList.add('is-cinema-mode');
                if (fsBtn) fsBtn.textContent = 'close_fullscreen';
            } else {
                body.classList.remove('is-cinema-mode');
                if (fsBtn) fsBtn.textContent = 'open_in_full';
            }
        },

        setLoading(loading) {
            const btn = document.getElementById('btn-import');
            if (btn) {
                btn.innerHTML = loading ? '<span class="animate-spin material-symbols-outlined">sync</span>' : 'Écouter';
                btn.disabled = loading;
            }
        },

        renderPlaylist() {
            const container = document.getElementById('playlist-container');
            if (!container) return;
            
            const countSpan = document.getElementById('track-count');
            if (countSpan) countSpan.textContent = MuseSound.state.currentPlaylist.length;
            
            if (MuseSound.state.currentPlaylist.length === 0) {
                container.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-50">
                        <span class="material-symbols-outlined text-6xl mb-4">queue_music</span>
                        <p>No playlist imported yet.</p>
                        <p class="text-sm mt-2">Collez une URL ou cherchez un morceau ci-dessus.</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = MuseSound.state.currentPlaylist.map((t, i) => `
                <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container-high cursor-pointer transition-colors group" onclick="MuseSound.player.playTrack(${i})">
                    <img src="${t.thumbnail}" class="w-12 h-12 rounded object-cover bg-surface-container-highest" onerror="this.src='https://placehold.co/48x48?text=Music'">
                    <div class="flex-1 min-w-0">
                        <div class="font-body-md text-on-surface truncate font-medium group-hover:text-primary ${i === MuseSound.state.currentIndex ? 'text-primary' : ''}">${this.escapeHtml(t.title)}</div>
                        <div class="font-label-md text-on-surface-variant truncate">${this.escapeHtml(t.author)}</div>
                    </div>
                </div>
            `).join('');
        },
        
        escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        },

        updateNowPlaying(track) {
            document.querySelectorAll('.current-title').forEach(el => el.textContent = track.title);
            document.querySelectorAll('.current-artist').forEach(el => el.textContent = track.author);
            document.querySelectorAll('.current-art').forEach(el => {
                if (el.tagName === 'IMG') {
                    el.src = track.thumbnail;
                    el.style.display = 'block';
                }
            });
            this.renderPlaylist(); // Met à jour le style de la playlist pour colorer le titre en cours
        },

        updatePlayerControls() {
            const icon = document.getElementById('play-pause-btn')?.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = MuseSound.state.isPlaying ? 'pause' : 'play_arrow';
            }
        },

        updateShuffleRepeatUI() {
            const shuffleBtn = document.getElementById('shuffle-btn');
            if (shuffleBtn) {
                shuffleBtn.classList.toggle('text-primary', MuseSound.state.shuffle);
                shuffleBtn.classList.toggle('text-on-surface-variant', !MuseSound.state.shuffle);
            }
            const repeatIcon = document.getElementById('repeat-icon');
            const repeatBtn = document.getElementById('repeat-btn');
            if (repeatIcon && repeatBtn) {
                if (MuseSound.state.repeat === 'none') {
                    repeatIcon.textContent = 'repeat';
                    repeatBtn.classList.remove('text-primary');
                    repeatBtn.classList.add('text-on-surface-variant');
                } else if (MuseSound.state.repeat === 'all') {
                    repeatIcon.textContent = 'repeat';
                    repeatBtn.classList.add('text-primary');
                    repeatBtn.classList.remove('text-on-surface-variant');
                } else if (MuseSound.state.repeat === 'one') {
                    repeatIcon.textContent = 'repeat_one';
                    repeatBtn.classList.add('text-primary');
                    repeatBtn.classList.remove('text-on-surface-variant');
                }
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

        formatTime(s) {
            if (!s || isNaN(s)) return '0:00';
            const min = Math.floor(s / 60);
            const sec = Math.floor(s % 60);
            return `${min}:${sec < 10 ? '0' : ''}${sec}`;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => MuseSound.init());