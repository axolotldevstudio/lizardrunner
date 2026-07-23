// firebase.js — Auth + Realtime DB, scores via Firebase Cloud Function

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getDatabase, ref, get, set, query, orderByChild, limitToLast, update
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const SCORE_FUNCTION_URL = 'https://us-central1-tuatara-5767d.cloudfunctions.net/submitScore';

const firebaseConfig = {
  apiKey: "AIzaSyBL_5kSGqnBCmzCvwljFA8T1dV5ttXUC0c",
  authDomain: "tuatara-5767d.firebaseapp.com",
  databaseURL: "https://tuatara-5767d-default-rtdb.firebaseio.com",
  projectId: "tuatara-5767d",
  storageBucket: "tuatara-5767d.firebasestorage.app",
  messagingSenderId: "431162836563",
  appId: "1:431162836563:web:d8cdec7590c992f22668a6",
  measurementId: "G-YTXVNDH06T"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);

function getBackendBaseUrl() {
  const globalBackend = window.SERVER_CONFIG?.global || window.SERVER_CONFIG?.GLOBAL;
  if (globalBackend) return globalBackend;
  return window.CONFIG?.BACKEND_URL || 'http://localhost:3001';
}

function ownedObjectToSet(obj) {
  return new Set(Object.keys(obj || {}));
}

function ownedSetToObject(set) {
  const obj = {};
  set.forEach(id => obj[id] = true);
  return obj;
}

function normalizePublicUsername(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes('@')) return null;
  return trimmed;
}

async function publishSinglePlayerLeaderboardEntry(score) {
  if (!window.currentUser || !Number.isFinite(Number(score)) || Number(score) <= 0) {
    return null;
  }

  const uid = window.currentUser.uid;
  const nextScore = Number(score);

  try {
    const idToken = await window.fbGetIdToken();
    const backendUrl = getBackendBaseUrl();
    const res = await fetch(`${backendUrl.replace(/\/$/, '')}/score/singleplayer`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: nextScore,
        uid,
        idToken,
        username: window.currentUser.username,
      })
    });

    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      console.warn('[FB] Single-player leaderboard publish returned invalid JSON', { status: res.status, text });
    }

    if (!res.ok) {
      console.error('[FB] Failed to publish single-player leaderboard entry', { status: res.status, body: data });
      return null;
    }

    console.log('[FB] Single-player leaderboard entry published', { uid, score: nextScore, response: data });
    return data;
  } catch (err) {
    console.error('[FB] Failed to publish single-player leaderboard entry', err);
    return null;
  }
}

window.fbSaveUserData = async function(data = {}) {
  console.log('[FB] fbSaveUserData start', { uid: window.currentUser?.uid, data });
  if (!window.currentUser) return null;
  const uid = window.currentUser.uid;
  const payload = {};
  if (data.scales !== undefined) payload.scales = data.scales;
  if (data.bestScore !== undefined) payload.bestScore = data.bestScore;
  if (data.owned !== undefined) payload.owned = Array.isArray(data.owned)
    ? ownedSetToObject(new Set(data.owned))
    : ownedSetToObject(data.owned instanceof Set ? data.owned : new Set(Object.keys(data.owned || {})));
  if (data.equipped !== undefined) payload.equipped = data.equipped;
  if (Object.keys(payload).length === 0) return null;
  await update(ref(db, `users/${uid}`), payload);
  console.log('[FB] fbSaveUserData complete', { uid, payload });
  return payload;
};

window.fbSaveScales = async function(scales) {
  console.log('[FB] fbSaveScales', { scales });
  if (!window.currentUser) return null;
  return window.fbSaveUserData({
    scales,
    bestScore: window.LR?.best,
    owned: [...(window.LR?.owned || [])],
    equipped: window.LR?.equipped,
  });
};

// ── Auth state ────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  console.log('[FB] auth state changed', { uid: user?.uid, loggedIn: !!user });
  if (user) {
    const snap = await get(ref(db, `users/${user.uid}`));
    const data = snap.val() || {};

    const serverOwned = ownedObjectToSet(data.owned || { classic: true, none: true });
    const serverEquipped = data.equipped || { skin: 'classic', trail: 'none', hat: 'none', powerup: 'none' };

    window.currentUser = {
      uid:       user.uid,
      email:     user.email,
      username:  data.username || normalizePublicUsername(user.displayName) || 'Player',
      joinedAt:  data.joinedAt,
      bestScore: data.bestScore || 0,
    };

    if (window.LR) {
      window.LR.scales = Math.max(data.scales ?? window.LR.scales, window.LR.scales);
      window.LR.best = data.bestScore ?? window.LR.best;
      window.LR.owned = new Set([...window.LR.owned, ...serverOwned]);
      window.LR.equipped = { ...window.LR.equipped, ...serverEquipped };
      localStorage.setItem('lizardrun_scales', String(window.LR.scales));
      localStorage.setItem('lizardrun_best',   String(window.LR.best));
      localStorage.setItem('lizardrun_owned',  JSON.stringify([...window.LR.owned]));
      localStorage.setItem('lizardrun_equipped', JSON.stringify(window.LR.equipped));
      document.querySelectorAll('#start-scales, #store-scales').forEach(el => {
        el.textContent = window.LR.scales;
      });
      console.log('[FB] synced user data from server', {
        uid: window.currentUser.uid,
        scales: window.LR.scales,
        best: window.LR.best,
        owned: [...window.LR.owned],
        equipped: window.LR.equipped,
      });
      window.fbSaveUserData({
        scales: window.LR.scales,
        bestScore: window.LR.best,
        owned: [...window.LR.owned],
        equipped: window.LR.equipped,
      }).catch(err => console.error('[FB] fbSaveUserData failed', err));
    }

    updateAuthUI(true);

    if (window.multiplayer && typeof window.multiplayer.isConnected === 'function' && window.multiplayer.isConnected()) {
      console.log('[FB] user logged in, reconnecting multiplayer socket with auth');
      window.multiplayer.connect();
    }
  } else {
    console.log('[FB] user logged out');
    window.currentUser = null;
    updateAuthUI(false);
  }
});

function updateAuthUI(loggedIn) {
  document.querySelectorAll('.auth-logged-in').forEach(el =>
    el.classList.toggle('hidden', !loggedIn));
  document.querySelectorAll('.auth-logged-out').forEach(el =>
    el.classList.toggle('hidden', loggedIn));
  if (loggedIn && window.currentUser) {
    document.querySelectorAll('.auth-username').forEach(el =>
      el.textContent = window.currentUser.username);
  }
}

// ── Register ──────────────────────────────────────────────────────
window.fbRegister = async function(email, password, username) {
  const clean = username.trim().replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 20);
  console.log('[FB] fbRegister start', { email, username: clean });
  if (clean.length < 2) throw new Error('Username must be at least 2 characters');

  const taken = await get(ref(db, `usernames/${clean.toLowerCase()}`));
  if (taken.exists()) throw new Error('Username already taken — pick another');

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  const uid  = user.uid;

  await updateProfile(user, {
    displayName: clean,
  });

  await set(ref(db, `users/${uid}`), {
    username:  clean,
    email,
    joinedAt:  Date.now(),
    bestScore: 0,
    scales:    0,
    owned:     { classic: true, none: true },
   equipped:  { skin: 'classic', trail: 'none', hat: 'classic', powerup: 'none' },
    timezone:  Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
  });
  await set(ref(db, `usernames/${clean.toLowerCase()}`), uid);
  console.log('[FB] fbRegister success', { uid, username: clean });
};

// ── Login ─────────────────────────────────────────────────────────
window.fbLogin = async function(email, password) {
  console.log('[FB] fbLogin attempt', { email });
  const result = await signInWithEmailAndPassword(auth, email, password);
  console.log('[FB] fbLogin success', { uid: result.user.uid, email: result.user.email });
  return result;
};

// ── Logout ────────────────────────────────────────────────────────
window.fbLogout = async function() {
  console.log('[FB] fbLogout attempt');
  await signOut(auth);
  console.log('[FB] fbLogout success');
};

window.fbGetIdToken = async function() {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken(true);
};

// ── Submit score via Firebase Cloud Function (secure) ───────
window.fbSubmitScore = async function(score) {
  console.log('[FB] fbSubmitScore', { score });
  if (!window.currentUser || score <= 0) return null;

  const previousBest = Number(window.currentUser?.bestScore || 0);
  const scoreValue = Number(score);

  try {
    // Fresh ID token proves this is a real logged-in user
    const idToken = await auth.currentUser.getIdToken(true);
    console.log('[FB] Score submit request', { url: SCORE_FUNCTION_URL, method: 'POST', uid: window.currentUser.uid, score });

    const res = await fetch(SCORE_FUNCTION_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score,
        idToken,
        uid:      window.currentUser.uid,
        username: window.currentUser.username,
      }),
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      console.error('[FB] Score submit invalid JSON response', { status: res.status, text });
      return null;
    }

    if (!res.ok) {
      console.error('[FB] Score rejected', { status: res.status, body: data });
      return null;
    }

    const newBest = Number(data.newBest || 0);
    const isNewBest = newBest > previousBest && scoreValue >= newBest;
    console.log('[FB] Score submit success', {
      uid: window.currentUser.uid,
      newScales: data.newScales,
      newBest,
      earnedScales: data.earnedScales,
      previousBest,
      isNewBest
    });

    // Update local state from server response
    window.LR.scales = data.newScales;
    window.LR.best   = newBest;
    localStorage.setItem('lizardrun_scales', String(data.newScales));
    localStorage.setItem('lizardrun_best',   String(newBest));
    document.querySelectorAll('#start-scales, #store-scales').forEach(el => {
      el.textContent = data.newScales;
    });

    if (isNewBest) {
      await publishSinglePlayerLeaderboardEntry(scoreValue);
    }

    window.currentUser.bestScore = newBest;

    return data;
  } catch (e) {
    console.error('[FB] Score submit failed', e.message);
    return null;
  }
};

// ── Fetch leaderboard ─────────────────────────────────────────────
window.fbFetchTopScores = async function(limit = 10) {
  try {
    const q    = query(ref(db, 'leaderboard'), orderByChild('score'), limitToLast(limit));
    const snap = await get(q);
    if (!snap.exists()) return [];
    return Object.values(snap.val())
      .map(e => ({
        username: e.username || 'Player',
        score: Number(e.score) || 0
      }))
      .sort((a, b) => b.score - a.score);
  } catch (fallbackErr) {
    console.error('[FB] Single-player leaderboard fetch failed:', fallbackErr);
    return [];
  }
};

window.fbFetchMultiplayerLeaderboard = async function(limit = 10) {
  const backendUrl = getBackendBaseUrl();
  const res = await fetch(`${backendUrl.replace(/\/$/, '')}/leaderboard/multiplayer?limit=${limit}`, {
    method: 'GET',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const rows = await res.json();
  return Array.isArray(rows) ? rows.slice(0, limit) : [];
};