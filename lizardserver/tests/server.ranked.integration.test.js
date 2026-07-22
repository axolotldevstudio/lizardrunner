const Client = require('socket.io-client');
const createServerInstance = require('../server');

jest.setTimeout(30000);

function makeIdToken(uid) {
  return Buffer.from(JSON.stringify({ uid, role: 'test' })).toString('base64');
}

function raceWithTimeout(promise, ms, message) {
  let timeoutHandle;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(message)), ms);
    })
  ]).finally(() => clearTimeout(timeoutHandle));
}

describe('ranked match pipeline', () => {
  let serverInstance;
  let port;
  let clientA;
  let clientB;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    serverInstance = createServerInstance(0);
    port = await serverInstance.start();
    clientA = Client(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      auth: { idToken: makeIdToken('uid-a') }
    });
    clientB = Client(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      auth: { idToken: makeIdToken('uid-b') }
    });

    await Promise.all([
      new Promise((resolve) => clientA.once('connect', resolve)),
      new Promise((resolve) => clientB.once('connect', resolve)),
    ]);
  });

  afterAll(async () => {
    clientA.close();
    clientB.close();
    await serverInstance.close();
  });

  it('emits ranked_result after a ranked match ends', async () => {
    const results = [];
    const matchStartPromise = Promise.all([
      new Promise((resolve) => clientA.once('match_start', resolve)),
      new Promise((resolve) => clientB.once('match_start', resolve)),
    ]);

    clientA.emit('find_match', { mode: 'ranked' });
    clientB.emit('find_match', { mode: 'ranked' });

    await raceWithTimeout(matchStartPromise, 10000, 'Match did not start in time');

    const payloadPromise = new Promise((resolve) => {
      clientA.once('ranked_result', (payload) => { results.push(payload); resolve(results); });
      clientB.once('ranked_result', (payload) => { results.push(payload); resolve(results); });
    });

    clientA.emit('input', { type: 'attack' });

    const payloads = await raceWithTimeout(payloadPromise, 10000, 'Timed out waiting for ranked_result');

    expect(payloads.length).toBeGreaterThan(0);
    expect(payloads[0]).toHaveProperty('mode', 'ranked');
    expect(payloads[0]).toHaveProperty('updates');
    expect(payloads[0].updates.length).toBe(2);
    expect(payloads[0].updates.some((u) => u.actualScore === 1)).toBe(true);
    expect(payloads[0].updates.some((u) => u.actualScore === 0)).toBe(true);
  });
});
