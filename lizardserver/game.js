const Player = require('./player');
const { submitMatchResults } = require('./stats');
const {
  TICK_MS,
  LANE_COUNT,
  TEMP_MIN,
  TEMP_MAX,
  TEMP_SAFE_LO,
  TEMP_SAFE_HI,
  TEMP_START,
  MATCH_MAX_DURATION_MS,
  ATTACK_RANGE,
  MAX_ATTACK_COOLDOWN,
  OBSTACLE_TRAVEL_TICKS,
  OBSTACLE_WARMUP_TICKS,
  OBSTACLE_MAX_CONCURRENT,
  OBSTACLE_CAT_UNLOCK_TICKS
} = require('./constants');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

class Match {
  constructor(io, players, onFinished = () => {}, options = {}) {
    this.io = io;
    this.players = players;
    this.mode = options.mode || 'casual';
    this.frame = 0;
    this.startedAt = Date.now();
    this.interval = null;
    this.id = `match_${Math.random().toString(36).slice(2, 10)}`;
    this.state = 'waiting';
    this.tickRate = 1000 / TICK_MS;
    this.broadcastFrequency = Math.max(1, Math.round(60 / TICK_MS));
    this.mapSeed = Math.floor(Math.random() * 1e9);
    this.onFinished = onFinished;

    // ── Environment hazards (server-authoritative "rats/stoats/cats") ──
    // Obstacles are modeled in time, not pixels: each has a spawn tick and
    // a fixed travel duration. Progress (0..1) is computed on demand so
    // clients of any resolution can render it consistently.
    this.obstacles = [];
    this.nextObstacleId = 1;

    // ── Thermal zones (hot / cold) mirror the single-player gameplay loop ──
    this.zones = [];
    this.nextZoneId = 1;
    this.zoneSpawnCooldown = 0;

    this.players.forEach((player) => {
      player.match = this;
      player.matchMode = this.mode;
      player.resetForMatch();
    });
  }

  start() {
    this.state = 'running';
    const startedAt = Date.now();
    this.startedAt = startedAt;
    this.players.forEach((player) => {
      player.matchStartTime = startedAt;
    });
    const payload = {
      matchId: this.id,
      state: this.state,
      startedAt: this.startedAt,
      tickRate: this.tickRate,
      mapSeed: this.mapSeed,
      players: this.players.map((player) => player.getPublicState())
    };
    this.players.forEach((player) => {
      if (player.socket) {
        player.socket.join(this.id);
        player.socket.emit('match_start', {
          ...payload,
          myPlayerId: player.id
        });
      }
    });
    this.interval = setInterval(() => this.tick(), TICK_MS);
  }

  broadcast(event, payload) {
    this.io.to(this.id).emit(event, payload);
  }

  getPublicObstacles() {
    return this.obstacles.map((o) => ({
      id: o.id,
      type: o.type,
      lane: o.lane,
      progress: Math.min(1, (this.frame - o.spawnTick) / OBSTACLE_TRAVEL_TICKS)
    }));
  }

  getPublicZones() {
    return this.zones.map((z) => ({
      id: z.id,
      type: z.type,
      x: z.x,
      w: z.w,
      yTop: z.yTop,
      yBot: z.yBot,
      heatRate: z.heatRate
    }));
  }

  sendStateToPlayer(player) {
    player.socket?.emit('state', {
      frame: this.frame,
      players: this.players.reduce((acc, p) => {
        acc[p.id] = p.getPublicState();
        return acc;
      }, {}),
      obstacles: this.getPublicObstacles(),
      zones: this.getPublicZones()
    });
  }

  handleInput(firebaseUid, input) {
    const player = this.players.find((p) => p.firebaseUid === firebaseUid || p.id === firebaseUid);
    if (!player || player.state !== 'alive') return;
    // Log incoming input for debugging
    // Keep logs minimal in production; verbose useful while diagnosing controls
    console.log(`[MATCH:${this.id}] handleInput from ${player.id}:`, input);
    const action = player.applyInput(input);
    if (action === 'attack') {
      this.applyAttack(player);
    } else if (action === 'flick_predator') {
      this.applyFlick(player);
    } else if (action === 'push') {
      this.applyPush(player);
    }
  }

  applyPush(attacker) {
    if (!attacker.alive) return;
    const target = this.players.find((player) => player !== attacker && player.alive);
    if (!target) return;
    const laneDelta = Math.abs(target.lane - attacker.lane);
    if (laneDelta > 1) return;

    const direction = Math.random() < 0.5 ? -1 : 1;
    const candidateLane = target.lane + direction;
    if (candidateLane < 0 || candidateLane >= LANE_COUNT) return;
    target.lane = candidateLane;
    this.io.to(this.id).emit('push_result', {
      attackerId: attacker.id,
      targetId: target.id,
      targetLane: target.lane
    });
  }

  applyAttack(attacker) {
    if (!attacker.alive) return;
    const target = this.players.find((player) =>
      player !== attacker &&
      player.alive &&
      Math.abs(player.lane - attacker.lane) <= ATTACK_RANGE
    );
    if (!target) return;

    target.alive = false;
    target.state = 'dead';
    target.deathReason = 'Hit by attack';
    attacker.kills = (attacker.kills || 0) + 1;
    this.io.to(this.id).emit('attack_hit', {
      attackerId: attacker.id,
      targetId: target.id,
      lane: target.lane
    });
  }

  applyFlick(attacker) {
    const target = this.players.find((player) => player !== attacker && player.alive);
    if (!target) return;
    target.predatorQueue.push({ from: attacker.id, timestamp: Date.now() });
    this.io.to(this.id).emit('predator_incoming', {
      targetId: target.id,
      fromId: attacker.id,
      lane: target.lane
    });
  }

  // ── Thermal zones (hot / cold) ─────────────────────────────────────
  maybeSpawnZone() {
    if (this.zoneSpawnCooldown > 0) {
      this.zoneSpawnCooldown -= 1;
      return;
    }

    const laneA = Math.floor(Math.random() * LANE_COUNT);
    const laneB = Math.min(laneA + Math.floor(Math.random() * 2) + 1, LANE_COUNT - 1);
    const types = ['shade', 'shade', 'sun', 'dappled', 'deepshade'];
    const type = types[Math.floor(Math.random() * types.length)];
    const rates = { sun: 0.055, dappled: 0.018, shade: -0.022, deepshade: -0.04 };

    this.zones.push({
      id: this.nextZoneId++,
      type,
      x: 820,
      w: Math.floor(Math.random() * 140) + 110,
      yTop: laneA * 100,
      yBot: (laneB + 1) * 100,
      heatRate: rates[type]
    });

    this.zoneSpawnCooldown = Math.floor(Math.random() * 130) + 110;
  }

  updateZones() {
    const moving = 2.2;
    this.zones = this.zones.filter((zone) => {
      zone.x -= moving;
      return zone.x + zone.w > -20;
    });
  }

  // ── Environment hazards ─────────────────────────────────────────────
  maybeSpawnObstacle() {
    if (this.frame < OBSTACLE_WARMUP_TICKS) return;
    if (this.obstacles.length >= OBSTACLE_MAX_CONCURRENT) return;

    // Spawn probability ramps up the longer the match runs, mirroring the
    // single-player difficulty curve (mapped from framesSurvived there).
    const rampTicks = 4000; // matches single-player's ramp window in frames
    const t = clamp((this.frame - OBSTACLE_WARMUP_TICKS) / rampTicks, 0, 1);
    const spawnChance = 0.015 + t * 0.03; // ~0.015 -> 0.045 per tick

    if (Math.random() >= spawnChance) return;

    const lane = Math.floor(Math.random() * LANE_COUNT);
    // Don't stack two obstacles in the same lane back-to-back
    const laneOccupied = this.obstacles.some((o) => o.lane === lane && o.progress < 0.6);
    if (laneOccupied) return;

    const types = this.frame > OBSTACLE_CAT_UNLOCK_TICKS ? ['rat', 'rat', 'rat', 'rat', 'stoat', 'cat'] : ['rat', 'rat', 'rat', 'rat', 'stoat'];
    const type = types[Math.floor(Math.random() * types.length)];

    this.obstacles.push({
      id: this.nextObstacleId++,
      type,
      lane,
      spawnTick: this.frame
    });
  }

  updateObstacles() {
    const remaining = [];
    for (const o of this.obstacles) {
      const progress = (this.frame - o.spawnTick) / OBSTACLE_TRAVEL_TICKS;
      if (progress < 1) {
        remaining.push(o);
        continue;
      }
      // Obstacle has arrived — resolve collision against every alive player
      // currently in its lane (server-authoritative, matches PvP attack rules).
      this.players.forEach((player) => {
        if (!player.alive || player.state !== 'alive') return;
        if (player.lane !== o.lane) return;
        if (player.inBurrow) return; // burrowing dodges ground hazards

        if (player.shieldHits > 0) {
          player.shieldHits -= 1;
        } else {
          player.alive = false;
          player.state = 'dead';
          const labels = { rat: 'A rat', stoat: 'A stoat', cat: 'A cat' };
          player.deathReason = `${labels[o.type] || 'Something'} got you`;
        }
      });
      // obstacle is consumed once it arrives, whether it hit someone or not
    }
    this.obstacles = remaining;
  }

  tick() {
    this.frame += 1;
    const alivePlayers = this.players.filter((player) => player.alive);
    if (Date.now() - this.startedAt > MATCH_MAX_DURATION_MS) {
      this.endMatch(alivePlayers.map((player) => player.id));
      return;
    }

    this.maybeSpawnZone();
    this.updateZones();
    alivePlayers.forEach((player) => {
      const activeZone = this.zones.find((z) => {
        const zoneLaneMin = Math.floor(z.yTop / 100);
        const zoneLaneMax = Math.floor((z.yBot - 1) / 100);
        return player.lane >= zoneLaneMin && player.lane <= zoneLaneMax;
      });
      if (activeZone && activeZone.heatRate !== 0) {
        player.temp += activeZone.heatRate;
      }
      player.tick();
    });

    this.maybeSpawnObstacle();
    this.updateObstacles();
    this.resolveAttacks();
    this.resolvePredators();
    this.updateScores();
    if (this.frame % this.broadcastFrequency === 0) {
      this.broadcastState();
    }
    this.checkGameEnd();
  }

  resolveAttacks() {
    // Attack actions are resolved immediately at the time of input.
  }

  resolvePredators() {
    this.players.forEach((player) => {
      if (!player.alive) return;
      const incoming = player.predatorQueue.shift();
      if (!incoming) return;
      player.alive = false;
      player.state = 'dead';
      player.deathReason = 'Caught by opponent predator';
      const attacker = this.players.find((p) => p.id === incoming.from);
      if (attacker) {
        attacker.kills = (attacker.kills || 0) + 1;
      }
    });
  }

  updateScores() {
    this.players.forEach((player) => {
      if (!player.alive) return;
      player.score += TICK_MS / 1000 * 1.5;
    });
  }

  broadcastState() {
    const state = {
      frame: this.frame,
      players: this.players.reduce((acc, player) => {
        acc[player.id] = player.getPublicState();
        return acc;
      }, {}),
      obstacles: this.getPublicObstacles(),
      zones: this.getPublicZones()
    };
    this.broadcast('state', state);
  }

  checkGameEnd() {
    const alive = this.players.filter((player) => player.alive);
    if (alive.length <= 1) {
      this.endMatch(alive.map((player) => player.id));
    }
  }

  endMatch(winnerIds) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    const resultPayload = {
      winnerIds,
      players: this.players.map((player) => player.getPublicState()),
      mode: this.mode,
      matchId: this.id,
    };
    this.broadcast('match_end', resultPayload);
    
    // Submit results to Firebase (server-authoritative)
    submitMatchResults(this.id, this.players, winnerIds, this.startedAt).catch(err => {
      console.error('[GAME] Failed to submit match results:', err);
    });

    if (this.mode === 'ranked') {
      const rankedPlayers = this.players.map((player) => ({
        id: player.id,
        uid: player.firebaseUid,
        firebaseUid: player.firebaseUid,
      }));
      const store = {
        read: async (path) => {
          const { getRtdb } = require('./firebase');
          const rtdb = getRtdb();
          if (!rtdb) return null;
          const snap = await rtdb.ref(path).once('value');
          return snap.val();
        },
        write: async (path, value) => {
          const { getRtdb } = require('./firebase');
          const rtdb = getRtdb();
          if (!rtdb) return;
          await rtdb.ref(path).set(value);
        },
      };
      applyRankedMatchResult(store, this.id, rankedPlayers, winnerIds, { mode: 'ranked' }).then((result) => {
        if (result.applied) {
          this.broadcast('ranked_result', {
            matchId: this.id,
            mode: 'ranked',
            updates: result.updates,
          });
        }
      }).catch((err) => {
        console.error('[GAME] Failed to apply ranked ELO result:', err);
      });
    }

    this.players.forEach((player) => {
      player.match = null;
      player.socket?.leave(this.id);
      player.resetForMatch();
    });
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

module.exports = Match;