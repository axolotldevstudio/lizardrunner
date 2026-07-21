const { LOBBY_COUNTDOWN_MS, MIN_LOBBY_START, MAX_LOBBY_PLAYERS } = require('./constants');

function makeLobbyId() {
  return 'lobby_' + Math.random().toString(36).slice(2, 10);
}

class Lobby {
  constructor(io, onReady) {
    this.io = io;
    this.id = makeLobbyId();
    this.players = [];
    this.status = 'waiting';
    const countdownMs = process.env.NODE_ENV === 'test' ? 1000 : LOBBY_COUNTDOWN_MS;
    this.countdown = countdownMs;
    this.countdownStart = null;
    this.countdownTimer = null;
    this.onReady = onReady;
  }

  addPlayer(player) {
    if (this.players.includes(player)) return;
    if (this.players.length >= MAX_LOBBY_PLAYERS) return;
    this.players.push(player);
    player.lobby = this;
    this.broadcastUpdate();
    this.evaluateStart();
  }

  removePlayer(player) {
    this.players = this.players.filter((p) => p !== player);
    if (player.lobby === this) {
      player.lobby = null;
    }
    if (this.players.length < MIN_LOBBY_START) {
      this.cancelCountdown();
    }
    this.broadcastUpdate();
  }

  evaluateStart() {
    if (this.players.length >= MAX_LOBBY_PLAYERS) {
      return this.startImmediately();
    }
    if (this.players.length >= MIN_LOBBY_START && !this.countdownTimer) {
      this.startCountdown();
    }
  }

  startCountdown() {
    if (this.countdownTimer) return;
    this.status = 'starting';
    this.countdownStart = Date.now();
    this.broadcastUpdate();
    this.countdownTimer = setTimeout(() => {
      this.startMatch();
    }, this.countdown);
  }

  cancelCountdown() {
    if (!this.countdownTimer) return;
    clearTimeout(this.countdownTimer);
    this.countdownTimer = null;
    this.countdownStart = null;
    this.status = 'waiting';
    this.broadcastUpdate();
  }

  startImmediately() {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.status = 'starting';
    this.broadcastUpdate();
    this.startMatch();
  }

  startMatch() {
    if (this.players.length < MIN_LOBBY_START) {
      this.status = 'waiting';
      this.broadcastUpdate();
      return;
    }
    this.status = 'started';
    this.broadcastUpdate();
    const players = [...this.players];
    this.players.forEach((p) => {
      p.lobby = null;
    });
    this.players = [];
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.onReady(this, players);
  }

  broadcastUpdate() {
    const countdownMs = process.env.NODE_ENV === 'test' ? 1000 : LOBBY_COUNTDOWN_MS;
    const remaining = this.countdownStart ? Math.max(0, countdownMs - (Date.now() - this.countdownStart)) : 0;
    const payload = {
      lobbyId: this.id,
      status: this.status,
      players: this.players.map((player) => ({ id: player.id })),
      count: this.players.length,
      maxPlayers: MAX_LOBBY_PLAYERS,
      countdownMs: remaining
    };
    this.players.forEach((player) => {
      player.socket?.emit('lobby_update', payload);
    });
  }
}

module.exports = Lobby;
