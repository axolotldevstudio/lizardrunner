require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { initFirebase, getAdmin, isFirebaseReady } = require('./firebase');
const Player = require('./player');
const Match = require('./game');
const Matchmaking = require('./matchmaking');
const { PLAYER_RECONNECT_MS, MAX_LOBBY_PLAYERS, LOBBY_COUNTDOWN_MS, MIN_PLAYERS_TO_START, MAX_PLAYERS_PER_MATCH } = require('./constants');
const os = require('os');

function createServerInstance(port = process.env.PORT || 3001) {
  const app = express();
  const httpServer = http.createServer(app);
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',').map(origin => origin.trim()).filter(Boolean);
  const isAllowedOrigin = (origin) => {
    if (!origin) {
      return true;
    }

    if (allowedOrigins.includes(origin)) {
      return true;
    }

    return allowedOrigins.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed);
        const candidateUrl = new URL(origin);
        const sameProtocol = allowedUrl.protocol === candidateUrl.protocol;
        const sameHost = allowedUrl.hostname === candidateUrl.hostname;
        const localHostMatch = ['localhost', '127.0.0.1', '::1'].includes(allowedUrl.hostname) && ['localhost', '127.0.0.1', '::1'].includes(candidateUrl.hostname);
        return sameProtocol && (sameHost || localHostMatch);
      } catch (error) {
        return false;
      }
    });
  };

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS origin not allowed: ${origin}`));
        }
      },
      methods: ['GET', 'POST']
    }
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

    let player = playersByFirebaseUid.get(firebaseUid);
    if (!player) {
      player = new Player(firebaseUid, socket);
      playersByFirebaseUid.set(firebaseUid, player);
    } else {
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
      countdownMs: lobby?.countdownStart ? Math.max(0, LOBBY_COUNTDOWN_MS - (Date.now() - lobby.countdownStart)) : 0
    };
  }

  const matchmaking = new Matchmaking(io, (lobby, lobbyPlayers) => {
    const match = new Match(io, lobbyPlayers, (finishedMatch) => {
      matches.delete(finishedMatch.id);
    });
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

  io.on('connection', async (socket) => {
    const player = await getPlayer(socket);
    console.log('connected:', player.id, 'firebaseUid=', player.firebaseUid, 'socketId=', player.socketId);

    socket.emit('connected', { playerId: player.id, firebaseUid: player.firebaseUid, socketId: player.socketId });
    socket.emit('lobby_update', getLobbyPayload(player));

    socket.on('find_match', () => {
      matchmaking.joinQueue(player);
      if (player.lobby) {
        socket.emit('lobby_update', getLobbyPayload(player));
        if (['waiting', 'starting'].includes(player.lobby.status)) {
          socket.emit('waiting');
        }
      }
    });

    socket.on('cancel_find', () => {
      matchmaking.leaveQueue(player);
    });

    socket.on('input', (payload) => {
      // Basic validation and rate limiting happen in Player.applyInput / Match.handleInput
      if (!payload || typeof payload !== 'object') return;
      // Prevent malformed input types
      if (typeof payload.type !== 'string') return;
      player.updateLastSeen();
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
      matches.forEach((match) => match.stop?.());
      matches.clear();
      io.of('/').disconnectSockets(true);
      io.close(() => {
        httpServer.close(() => resolve());
      });
    }),
    start: () => new Promise((resolve) => {
      httpServer.listen(port, () => resolve(httpServer.address().port));
    })
  };
}

module.exports = createServerInstance;

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  process.env.NODE_ENV = 'production';
  const server = createServerInstance(PORT);
  server.start().then((port) => {
    console.log(`🎮 Lizard Run PvP server running on port ${port}`);
  }).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
module.exports.createServerInstance = createServerInstance;
