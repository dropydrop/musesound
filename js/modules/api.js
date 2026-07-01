/**
 * YouTube API / Importer Module
 */
import { CONFIG } from './config.js';
import { state } from './state.js';
import { utils } from './utils.js';

export const api = {
    async processInput(input, forceSearch = false) {
        const { ui, player } = window.MuseSound;
        const cleanInput = input.trim();
        if (!cleanInput) return;

        const normalizedInput = cleanInput.replace("music.youtube.com", "www.youtube.com");
        ui.setLoading(true);
        
        try {
            let success = false;
            
            if (!forceSearch && normalizedInput.includes("list=")) {
                const urlObj = new URL(normalizedInput.includes('http') ? normalizedInput : `https://${normalizedInput}`);
                const playlistId = urlObj.searchParams.get("list");
                if (playlistId) {
                    state.queue = [];
                    success = await this.fetchPlaylist(playlistId, false);
                    if (success) {
                        state.uiMode = 'queue';
                        player.playQueueTrack(0);
                    }
                }
            } 
            
            if (!success && !forceSearch && (normalizedInput.includes("youtube.com") || normalizedInput.includes("youtu.be"))) {
                const videoIdRegex = /(?:v=|\/v\/|embed\/|shorts\/|youtu\.be\/|\/watch\?v=)([^#&?]{11})/;
                const match = normalizedInput.match(videoIdRegex);
                if (match && match[1]) {
                    const track = await this.getTrackInfo(match[1]);
                    if (track) {
                        const insertPos = state.playingQueueIndex >= 0 ? state.playingQueueIndex + 1 : 0;
                        state.queue.splice(insertPos, 0, track);
                        state.uiMode = 'queue';
                        player.playQueueTrack(insertPos);
                        success = true;
                    }
                }
            }

            if (!success) {
                if (state.searchTab === 'tracks') {
                    success = await this.searchTracks(cleanInput);
                    state.uiMode = 'playlist';
                } else {
                    success = await this.searchPlaylists(cleanInput);
                    state.uiMode = 'playlists';
                }
            }
        } catch (error) { console.error("Importer Error:", error); }
        ui.setLoading(false);
        ui.syncTabs();
    },

    async getTrackInfo(videoId) {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${CONFIG.YOUTUBE_API_KEY}`;
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

    async searchTracks(query, isMore = false) {
        const { ui, player } = window.MuseSound;

        // Spécification 1 : !yt → globale, sinon musique uniquement
        let cleanQuery = isMore ? state.lastSearchQuery : query.trim();
        if (!cleanQuery) return false;
        let categoryParam = '&videoCategoryId=10';
        if (cleanQuery.startsWith('!yt')) {
            categoryParam = '';
            cleanQuery = cleanQuery.replace('!yt', '').trim();
            if (!cleanQuery) return false;
        }

        if (!isMore) {
            state.lastSearchQuery = cleanQuery;
            state.nextPageTokenTracks = null;
        } else if (!state.nextPageTokenTracks) return false;

        const tokenParam = state.nextPageTokenTracks ? `&pageToken=${state.nextPageTokenTracks}` : "";
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&type=video${categoryParam}&q=${encodeURIComponent(cleanQuery)}${tokenParam}&key=${CONFIG.YOUTUBE_API_KEY}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (!data.items?.length) return false;

            state.nextPageTokenTracks = data.nextPageToken || null;

            const tracks = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                author: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                duration: 0,
                views: 0
            }));

            const enrichedTracks = await this.enrichTracksData(tracks);

            if (isMore) {
                state.currentPlaylist = [...state.currentPlaylist, ...enrichedTracks];
            } else {
                state.currentPlaylist = enrichedTracks;
                localStorage.setItem('MS_CURRENT_PLAYLIST', JSON.stringify(enrichedTracks));

                if (state.queue.length === 0) {
                    state.queue = [...enrichedTracks];
                    localStorage.setItem('MS_QUEUE', JSON.stringify(state.queue));
                    if (!player.ytActive) player.playQueueTrack(0);
                }
            }

            ui.renderPlaylist();
            return true;
        } catch (e) {
            console.error("Search Tracks Error:", e);
            return false;
        }
    },

    async searchPlaylists(query, isMore = false) {
        const { ui } = window.MuseSound;
        if (!isMore) {
            state.lastSearchQuery = query;
            state.nextPageTokenPlaylists = null;
        } else if (!state.nextPageTokenPlaylists) return false;

        const tokenParam = state.nextPageTokenPlaylists ? `&pageToken=${state.nextPageTokenPlaylists}` : "";
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&type=playlist&q=${encodeURIComponent(query)}${tokenParam}&key=${CONFIG.YOUTUBE_API_KEY}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (!data.items?.length) return false;

            state.nextPageTokenPlaylists = data.nextPageToken || null;

            const newPlaylists = data.items.map(item => ({
                id: item.id.playlistId,
                title: item.snippet.title,
                author: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url
            }));

            if (isMore) {
                state.foundPlaylists = [...state.foundPlaylists, ...newPlaylists];
            } else {
                state.foundPlaylists = newPlaylists;
            }

            ui.renderPlaylistsResults();
            return true;
        } catch (e) {
            console.error("Search Playlists Error:", e);
            return false;
        }
    },

    async fetchMore() {
        const { ui } = window.MuseSound;
        if (state.isFetchingMore || !state.lastSearchQuery) return;

        const mode = state.uiMode;
        if (mode !== 'playlist' && mode !== 'playlists') return;

        state.isFetchingMore = true;
        
        if (mode === 'playlist') ui.renderPlaylist();
        else ui.renderPlaylistsResults();

        if (mode === 'playlist') {
            await this.searchTracks(state.lastSearchQuery, true);
        } else {
            await this.searchPlaylists(state.lastSearchQuery, true);
        }

        state.isFetchingMore = false;
    },

        async fetchPlaylist(playlistId, isQuiet = false) {
        const { ui, player } = window.MuseSound;
        // Pour les playlists privées, il faut utiliser l'autorisation OAuth
        const token = state.googleToken;
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${CONFIG.YOUTUBE_API_KEY}`;
        
        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Augmentation de la limite : récupérer jusqu'à 500 morceaux si possible (via pagination)
        let allTracks = [];
        let nextPageToken = "";
        
        while (allTracks.length < 500) {
            const pageUrl = `${url}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;
            const response = await fetch(pageUrl, { headers });
            
            // Token expiré → tentative de refresh puis retry de la page courante
            if (response.status === 401 && token) {
                const newToken = await window.MuseSound.refreshGoogleToken();
                if (newToken) {
                    headers['Authorization'] = `Bearer ${newToken}`;
                    const retry = await fetch(pageUrl, { headers });
                    if (!retry.ok) throw new Error("Session expirée, veuillez vous reconnecter.");
                    const data = await retry.json();
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
                    if (!nextPageToken || allTracks.length >= 500) break;
                    continue;
                }
                throw new Error("Session expirée, veuillez vous reconnecter.");
            }
            
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
            if (!nextPageToken || allTracks.length >= 500) break;
        }

        const enriched = await this.enrichTracksData(allTracks.slice(0, 500));
        
        if (isQuiet) {
            state.queue = [...state.queue, ...enriched].slice(0, 500);
        } else {
            state.queue = enriched.slice(0, 500);
            state.uiMode = 'queue';
            ui.syncTabs();
            utils.showToast(`${enriched.length} titres chargés`);
            player.playQueueTrack(0);
        }
        
        localStorage.setItem('MS_QUEUE', JSON.stringify(state.queue));
        ui.renderQueue();
        return true;
    },

    async fetchRadio(track) {
        const { ui, player } = window.MuseSound;
        ui.setLoading(true);
        utils.showToast(`Génération de la radio : ${track.author}`);
        
        const query = `"${track.author} mix"`;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&type=playlist&q=${encodeURIComponent(query)}&key=${CONFIG.YOUTUBE_API_KEY}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.items?.length > 0) {
                state.queue = [];
                await this.fetchPlaylist(data.items[0].id.playlistId, true);
                if (state.queue.length < 20 && data.items[1]) {
                    await this.fetchPlaylist(data.items[1].id.playlistId, true);
                }
                state.uiMode = 'queue';
                ui.syncTabs();
                player.playQueueTrack(0);
            } else {
                utils.showToast("Radio indisponible pour cet artiste.");
            }
        } catch (e) { console.error("Radio Error:", e); }
        ui.setLoading(false);
    },

    async enrichTracksData(tracks) {
        if (!tracks.length) return tracks;
        const ids = tracks.map(t => t.id).join(',');
        const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${ids}&key=${CONFIG.YOUTUBE_API_KEY}`;
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
};
