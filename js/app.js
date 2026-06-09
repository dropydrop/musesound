/**
 * MuseSound - YouTube IFrame Edition (V7 - API Officielle)
 *
 * Nécessite une clé API YouTube Data v3 (gratuite)
 * Obtenez-la ici : https://console.cloud.google.com/apis/credentials
 * (Activer YouTube Data API v3, créer une clé API)
 */

const MuseSound = {
    // ⚠️ REMPLACEZ CETTE CLÉ PAR LA VÔTRE ⚠️
    YOUTUBE_API_KEY: 'VOTRE_CLE_API_ICI',

    config: {},

    state: {
        currentPlaylist: JSON.parse(localStorage.getItem('MS_CURRENT_PLAYLIST')) || [],
        currentIndex: -1,
        isPlaying: false,
        isLoading: false
    },

    init() {
        console.log("MuseSound V7 - YouTube API Officielle");
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
                alert("Erreur lors de l'import. Vérifiez votre clé API et que l'API YouTube Data v3 est activée.");
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
                        onReady: () => console.log("YouTube IFrame Player prêt"),
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
                                MuseSound.player.next();
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

            if (!this.ytPlayer || typeof this.ytPlayer.loadVideoById !== 'function') {
                const waitForPlayer = setInterval(() => {
                    if (this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
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
            this.ytPlayer.loadVideoById(track.id);
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

        next() { this.playTrack(MuseSound.state.currentIndex + 1); },
        prev() { this.playTrack(MuseSound.state.currentIndex - 1); }
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
            document.getElementById('next-btn')?.addEventListener('click', () => MuseSound.player.next());
            document.getElementById('prev-btn')?.addEventListener('click', () => MuseSound.player.prev());

            this.renderPlaylist();
        },

        setLoading(loading) {
            const btn = document.getElementById('btn-import');
            if (btn) {
                btn.innerHTML = loading ? '<span class="animate-spin material-symbols-outlined">sync</span>' : 'Import';
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
                        <p class="text-sm mt-2">Collez une URL YouTube ci-dessus</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = MuseSound.state.currentPlaylist.map((t, i) => `
                <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container-high cursor-pointer transition-colors group" onclick="MuseSound.player.playTrack(${i})">
                    <img src="${t.thumbnail}" class="w-12 h-12 rounded object-cover bg-surface-container-highest" onerror="this.src='https://placehold.co/48x48?text=Music'">
                    <div class="flex-1 min-w-0">
                        <div class="font-body-md text-on-surface truncate font-medium group-hover:text-primary">${this.escapeHtml(t.title)}</div>
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
                } else {
                    el.style.backgroundImage = `url('${track.thumbnail}')`;
                }
            });
        },

        updatePlayerControls() {
            const icon = document.getElementById('play-pause-btn')?.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = MuseSound.state.isPlaying ? 'pause' : 'play_arrow';
            }
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