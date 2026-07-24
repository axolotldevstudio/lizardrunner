const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createElement(id) {
  return {
    id,
    disabled: false,
    textContent: '',
    dataset: {},
    classList: {
      add() {},
      remove() {},
      toggle() {}
    },
    addEventListener() {},
    appendChild() {},
    scrollIntoView() {}
  };
}

function createSocket() {
  const listeners = {};
  const emitted = [];
  return {
    listeners,
    emitted,
    connected: true,
    id: 'socket-1',
    on(event, handler) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    },
    once(event, handler) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    },
    off(event, handler) {
      listeners[event] = listeners[event] || [];
      listeners[event] = listeners[event].filter((fn) => fn !== handler);
    },
    emit(event, payload) {
      emitted.push({ event, payload });
      const handlers = listeners[event] || [];
      handlers.forEach((handler) => handler(payload));
    },
    disconnect() {
      this.connected = false;
    }
  };
}

function loadMultiplayerScript(socket) {
  const scriptPath = path.join(__dirname, '..', '..', 'multiplayer.js');
  const scriptSource = fs.readFileSync(scriptPath, 'utf8');

  const elements = {
    'mp-status': createElement('mp-status'),
    'mp-connect-btn': createElement('mp-connect-btn'),
    'mp-find-btn': createElement('mp-find-btn'),
    'mp-cancel-btn': createElement('mp-cancel-btn'),
    'mp-back-btn': createElement('mp-back-btn'),
    'mp-server': createElement('mp-server'),
    'mp-log-list': createElement('mp-log-list'),
    'mp-ranked-btn': createElement('mp-ranked-btn'),
    'mp-casual-btn': createElement('mp-casual-btn'),
    'mp-ranked-profile': createElement('mp-ranked-profile'),
    'multiplayer-btn': createElement('multiplayer-btn'),
    'start-screen': createElement('start-screen'),
    'gameover-screen': createElement('gameover-screen'),
    'multiplayer-screen': createElement('multiplayer-screen')
  };

  const document = {
    createElement(tagName) {
      return createElement(tagName);
    },
    getElementById(id) {
      return elements[id] || createElement(id);
    },
    querySelectorAll() {
      return [];
    }
  };  
 
  const window = {
    document,
    CONFIG: { ENABLE_MULTIPLAYER: true },
    fbGetIdToken: async () => null,
    serverManager: {
      connectToBestServer: async () => ({ socket, region: 'global' })
    },
    multiplayer: null,
    onMultiplayerDisconnect: null,
    onMultiplayerMatchStart: null,
    onMultiplayerState: null,
    onMultiplayerMatchEnd: null,
    onMultiplayerPredatorIncoming: null,
    onRankedResult: null,
    console
  };

  const context = vm.createContext({
    window,
    document,
    console,
    setTimeout,
    clearTimeout,
    io: () => ({})
  });

  vm.runInContext(scriptSource, context, { filename: 'multiplayer.js' });
  return { window, document, elements };
}

test('connectMultiplayer marks the client as connected when the socket is already connected', async () => {
  const socket = createSocket();
  const { window } = loadMultiplayerScript(socket);

  await window.multiplayer.connect();

  assert.equal(window.multiplayer.isConnected(), true);
  assert.equal(window.document.getElementById('mp-find-btn').disabled, false);
});

test('findMatch emits the server event once the socket is connected', async () => {
  const socket = createSocket();
  const { window } = loadMultiplayerScript(socket);

  await window.multiplayer.connect();
  window.multiplayer.findMatch();

  assert.ok(socket.emitted.some((entry) => entry.event === 'find_match'));
});
