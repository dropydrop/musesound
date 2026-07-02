/**
 * MuseSound - YouTube IFrame Edition (V7.5 - Modular Edition)
 * Entry point and orchestrator
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('Service Worker de MuseSound enregistré avec succès.'))
      .catch(err => console.error('Échec de l\'enregistrement du SW:', err));
  });
}

import { state } from './modules/state.js';
import { utils } from './modules/utils.js';
import { api } from './modules/api.js';
import { player } from './modules/player.js';
import { ui } from './modules/ui.js';
import { jam } from './modules/jam.js';

const SUPABASE_URL = 'https://jothxhslawjggrcbcdhq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdGh4aHNsYXdqZ2dyY2JjZGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjUzMjIsImV4cCI6MjA4NTY0MTMyMn0.FuPqkPmTSM3Wr_skgVZmbzHrXZ77GIaMSEFVHPHoGbY';

window.MuseSound = {
    state,
    utils,
    importer: api,
    player,
    ui,
    jam,
    supabase: null,
    
    async init() {
        console.log("MuseSound V7.5 - Modular (ES6)");
        
        // Initialisation sécurisée du client Supabase
        if (window.supabase) {
            this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
            console.error("Le CDN Supabase n'a pas pu être chargé à temps.");
        }

        // ⚠️ Remplacez ces valeurs par votre configuration Firebase
        state.jamFirebaseConfig = {
            apiKey: 'AIzaSyChbZxLKNZCOpVYe-HbJLiRYOLPII6uF0g',
            authDomain: 'musesound-jam.firebaseapp.com',
            databaseURL: 'https://musesound-jam-default-rtdb.europe-west1.firebasedatabase.app',
            projectId: 'musesound-jam'
        };

        this.ui.init();
        this.player.init();
        this.state.initVolume();
        this.jam.init();
        
        if (this.supabase) {
            this.handleAuthErrors();
            await this.setupAuth();
        }
        
        if (this.state.currentPlaylist.length > 0) {
            this.ui.renderPlaylist();
            this.ui.checkResumeState();
        }

        // Détection d'une invitation Jam via paramètre d'URL — auto-join
        const urlParams = new URLSearchParams(window.location.search);
        const jamCode = urlParams.get('code');
        if (jamCode) {
            setTimeout(async () => {
                document.getElementById('tab-jam')?.click();
                const result = await this.jam.joinJamSession(jamCode);
                if (result) this.ui.renderJam();
            }, 1500);
        }
    },

    handleAuthErrors() {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const error = hashParams.get('error') || queryParams.get('error');
        const errorDesc = hashParams.get('error_description') || queryParams.get('error_description');
        
        if (error) {
            this.showToast(`Auth refusée : ${decodeURIComponent(errorDesc || error)}`);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    },

    async setupAuth() {
        const loginBtn = document.getElementById('btn-login');
        if (!loginBtn || !this.supabase) return;

        loginBtn.classList.remove('hidden');

        // Restaure le provider_token depuis localStorage si Supabase ne le renvoie pas
        const { data: { session } } = await this.supabase.auth.getSession();

        if (session) {
            console.log("Accès Google autorisé.");
            this.state.googleToken = session.provider_token || localStorage.getItem('MS_GOOGLE_TOKEN');
            if (session.provider_token) localStorage.setItem('MS_GOOGLE_TOKEN', session.provider_token);
            await this._switchToLibrary();
        } else {
            // Pas de session Supabase mais un token stocké → on tente un refresh
            const savedToken = localStorage.getItem('MS_GOOGLE_TOKEN');
            if (savedToken) {
                this.state.googleToken = savedToken;
                const refreshed = await this.refreshGoogleToken();
                if (refreshed) await this._switchToLibrary();
            }
        }

        // Écoute les événements d'auth — couvre le retour OAuth et les changements d'état
        this.supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session) {
                    console.log(`Auth event: ${event}`);
                    this.state.googleToken = session.provider_token || localStorage.getItem('MS_GOOGLE_TOKEN');
                    if (session.provider_token) localStorage.setItem('MS_GOOGLE_TOKEN', session.provider_token);
                    await this._switchToLibrary();
                }
            }
        });

        if (session) {
            loginBtn.innerHTML = '<span class="material-symbols-outlined mr-2 text-xl">logout</span> Déconnecter';
            loginBtn.classList.add('text-on-surface-variant');
            
            loginBtn.onclick = async () => {
                localStorage.removeItem('MS_GOOGLE_TOKEN');
                await this.supabase.auth.signOut();
                window.location.reload();
            };
        } else {
            loginBtn.onclick = async () => {
                localStorage.removeItem('MS_GOOGLE_TOKEN');
                const { error } = await this.supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin, 
                        scopes: 'https://www.googleapis.com/auth/youtube.readonly',
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent'
                        }
                    }
                });
                if (error) this.showToast("Erreur d'initialisation Google");
            };
        }
    },

    async refreshGoogleToken() {
        if (!this.supabase) return null;
        try {
            const { data, error } = await this.supabase.auth.refreshSession();
            if (error) throw error;
            if (data.session?.provider_token) {
                this.state.googleToken = data.session.provider_token;
                localStorage.setItem('MS_GOOGLE_TOKEN', data.session.provider_token);
                return data.session.provider_token;
            }
        } catch (e) {
            console.error("Refresh Google token failed:", e);
            if (e.message && !e.message.includes("fetch")) {
                this.state.googleToken = null;
                localStorage.removeItem('MS_GOOGLE_TOKEN');
            }
            return null;
        }
    },

    async _switchToLibrary() {
        if (this.ui && typeof this.ui.syncTabs === 'function') {
            this.state.uiMode = 'library';
            this.ui.syncTabs();
            if (!this.state.libraryFetched) {
                try {
                    const module = await import('./modules/youtube-private.js');
                    const data = await module.fetchMyPlaylists();
                    this.state.foundLibrary = data;
                    this.state.libraryFetched = true;
                    this.ui.renderLibrary();
                } catch (err) {
                    console.error("Erreur chargement bibliothèque:", err);
                }
            }
        }
    },

    showToast(msg) {
        this.utils.showToast(msg);
    }
};

document.addEventListener('DOMContentLoaded', () => window.MuseSound.init());