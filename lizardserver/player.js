const {
  TEMP_START,
  TEMP_MIN,
  TEMP_MAX,
  TEMP_SAFE_LO,
  TEMP_SAFE_HI,
  LANE_COUNT,
  MAX_LANE_DELTA,
  MAX_BURST_COOLDOWN,
  MAX_BURROW_COOLDOWN,
  MAX_JUMP_COOLDOWN,
  MAX_ATTACK_COOLDOWN,
  MAX_INPUTS_PER_SECOND
} = require('./constants');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

class Player {
  constructor(firebaseUid, socket) {
    this.firebaseUid = firebaseUid || null;
    this.socket = socket;
    this.socketId = socket?.id || null;
    this.id = firebaseUid ? firebaseUid : `guest_${socket?.id || Math.random().toString(36).slice(2, 8)}`;
    this.resetForMatch();
    this.disconnectTimer = null;
    this.lastSeen = Date.now();
    this.lobby = null;
    this.match = null;
    this.replay = [];
  }

  updateLastSeen() {
    this.lastSeen = Date.now();
  }

  attachSocket(socket) {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
    this.socket = socket;
    this.socketId = socket.id;
    this.updateLastSeen();
  }

  detachSocket() {
    this.socket = null;
  }

  resetForMatch() {
    this.state = 'alive';
    this.alive = true;
    this.lane = 1;
    this.temp = TEMP_START;
    this.score = 0;
    this.inBurrow = false;
    this.burrowTimer = 0;
    this.burrowCooldown = 0;
    this.burstCooldown = 0;
    this.jumpCooldown = 0;
    this.jumpTimer = 0;
    this.attackCooldown = 0;
    this.flickCooldown = 0;
    this.pendingAttack = false;
    this.deathReason = null;
    this.predatorQueue = [];
    this.replay = [];
  }

  getPublicState() {
    return {
      id: this.id,
      state: this.state,
      alive: this.alive,
      lane: this.lane,
      temp: Number(this.temp.toFixed(1)),
      score: Number(this.score.toFixed(1)),
      deathReason: this.deathReason
    };
  }

  flagViolation(reason) {
    console.warn(`Anti-cheat flag for player ${this.id}: ${reason}`);
  }

  recordInput(input) {
    this.replay.push({
      ts: Date.now(),
      ...input
    });
    if (this.replay.length > 2000) {
      this.replay.shift();
    }
  }

  inputRateExceeded() {
    const now = Date.now();
    this.inputWindow = this.inputWindow || { count: 0, start: now };
    if (now - this.inputWindow.start >= 1000) {
      this.inputWindow.start = now;
      this.inputWindow.count = 0;
    }
    this.inputWindow.count += 1;
    return this.inputWindow.count > MAX_INPUTS_PER_SECOND;
  }

  applyInput(input) {
    if (!this.alive || this.state !== 'alive') return;
    if (!input || typeof input.type !== 'string') return;
    if (this.inputRateExceeded()) return;
    this.recordInput(input);

    const type = input.type;
    switch (type) {
      case 'lane': {
        const requestedLane = Number(input.lane);
        if (!Number.isInteger(requestedLane) || requestedLane < 0 || requestedLane >= LANE_COUNT) {
          this.flagViolation('invalid lane');
          return;
        }
        if (Math.abs(requestedLane - this.lane) > MAX_LANE_DELTA) {
          this.flagViolation('too fast lane change');
          return;
        }
        if (this.inBurrow) return;
        this.lane = requestedLane;
        break;
      }

      case 'left': {
        if (this.inBurrow) return;
        if (this.lane <= 0) return;
        this.lane -= 1;
        break;
      }

      case 'right': {
        if (this.inBurrow) return;
        if (this.lane >= LANE_COUNT - 1) return;
        this.lane += 1;
        break;
      }

      case 'burst': {
        if (this.burstCooldown > 0) return;
        this.burstCooldown = MAX_BURST_COOLDOWN;
        this.temp = clamp(this.temp + 1.4, TEMP_MIN, TEMP_MAX);
        break;
      }

      case 'burrow': {
        if (this.burrowCooldown > 0 || this.inBurrow) return;
        this.inBurrow = true;
        this.burrowTimer = 90;
        this.burrowCooldown = MAX_BURROW_COOLDOWN;
        break;
      }

      case 'jump': {
        if (this.jumpCooldown > 0) return;
        this.jumpTimer = MAX_JUMP_COOLDOWN;
        this.jumpCooldown = MAX_JUMP_COOLDOWN;
        break;
      }

      case 'attack': {
        if (this.attackCooldown > 0) return;
        this.attackCooldown = MAX_ATTACK_COOLDOWN;
        return 'attack';
      }

      case 'flick_predator': {
        if (this.flickCooldown > 0) return;
        this.flickCooldown = MAX_ATTACK_COOLDOWN;
        return 'flick_predator';
      }

      case 'zone_heat': {
        // Zone heat is no longer trusted directly from the client.
        return;
      }

      default:
        this.flagViolation(`unknown input type ${type}`);
    }
  }

  tick() {
    if (!this.alive || this.state !== 'alive') return;
    if (this.burrowCooldown > 0) this.burrowCooldown -= 1;
    if (this.burstCooldown > 0) this.burstCooldown -= 1;
    if (this.jumpCooldown > 0) this.jumpCooldown -= 1;
    if (this.attackCooldown > 0) this.attackCooldown -= 1;
    if (this.flickCooldown > 0) this.flickCooldown -= 1;

    if (this.inBurrow) {
      this.temp -= 0.08;
      this.burrowTimer -= 1;
      if (this.burrowTimer <= 0) {
        this.inBurrow = false;
      }
    }

    if (this.jumpTimer > 0) {
      this.jumpTimer -= 1;
    }

    if (!this.inBurrow) {
      if (this.temp > TEMP_SAFE_HI) this.temp -= 0.01;
      else if (this.temp < TEMP_SAFE_LO) this.temp += 0.005;
      else this.temp += 0.004;
    }

    this.temp = clamp(this.temp, TEMP_MIN, TEMP_MAX);

    if (this.temp >= TEMP_MAX) {
      this.alive = false;
      this.state = 'dead';
      this.deathReason = 'Overheated';
    }
    if (this.temp <= TEMP_MIN) {
      this.alive = false;
      this.state = 'dead';
      this.deathReason = 'Froze';
    }
  }
}

module.exports = Player;
