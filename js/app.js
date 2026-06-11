/**
 * MuseSound - YouTube IFrame Edition (V7.5 - Modular Edition)
 * Entry point and orchestrator
 */

import { state } from './modules/state.js';
import { utils } from './modules/utils.js';
import { api } from './modules/api.js';
import { player } from './modules/player.js';
import { ui } from './modules/ui.js';

// Global Namespace for internal references (compatible with current logic)
window.MuseSound = {
    state,
    utils,
    importer: api,
    player,
    ui,
    
    init() {
        console.log("MuseSound V7.5 - Modular (ES6)");
        this.ui.init();
        this.player.init();
        
        if (this.state.currentPlaylist.length > 0) {
            this.ui.renderPlaylist();
            this.ui.checkResumeState();
        }
    },

    showToast(msg) {
        this.utils.showToast(msg);
    }
};

// Start Application
document.addEventListener('DOMContentLoaded', () => window.MuseSound.init());
