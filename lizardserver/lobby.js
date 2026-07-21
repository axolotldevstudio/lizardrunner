const { LOBBY_COUNTDOWN_MS, MIN_PLAYERS_TO_START, MAX_LOBBY_PLAYERS } = require('./constants');

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
    console.log(`[LOBBY] player ${player.id} joined lobby ${this.id} (${this.players.length}/${MAX_LOBBY_PLAYERS})`);
    this.evaluateStart();
  }

  removePlayer(player) {
    this.players = this.players.filter((p) => p !== player);
    if (player.lobby === this) {
      player.lobby = null;
    }
    if (this.players.length < MIN_PLAYERS_TO_START) {
      this.cancelCountdown();
    }
    this.broadcastUpdate();
  }

  evaluateStart() {
    // If we have the maximum allowed players, start countdown immediately
    if (this.players.length >= MAX_LOBBY_PLAYERS) {
      return this.startCountdown();
    }

    // When reaching the minimum players required, start a short countdown (3s)
    // to give clients time to receive the lobby update and prepare.
    if (this.players.length >= MIN_PLAYERS_TO_START) {
      console.log(`[LOBBY] reached MIN_PLAYERS_TO_START (${MIN_PLAYERS_TO_START}) - starting short countdown for lobby ${this.id}`);
      return this.startCountdown();
    }
  }

  startCountdown() {
    if (this.countdownTimer) return;
    this.status = 'starting';
    // Use a short 3 second countdown for quick matches
    const countdownMs = 3000;
    this.countdown = countdownMs;
    this.countdownStart = Date.now();
    this.broadcastUpdate();
    console.log(`[LOBBY] short countdown (${countdownMs}ms) started for lobby ${this.id}`);
    this.countdownTimer = setTimeout(() => {
      console.log(`[LOBBY] countdown expired for lobby ${this.id}, starting match`);
      this.startMatch();
    }, countdownMs);
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
    if (this.players.length < MIN_PLAYERS_TO_START) {
      this.status = 'waiting';
      this.broadcastUpdate();
      return;
    }
    this.status = 'started';
    this.broadcastUpdate();
    console.log(`[LOBBY] startMatch invoked for lobby ${this.id} with ${this.players.length} players`);
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
