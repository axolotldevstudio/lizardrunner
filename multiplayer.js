const mpStatus = document.getElementById('mp-status');
const mpConnectBtn = document.getElementById('mp-connect-btn');
const mpFindBtn = document.getElementById('mp-find-btn');
const mpCancelBtn = document.getElementById('mp-cancel-btn');
const mpBackBtn = document.getElementById('mp-back-btn');
const mpServerInput = document.getElementById('mp-server');
const mpLogList = document.getElementById('mp-log-list');

let socket = null;
let connected = false;
let matchId = null;
let waiting = false;

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

function resetMultiplayerUi() {
  setStatus('Not connected');
  mpFindBtn.disabled = true;
  mpCancelBtn.disabled = true;
}

async function connectMultiplayer() {
  const serverUrl = mpServerInput.value.trim();
  if (!serverUrl) {
    setStatus('Enter a server URL first', 'error');
    return;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  setStatus('Connecting...');
  const authPayload = {};
  if (window.fbGetIdToken) {
    const idToken = await window.fbGetIdToken();
    if (idToken) authPayload.idToken = idToken;
  }
  socket = io(serverUrl, {
    transports: ['websocket'],
    auth: authPayload
  });

  socket.on('connect', () => {
    connected = true;
    setStatus(`Connected (${socket.id})`, 'success');
    mpFindBtn.disabled = false;
    mpCancelBtn.disabled = true;
    logMultiplayer('Connected to server');
  });

  socket.on('connected', (payload) => {
    if (payload?.playerId) {
      window.multiplayer.playerId = payload.playerId;
    }
  });

  socket.on('lobby_update', (payload) => {
    if (!payload) return;
    const countdown = payload.countdownMs != null ? ` | ${Math.ceil(payload.countdownMs / 1000)}s left` : '';
    setStatus(`Lobby ${payload.status} (${payload.count}/${payload.maxPlayers})${countdown}`, 'info');
    logMultiplayer(`Lobby update: ${payload.status}, ${payload.count}/${payload.maxPlayers}`);
  });

  socket.on('disconnect', () => {
    connected = false;
    waiting = false;
    matchId = null;
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
    if (window.onMultiplayerMatchEnd) {
      window.onMultiplayerMatchEnd(result);
    }
  });

  socket.on('predator_incoming', (data) => {
    if (window.onMultiplayerPredatorIncoming) {
      window.onMultiplayerPredatorIncoming(data);
    }
  });

  socket.on('connect_error', (error) => {
    setStatus(`Connect failed: ${error.message}`, 'error');
    logMultiplayer(`Connect error: ${error.message}`);
  });
}

function findMatch() {
  if (!socket || !connected) {
    setStatus('Not connected', 'error');
    return;
  }
  socket.emit('find_match');
}

function cancelFind() {
  if (!socket || !connected) return;
  socket.emit('cancel_find');
  waiting = false;
  mpFindBtn.disabled = false;
  mpCancelBtn.disabled = true;
  setStatus('Match search canceled', 'info');
  logMultiplayer('Canceled match search');
}

function showMultiplayerScreen() {
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

document.getElementById('multiplayer-btn').addEventListener('click', showMultiplayerScreen);

resetMultiplayerUi();

window.multiplayer = {
  get socket() { return socket; },
  isConnected() { return connected; },
  getMatchId() { return matchId; },
  show: showMultiplayerScreen,
  hide: hideMultiplayerScreen
};
