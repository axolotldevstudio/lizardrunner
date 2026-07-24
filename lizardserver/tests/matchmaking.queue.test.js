const test = require('node:test');
const assert = require('node:assert/strict');

const Matchmaking = require('../matchmaking');
const { rankServerCandidates } = require('../../serverManager');

test('Matchmaking exposes waiting counts by mode', () => {
  const matchmaking = new Matchmaking({}, () => {});
  const playerA = { id: 'a', lobby: null, match: null, socket: null };
  const playerB = { id: 'b', lobby: null, match: null, socket: null };
  const playerC = { id: 'c', lobby: null, match: null, socket: null };

  matchmaking.joinQueue(playerA, 'casual');
  matchmaking.joinQueue(playerB, 'casual');
  matchmaking.joinQueue(playerC, 'ranked');

  const snapshot = matchmaking.getQueueSnapshot();
  assert.equal(snapshot.casual, 2);
  assert.equal(snapshot.ranked, 1);
  assert.equal(snapshot.totalWaiting, 3);
  assert.equal(snapshot.lobbyCount, 2);
});

test('rankServerCandidates prefers the preferred server and then servers with more waiters', () => {
  const results = rankServerCandidates([
    { region: 'eu', url: 'https://eu.example', latency: 80, queueInfo: { totalWaiting: 1, casual: 1, ranked: 0 } },
    { region: 'us', url: 'https://us.example', latency: 30, queueInfo: { totalWaiting: 2, casual: 2, ranked: 0 } },
    { region: 'apac', url: 'https://apac.example', latency: 20, queueInfo: { totalWaiting: 0, casual: 0, ranked: 0 } },
  ], 'https://us.example');

  assert.equal(results[0].region, 'us');
  assert.equal(results[1].region, 'eu');
  assert.equal(results[2].region, 'apac');
});
