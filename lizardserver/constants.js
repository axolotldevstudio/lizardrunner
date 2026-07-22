const TICK_MS = Number(process.env.SERVER_TICK_MS) || 50; // 20 ticks per second
// Default to 2 players per match (make PvP quick to test locally)
const MAX_PLAYERS_PER_MATCH = Number(process.env.MAX_PLAYERS_PER_MATCH) || 2;
const MAX_LOBBY_PLAYERS = MAX_PLAYERS_PER_MATCH;
// Minimum players required to start a match (default 2)
const MIN_PLAYERS_TO_START = Number(process.env.MIN_PLAYERS_TO_START) || 2;
// Default lobby countdown (ms) when minimum players reached — set to 30s
const MATCHMAKING_TIMEOUT_MS = Number(process.env.MATCHMAKING_TIMEOUT_MS) || 30000;
const LOBBY_COUNTDOWN_MS = MATCHMAKING_TIMEOUT_MS;
const PLAYER_RECONNECT_MS = Number(process.env.RECONNECT_TIMEOUT_MS) || 30000;
const MATCH_MAX_DURATION_MS = Number(process.env.MATCH_MAX_DURATION_MS) || 5 * 60 * 1000; // 5 minutes
const LANE_COUNT = 4;
const TEMP_MIN = 8;
const TEMP_MAX = 32;
const TEMP_SAFE_LO = 12;
const TEMP_SAFE_HI = 20;
const TEMP_START = 15;
const MAX_LANE_DELTA = 1;
const MAX_HIT_COOLDOWN = 300;
const MAX_BURST_COOLDOWN = 80;
const MAX_BURROW_COOLDOWN = 180;
const MAX_JUMP_COOLDOWN = 80;
const MAX_ATTACK_COOLDOWN = 120;
const MAX_PUSH_COOLDOWN = 240;
const MAX_INPUTS_PER_SECOND = 45;
const ATTACK_RANGE = 1;
const JUMP_HEIGHT = 18;
const MAX_PREDATOR_DELAY = 24; // ticks
const ENERGY_MAX = 100;
const ENERGY_START = 100;
const ENERGY_REGEN_RATE = 0.6;
const SPRINT_ENERGY_DRAIN = 1.2;
const SPRINT_TEMP_RATE = 0.02;
const PUSH_ENERGY_COST = 10;

// ── Ranked ELO configuration ─────────────────────────────────────
const INITIAL_ELO = 1000;
const ELO_K_VALUE = Number(process.env.ELO_K_VALUE) || 32;
const ELO_RANK_THRESHOLDS = [
  { min: 1800, rank: 'Grandmaster' },
  { min: 1600, rank: 'Master' },
  { min: 1400, rank: 'Diamond' },
  { min: 1200, rank: 'Platinum' },
  { min: 1000, rank: 'Gold' },
  { min: 800, rank: 'Silver' },
  { min: 0, rank: 'Bronze' },
];
const RANKED_MATCHMAKING_MAX_DIFFS = [
  { maxSeconds: 10, maxDiff: Number(process.env.ELO_MATCHMAKING_MAX_DIFF_0_10) || 100 },
  { maxSeconds: 20, maxDiff: Number(process.env.ELO_MATCHMAKING_MAX_DIFF_10_20) || 200 },
  { maxSeconds: 999999, maxDiff: Number(process.env.ELO_MATCHMAKING_MAX_DIFF_20_30) || 400 },
];

// ── Environment hazards (rats/stoats/cats) ──────────────────────────
// Obstacles are modeled in ticks, not pixels, so they render consistently
// across clients regardless of screen size.
const OBSTACLE_TRAVEL_TICKS = Number(process.env.OBSTACLE_TRAVEL_TICKS) || 60; // ~3s at 20 ticks/sec
const OBSTACLE_WARMUP_TICKS = Number(process.env.OBSTACLE_WARMUP_TICKS) || 60; // grace period at match start
const OBSTACLE_MAX_CONCURRENT = Number(process.env.OBSTACLE_MAX_CONCURRENT) || 3;
const OBSTACLE_CAT_UNLOCK_TICKS = Number(process.env.OBSTACLE_CAT_UNLOCK_TICKS) || 1800; // ~90s before cats appear

module.exports = {
  TICK_MS,
  MAX_PLAYERS_PER_MATCH,
  MAX_LOBBY_PLAYERS,
  MIN_PLAYERS_TO_START,
  MATCHMAKING_TIMEOUT_MS,
  LOBBY_COUNTDOWN_MS,
  PLAYER_RECONNECT_MS,
  MATCH_MAX_DURATION_MS,
  LANE_COUNT,
  TEMP_MIN,
  TEMP_MAX,
  TEMP_SAFE_LO,
  TEMP_SAFE_HI,
  TEMP_START,
  MAX_LANE_DELTA,
  MAX_HIT_COOLDOWN,
  MAX_BURST_COOLDOWN,
  MAX_BURROW_COOLDOWN,
  MAX_JUMP_COOLDOWN,
  MAX_ATTACK_COOLDOWN,
  MAX_PUSH_COOLDOWN,
  MAX_INPUTS_PER_SECOND,
  ATTACK_RANGE,
  JUMP_HEIGHT,
  ENERGY_MAX,
  ENERGY_START,
  ENERGY_REGEN_RATE,
  SPRINT_ENERGY_DRAIN,
  SPRINT_TEMP_RATE,
  PUSH_ENERGY_COST,
  INITIAL_ELO,
  ELO_K_VALUE,
  ELO_RANK_THRESHOLDS,
  RANKED_MATCHMAKING_MAX_DIFFS,
  MAX_PREDATOR_DELAY,
  OBSTACLE_TRAVEL_TICKS,
  OBSTACLE_WARMUP_TICKS,
  OBSTACLE_MAX_CONCURRENT,
  OBSTACLE_CAT_UNLOCK_TICKS
};