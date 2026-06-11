/**
 * UI Manager Module
 */
import { state } from './state.js';
import { utils } from './utils.js';

export const ui = {
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
        document.getElementById('tab-queue')?.addEventListener('click', () => { state.uiMode = 'queue'; this.syncTabs(); });

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
            utils.showToast(state.ecoMode ? "Mode Éco (144p)" : "Mode HD (720p)");
        });

        document.getElementById('fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && state.isCinemaMode) this.toggleFullscreen(true);
        });

        const volSlider = document.getElementById('volume-slider');
        if (volSlider) {
            volSlider.value = state.volume;
            volSlider.addEventListener('input', (e) => player.setVolume(parseInt(e.target.value)));
        }
        document.getElementById('volume-icon')?.addEventListener('click', () => player.setVolume(state.volume > 0 ? 0 : 100));

        const trackContainer = document.getElementById('playlist-container');
        const plContainer = document.getElementById('playlists-results') || this.createPlaylistsResultsContainer();
        trackContainer?.addEventListener('scroll', () => this.handleScroll(trackContainer));
        plContainer?.addEventListener('scroll', () => this.handleScroll(plContainer));

        this.updateShuffleRepeatUI();
        this.updateVolumeUI();
        this.updateEcoUI();
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
        const script = document.createElement('script');
        script.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}&callback=MuseSound.ui.handleSuggestions`;
        document.body.appendChild(script);
    },

    handleSuggestions(data) {
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
        const m = state.uiMode;
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
                </div>
            </div>
        `).join('');

        if (state.isFetchingMore) html += `<div class="flex justify-center p-6"><span class="animate-spin material-symbols-outlined text-primary">sync</span></div>`;
        container.innerHTML = html;
    },

    renderPlaylistsResults() {
        const { importer } = window.MuseSound;
        const container = document.getElementById('playlists-results') || this.createPlaylistsResultsContainer();
        if (!container) return;
        if (state.foundPlaylists.length === 0) {
            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-50"><span class="material-symbols-outlined text-6xl mb-4">featured_play_list</span><p>Aucune playlist trouvée.</p></div>`;
            return;
        }
        let html = state.foundPlaylists.map(pl => `
            <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container-high cursor-pointer" onclick="MuseSound.importer.fetchPlaylist('${pl.id}')">
                <div class="relative">
                    <img src="${pl.thumbnail}" class="w-16 h-16 rounded object-cover shadow-lg">
                    <div class="absolute inset-0 bg-black/40 flex items-center justify-center"><span class="material-symbols-outlined text-white">playlist_play</span></div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-bold truncate">${utils.escapeHtml(pl.title)}</div>
                    <div class="text-xs text-primary">${utils.escapeHtml(pl.author)}</div>
                </div>
            </div>
        `).join('');
        if (state.isFetchingMore) html += `<div class="flex justify-center p-6"><span class="animate-spin material-symbols-outlined text-primary">sync</span></div>`;
        container.innerHTML = html;
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
                <div class="flex items-center">
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
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        if (e.target.closest('button')) return;
        state.draggedIndex = index;
        state.draggedType = type;
        state.startY = e.clientY;
        state.dragTimer = setTimeout(() => {
            e.currentTarget.classList.add('scale-105', 'shadow-2xl', 'z-50', 'bg-surface-container-highest', 'rotate-1');
            document.body.style.cursor = 'grabbing';
            utils.showToast("Déplacement activé");
        }, 500);
    },

    handlePointerMove(e) {
        if (state.dragTimer && !document.body.style.cursor) {
            if (Math.abs(e.clientY - state.startY) > 10) { clearTimeout(state.dragTimer); state.dragTimer = null; }
        }
    },

    handlePointerUp(e, toIndex, type) {
        clearTimeout(state.dragTimer); state.dragTimer = null;
        const fromIndex = state.draggedIndex;
        const fromType = state.draggedType;
        document.body.style.cursor = '';
        if (fromIndex !== -1 && fromIndex !== toIndex && fromType === type) {
            const list = type === 'playlist' ? state.currentPlaylist : state.queue;
            const [movedItem] = list.splice(fromIndex, 1);
            list.splice(toIndex, 0, movedItem);
            if (type === 'playlist') {
                if (state.currentIndex === fromIndex) state.currentIndex = toIndex;
                else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) state.currentIndex--;
                else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) state.currentIndex++;
                localStorage.setItem('MS_CURRENT_PLAYLIST', JSON.stringify(list));
                this.renderPlaylist();
            } else {
                if (state.playingQueueIndex === fromIndex) state.playingQueueIndex = toIndex;
                else if (fromIndex < state.playingQueueIndex && toIndex >= state.playingQueueIndex) state.playingQueueIndex--;
                else if (fromIndex > state.playingQueueIndex && toIndex <= state.playingQueueIndex) state.playingQueueIndex++;
                localStorage.setItem('MS_QUEUE', JSON.stringify(list));
                this.renderQueue();
            }
        }
        state.draggedIndex = -1; state.draggedType = null;
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
