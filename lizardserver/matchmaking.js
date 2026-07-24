const Lobby = require('./lobby');
const { MAX_PLAYERS_PER_MATCH, RANKED_MATCHMAKING_MAX_DIFFS } = require('./constants');

class Matchmaking {
  constructor(io, onLobbyReady) {
    this.io = io;
    this.onLobbyReady = onLobbyReady;
    this.activeLobby = null;
    this.lobbies = new Map();
  }

  getOpenLobby(mode = 'casual') {
    const openLobbies = Array.from(this.lobbies.values()).filter((lobby) => lobby && lobby.mode === mode && lobby.status !== 'started');
    const preferredLobby = openLobbies.find((lobby) => lobby.players.length < 2) || openLobbies[0] || null;
    if (!preferredLobby) {
      const lobby = new Lobby(this.io, (readyLobby, players) => {
        this.lobbies.delete(readyLobby.id);
        if (this.activeLobby === readyLobby) {
          this.activeLobby = null;
        }
        this.onLobbyReady(readyLobby, players);
      }, mode);
      this.activeLobby = lobby;
      this.lobbies.set(lobby.id, lobby);
      return lobby;
    }
    return preferredLobby;
  }

  joinQueue(player, mode = 'casual') {
    if (player.lobby || player.match) return;
    const lobby = this.getOpenLobby(mode);
    lobby.addPlayer(player);
  }

  getQueueSnapshot() {
    const lobbies = Array.from(this.lobbies.values()).filter(Boolean);
    const byMode = lobbies.reduce((acc, lobby) => {
      if (!acc[lobby.mode]) acc[lobby.mode] = 0;
      acc[lobby.mode] += lobby.players.length;
      return acc;
    }, {});
    return {
      casual: byMode.casual || 0,
      ranked: byMode.ranked || 0,
      totalWaiting: lobbies.reduce((sum, lobby) => sum + lobby.players.length, 0),
      lobbyCount: lobbies.length,
    };
  }

  leaveQueue(player) {
    if (!player.lobby) return;
    const lobby = player.lobby;
    lobby.removePlayer(player);
    if (lobby.players.length === 0) {
      this.lobbies.delete(lobby.id);
      if (this.activeLobby === lobby) {
        this.activeLobby = null;
      }
    }
  }

  remove(player) {
    return this.leaveQueue(player);
  }
}

module.exports = Matchmaking;
