/**
 * Jam Module — Shared real-time queue via Firebase Realtime Database
 */
import { state } from './state.js';

export let db = null;
export let auth = null;
let jamRef = null;
let jamListener = null;
let currentTrackId = null;

function sanitizeTrack(track) {
  return {
    id: track.id,
    title: track.title || '',
    author: track.author || '',
    thumbnail: track.thumbnail || '',
    duration: track.duration || 0,
    addedBy: jam.userId
  };
}

function generateCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export const jam = {
  userId: null,
  sessionId: null,
  code: null,
  isHost: false,
  _updatingFromFirebase: false,
  _prevIsPlaying: null,
  _lastSentTime: 0,

  init() {
    if (!window.firebase) return;
    const config = window.MuseSound.state.jamFirebaseConfig;
    if (!config) return;

    try {
      let app;
      if (window.firebase.apps.length === 0) {
        app = window.firebase.initializeApp(config);
      } else {
        app = window.firebase.apps[0];
      }
      
      db = window.firebase.database(app);
      auth = window.firebase.auth(app);

      if (!auth.currentUser) {
        auth.signInAnonymously()
          .then(userCredential => {
            this.userId = userCredential.user.uid;
            console.log('Jam: Auth OK', this.userId);
          })
          .catch(err => {
            console.error('Jam: Auth failed', err);
            window.MuseSound.utils.showToast('Erreur d\'authentification Jam');
          });
      } else {
        this.userId = auth.currentUser.uid;
        console.log('Jam: Already authenticated', this.userId);
      }
    } catch (e) {
      console.error('Jam: Firebase init error', e);
    }
  },

  async createJamSession() {
    if (!db || !this.userId) {
      window.MuseSound.utils.showToast('Jam: authentication in progress…');
      return null;
    }

    let code = generateCode();
    let tries = 0;
    while (tries < 10) {
      const snap = await db.ref('jam_sessions')
        .orderByChild('code')
        .equalTo(code)
        .once('value');
      if (!snap.exists()) break;
      code = generateCode();
      tries++;
    }

    const sessionId = db.ref('jam_sessions').push().key;
    const sessionRef = db.ref(`jam_sessions/${sessionId}`);
    const url = `https://musesound.vercel.app/jam?code=${code}`;

    await sessionRef.set({
      code,
      hostId: this.userId,
      createdAt: window.firebase.database.ServerValue.TIMESTAMP,
      currentTrack: null,
      currentTime: 0,
      isPlaying: false,
      queue: []
    });

    this.sessionId = sessionId;
    this.code = code;
    this.isHost = true;
    state.jamSessionId = sessionId;
    state.jamCode = code;
    state.jamIsHost = true;
    state.jamActive = true;

    this._listen(sessionId);
    return { sessionId, code, url };
  },

  async joinJamSession(codeOrSessionId) {
    if (!db || !this.userId) {
      window.MuseSound.utils.showToast('Jam: authentification en cours…');
      return null;
    }

    const input = codeOrSessionId.toString().trim();

    let snapshot = await db.ref('jam_sessions')
      .orderByChild('code')
      .equalTo(input)
      .once('value');

    if (!snapshot.exists()) {
      const direct = await db.ref(`jam_sessions/${input}`).once('value');
      if (direct.exists()) {
        snapshot = direct;
      } else {
        window.MuseSound.utils.showToast('Session introuvable');
        return null;
      }
    }

    let sessionId, data;
    if (snapshot.val && typeof snapshot.val === 'function') {
      const val = snapshot.val();
      const keys = Object.keys(val);
      if (keys.length === 0) {
        window.MuseSound.utils.showToast('Session introuvable');
        return null;
      }
      sessionId = keys[0];
      data = val[keys[0]];
    } else {
      sessionId = input;
      data = snapshot.val();
    }

    this.sessionId = sessionId;
    this.code = data.code;
    this.isHost = data.hostId === this.userId;
    state.jamSessionId = sessionId;
    state.jamCode = data.code;
    state.jamIsHost = this.isHost;
    state.jamActive = true;

    this._listen(sessionId);
    return { sessionId, code: data.code, url: `https://musesound.vercel.app/jam?code=${data.code}`, data };
  },

  leaveJamSession() {
    if (jamListener && jamRef) {
      jamRef.off('value', jamListener);
    }
    jamListener = null;
    jamRef = null;
    currentTrackId = null;
    this.sessionId = null;
    this.code = null;
    this.isHost = false;
    state.jamSessionId = null;
    state.jamCode = null;
    state.jamIsHost = false;
    state.jamActive = false;
    state.jamQueue = [];
    state.jamCurrentTrack = null;
    window.MuseSound.ui.renderJam();
  },

  async addTrackToJam(track) {
    if (!db || !this.sessionId || !this.userId) return;
    const clean = sanitizeTrack(track);
    const ref = db.ref(`jam_sessions/${this.sessionId}/queue`);
    await ref.transaction(current => {
      if (!Array.isArray(current)) return [clean];
      current.push(clean);
      return current;
    });
    window.MuseSound.utils.showToast('Ajouté au Jam');
  },

  async removeTrackFromJam(index) {
    if (!this.isHost) {
      window.MuseSound.utils.showToast('Seul l\'hôte peut supprimer');
      return;
    }
    if (!db || !this.sessionId) return;
    const ref = db.ref(`jam_sessions/${this.sessionId}/queue`);
    await ref.transaction(current => {
      if (!Array.isArray(current) || index >= current.length) return current;
      current.splice(index, 1);
      return current;
    });
  },

  async nextJamTrack() {
    if (!this.isHost) {
      window.MuseSound.utils.showToast('Seul l\'hôte peut passer au suivant');
      return;
    }
    if (!db || !this.sessionId) return;

    const snap = await db.ref(`jam_sessions/${this.sessionId}/queue`).once('value');
    const queue = snap.val() || [];
    if (queue.length === 0) return;

    const nextTrack = queue.shift();

    const updates = {};
    updates[`jam_sessions/${this.sessionId}/queue`] = queue;
    updates[`jam_sessions/${this.sessionId}/currentTrack`] = nextTrack;
    updates[`jam_sessions/${this.sessionId}/currentTime`] = 0;
    updates[`jam_sessions/${this.sessionId}/isPlaying`] = true;

    await db.ref().update(updates);
  },

  updatePlaybackState(isPlaying) {
    if (!db || !this.sessionId || !this.isHost) return;
    db.ref(`jam_sessions/${this.sessionId}/isPlaying`).set(isPlaying);
  },

  updatePlaybackTime(currentTime) {
    if (!db || !this.sessionId || !this.isHost) return;
    // Éviter les écritures trop fréquentes (toutes les 2 secondes max)
    if (Math.abs(currentTime - this._lastSentTime) < 0.5) return;
    this._lastSentTime = currentTime;
    db.ref(`jam_sessions/${this.sessionId}/currentTime`).set(currentTime);
  },

  _listen(sessionId) {
    if (jamListener && jamRef) {
      jamRef.off('value', jamListener);
    }

    jamRef = db.ref(`jam_sessions/${sessionId}`);

    jamListener = jamRef.on('value', snap => {
      const data = snap.val();
      if (!data) return;

      state.jamQueue = data.queue || [];
      state.jamCurrentTrack = data.currentTrack || null;

      const trackChanged = data.currentTrack && data.currentTrack.id !== currentTrackId;
      if (trackChanged && currentTrackId !== null) {
        currentTrackId = data.currentTrack.id;
        const { player } = window.MuseSound;
        const track = {
          id: data.currentTrack.id,
          title: data.currentTrack.title,
          author: data.currentTrack.author,
          thumbnail: data.currentTrack.thumbnail,
          duration: data.currentTrack.duration || 0
        };
        state.playingQueueIndex = -1;
        state.currentIndex = -1;
        player.doPlay(track);
        if (data.isPlaying) {
          setTimeout(() => { if (player.ytPlayer?.playVideo) player.ytPlayer.playVideo(); }, 200);
        }
      }

      if (data.currentTrack === null && currentTrackId !== null) {
        currentTrackId = null;
        const { player } = window.MuseSound;
        if (player.ytPlayer && player.ytActive) {
          player.ytPlayer.pauseVideo();
          player.ytActive = false;
        }
      }

      // Synchronisation play/pause
      const playingChanged = typeof data.isPlaying === 'boolean' && data.isPlaying !== this._prevIsPlaying;
      this._prevIsPlaying = data.isPlaying;

      if (playingChanged && !trackChanged && !this.isHost) {
        const { player } = window.MuseSound;
        if (player.ytPlayer && player.ytActive) {
          this._updatingFromFirebase = true;
          if (data.isPlaying) {
            player.ytPlayer.playVideo();
          } else {
            player.ytPlayer.pauseVideo();
          }
          this._updatingFromFirebase = false;
        }
      }

      // Synchronisation du seek (position)
      if (typeof data.currentTime === 'number' && !this.isHost && !this._updatingFromFirebase) {
        const { player } = window.MuseSound;
        const localTime = player.ytPlayer?.getCurrentTime?.() || 0;
        if (Math.abs(data.currentTime - localTime) > 1) {
          this._updatingFromFirebase = true;
          if (player.ytPlayer && typeof player.ytPlayer.seekTo === 'function') {
            player.ytPlayer.seekTo(data.currentTime, true);
          }
          this._updatingFromFirebase = false;
        }
      }

      window.MuseSound.ui.renderJam();
    });
  },

  generateQRUrl() {
    if (!this.code) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`https://musesound.vercel.app/jam?code=${this.code}`)}`;
  }
};