// Cloudflare Worker — Lizard Run score validator
// Sits between your game and Firebase, validates before writing

const FIREBASE_URL = 'https://tuatara-5767d-default-rtdb.firebaseio.com';
const MAX_SCORE    = 99999;
const MIN_SCORE    = 1;
const RATE_LIMIT_S = 10; // seconds between submissions per user

// In-memory rate limit store (resets on worker restart, good enough)
const lastSubmit = new Map();

export default {
  async fetch(request, env) {
    console.log('[WORKER] request', { method: request.method, url: request.url });

    // ── CORS headers — only allow your game's domain ──────────────
    const origin  = request.headers.get('Origin') || '';
    const allowed = ['http://127.0.0.1:5500', 'http://localhost:5500', 'https://your-game-domain.com'];
    const corsHeaders = {
      'Access-Control-Allow-Origin':  allowed.includes(origin) ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return json({ error: 'POST only' }, 405, corsHeaders);
    }

    // ── Parse body ────────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch (err) {
      console.error('[WORKER] invalid JSON', err);
      return json({ error: 'Invalid JSON' }, 400, corsHeaders);
    }

    const { score, idToken, uid, username } = body;
    console.log('[WORKER] request body', { score, uid, username });

    // ── Validate inputs ───────────────────────────────────────────
    if (!idToken || !uid || !username) {
      console.warn('[WORKER] missing required fields', { score, uid, username });
      return json({ error: 'Missing required fields' }, 400, corsHeaders);
    }
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      return json({ error: 'Invalid score' }, 400, corsHeaders);
    }
    if (score < MIN_SCORE || score > MAX_SCORE) {
      return json({ error: `Score must be between ${MIN_SCORE} and ${MAX_SCORE}` }, 400, corsHeaders);
    }
    if (typeof username !== 'string' || username.length > 20 || !/^[a-zA-Z0-9_\-]+$/.test(username)) {
      return json({ error: 'Invalid username' }, 400, corsHeaders);
    }

    // ── Rate limit ────────────────────────────────────────────────
    const now     = Date.now();
    const lastMs  = lastSubmit.get(uid) || 0;
    if (now - lastMs < RATE_LIMIT_S * 1000) {
      return json({ error: 'Submitting too fast' }, 429, corsHeaders);
    }
    lastSubmit.set(uid, now);

    // ── Verify Firebase ID token ──────────────────────────────────
    // This proves the request is from a real logged-in user
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    const verifyData = await verifyRes.json();

    if (!verifyData.users?.length) {
      console.warn('[WORKER] invalid auth token');
      return json({ error: 'Invalid auth token' }, 401, corsHeaders);
    }

    const tokenUid = verifyData.users[0].localId;
    console.log('[WORKER] auth verified', { tokenUid });
    if (tokenUid !== uid) {
      console.warn('[WORKER] token UID mismatch', { tokenUid, uid });
      return json({ error: 'Token UID mismatch' }, 401, corsHeaders);
    }

    // ── Fetch current best score from Firebase ────────────────────
    const userRes  = await fetch(
      `${FIREBASE_URL}/users/${uid}.json?auth=${env.FIREBASE_SECRET}`,
    );
    const userData = await userRes.json();

    console.log('[WORKER] loaded user data', { uid, userData });
    if (!userData) {
      console.warn('[WORKER] user not found', { uid });
      return json({ error: 'User not found' }, 404, corsHeaders);
    }

    const prevBest = userData.bestScore || 0;
    const isNewBest = score > prevBest;

    // ── Award scales ──────────────────────────────────────────────
    const hoarder     = userData.equipped?.powerup === 'hoarder';
    const earned      = Math.floor(score / 10) * (hoarder ? 2 : 1);
    const newScales   = (userData.scales || 0) + earned;
    const newBest     = isNewBest ? score : prevBest;

    // ── Write to Firebase (server secret — client never sees this) ─
    // Update user record
    console.log('[WORKER] writing user update', { uid, newScales, newBest, lastScoreSubmit: now });
    await fetch(`${FIREBASE_URL}/users/${uid}.json?auth=${env.FIREBASE_SECRET}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scales:          newScales,
        bestScore:       newBest,
        lastScoreSubmit: now,
      }),
    });

    // Update leaderboard only if new personal best
    if (isNewBest) {
      console.log('[WORKER] updating leaderboard', { uid, username, score });
      await fetch(`${FIREBASE_URL}/leaderboard/${uid}.json?auth=${env.FIREBASE_SECRET}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          score,
          ts: now,
        }),
      });
    }

    console.log('[WORKER] submit-score complete', { uid, isNewBest, earned, newScales, newBest });
    return json({
      success:      true,
      isNewBest,
      earnedScales: earned,
      newScales,
      newBest,
    }, 200, corsHeaders);
  }
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}