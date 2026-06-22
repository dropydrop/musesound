/**
 * MuseSound - YouTube IFrame Edition (V7.5 - Modular Edition)
 * Entry point and orchestrator
 */

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

        const { data: { session } } = await this.supabase.auth.getSession();

        if (session) {
            console.log("Accès Google autorisé.");
            this.state.googleToken = session.provider_token; 
            
            // Gestion auto-rafraîchissement de la session via Supabase
            this.supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'TOKEN_REFRESHED') {
                    console.log("Token rafraîchi avec succès");
                    this.state.googleToken = session.provider_token;
                }
            });
            
            loginBtn.innerHTML = '<span class="material-symbols-outlined mr-2 text-xl">logout</span> Déconnecter';
            loginBtn.classList.add('text-on-surface-variant');
            
            loginBtn.onclick = async () => {
                await this.supabase.auth.signOut();
                window.location.reload();
            };
        } else {
            loginBtn.onclick = async () => {
                const { error } = await this.supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin, 
                        scopes: 'https://www.googleapis.com/auth/youtube.readonly'
                    }
                });
                if (error) this.showToast("Erreur d'initialisation Google");
            };
        }
    },

    showToast(msg) {
        this.utils.showToast(msg);
    }
};

document.addEventListener('DOMContentLoaded', () => window.MuseSound.init());