require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { initFirebase, getAdmin, getRtdb, isFirebaseReady } = require('./firebase');
const Player = require('./player');
const Match = require('./game');
const Matchmaking = require('./matchmaking');
const { PLAYER_RECONNECT_MS, MAX_LOBBY_PLAYERS, LOBBY_COUNTDOWN_MS, MIN_PLAYERS_TO_START, MAX_PLAYERS_PER_MATCH } = require('./constants');
const { fetchMultiplayerLeaderboard } = require('./stats');
const { applyRankedMatchResult } = require('./elo');
const os = require('os');

function createServerInstance(port = process.env.PORT || 3001) {
  const app = express();
  app.use(express.json());
  const httpServer = http.createServer(app);
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ||
    'https://lizardrunnerdev.pages.dev,https://9d8354d9.lizardrunnerdev.pages.dev,http://127.0.0.1:3000,http://localhost:3000,http://localhost:5500'
  )
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        return new URL(origin).origin;
      } catch (error) {
        return `https://${origin}`;
      }
    });

  const isAllowedOrigin = (origin) => {
    if (!origin || origin === 'null') {
      return true;
    }

    if (origin.startsWith('file://')) {
      return true;
    }

    try {
      const candidateUrl = new URL(origin);
      const candidateHost = candidateUrl.hostname;

      if (candidateHost.endsWith('.pages.dev') || candidateHost === 'pages.dev') {
        return true;
      }

      if (allowedOrigins.includes(origin)) {
        return true;
      }

      return allowedOrigins.some((allowed) => {
        try {
          const allowedUrl = new URL(allowed);
          const sameProtocol = allowedUrl.protocol === candidateUrl.protocol;
          const sameHost = allowedUrl.hostname === candidateHost;
          const localHostMatch =
            ['localhost', '127.0.0.1', '::1'].includes(allowedUrl.hostname) &&
            ['localhost', '127.0.0.1', '::1'].includes(candidateHost);

          return sameProtocol && (sameHost || localHostMatch);
        } catch (error) {
          return false;
        }
      });
    } catch (error) {
      return false;
    }
  };

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        console.log('[CORS] Request from:', origin);

        if (isAllowedOrigin(origin)) {
          console.log('[CORS] Allowed:', origin);
          callback(null, true);
        } else {
          console.error('[CORS] Blocked:', origin);
          callback(new Error(`CORS origin not allowed: ${origin}`));
        }
      },
      methods: ['GET', 'POST']
    }
  });

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  initFirebase();

  // Log matchmaking config for easier debugging
  console.log('[SERVER] Matchmaking config:', {
    MIN_PLAYERS_TO_START: Number(process.env.MIN_PLAYERS_TO_START) || MIN_PLAYERS_TO_START,
    MAX_PLAYERS_PER_MATCH: Number(process.env.MAX_PLAYERS_PER_MATCH) || MAX_LOBBY_PLAYERS,
    LOBBY_COUNTDOWN_MS: Number(process.env.MATCHMAKING_TIMEOUT_MS) || LOBBY_COUNTDOWN_MS
  });

  const playersByFirebaseUid = new Map();
  const matches = new Map();
  const timers = new Set();

  function removePlayerMappings(player) {
    playersByFirebaseUid.delete(player.firebaseUid);
  }

  function trackTimer(timer) {
    timers.add(timer);
    return timer;
  }

  async function getPlayer(socket) {
    let auth = socket.handshake.auth || {};
    if (typeof auth === 'string') {
      try {
        auth = JSON.parse(auth);
      } catch (err) {
        auth = {};
      }
    }
    const idToken = typeof auth.idToken === 'string' ? auth.idToken : null;
    let firebaseUid = null;
    const adminClient = getAdmin();

    if (idToken) {
      if (process.env.NODE_ENV === 'test') {
        try {
          const decoded = JSON.parse(Buffer.from(idToken, 'base64').toString('utf8'));
          firebaseUid = decoded.uid;
        } catch (error) {
          console.warn('Failed to decode test token:', error.message);
        }
      } else if (adminClient) {
        try {
          const decoded = await adminClient.auth().verifyIdToken(idToken);
          firebaseUid = decoded.uid;
        } catch (error) {
          console.warn('Invalid Firebase ID token for socket connection:', error.message);
        }
      }
    }

    if (!firebaseUid) {
      firebaseUid = socket.id;
    }

    // Resolve a display name for the player (RTDB username -> Firebase displayName -> fallback 'Player')
    let displayName = null;
    try {
      const rtdb = getRtdb();
      if (rtdb) {
        const snap = await rtdb.ref(`users/${firebaseUid}/username`).once('value');
        displayName = snap.val() || null;
      }
    } catch (err) {
      console.warn('Failed to fetch username from RTDB:', err && err.message ? err.message : String(err));
    }

    if (!displayName && adminClient && adminClient.auth) {
      try {
        const userRecord = await adminClient.auth().getUser(firebaseUid);
        displayName = userRecord.displayName || null;
      } catch (err) {
        // ignore
      }
    }

    if (!displayName) displayName = 'Player';

    let player = playersByFirebaseUid.get(firebaseUid);
    if (!player) {
      player = new Player(firebaseUid, socket, displayName);
      playersByFirebaseUid.set(firebaseUid, player);
    } else {
      player.displayName = displayName || player.displayName || 'Player';
      player.attachSocket(socket);
    }

    if (player.match) {
      socket.join(player.match.id);
      player.match.sendStateToPlayer(player);
    }

    return player;
  }

  function getLobbyPayload(player) {
    const lobby = player.lobby;
    return {
      lobbyId: lobby?.id || null,
      status: lobby?.status || 'idle',
      players: lobby?.players.map((p) => ({ id: p.id })) || [],
      count: lobby?.players.length || 0,
      maxPlayers: MAX_LOBBY_PLAYERS,
      countdownMs: lobby?.countdownStart ? Math.max(0, (lobby.countdown || LOBBY_COUNTDOWN_MS) - (Date.now() - lobby.countdownStart)) : 0
    };
  }

  const matchmaking = new Matchmaking(io, (lobby, lobbyPlayers) => {
    const match = new Match(io, lobbyPlayers, (finishedMatch) => {
      matches.delete(finishedMatch.id);
    }, { mode: lobby.mode || 'casual' });
    matches.set(match.id, match);
    lobbyPlayers.forEach((player) => {
      player.match = match;
    });
    match.start();
  });

  app.get('/', (req, res) => {
    res.send('Lizard Run PvP server is running.');
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  app.get('/status', (req, res) => {
    const health = {
      players: playersByFirebaseUid.size,
      matches: matches.size,
      uptime: `${process.uptime().toFixed(1)}s`,
      memory: process.memoryUsage(),
      cpu: os.platform() === 'win32' ? 'unsupported' : os.loadavg(),
      timestamp: Date.now()
    };
    res.json(health);
  });

  app.get('/leaderboard/multiplayer', async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(Number(req.query.limit || 10), 20));
      const rows = await fetchMultiplayerLeaderboard(limit);
      res.json(rows);
    } catch (err) {
      console.error('[SERVER] Failed to serve multiplayer leaderboard:', err);
      res.status(500).json({ error: 'Failed to load multiplayer leaderboard' });
    }
  });

  app.get('/leaderboard/singleplayer', async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(Number(req.query.limit || 10), 20));
      const adminClient = getAdmin();
      const rtdb = getRtdb();

      if (!adminClient || !rtdb) {
        return res.status(503).json({ error: 'Firebase services unavailable' });
      }

      const snap = await rtdb.ref('leaderboard').orderByChild('score').limitToLast(limit).once('value');
      if (!snap.exists()) {
        return res.json([]);
      }

      const rows = Object.values(snap.val())
        .map((entry) => ({
          username: entry.username || entry.displayName || 'Player',
          score: Number(entry.score) || 0,
          uid: entry.uid || null,
          updatedAt: entry.updatedAt || null,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      res.json(rows);
    } catch (err) {
      console.error('[SERVER] Failed to serve single-player leaderboard:', err);
      res.status(500).json({ error: 'Failed to load single-player leaderboard' });
    }
  });

  app.post('/score/singleplayer', async (req, res) => {
    try {
      const { score, idToken, uid, username } = req.body || {};
      const scoreValue = Number(score);
      const adminClient = getAdmin();
      const rtdb = getRtdb();

      if (!adminClient || !rtdb) {
        return res.status(503).json({ error: 'Firebase services unavailable' });
      }

      if (!idToken || !uid || !Number.isFinite(scoreValue) || scoreValue <= 0) {
        return res.status(400).json({ error: 'Missing scoring payload' });
      }

      const decoded = await adminClient.auth().verifyIdToken(idToken);
      const verifiedUid = decoded.uid;

      if (!verifiedUid || verifiedUid !== uid) {
        return res.status(401).json({ error: 'Unauthorized score submission' });
      }

      const userSnap = await rtdb.ref(`users/${verifiedUid}/username`).once('value');
      const displayName = userSnap.val() || username || decoded.name || 'Player';
      const leaderboardRef = rtdb.ref(`leaderboard/${verifiedUid}`);
      const existingSnap = await leaderboardRef.once('value');
      const existing = existingSnap.val() || {};
      const existingScore = Number(existing.score) || 0;

      if (existingScore >= scoreValue) {
        return res.json({
          updated: false,
          uid: verifiedUid,
          score: existingScore,
          username: existing.username || displayName,
        });
      }

      await leaderboardRef.set({
        uid: verifiedUid,
        username: displayName,
        score: scoreValue,
        updatedAt: Date.now(),
      });

      res.json({
        updated: true,
        uid: verifiedUid,
        username: displayName,
        score: scoreValue,
      });
    } catch (err) {
      console.error('[SERVER] Failed to save single-player leaderboard entry:', err);
      res.status(401).json({ error: 'Failed to save leaderboard entry' });
    }
  });

  io.on('connection', async (socket) => {
    const player = await getPlayer(socket);
    console.log('connected:', player.id, 'firebaseUid=', player.firebaseUid, 'socketId=', player.socketId);

    socket.emit('connected', { playerId: player.id, firebaseUid: player.firebaseUid, socketId: player.socketId, username: player.displayName });
    socket.emit('lobby_update', getLobbyPayload(player));

    socket.on('find_match', (payload = {}) => {
      const mode = payload?.mode === 'ranked' ? 'ranked' : 'casual';
      player.preferredMatchMode = mode;
      matchmaking.joinQueue(player, mode);
      if (player.lobby) {
        socket.emit('lobby_update', getLobbyPayload(player));
        if (['waiting', 'starting'].includes(player.lobby.status)) {
          socket.emit('waiting');
        }
      }
    });

    socket.on('ping', (payload) => {
      socket.emit('pong', payload);
    });

    socket.on('cancel_find', () => {
      matchmaking.leaveQueue(player);
    });

    socket.on('get_ranked_profile', async () => {
      try {
        const rtdb = getRtdb();
        if (!rtdb) {
          socket.emit('ranked_profile', { available: false });
          return;
        }
        const snap = await rtdb.ref(`users/${player.firebaseUid}`).once('value');
        const profile = snap.val() || {};
        socket.emit('ranked_profile', {
          available: true,
          elo: Number(profile.elo || 1000),
          rank: profile.rank || 'Bronze',
          rankedWins: Number(profile.rankedWins || 0),
          rankedLosses: Number(profile.rankedLosses || 0),
          rankedGames: Number(profile.rankedGames || 0),
        });
      } catch (err) {
        console.warn('[SERVER] ranked profile fetch failed', err && err.message ? err.message : err);
        socket.emit('ranked_profile', { available: false });
      }
    });

    socket.on('input', (payload) => {
      // Basic validation and rate limiting happen in Player.applyInput / Match.handleInput
      if (!payload || typeof payload !== 'object') return;
      // Prevent malformed input types
      if (typeof payload.type !== 'string') return;
      player.updateLastSeen();
      console.log(`[INPUT] from ${player.id} (${player.firebaseUid}) payload=`, payload);
      if (player.match) {
        player.match.handleInput(player.firebaseUid, payload);
      }
    });

    socket.on('disconnect', () => {
      console.log('disconnected:', player.id);
      if (player.lobby) {
        matchmaking.leaveQueue(player);
      }

      player.detachSocket();
      if (player.match) {
        const reconnectTimeoutMs = process.env.NODE_ENV === 'test' ? 500 : PLAYER_RECONNECT_MS;
        player.disconnectTimer = trackTimer(setTimeout(() => {
          if (!player.socket || !player.socket.connected) {
            const currentMatch = player.match;
            if (currentMatch) {
              player.alive = false;
              player.state = 'dead';
              player.deathReason = 'Disconnected';
              currentMatch.broadcastState();
              currentMatch.checkGameEnd();
            }
            removePlayerMappings(player);
          }
          timers.delete(player.disconnectTimer);
        }, reconnectTimeoutMs));
      } else {
        removePlayerMappings(player);
      }
    });
  });

    return {
    app,
    httpServer,
    io,
    playersByFirebaseUid,
    matches,

    close: () => new Promise((resolve) => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();

      matchmaking.lobbies.forEach((lobby) => {
        lobby.cancelCountdown?.();
      });

      matchmaking.lobbies.clear();

      matches.forEach((match) => {
        match.stop?.();
      });

      matches.clear();

      io.of('/').disconnectSockets(true);

      io.close(() => {
        httpServer.close(() => resolve());
      });
    }),

    start: () => new Promise((resolve) => {
      httpServer.listen(port, () => {
        resolve(httpServer.address().port);
      });
    })
  };
} // IMPORTANT: closes createServerInstance()

module.exports = createServerInstance;

if (require.main === module) {
  const PORT = process.env.PORT || 3001;

  process.env.NODE_ENV = 'production';

  const server = createServerInstance(PORT);

  server.start()
    .then((port) => {
      console.log(`🎮 Lizard Run PvP server running on port ${port}`);
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

module.exports.createServerInstance = createServerInstance;