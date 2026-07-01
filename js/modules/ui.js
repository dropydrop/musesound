/**
 * UI Manager Module
 */
import { state } from './state.js';
import { utils } from './utils.js';
import { CONFIG } from './config.js';

export const ui = {
    mobileSearchOpen: false,

    init() {
        const { importer, player } = window.MuseSound;
        const input = document.getElementById('playlist-url');
        const btn = document.getElementById('btn-import');
        
        input?.addEventListener('input', (e) => {
            clearTimeout(state.debounceTimer);
            state.debounceTimer = setTimeout(() => this.fetchSuggestions(e.target.value), 444);
        });

        btn?.addEventListener('click', () => {
            this.hideSuggestions();
            importer.processInput(input.value);
        });
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.hideSuggestions();
                importer.processInput(input.value);
            }
        });

        document.getElementById('tab-playlist')?.addEventListener('click', () => { state.uiMode = 'playlist'; state.searchTab = 'tracks'; this.syncTabs(); });
        document.getElementById('tab-playlists')?.addEventListener('click', () => { state.uiMode = 'playlists'; state.searchTab = 'playlists'; this.syncTabs(); });
        document.getElementById('tab-library')?.addEventListener('click', async () => {
            state.uiMode = 'library';
            this.syncTabs();
            if (state.libraryFetched) return;
            const module = await import('./youtube-private.js');
            const data = await module.fetchMyPlaylists();
            state.foundLibrary = data;
            state.libraryFetched = true;
            this.renderLibrary();
        });
        document.getElementById('tab-queue')?.addEventListener('click', () => { state.uiMode = 'queue'; this.syncTabs(); });
        document.getElementById('tab-jam')?.addEventListener('click', () => { state.uiMode = 'jam'; this.syncTabs(); });

        // Délégation d'événements globale (indestructible face aux re-rendus DOM)
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('#btn-mobile-search-trigger');
            if (trigger) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (typeof this.toggleMobileSearch === 'function') {
                    this.toggleMobileSearch(true);
                } else if (window.MuseSound && window.MuseSound.ui) {
                    window.MuseSound.ui.toggleMobileSearch(true);
                } else {
                    console.error("Impossible de trouver toggleMobileSearch");
                }
            }
        }, true);
        const mSearchBack = document.getElementById('mobile-search-back');
        if (mSearchBack) {
            mSearchBack.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMobileSearch(false);
            };
        }
        window.addEventListener('resize', () => {
            if (this.mobileSearchOpen && window.innerWidth >= 768) this.toggleMobileSearch(false);
        });

        // Scope pills
        document.getElementById('scope-tracks')?.addEventListener('click', () => {
            state.searchTab = 'tracks';
            this.updateScopePills();
        });
        document.getElementById('scope-playlists')?.addEventListener('click', () => {
            state.searchTab = 'playlists';
            this.updateScopePills();
        });

        document.getElementById('nowplaying-radio-btn')?.addEventListener('click', () => {
            const track = state.queue[state.playingQueueIndex] || state.currentPlaylist[state.currentIndex];
            if (track) importer.fetchRadio(track);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#playlist-url')) this.hideSuggestions();
        });

        document.getElementById('btn-resume-ignore')?.addEventListener('click', () => this.hideResumeBanner());
        document.getElementById('btn-resume-play')?.addEventListener('click', () => {
            const index = parseInt(localStorage.getItem('MS_LAST_INDEX'));
            const pos = parseFloat(localStorage.getItem('MS_LAST_POS'));
            const isQueue = localStorage.getItem('MS_LAST_IS_QUEUE') === 'true';
            this.hideResumeBanner();
            if (!isNaN(index) && index >= 0) {
                if (isQueue) player.playQueueTrack(index, pos);
                else player.playTrack(index, pos);
            }
        });

        this.initJamControls();
        this.initStaticControls();
        this.syncTabs();
    },

    initStaticControls() {
        const { player } = window.MuseSound;
        document.getElementById('play-pause-btn')?.addEventListener('click', () => player.toggle());
        document.getElementById('next-btn')?.addEventListener('click', () => player.next(true));
        document.getElementById('prev-btn')?.addEventListener('click', () => player.prev());

        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) {
            progressContainer.addEventListener('click', (e) => {
                if (!player.ytActive || !player.ytPlayer) return;
                const rect = progressContainer.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                const duration = player.ytPlayer.getDuration();
                if (duration && !isNaN(duration)) player.ytPlayer.seekTo(percent * duration, true);
            });
        }

        document.getElementById('shuffle-btn')?.addEventListener('click', () => {
            state.shuffle = !state.shuffle;
            localStorage.setItem('MS_SHUFFLE', state.shuffle);
            this.updateShuffleRepeatUI();
        });

        document.getElementById('repeat-btn')?.addEventListener('click', () => {
            const modes = ['none', 'all', 'one'];
            state.repeat = modes[(modes.indexOf(state.repeat) + 1) % 3];
            localStorage.setItem('MS_REPEAT', state.repeat);
            this.updateShuffleRepeatUI();
        });

        document.getElementById('clear-queue-btn')?.addEventListener('click', () => player.clearQueue());
        document.getElementById('export-queue-btn')?.addEventListener('click', () => player.exportQueueToFile());
        document.getElementById('import-queue-btn')?.addEventListener('click', () => document.getElementById('queue-file-input')?.click());
        document.getElementById('queue-file-input')?.addEventListener('change', (e) => player.importQueueFromFile(e));

        document.getElementById('eco-btn')?.addEventListener('click', () => {
            state.ecoMode = !state.ecoMode;
            localStorage.setItem('MS_ECO_MODE', state.ecoMode);
            this.updateEcoUI();
            utils.showToast(state.ecoMode ? "Mode Éco (144p)" : "Mode HQ (360p)");
        });

        document.getElementById('fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && state.isCinemaMode) this.toggleFullscreen(true);
        });

        const volSlider = document.getElementById('volume-slider');
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (volSlider) {
            if (isMobile) {
                // Masque ou désactive le slider inutile sur mobile
                volSlider.style.display = 'none'; 
                document.getElementById('volume-icon') ? document.getElementById('volume-icon').style.display = 'none' : null;
            } else {
                volSlider.value = state.volume;
                volSlider.addEventListener('input', (e) => player.setVolume(parseInt(e.target.value)));
                document.getElementById('volume-icon')?.addEventListener('click', () => player.setVolume(state.volume > 0 ? 0 : 100));
            }
        }

        const trackContainer = document.getElementById('playlist-container');
        const plContainer = document.getElementById('playlists-results') || this.createPlaylistsResultsContainer();
        trackContainer?.addEventListener('scroll', () => this.handleScroll(trackContainer));
        plContainer?.addEventListener('scroll', () => this.handleScroll(plContainer));

        this.updateShuffleRepeatUI();
        this.updateVolumeUI();
        this.updateEcoUI();
    },

    initJamControls() {
        const { jam } = window.MuseSound;
        
        document.getElementById('jam-btn-create')?.addEventListener('click', async () => {
            const result = await jam.createJamSession();
            if (result) {
                utils.showToast(`Session créée ! Code: ${result.code}`);
                this.renderJam();
            }
        });

        document.getElementById('jam-btn-join')?.addEventListener('click', async () => {
            const input = document.getElementById('jam-code-input');
            const code = input?.value.trim();
            if (!code || code.length < 3) {
                utils.showToast('Entrez un code valide');
                return;
            }
            const result = await jam.joinJamSession(code);
            if (result) {
                utils.showToast(`Rejoint la session ${result.code}`);
                input.value = '';
                this.renderJam();
            }
        });

        document.getElementById('jam-code-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('jam-btn-join')?.click();
        });

        document.getElementById('jam-btn-leave')?.addEventListener('click', () => {
            jam.leaveJamSession();
            utils.showToast('Session quittée');
        });

        document.getElementById('jam-btn-copy')?.addEventListener('click', () => {
            this.copyJamLink();
        });

        document.getElementById('jam-btn-qr')?.addEventListener('click', () => {
            this.generateJamQR();
        });

        document.getElementById('jam-btn-next')?.addEventListener('click', () => {
            jam.nextJamTrack();
        });

        document.getElementById('jam-btn-prev')?.addEventListener('click', () => {
            const { player } = window.MuseSound;
            player.prev();
        });

        document.getElementById('jam-btn-playpause')?.addEventListener('click', () => {
            const { player } = window.MuseSound;
            player.toggle();
        });

        document.getElementById('jam-btn-export')?.addEventListener('click', () => {
            jam.exportJamQueue();
        });

        document.getElementById('jam-btn-import')?.addEventListener('click', () => {
            document.getElementById('jam-file-input')?.click();
        });

        document.getElementById('jam-file-input')?.addEventListener('change', (e) => {
            jam.importJamQueueFromFile(e.target.files[0]);
            e.target.value = '';
        });

        document.getElementById('jam-btn-clear')?.addEventListener('click', () => {
            jam.clearJamQueue();
        });
    },

    generateJamQR() {
        const modal = document.getElementById('jam-qr-modal');
        const img = document.getElementById('jam-qr-image');
        const display = document.getElementById('jam-qr-code-display');
        const fallback = document.getElementById('jam-qr-fallback');
        const { code } = window.MuseSound.jam;
        
        if (display) display.textContent = code || '';
        
        if (!code) {
            if (img) img.classList.add('hidden');
            if (fallback) fallback.classList.remove('hidden');
            if (modal) modal.classList.remove('hidden');
            return;
        }

        // Génération du QR Code avec la librairie
        if (typeof QRCode !== 'undefined' && img) {
            try {
                // Créer un canvas temporaire pour le QR
                const qrContainer = document.createElement('div');
                qrContainer.style.display = 'none';
                document.body.appendChild(qrContainer);
                
                new QRCode(qrContainer, {
                    text: `https://musesound.vercel.app/?code=${code}`,
                    width: 220,
                    height: 220,
                    colorDark: '#53e076',
                    colorLight: '#121414',
                    correctLevel: QRCode.CorrectLevel.L
                });
                
                // Récupérer le canvas généré
                const canvas = qrContainer.querySelector('canvas');
                if (canvas) {
                    img.src = canvas.toDataURL('image/png');
                    img.classList.remove('hidden');
                    if (fallback) fallback.classList.add('hidden');
                } else {
                    this.showQRFallback(img, fallback, code);
                }
                document.body.removeChild(qrContainer);
            } catch (e) {
                console.warn('QR Code generation failed:', e);
                this.showQRFallback(img, fallback, code);
            }
        } else {
            this.showQRFallback(img, fallback, code);
        }
        
        if (modal) modal.classList.remove('hidden');
    },

    showQRFallback(img, fallback, code) {
        if (img) img.classList.add('hidden');
        if (fallback) {
            fallback.classList.remove('hidden');
            fallback.innerHTML = `
                <div class="text-on-surface-variant/70 text-sm p-4 border border-outline-variant rounded-lg text-center">
                    <span class="material-symbols-outlined text-3xl block mb-2">qr_code_scanner</span>
                    <p>QR Code non disponible.</p>
                    <p class="text-xs mt-1">Code d'invitation : <strong>${code || '---'}</strong></p>
                    ${code ? `<button onclick="navigator.clipboard?.writeText('${code}'); window.MuseSound.utils.showToast('Code copié !')" class="mt-2 text-primary text-xs underline">Copier le code</button>` : ''}
                </div>
            `;
        }
    },

    handleScroll(el) {
        const { importer } = window.MuseSound;
        if (state.isFetchingMore) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 150) {
            const hasMore = state.uiMode === 'playlist' ? state.nextPageTokenTracks : state.nextPageTokenPlaylists;
            if (hasMore) importer.fetchMore();
        }
    },

    async fetchSuggestions(q) {
        if (q.length < 2) { this.hideSuggestions(); return; }
        this._suggestionsQuery = q;
        clearTimeout(this._suggestionsFallbackTimer);
        this._suggestionsFallbackTimer = setTimeout(() => {
            this.handleLocalSuggestions(q);
        }, 2000);
        const script = document.createElement('script');
        script.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}&callback=MuseSound.ui.handleSuggestions`;
        document.body.appendChild(script);
    },

    handleLocalSuggestions(q) {
        const query = q.toLowerCase();
        const local = [];
        if (state.currentPlaylist && state.currentPlaylist.length) {
            state.currentPlaylist.forEach(t => {
                if (t.title && t.title.toLowerCase().includes(query) && !local.includes(t.title)) {
                    local.push(t.title);
                }
            });
        }
        if (state.foundPlaylists && state.foundPlaylists.length) {
            state.foundPlaylists.forEach(p => {
                if (p.title && p.title.toLowerCase().includes(query) && !local.includes(p.title)) {
                    local.push(p.title);
                }
            });
        }
        const sliced = local.slice(0, 5);
        if (!sliced.length) return;
        const container = document.getElementById('suggestions-container') || this.createSuggestionsContainer();
        container.innerHTML = sliced.map(s => `<div class="p-3 hover:bg-primary/10 cursor-pointer text-sm border-b border-outline-variant/30">${s}</div>`).join('');
        container.classList.remove('hidden');
        container.querySelectorAll('div').forEach((el, i) => {
            el.onclick = () => {
                document.getElementById('playlist-url').value = sliced[i];
                this.hideSuggestions();
                window.MuseSound.importer.processInput(sliced[i], true);
            };
        });
    },

    handleSuggestions(data) {
        clearTimeout(this._suggestionsFallbackTimer);
        const { importer } = window.MuseSound;
        const suggestions = data[1];
        const container = document.getElementById('suggestions-container') || this.createSuggestionsContainer();
        container.innerHTML = suggestions.map(s => `<div class="p-3 hover:bg-primary/10 cursor-pointer text-sm border-b border-outline-variant/30">${s[0]}</div>`).join('');
        container.classList.remove('hidden');
        container.querySelectorAll('div').forEach((el, i) => {
            el.onclick = () => {
                const q = suggestions[i][0];
                document.getElementById('playlist-url').value = q;
                this.hideSuggestions();
                importer.processInput(q, true);
            };
        });
    },

    createSuggestionsContainer() {
        const mInput = document.getElementById('playlist-url');
        let mSuggest = document.getElementById('suggestions-container');
        if (mSuggest) return mSuggest;
        mSuggest = document.createElement('div');
        mSuggest.id = 'suggestions-container';
        mSuggest.className = 'absolute top-full left-0 w-full z-[10000] bg-surface-container-high rounded-b-lg shadow-xl border border-outline-variant max-h-60 overflow-y-auto hidden mt-1';
        if (mInput && mInput.parentElement) {
            mInput.parentElement.classList.add('relative');
            mInput.parentElement.appendChild(mSuggest);
        }
        return mSuggest;
    },

    hideSuggestions() { document.getElementById('suggestions-container')?.classList.add('hidden'); },

    toggleMobileSearch(show) {
        if (show) {
            const mOverlay = document.getElementById('mobile-search-overlay');
            const mWrapper = document.getElementById('mobile-search-input-wrapper');
            const mInput = document.getElementById('playlist-url');

            if (mOverlay) {
                mOverlay.style.setProperty('display', 'flex', 'important');
                mOverlay.style.setProperty('visibility', 'visible', 'important');
                mOverlay.style.setProperty('opacity', '1', 'important');
            }
            
            if (mWrapper && mInput) {
                mWrapper.appendChild(mInput);
                mInput.value = '';
            }

            this.mobileSearchOpen = true;
            this.updateScopePills();
            
            setTimeout(() => { try { mInput?.focus(); } catch(e) {} }, 150);
        } else {
            const mOverlay = document.getElementById('mobile-search-overlay');
            const mHeaderContainer = document.getElementById('header-search-container');
            const mInput = document.getElementById('playlist-url');
            const mBtn = document.getElementById('btn-import');

            if (mOverlay) {
                mOverlay.style.setProperty('display', 'none', 'important');
            }
            
            if (mHeaderContainer) {
                if (mBtn) mHeaderContainer.prepend(mBtn);
                if (mInput) mHeaderContainer.prepend(mInput);
            }
            
            if (typeof this.hideSuggestions === 'function') {
                this.hideSuggestions();
            }
            const mSuggest = document.getElementById('suggestions-container');
            if (mSuggest) mSuggest.remove();
            
            this.mobileSearchOpen = false;
        }
    },

    updateScopePills() {
        const isTracks = state.searchTab === 'tracks';
        const tracksBtn = document.getElementById('scope-tracks');
        const playlistsBtn = document.getElementById('scope-playlists');
        if (!tracksBtn || !playlistsBtn) return;
        tracksBtn.classList.toggle('bg-primary', isTracks);
        tracksBtn.classList.toggle('text-background', isTracks);
        tracksBtn.classList.toggle('border-primary', isTracks);
        tracksBtn.classList.toggle('bg-transparent', !isTracks);
        tracksBtn.classList.toggle('text-on-surface-variant', !isTracks);
        tracksBtn.classList.toggle('border-outline-variant', !isTracks);
        playlistsBtn.classList.toggle('bg-primary', !isTracks);
        playlistsBtn.classList.toggle('text-background', !isTracks);
        playlistsBtn.classList.toggle('border-primary', !isTracks);
        playlistsBtn.classList.toggle('bg-transparent', isTracks);
        playlistsBtn.classList.toggle('text-on-surface-variant', isTracks);
        playlistsBtn.classList.toggle('border-outline-variant', isTracks);
    },

    syncTabs() {
        const m = state.uiMode;
        const containers = { playlist: 'playlist-container', playlists: 'playlists-results', library: 'library-section', queue: 'queue-view', jam: 'jam-view' };
        Object.keys(containers).forEach(key => {
            const el = document.getElementById(containers[key]);
            const tab = document.getElementById('tab-' + (key === 'playlist' ? 'playlist' : key === 'playlists' ? 'playlists' : key === 'library' ? 'library' : key === 'queue' ? 'queue' : 'jam'));
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
        if (m === 'library') this.renderLibrary();
        if (m === 'jam') this.renderJam();
        this.updateScopePills();
    },

    updateShuffleRepeatUI() {
        const shuffleBtn = document.getElementById('shuffle-btn');
        const repeatBtn = document.getElementById('repeat-btn');

        if (shuffleBtn) {
            shuffleBtn.classList.toggle('text-primary', state.shuffle);
            shuffleBtn.classList.toggle('opacity-60', !state.shuffle);
        }

        if (repeatBtn) {
            // Gère les trois états : 'none', 'all', 'one'
            const isTargeted = state.repeat !== 'none';
            repeatBtn.classList.toggle('text-primary', isTargeted);
            repeatBtn.classList.toggle('opacity-60', !isTargeted);
            
            // Optionnel : Change l'icône si tu gères le mode 'one' distinctement
            const icon = repeatBtn.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = state.repeat === 'one' ? 'repeat_one' : 'repeat';
            }
        }
    },

    renderPlaylistsResults() {
        const container = document.getElementById('playlists-results');
        if (!container || state.uiMode !== 'playlists') return;
        
        if (!state.foundPlaylists || state.foundPlaylists.length === 0) {
            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-50"><span class="material-symbols-outlined text-6xl mb-4">video_library</span><p>Aucune playlist trouvée.</p></div>`;
            return;
        }

        container.innerHTML = state.foundPlaylists.map(pl => `
            <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container-high cursor-pointer" onclick="MuseSound.importer.fetchPlaylist('${pl.id}', false)">
                <div class="relative">
                    <img src="${pl.thumbnail}" class="w-16 h-16 rounded object-cover shadow-lg">
                    <div class="absolute inset-0 bg-black/40 flex items-center justify-center"><span class="material-symbols-outlined text-white">playlist_play</span></div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-bold truncate">${utils.escapeHtml(pl.title)}</div>
                    <div class="text-xs text-primary">${utils.escapeHtml(pl.author)}</div>
                </div>
                ${state.jamActive
                    ? `<button class="w-11 h-11 flex items-center justify-center opacity-60 hover:opacity-100" onclick='event.stopPropagation(); MuseSound.ui.addPlaylistToJam("${pl.id}")'>
                        <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">group</span>
                       </button>`
                    : ''
                }
            </div>
        `).join('');
    },

    renderPlaylist() {
        const { player, importer } = window.MuseSound;
        const container = document.getElementById('playlist-container');
        if (!container || state.uiMode !== 'playlist') return;
        this.updateStats(state.currentPlaylist);

        if (state.currentPlaylist.length === 0) {
            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-50"><span class="material-symbols-outlined text-6xl mb-4">search</span><p>Cherchez des morceaux ou collez une URL.</p></div>`;
            return;
        }

        let html = state.currentPlaylist.map((t, i) => `
            <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container-high cursor-pointer group transition-all select-none" 
                 onpointerdown="MuseSound.ui.handlePointerDown(event, ${i}, 'playlist')" 
                 onpointerup="MuseSound.ui.handlePointerUp(event, ${i}, 'playlist')"
                 onpointermove="MuseSound.ui.handlePointerMove(event)">
                <img src="${t.thumbnail}" class="w-12 h-12 rounded object-cover pointer-events-none" onclick="event.stopPropagation(); MuseSound.ui.playResultNow(${i})">
                <div class="flex-1 min-w-0" onclick="MuseSound.ui.playResultNow(${i})">
                    <div class="font-medium truncate">${utils.escapeHtml(t.title)}</div>
                    <div class="text-xs text-on-surface-variant truncate">${utils.escapeHtml(t.author)} • ${this.formatViews(t.views)} écoutes</div>
                </div>
                <div class="flex items-center gap-1">
                    <button class="w-11 h-11 flex items-center justify-center opacity-60 hover:opacity-100" onclick='event.stopPropagation(); MuseSound.importer.fetchRadio(MuseSound.state.currentPlaylist[${i}])'>
                        <span class="material-symbols-outlined text-primary">radio</span>
                    </button>
                    <button class="w-11 h-11 flex items-center justify-center opacity-60 hover:opacity-100" onclick='event.stopPropagation(); MuseSound.player.addToQueue(MuseSound.state.currentPlaylist[${i}])'>
                        <span class="material-symbols-outlined text-primary">playlist_add</span>
                    </button>
                    ${state.jamActive
                        ? `<button class="w-11 h-11 flex items-center justify-center opacity-60 hover:opacity-100" onclick='event.stopPropagation(); MuseSound.jam.addTrackToJam(MuseSound.state.currentPlaylist[${i}])'>
                            <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">group</span>
                           </button>`
                        : ''
                    }
                </div>
            </div>
        `).join('');

        if (state.isFetchingMore) html += `<div class="flex justify-center p-6"><span class="animate-spin material-symbols-outlined text-primary">sync</span></div>`;
        container.innerHTML = html;
    },

    renderLibrary() {
        const container = document.getElementById('library-container');
        if (!container || state.uiMode !== 'library' || !state.foundLibrary) return;
        if (state.foundLibrary.length === 0) {
            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-50"><span class="material-symbols-outlined text-6xl mb-4">video_library</span><p>Aucune playlist privée trouvée.</p></div>`;
            return;
        }
        container.innerHTML = state.foundLibrary.map(pl => `
            <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container-high cursor-pointer" onclick="MuseSound.importer.fetchPlaylist('${pl.id}')">
                <div class="relative">
                    <img src="${pl.snippet.thumbnails?.medium?.url}" class="w-16 h-16 rounded object-cover shadow-lg">
                    <div class="absolute inset-0 bg-black/40 flex items-center justify-center"><span class="material-symbols-outlined text-white">playlist_play</span></div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-bold truncate">${utils.escapeHtml(pl.snippet.title)}</div>
                    <div class="text-xs text-primary">${pl.contentDetails.itemCount} morceaux</div>
                </div>
                ${state.jamActive
                    ? `<button class="w-11 h-11 flex items-center justify-center opacity-60 hover:opacity-100" onclick='event.stopPropagation(); MuseSound.ui.addPlaylistToJam("${pl.id}")'>
                        <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">group</span>
                       </button>`
                    : ''
                }
            </div>
        `).join('');
    },

    renderQueue() {
        const { player, importer } = window.MuseSound;
        const list = document.getElementById('queue-list');
        const badge = document.getElementById('queue-badge');
        if (!list) return;
        const count = state.queue.length;
        if (badge) { badge.textContent = count; badge.classList.toggle('hidden', count === 0); }
        if (state.uiMode === 'queue') this.updateStats(state.queue);
        if (count === 0) {
            list.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-on-surface-variant opacity-50"><span class="material-symbols-outlined text-4xl mb-2">queue_play_next</span><p class="text-sm">La file d'attente est vide.</p></div>`;
            return;
        }
        list.innerHTML = state.queue.map((t, i) => `
            <div class="flex items-center gap-3 p-3 rounded-lg transition-all select-none ${i === state.playingQueueIndex ? 'bg-primary/10 border border-primary/20' : ''}"
                 onpointerdown="MuseSound.ui.handlePointerDown(event, ${i}, 'queue')" onpointerup="MuseSound.ui.handlePointerUp(event, ${i}, 'queue')" onpointermove="MuseSound.ui.handlePointerMove(event)">
                
                <img src="${t.thumbnail}" class="w-10 h-10 rounded object-cover pointer-events-none ${i === state.playingQueueIndex ? 'animate-pulse' : ''}" onclick="MuseSound.player.playQueueTrack(${i})">
                <div class="flex-1 min-w-0" onclick="MuseSound.player.playQueueTrack(${i})">
                    <div class="text-sm font-medium truncate ${i === state.playingQueueIndex ? 'text-primary' : ''}">${utils.escapeHtml(t.title)}</div>
                    <div class="text-[10px] text-on-surface-variant truncate">${utils.escapeHtml(t.author)}</div>
                </div>
                <div class="flex items-center gap-1">
                    <div class="reorder-btn-group flex-col gap-1 mr-1">
                        <button class="w-7 h-7 flex items-center justify-center bg-surface-container rounded hover:bg-primary/20" 
                                onclick="event.stopPropagation(); MuseSound.ui.moveQueueItem(${i}, -1)">
                            <span class="material-symbols-outlined text-base">keyboard_arrow_up</span>
                        </button>
                        <button class="w-7 h-7 flex items-center justify-center bg-surface-container rounded hover:bg-primary/20" 
                                onclick="event.stopPropagation(); MuseSound.ui.moveQueueItem(${i}, 1)">
                            <span class="material-symbols-outlined text-base">keyboard_arrow_down</span>
                        </button>
                    </div>

                    <button class="w-10 h-10 flex items-center justify-center opacity-60 hover:opacity-100" onclick='event.stopPropagation(); MuseSound.importer.fetchRadio(MuseSound.state.queue[${i}])'>
                        <span class="material-symbols-outlined text-sm">radio</span>
                    </button>
                    <button class="w-10 h-10 flex items-center justify-center opacity-60 hover:opacity-100" onclick="event.stopPropagation(); MuseSound.player.removeFromQueue(${i})">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            </div>
        `).join('');
    },

    renderJam() {
        const { jam, importer } = window.MuseSound;
        const lobby = document.getElementById('jam-lobby');
        const session = document.getElementById('jam-session');
        if (!lobby || !session) return;

        const active = state.jamActive && jam.sessionId;

        lobby.classList.toggle('hidden', active);
        session.classList.toggle('hidden', !active);

        if (!active) return;

        document.getElementById('jam-session-code').textContent = state.jamCode || '';
        const role = document.getElementById('jam-session-role');
        if (role) {
            role.textContent = state.jamIsHost ? 'Hôte' : 'Invité';
            role.className = state.jamIsHost
                ? 'ml-2 px-2 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary'
                : 'ml-2 px-2 py-0.5 rounded-full text-[10px] bg-on-surface-variant/20 text-on-surface-variant';
        }

        const hostControls = document.getElementById('jam-host-controls');
        if (hostControls) hostControls.classList.toggle('hidden', !state.jamIsHost);

        const queueTools = document.getElementById('jam-queue-tools');
        if (queueTools) queueTools.classList.toggle('hidden', !state.jamIsHost);

        const playPauseIcon = document.getElementById('jam-btn-playpause')?.querySelector('.material-symbols-outlined');
        if (playPauseIcon) playPauseIcon.textContent = state.isPlaying ? 'pause' : 'play_arrow';

        const nowPlaying = document.getElementById('jam-nowplaying');
        if (state.jamCurrentTrack) {
            nowPlaying?.classList.remove('hidden');
            document.getElementById('jam-current-title').textContent = state.jamCurrentTrack.title || '';
            document.getElementById('jam-current-author').textContent = state.jamCurrentTrack.author || '';
            document.getElementById('jam-current-art').src = state.jamCurrentTrack.thumbnail || '';
        } else {
            nowPlaying?.classList.add('hidden');
        }

        const list = document.getElementById('jam-queue-list');
        const count = document.getElementById('jam-track-count');
        if (!list) return;
        if (count) count.textContent = `${state.jamQueue.length} morceau${state.jamQueue.length > 1 ? 'x' : ''}`;

        if (state.jamQueue.length === 0) {
            list.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-on-surface-variant opacity-50"><span class="material-symbols-outlined text-4xl mb-2">queue_play_next</span><p class="text-sm">La file d'attente est vide.</p></div>`;
            return;
        }

        list.innerHTML = state.jamQueue.map((t, i) => `
            <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-container-high transition-all">
                <img src="${t.thumbnail}" class="w-10 h-10 rounded object-cover" onerror="this.style.display='none'">
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium truncate">${utils.escapeHtml(t.title)}</div>
                    <div class="text-[10px] text-on-surface-variant truncate">${utils.escapeHtml(t.author)}</div>
                </div>
                ${state.jamIsHost ? `
                    <div class="reorder-btn-group flex-col gap-1 mr-1">
                        <button class="w-7 h-7 flex items-center justify-center bg-surface-container rounded hover:bg-primary/20 ${i === 0 ? 'opacity-30 pointer-events-none' : ''}"
                                onclick="event.stopPropagation(); MuseSound.jam.moveJamTrack(${i}, -1)">
                            <span class="material-symbols-outlined text-base">keyboard_arrow_up</span>
                        </button>
                        <button class="w-7 h-7 flex items-center justify-center bg-surface-container rounded hover:bg-primary/20 ${i === state.jamQueue.length - 1 ? 'opacity-30 pointer-events-none' : ''}"
                                onclick="event.stopPropagation(); MuseSound.jam.moveJamTrack(${i}, 1)">
                            <span class="material-symbols-outlined text-base">keyboard_arrow_down</span>
                        </button>
                    </div>
                    <button class="w-10 h-10 flex items-center justify-center opacity-60 hover:opacity-100" onclick='event.stopPropagation(); MuseSound.jam.generateRadioMix(${i})'>
                        <span class="material-symbols-outlined text-sm">radio</span>
                    </button>
                    <button class="w-8 h-8 flex items-center justify-center opacity-60 hover:opacity-100 hover:text-red-400" onclick="MuseSound.jam.removeTrackFromJam(${i})">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                ` : ''}
            </div>
        `).join('');
    },

    async addPlaylistToJam(playlistId) {
        const { jam, utils, importer } = window.MuseSound;
        if (!jam.sessionId) {
            utils.showToast('Rejoignez une session Jam d\'abord');
            return;
        }

        const token = state.googleToken;
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${CONFIG.YOUTUBE_API_KEY}`;
        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let allTracks = [];
        let nextPageToken = '';
        while (allTracks.length < 500) {
            const pageUrl = `${url}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
            const response = await fetch(pageUrl, { headers });
            const data = await response.json();
            if (!data.items?.length) break;

            const tracks = data.items.map(item => ({
                id: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                author: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                duration: 0
            }));

            allTracks = [...allTracks, ...tracks];
            nextPageToken = data.nextPageToken;
            if (!nextPageToken) break;
        }

        if (allTracks.length === 0) {
            utils.showToast('Aucun morceau trouvé dans cette playlist');
            return;
        }

        const enriched = await importer.enrichTracksData(allTracks.slice(0, 500));

        for (const track of enriched) {
            await jam.addTrackToJam(track, true);
        }

        utils.showToast(`Playlist ajoutée au Jam (${enriched.length} morceaux)`);
    },

    moveQueueItem(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= state.queue.length) return;

        const [item] = state.queue.splice(index, 1);
        state.queue.splice(newIndex, 0, item);

        if (state.playingQueueIndex === index) {
            state.playingQueueIndex = newIndex;
        } else if (index < state.playingQueueIndex && newIndex >= state.playingQueueIndex) {
            state.playingQueueIndex--;
        } else if (index > state.playingQueueIndex && newIndex <= state.playingQueueIndex) {
            state.playingQueueIndex++;
        }

        localStorage.setItem('MS_QUEUE', JSON.stringify(state.queue));
        this.renderQueue();
        utils.showToast(direction < 0 ? "Déplacé vers le haut" : "Déplacé vers le bas");
    },

    playResultNow(index) {
        const { player } = window.MuseSound;
        const track = state.currentPlaylist[index];
        if (!track) return;
        const insertPos = state.playingQueueIndex >= 0 ? state.playingQueueIndex + 1 : 0;
        state.queue.splice(insertPos, 0, track);
        localStorage.setItem('MS_QUEUE', JSON.stringify(state.queue));
        state.uiMode = 'queue';
        this.syncTabs();
        player.playQueueTrack(insertPos);
    },

    createPlaylistsResultsContainer() {
        const main = document.querySelector('main');
        const div = document.createElement('div');
        div.id = 'playlists-results';
        div.className = 'hidden flex-1 overflow-y-auto p-4 flex flex-col gap-1 hide-scrollbar';
        main.insertBefore(div, document.getElementById('queue-view'));
        return div;
    },

    handlePointerDown(e, index, type) {
        if (e.pointerType === 'touch') return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        if (e.target.closest('button')) return;
        
        state.draggedIndex = index;
        state.draggedType = type;
        state.startY = e.clientY;
        state.lastX = e.clientX;
        state.lastY = e.clientY;
        const currentEl = e.currentTarget;
        
        state.dragTimer = setTimeout(() => {
            currentEl.classList.add('scale-105', 'shadow-2xl', 'z-50', 'bg-surface-container-highest', 'rotate-1', 'is-dragging');
            currentEl.style.pointerEvents = 'none';
            document.body.style.cursor = 'grabbing';
            utils.showToast("Déplacement activé");
            currentEl.setPointerCapture(e.pointerId);
        }, 500);
    },

    handlePointerMove(e) {
        if (state.dragTimer && !document.body.style.cursor) {
            if (Math.abs(e.clientY - state.startY) > 10) { 
                clearTimeout(state.dragTimer); 
                state.dragTimer = null; 
            }
        }

        if (document.body.style.cursor === 'grabbing') {
            state.lastX = e.clientX;
            state.lastY = e.clientY;

            const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[onpointerdown]');
            
            document.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over', 'border-t-4', 'border-primary');
            });
            
            if (target && target.getAttribute('onpointerdown').includes(state.draggedType)) {
                if (target !== e.currentTarget) {
                    target.classList.add('drag-over', 'border-t-4', 'border-primary');
                }
            }
        }
    },

    handlePointerUp(e, toIndex, type) {
        clearTimeout(state.dragTimer);
        state.dragTimer = null;
        
        const fromIndex = state.draggedIndex;
        const fromType = state.draggedType;
        const currentEl = e.currentTarget;
        
        document.body.style.cursor = '';
        
        const dropTarget = document.elementFromPoint(state.lastX, state.lastY)?.closest('[onpointerdown]');
        let finalToIndex = fromIndex; 

        if (dropTarget && dropTarget.getAttribute('onpointerdown').includes(fromType)) {
            const match = dropTarget.getAttribute('onpointerdown').match(/event,\s*(\d+)/);
            if (match) finalToIndex = parseInt(match[1]);
        }

        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over', 'border-t-4', 'border-primary');
        });
        
        currentEl.classList.remove('scale-105', 'shadow-2xl', 'z-50', 'bg-surface-container-highest', 'rotate-1', 'is-dragging');
        currentEl.style.pointerEvents = '';
        
        try { currentEl.releasePointerCapture(e.pointerId); } catch(err) {}

        if (fromIndex !== -1 && fromIndex !== finalToIndex && fromType === type) {
            const list = type === 'playlist' ? state.currentPlaylist : state.queue;
            const [movedItem] = list.splice(fromIndex, 1);
            list.splice(finalToIndex, 0, movedItem);
            
            if (type === 'playlist') {
                if (state.currentIndex === fromIndex) state.currentIndex = finalToIndex;
                else if (fromIndex < state.currentIndex && finalToIndex >= state.currentIndex) state.currentIndex--;
                else if (fromIndex > state.currentIndex && finalToIndex <= state.currentIndex) state.currentIndex++;
                localStorage.setItem('MS_CURRENT_PLAYLIST', JSON.stringify(list));
                this.renderPlaylist();
            } else {
                if (state.playingQueueIndex === fromIndex) state.playingQueueIndex = finalToIndex;
                else if (fromIndex < state.playingQueueIndex && finalToIndex >= state.playingQueueIndex) state.playingQueueIndex--;
                else if (fromIndex > state.playingQueueIndex && finalToIndex <= state.playingQueueIndex) state.playingQueueIndex++;
                localStorage.setItem('MS_QUEUE', JSON.stringify(list));
                this.renderQueue();
            }
        }
        
        state.draggedIndex = -1;
        state.draggedType = null;
    },

    updateStats(list) {
        const c = document.getElementById('track-count'), d = document.getElementById('total-duration');
        if (c) c.textContent = list.length;
        if (d) {
            const total = list.reduce((sum, t) => sum + (t.duration || 0), 0);
            d.textContent = total > 0 ? ` • ${utils.formatTime(total)}` : "";
        }
    },

    updateNowPlaying(track) {
        document.querySelectorAll('.current-title').forEach(el => el.textContent = track.title);
        document.querySelectorAll('.current-artist').forEach(el => el.textContent = track.author);
        document.querySelectorAll('.current-art').forEach(el => { if (el.tagName === 'IMG') { el.src = track.thumbnail; el.style.display = 'block'; } });
    },

    updatePlayerControls() {
        const icon = document.getElementById('play-pause-btn')?.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = state.isPlaying ? 'pause' : 'play_arrow';
    },

    updateShuffleRepeatUI() {
        const s = document.getElementById('shuffle-btn'), r = document.getElementById('repeat-btn'), ri = document.getElementById('repeat-icon');
        if (s) s.classList.toggle('text-primary', state.shuffle);
        if (ri && r) {
            const map = { none: ['repeat', false], all: ['repeat', true], one: ['repeat_one', true] };
            const [icon, active] = map[state.repeat];
            ri.textContent = icon;
            r.classList.toggle('text-primary', active);
        }
    },

    updateVolumeUI() {
        const i = document.getElementById('volume-icon'), s = document.getElementById('volume-slider'), v = state.volume;
        if (s) s.value = v;
        if (i) {
            if (v === 0) i.textContent = 'volume_off';
            else if (v < 50) i.textContent = 'volume_down';
            else i.textContent = 'volume_up';
        }
    },

    formatViews(v) { return utils.formatViews(v); },

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
            b.classList.toggle('bg-primary', state.ecoMode);
            b.classList.toggle('text-background', state.ecoMode);
            b.classList.toggle('border-primary', state.ecoMode);
        }
    },

    checkResumeState() {
        const i = parseInt(localStorage.getItem('MS_LAST_INDEX')), p = parseFloat(localStorage.getItem('MS_LAST_POS')), isQ = localStorage.getItem('MS_LAST_IS_QUEUE') === 'true';
        const list = isQ ? state.queue : state.currentPlaylist;
        if (!isNaN(i) && i >= 0 && i < list.length && p > 10) {
            const t = list[i], b = document.getElementById('resume-banner'), tt = document.getElementById('resume-track-title');
            if (b && tt) { tt.textContent = `${t.title} (${utils.formatTime(p)})`; b.classList.remove('hidden'); setTimeout(() => b.classList.add('visible'), 100); }
        }
    },

    hideResumeBanner() {
        const b = document.getElementById('resume-banner');
        if (b) { b.classList.remove('visible'); setTimeout(() => b.classList.add('hidden'), 500); }
        localStorage.removeItem('MS_LAST_INDEX'); localStorage.removeItem('MS_LAST_POS');
    },

    copyJamLink() {
        const { code } = window.MuseSound.jam;
        if (!code) return;
        const url = `https://musesound.vercel.app/?code=${code}`;
        navigator.clipboard.writeText(url).then(() => {
            utils.showToast('Lien copié !');
        }).catch(() => {
            utils.showToast('Erreur de copie');
        });
    },

    toggleFullscreen(f = false) {
        const n = !!document.fullscreenElement, s = f ? false : !state.isCinemaMode;
        state.isCinemaMode = s;
        const b = document.body, fs = document.getElementById('fullscreen-btn');
        if (s) {
            b.classList.add('is-cinema-mode'); if (fs) fs.textContent = 'close_fullscreen';
            if (!n) document.documentElement.requestFullscreen().catch(() => {});
        } else {
            b.classList.remove('is-cinema-mode'); if (fs) fs.textContent = 'open_in_full';
            if (n) document.exitFullscreen().catch(() => {});
        }
    }
};