const { INITIAL_ELO, ELO_K_VALUE, ELO_RANK_THRESHOLDS } = require('./constants');

function calculateExpectedScore(ratingA, ratingB) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function calculateEloOutcome(ratingA, ratingB, actualScore, kValue = ELO_K_VALUE) {
  const expectedScoreA = calculateExpectedScore(ratingA, ratingB);
  const newRating = Math.round(ratingA + kValue * (actualScore - expectedScoreA));
  const ratingDelta = newRating - ratingA;
  return {
    expectedScoreA,
    newRating,
    ratingDelta,
  };
}

function getRankForElo(elo) {
  const value = Number(elo) || 0;
  const thresholds = [...(ELO_RANK_THRESHOLDS || [])].sort((a, b) => a.min - b.min);
  for (let index = thresholds.length - 1; index >= 0; index -= 1) {
    const threshold = thresholds[index];
    if (value >= threshold.min) {
      return threshold.rank;
    }
  }
  return 'Bronze';
}

async function applyRankedMatchResult(store, matchId, players, winnerIds, options = {}) {
  const mode = options.mode || 'ranked';
  console.log(`[ELO] applyRankedMatchResult called for match ${matchId} mode=${mode}`);
  if (mode !== 'ranked') {
    console.log(`[ELO] Match ${matchId} is casual — skipping ELO update`);
    return { applied: false, reason: 'casual' };
  }

  const markerRef = `rankedMatches/${matchId}`;
  try {
    const existing = await store.read(markerRef);
    if (existing) {
      console.log(`[ELO] Match ${matchId} already processed (marker exists)`);
      return { applied: false, reason: 'duplicate' };
    }
  } catch (e) {
    console.error('[ELO] ERROR reading markerRef:', e && e.message ? e.message : e);
    throw e;
  }

  const winnerSet = new Set(winnerIds || []);
  const updates = [];

  for (const player of players) {
    const uid = player.uid || player.firebaseUid || player.id;
    if (!uid) continue;
    const profile = await store.read(`users/${uid}`);
    const currentElo = Number(profile?.elo ?? INITIAL_ELO);
    console.log(`[ELO] Player ${player.id} -> uid=${uid} currentElo=${currentElo}`);
    const opponent = players.find((candidate) => candidate.id !== player.id && (candidate.uid || candidate.firebaseUid || candidate.id));
    const opponentUid = opponent?.uid || opponent?.firebaseUid || opponent?.id;
    const opponentProfile = opponentUid ? await store.read(`users/${opponentUid}`) : null;
    const opponentElo = Number(opponentProfile?.elo ?? INITIAL_ELO);
    console.log(`[ELO] Opponent for ${uid}: uid=${opponentUid} elo=${opponentElo}`);
    const actualScore = winnerSet.has(player.id) ? 1 : (winnerSet.size === 0 ? 0.5 : 0);
    const next = calculateEloOutcome(currentElo, opponentElo, actualScore, options.kValue || ELO_K_VALUE);
    const delta = next.newRating - currentElo;
    const nextProfile = {
      ...(profile || {}),
      elo: next.newRating,
      rankedWins: Number(profile?.rankedWins || 0) + (actualScore === 1 ? 1 : 0),
      rankedLosses: Number(profile?.rankedLosses || 0) + (actualScore === 0 ? 1 : 0),
      rankedGames: Number(profile?.rankedGames || 0) + 1,
      rank: getRankForElo(next.newRating),
      lastRankedResultAt: Date.now(),
    };
    updates.push({ uid, profile: nextProfile, eloDelta: delta, actualScore, eloBefore: currentElo, eloAfter: next.newRating });
  }

  for (const update of updates) {
    const historyKey = `rankedHistory/${matchId}/${update.uid}`;
    await store.write(historyKey, {
      matchId,
      uid: update.uid,
      opponentUid: players.find((player) => (player.uid || player.firebaseUid || player.id) !== update.uid)?.uid || null,
      result: update.actualScore === 1 ? 'win' : (update.actualScore === 0.5 ? 'draw' : 'loss'),
      eloBefore: update.eloBefore,
      eloDelta: update.eloDelta,
      eloAfter: update.profile.elo,
      timestamp: Date.now(),
    });
    const writeFn = typeof store.transaction === 'function' ? store.transaction.bind(store) : null;
    if (writeFn) {
      const txnRes = await writeFn(`users/${update.uid}`, (current) => ({ ...(current || {}), ...update.profile }));
      console.log(`[ELO] Transactioned users/${update.uid} -> committed=${txnRes && txnRes.committed}`);
    } else {
      await store.write(`users/${update.uid}`, update.profile);
      console.log(`[ELO] Wrote users/${update.uid} via write()`);
    }
  }

  await store.write(markerRef, { matchId, completedAt: Date.now(), winnerIds: [...winnerSet] });
  console.log(`[ELO] Wrote marker for match ${matchId}`);

  return {
    applied: true,
    matchId,
    updates,
  };
}

module.exports = {
  INITIAL_ELO,
  DEFAULT_ELO_K: ELO_K_VALUE,
  calculateExpectedScore,
  calculateEloOutcome,
  getRankForElo,
  applyRankedMatchResult,
};
