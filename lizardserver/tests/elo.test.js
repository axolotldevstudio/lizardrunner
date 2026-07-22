const {
  INITIAL_ELO,
  DEFAULT_ELO_K,
  calculateExpectedScore,
  calculateEloOutcome,
  getRankForElo,
  applyRankedMatchResult,
} = require('../elo');

function createFakeStore(initialUsers = {}) {
  const state = {
    users: { ...initialUsers },
    matchMarkers: {},
    history: {},
  };

  return {
    async read(path) {
      const parts = path.split('/').filter(Boolean);
      let cursor = state;
      for (const part of parts) {
        if (cursor == null) return null;
        cursor = cursor[part];
      }
      return cursor;
    },
    async write(path, value) {
      const parts = path.split('/').filter(Boolean);
      let cursor = state;
      for (let i = 0; i < parts.length - 1; i += 1) {
        const key = parts[i];
        if (!cursor[key] || typeof cursor[key] !== 'object') {
          cursor[key] = {};
        }
        cursor = cursor[key];
      }
      cursor[parts[parts.length - 1]] = value;
    },
    async transaction(path, updater) {
      const current = await this.read(path);
      const next = updater(current);
      if (next !== undefined) {
        await this.write(path, next);
      }
      return next;
    }
  };
}

describe('ranked ELO system', () => {
  it('starts new players at 1000 ELO', () => {
    expect(INITIAL_ELO).toBe(1000);
  });

  it('increases ELO for a win and decreases it for a loss', () => {
    const win = calculateEloOutcome(1000, 1000, 1, DEFAULT_ELO_K);
    const loss = calculateEloOutcome(1000, 1000, 0, DEFAULT_ELO_K);

    expect(win.newRating).toBeGreaterThan(1000);
    expect(loss.newRating).toBeLessThan(1000);
  });

  it('gives higher-rated players fewer points for beating lower-rated players', () => {
    const favorite = calculateEloOutcome(1400, 1000, 1, DEFAULT_ELO_K);
    const underdog = calculateEloOutcome(1000, 1400, 1, DEFAULT_ELO_K);

    expect(favorite.ratingDelta).toBeLessThan(underdog.ratingDelta);
  });

  it('assigns the correct rank for a given ELO', () => {
    expect(getRankForElo(799)).toBe('Bronze');
    expect(getRankForElo(800)).toBe('Silver');
    expect(getRankForElo(1000)).toBe('Gold');
    expect(getRankForElo(1200)).toBe('Platinum');
    expect(getRankForElo(1400)).toBe('Diamond');
    expect(getRankForElo(1600)).toBe('Master');
    expect(getRankForElo(1800)).toBe('Grandmaster');
  });

  it('calculates the expected score for two ratings', () => {
    const expected = calculateExpectedScore(1000, 1400);
    expect(expected).toBeLessThan(0.5);
  });

  it('prevents duplicate ranked match results from awarding ELO twice', async () => {
    const store = createFakeStore({
      'uid-a': { elo: 1000, rankedWins: 0, rankedLosses: 0, rankedGames: 0 },
      'uid-b': { elo: 1000, rankedWins: 0, rankedLosses: 0, rankedGames: 0 },
    });

    const first = await applyRankedMatchResult(store, 'match-1', [
      { uid: 'uid-a', id: 'a' },
      { uid: 'uid-b', id: 'b' },
    ], ['a']);

    const second = await applyRankedMatchResult(store, 'match-1', [
      { uid: 'uid-a', id: 'a' },
      { uid: 'uid-b', id: 'b' },
    ], ['a']);

    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    const profileA = await store.read('users/uid-a');
    expect(profileA.rankedGames).toBe(1);
    expect(profileA.elo).toBeGreaterThan(1000);
  });
});
