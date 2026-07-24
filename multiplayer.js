const mpStatus = document.getElementById('mp-status');
const mpConnectBtn = document.getElementById('mp-connect-btn');
const mpFindBtn = document.getElementById('mp-find-btn');
const mpCancelBtn = document.getElementById('mp-cancel-btn');
const mpBackBtn = document.getElementById('mp-back-btn');
const mpServerInput = document.getElementById('mp-server');
const mpLogList = document.getElementById('mp-log-list');
const mpRankedBtn = document.getElementById('mp-ranked-btn');
const mpCasualBtn = document.getElementById('mp-casual-btn');
const mpRankedProfile = document.getElementById('mp-ranked-profile');

let socket = null;
let connected = false;
let matchId = null;
let waiting = false;
let selectedMode = 'casual';

// If an input is present to override server selection, keep its value
if (mpServerInput) {
  mpServerInput.placeholder = mpServerInput.placeholder || 'Leave blank to auto-select';
}

function getSelectedServerUrl() {
  // If user entered a server URL manually, honor it
  if (mpServerInput && mpServerInput.value && mpServerInput.value.trim()) return mpServerInput.value.trim();
  // otherwise the serverManager will pick the best server
  return null;
}

function logMultiplayer(message) {
  const item = document.createElement('div');
  item.textContent = message;
  mpLogList.appendChild(item);
  item.scrollIntoView({ block: 'end' });
}

function setStatus(text, type = 'info') {
  mpStatus.textContent = text;
  mpStatus.dataset.state = type;
}

function setMode(mode) {
  selectedMode = mode === 'ranked' ? 'ranked' : 'casual';
  mpRankedBtn?.classList.toggle('active', selectedMode === 'ranked');
  mpCasualBtn?.classList.toggle('active', selectedMode === 'casual');
}

function syncConnectedUi(s) {
  connected = Boolean(s?.connected);
  mpFindBtn.disabled = !connected;
  mpCancelBtn.disabled = !connected || !waiting;
  if (connected) {
    setStatus(`Connected (${s?.id || 'socket'})`, 'success');
    logMultiplayer('Connected to server');
  }
}

function resetMultiplayerUi() {
  if (!window.CONFIG?.ENABLE_MULTIPLAYER) {
    setStatus('Multiplayer disabled', 'error');
    mpConnectBtn.disabled = true;
    mpFindBtn.disabled = true;
    mpCancelBtn.disabled = true;
    return;
  }

  setMode(selectedMode);
  setStatus('Not connected');
  mpFindBtn.disabled = true;
  mpCancelBtn.disabled = true;
}

async function connectMultiplayer() {
  if (!window.CONFIG?.ENABLE_MULTIPLAYER) {
    setStatus('Multiplayer disabled', 'error');
    return;
  }
  // If user provided a manual URL, use it; otherwise use serverManager to pick best
  const manual = getSelectedServerUrl();

  if (socket) {
    try { socket.disconnect(); } catch (e) {}
    socket = null;
  }

  const authPayload = {};
  const preferredServerUrl = window.multiplayer?.serverUrl || getSelectedServerUrl();
  if (window.fbGetIdToken) {
    const idToken = await window.fbGetIdToken();
    if (idToken) authPayload.idToken = idToken;
  }

  let connectResult = null;
  try {
    if (manual) {
      setStatus('Connecting to ' + manual + '...');
      connectResult = await (async () => {
        // basic manual connect
        return new Promise((resolve, reject) => {
          const s = io(manual, buildSocketOptions(authPayload));
          s.once('connect', () => resolve({ socket: s, region: 'manual' }));
          s.once('connect_error', (err) => { try { s.disconnect(); } catch(e){}; reject(err); });
          setTimeout(() => reject(new Error('connect_timeout')), 8000);
        });
      })();
    } else if (window.serverManager && typeof window.serverManager.connectToBestServer === 'function') {
      setStatus('Selecting best multiplayer server...');
      try {
        connectResult = await window.serverManager.connectToBestServer(authPayload, preferredServerUrl);
      } catch (err) {
        setStatus('No multiplayer servers available', 'error');
        logMultiplayer('No available multiplayer servers');
        return;
      }
      if (!connectResult?.socket) {
        setStatus('No multiplayer servers available', 'error');
        logMultiplayer('No available multiplayer servers');
        return;
      }
    } else {
      setStatus('Multiplayer config missing', 'error');
      return;
    }
  } catch (err) {
    setStatus(`Connect failed: ${err.message || err}`, 'error');
    logMultiplayer('Connect failed: ' + String(err && err.message ? err.message : err));
    return;
  }

  socket = connectResult.socket;
  if (window.multiplayer) {
    window.multiplayer.socket = socket;
    window.multiplayer.serverUrl = connectResult.url || preferredServerUrl || null;
  }
  if (window.__lrAttachSocketPerfTracking) {
    window.__lrAttachSocketPerfTracking(socket);
  }

  // common handler setup
  function attachHandlers(s) {
    s.on('connect', () => {
      syncConnectedUi(s);
    });

    s.on('connect_error', (error) => {
      connected = false;
      setStatus(`Connect failed: ${error.message}`, 'error');
      mpFindBtn.disabled = true;
      mpCancelBtn.disabled = true;
      logMultiplayer(`Connect error: ${error.message}`);
    });

    s.on('connected', (payload) => {
      if (payload?.playerId) {
        window.multiplayer.playerId = payload.playerId;
      }
      s.emit('get_ranked_profile');
    });

    s.on('disconnect', async (reason) => {
      connected = false;
      logMultiplayer('Disconnected from server: ' + reason);
      // attempt failover
      try {
        setStatus('Attempting failover...', 'info');
        const res = await window.serverManager.attemptFailover(s, authPayload);
        const newSocket = res.socket;
        socket = newSocket;
        if (window.multiplayer) window.multiplayer.socket = socket;
        attachHandlers(socket);
        setStatus('Reconnected to another server', 'success');
      } catch (err) {
        setStatus('Disconnected — no servers available', 'error');
        resetMultiplayerUi();
      }
    });
  }

  attachHandlers(socket);
  syncConnectedUi(socket);

  socket.on('ranked_profile', (payload) => {
    if (!payload?.available) return;
    if (mpRankedProfile) {
      mpRankedProfile.textContent = `ELO: ${payload.elo || 1000} • Rank: ${payload.rank || 'Bronze'} • W/L: ${payload.rankedWins || 0}/${payload.rankedLosses || 0}`;
    }
  });

  socket.on('lobby_update', (payload) => {
    if (!payload) return;
    const countdown = payload.countdownMs != null ? ` | ${Math.ceil(payload.countdownMs / 1000)}s left` : '';
    setStatus(`Lobby ${payload.status} (${payload.count}/${payload.maxPlayers})${countdown}`, 'info');
    logMultiplayer(`Lobby update: ${payload.status}, ${payload.count}/${payload.maxPlayers}`);
    // Update player count display if present
    const pc = document.getElementById('mp-player-count');
    if (pc) pc.textContent = `Players: ${payload.count} / ${payload.maxPlayers}`;
  });

  socket.on('disconnect', () => {
    connected = false;
    waiting = false;
    matchId = null;
    if (window.multiplayer) {
      window.multiplayer.socket = null;
    }
    if (window.onMultiplayerDisconnect) {
      window.onMultiplayerDisconnect();
    }
    resetMultiplayerUi();
    logMultiplayer('Disconnected from server');
  });

  socket.on('waiting', () => {
    waiting = true;
    mpFindBtn.disabled = true;
    mpCancelBtn.disabled = false;
    setStatus('Waiting for opponent...', 'waiting');
    logMultiplayer('Searching for a match');
  });

  socket.on('match_start', (payload) => {
    matchId = payload.matchId;
    waiting = false;
    mpFindBtn.disabled = true;
    mpCancelBtn.disabled = true;
    setStatus(`Match ready: ${matchId}`, 'success');
    logMultiplayer('Match started. Use the game to play.');
    if (window.onMultiplayerMatchStart) {
      window.onMultiplayerMatchStart(payload);
    }
  });

  socket.on('state', (state) => {
    if (window.onMultiplayerState) {
      window.onMultiplayerState(state);
    }
  });

  socket.on('match_end', (result) => {
    if (result?.winnerIds) {
      logMultiplayer(`Match ended. Winners: ${result.winnerIds.join(', ')}`);
    } else {
      logMultiplayer('Match ended.');
    }
    if (result?.mode === 'ranked' && result?.matchId) {
      const label = result.winnerIds?.includes(window.multiplayer?.playerId) ? 'Victory' : 'Defeat';
      logMultiplayer(`${label} — ranked result stored by the server.`);
    }
    if (window.onMultiplayerMatchEnd) {
      window.onMultiplayerMatchEnd(result);
    }
  });

  // Server-side ranked ELO updates after match completion
  socket.on('ranked_result', (payload) => {
    if (!payload) return;
    logMultiplayer('Received ranked result from server');
    // Update ranked profile if included
    if (payload.profile && payload.profile.uid === window.multiplayer?.playerId) {
      mpRankedProfile.textContent = `ELO: ${payload.profile.elo || 1000} • Rank: ${payload.profile.rank || 'Bronze'} • W/L: ${payload.profile.rankedWins || 0}/${payload.profile.rankedLosses || 0}`;
    }
    if (window.onRankedResult) {
      window.onRankedResult(payload);
    } else {
      // store for later consumers
      window._lastRankedResult = payload;
    }
  });

  socket.on('predator_incoming', (data) => {
    if (!data || !window.multiplayer) return;
    if (data.targetId !== window.multiplayer.playerId) return;
    if (window.onMultiplayerPredatorIncoming) {
      window.onMultiplayerPredatorIncoming(data);
    }
  });
}

function findMatch() {
  if (!socket || (!connected && !socket.connected)) {
    setStatus('Not connected', 'error');
    return;
  }
  socket.emit('find_match', { mode: selectedMode });
}

function cancelFind() {
  if (!socket || (!connected && !socket.connected)) return;
  socket.emit('cancel_find');
  waiting = false;
  mpFindBtn.disabled = false;
  mpCancelBtn.disabled = true;
  setStatus('Match search canceled', 'info');
  logMultiplayer('Canceled match search');
}

function showMultiplayerScreen() {
  if (!window.CONFIG?.ENABLE_MULTIPLAYER) {
    setStatus('Multiplayer is disabled in this build', 'error');
    return;
  }
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
  document.getElementById('multiplayer-screen').classList.remove('hidden');
}

function hideMultiplayerScreen() {
  document.getElementById('multiplayer-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
}

mpConnectBtn.addEventListener('click', connectMultiplayer);
mpFindBtn.addEventListener('click', findMatch);
mpCancelBtn.addEventListener('click', cancelFind);
mpBackBtn.addEventListener('click', hideMultiplayerScreen);
mpRankedBtn?.addEventListener('click', () => setMode('ranked'));
mpCasualBtn?.addEventListener('click', () => setMode('casual'));

document.getElementById('multiplayer-btn')?.addEventListener('click', showMultiplayerScreen);

function initMultiplayerUi() {
  resetMultiplayerUi();
  mpBackBtn.disabled = false;
}

window.multiplayer = {
  socket,
  playerId: null,
  isConnected: () => connected,
  getMatchId: () => matchId,
  connect: connectMultiplayer,
  findMatch,
  cancelFind,
  show: showMultiplayerScreen,
  hide: hideMultiplayerScreen,
};

initMultiplayerUi();
