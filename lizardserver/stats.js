// lizardserver/stats.js - Server-authoritative multiplayer stats tracking

const { rtdb } = require('./firebase');

/**
 * Submit match results to Firebase
 * Called when match ends - stores stats server-side
 * @param {string} matchId - Unique match identifier
 * @param {Array} players - Player objects from match
 * @param {Array} winnerIds - IDs of winning players
 */
async function submitMatchResults(matchId, players, winnerIds) {
  if (!rtdb) {
    console.warn('[STATS] Firebase Realtime Database not initialized, skipping stats submission');
    return;
  }

  try {
    const timestamp = Date.now();
    const matchDuration = Math.floor((timestamp - (players[0]?.matchStartTime || timestamp)) / 1000);

    // Calculate placement for each player
    const placements = calculatePlacements(players, winnerIds);

    // Store per-player stats
    for (const player of players) {
      if (!player.firebaseUid) continue;

      const placement = placements[player.id];
      const isWinner = winnerIds.includes(player.id);
      const kills = player.kills || 0;

      const statsEntry = {
        matchId,
        timestamp,
        placement,
        kills,
        score: Math.floor(player.score || 0),
        survived: Math.floor(matchDuration),
        won: isWinner
      };

      // Store in /multiplayer/players/{uid}/matches/{matchId}
      await rtdb.ref(`multiplayer/players/${player.firebaseUid}/matches/${matchId}`).set({
        ...statsEntry,
        serverVerified: true
      });

      // Update user's aggregate stats in /multiplayer/stats/{uid}
      await updatePlayerStats(player.firebaseUid, placement, isWinner, kills);
    }

    // Store match summary in /multiplayer/matches/{matchId}
    await rtdb.ref(`multiplayer/matches/${matchId}`).set({
      timestamp,
      duration: matchDuration,
      playerCount: players.length,
      winners: winnerIds,
      results: placements,
      serverVerified: true
    });

    console.log(`[STATS] Match ${matchId} results submitted: ${players.length} players, winners: ${winnerIds.join(',')}`);
  } catch (err) {
    console.error('[STATS] Error submitting match results:', err);
  }
}

/**
 * Update aggregated multiplayer stats for a player
 * @param {string} uid - Firebase UID
 * @param {number} placement - 1st, 2nd, 3rd, etc.
 * @param {boolean} won - Did player win?
 * @param {number} kills - Kills in this match
 */
async function updatePlayerStats(uid, placement, won, kills) {
  if (!rtdb) return;

  const statsRef = rtdb.ref(`multiplayer/stats/${uid}`);

  return statsRef.transaction((current) => {
    if (!current) {
      // First match
      return {
        matches: 1,
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        totalKills: kills,
        top3Finishes: placement <= 3 ? 1 : 0,
        bestPlacement: placement,
        lastMatch: Date.now()
      };
    }

    // Subsequent matches
    const updated = {
      ...current,
      matches: (current.matches || 0) + 1,
      wins: (current.wins || 0) + (won ? 1 : 0),
      losses: (current.losses || 0) + (won ? 0 : 1),
      totalKills: (current.totalKills || 0) + kills,
      top3Finishes: (current.top3Finishes || 0) + (placement <= 3 ? 1 : 0),
      bestPlacement: Math.min(current.bestPlacement || 999, placement),
      lastMatch: Date.now()
    };

    // Calculate win rate
    updated.winRate = (updated.wins / updated.matches * 100).toFixed(1);

    return updated;
  });
}

/**
 * Calculate final placement for each player
 * Placement is determined by: survival time, then kills as tiebreaker
 * @param {Array} players - Player objects
 * @param {Array} winnerIds - Winner IDs (placed 1st)
 * @returns {Object} Map of playerId -> placement
 */
function calculatePlacements(players, winnerIds) {
  const placements = {};

  // Sort by survival time (longer = better), then by kills
  const sorted = [...players].sort((a, b) => {
    const scoreA = a.score || 0;
    const scoreB = b.score || 0;
    if (scoreA !== scoreB) return scoreB - scoreA; // Higher score is better
    return (b.kills || 0) - (a.kills || 0); // Tiebreaker: more kills is better
  });

  sorted.forEach((player, index) => {
    placements[player.id] = index + 1;
  });

  return placements;
}

/**
 * Fetch top multiplayer players for leaderboard display
 * Ranks by: wins → top 3 finishes → kill count → best placement
 * @param {number} limit - Number of players to return
 * @returns {Promise<Array>} Array of player leaderboard entries
 */
async function fetchMultiplayerLeaderboard(limit = 10) {
  if (!rtdb) return [];

  try {
    const snapshot = await rtdb.ref('multiplayer/stats').orderByChild('wins').limitToLast(limit * 2).once('value');
    
    if (!snapshot.exists()) return [];

    const players = [];
    snapshot.forEach((childSnapshot) => {
      const uid = childSnapshot.key;
      const stats = childSnapshot.val();
      players.push({
        uid,
        username: stats.username || `Player_${uid.slice(0, 6)}`,
        wins: stats.wins || 0,
        matches: stats.matches || 0,
        top3Finishes: stats.top3Finishes || 0,
        totalKills: stats.totalKills || 0,
        bestPlacement: stats.bestPlacement || 999,
        winRate: stats.winRate || 0,
        lastMatch: stats.lastMatch || 0
      });
    });

    // Sort by ranking criteria: wins → top 3 finishes → kills → best placement
    players.sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.top3Finishes !== b.top3Finishes) return b.top3Finishes - a.top3Finishes;
      if (a.totalKills !== b.totalKills) return b.totalKills - a.totalKills;
      return a.bestPlacement - b.bestPlacement;
    });

    return players.slice(0, limit);
  } catch (err) {
    console.error('[STATS] Error fetching multiplayer leaderboard:', err);
    return [];
  }
}

module.exports = {
  submitMatchResults,
  updatePlayerStats,
  calculatePlacements,
  fetchMultiplayerLeaderboard
};
