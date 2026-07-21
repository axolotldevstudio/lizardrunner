const Lobby = require('./lobby');
const { MAX_LOBBY_PLAYERS } = require('./constants');

class Matchmaking {
  constructor(io, onLobbyReady) {
    this.io = io;
    this.onLobbyReady = onLobbyReady;
    this.activeLobby = null;
    this.lobbies = new Map();
  }

  getOpenLobby() {
    if (!this.activeLobby || this.activeLobby.status !== 'waiting') {
      this.activeLobby = new Lobby(this.io, (lobby, players) => {
        this.lobbies.delete(lobby.id);
        if (this.activeLobby === lobby) {
          this.activeLobby = null;
        }
        this.onLobbyReady(lobby, players);
      });
      this.lobbies.set(this.activeLobby.id, this.activeLobby);
    }
    return this.activeLobby;
  }

  joinQueue(player) {
    if (player.lobby || player.match) return;
    const lobby = this.getOpenLobby();
    lobby.addPlayer(player);
    if (lobby.players.length >= MAX_LOBBY_PLAYERS) {
      lobby.startImmediately();
    }
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
