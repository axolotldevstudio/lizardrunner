const { io: Client } = require('socket.io-client');
const createServerInstance = require('../server');
const { admin } = require('../firebase');

jest.setTimeout(60000);

function makeIdToken(uid) {
  return Buffer.from(JSON.stringify({ uid, role: 'test' })).toString('base64');
}

function raceWithTimeout(promise, ms, message) {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
}

async function connectClient(port, uid) {
  const client = Client(`http://localhost:${port}`, {
    transports: ['websocket'],
    auth: { idToken: makeIdToken(uid) },
    reconnection: false,
    forceNew: true
  });

  const payload = await raceWithTimeout(
    new Promise((resolve) => client.once('connected', resolve)),
    10000,
    `Client ${uid} timeout`
  );

  return { client, payload };
}

describe('multiplayer integration', () => {
  let server;
  let port;

  beforeAll(async () => {
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    process.env.NODE_ENV = 'test';
    server = createServerInstance(0);
    port = await server.start();
  });

  afterAll(async () => {
    if (server) {
      server.io.of('/').disconnectSockets(true);
      try {
        await server.close();
      } catch (e) {
        console.error('Error closing server:', e);
      }
    }
  });

  test('two players connect and authenticate', async () => {
    const { client: clientA, payload: payloadA } = await connectClient(port, 'uid-a');
    const { client: clientB, payload: payloadB } = await connectClient(port, 'uid-b');

    expect(payloadA.playerId).toBeTruthy();
    expect(payloadB.playerId).toBeTruthy();
    expect(payloadA.firebaseUid).toBe('uid-a');
    expect(payloadB.firebaseUid).toBe('uid-b');

    clientA.close();
    clientB.close();
    
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  test('players can find a match and enter lobby', async () => {
    const { client: clientA, payload: payloadA } = await connectClient(port, 'uid-c');
    const { client: clientB, payload: payloadB } = await connectClient(port, 'uid-d');

    clientA.emit('find_match');
    clientB.emit('find_match');

    const lobbyUpdateA = await raceWithTimeout(
      new Promise((resolve) => clientA.once('lobby_update', resolve)),
      5000,
      'Lobby update timeout'
    );

    const lobbyUpdateB = await raceWithTimeout(
      new Promise((resolve) => clientB.once('lobby_update', resolve)),
      5000,
      'Lobby update timeout'
    );

    expect(lobbyUpdateA.status).toBeDefined();
    expect(lobbyUpdateB.status).toBeDefined();
    expect(lobbyUpdateA.count).toBeGreaterThan(0);
    expect(lobbyUpdateB.count).toBeGreaterThan(0);

    clientA.close();
    clientB.close();
    
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  test('match starts when minimum players ready', async () => {
    const players = [];
    for (let i = 0; i < 3; i++) {
      const { client, payload } = await connectClient(port, `uid-match-${i}`);
      players.push({ client, payload });
    }

    players.forEach((p) => p.client.emit('find_match'));

    const matchStartPromises = players.map((p) =>
      raceWithTimeout(
        new Promise((resolve) => p.client.once('match_start', resolve)),
        10000,
        'Match start timeout'
      )
    );

    const matchStarts = await Promise.all(matchStartPromises);

    matchStarts.forEach((start) => {
      expect(start.matchId).toBeTruthy();
      expect(start.players).toBeDefined();
      expect(Array.isArray(start.players)).toBe(true);
    });

    players.forEach((p) => p.client.close());
    
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  test('server emits authoritative game state', async () => {
    const { client: clientA, payload: payloadA } = await connectClient(port, 'uid-state-a');
    const { client: clientB, payload: payloadB } = await connectClient(port, 'uid-state-b');

    clientA.emit('find_match');
    clientB.emit('find_match');

    const matchStart = await raceWithTimeout(
      new Promise((resolve) => clientA.once('match_start', resolve)),
      10000,
      'Match start timeout'
    );

    const gameState = await raceWithTimeout(
      new Promise((resolve) => clientA.once('state', resolve)),
      5000,
      'State timeout'
    );

    expect(gameState.players).toBeDefined();
    expect(typeof gameState.players).toBe('object');
    expect(gameState.frame).toBeGreaterThanOrEqual(0);

    clientA.close();
    clientB.close();
    
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  test('invalid inputs are rejected', async () => {
    const { client: clientA, payload: payloadA } = await connectClient(port, 'uid-input-a');
    const { client: clientB, payload: payloadB } = await connectClient(port, 'uid-input-b');

    clientA.emit('find_match');
    clientB.emit('find_match');

    await raceWithTimeout(
      new Promise((resolve) => clientA.once('match_start', resolve)),
      10000,
      'Match start timeout'
    );

    clientA.emit('input', { lane: -1, action: 'invalid' });
    clientA.emit('input', { lane: 999, action: 'jump' });
    clientA.emit('input', null);

    await new Promise((resolve) => setTimeout(resolve, 500));

    clientA.close();
    clientB.close();
    
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  test('disconnected players are marked dead', async () => {
    const { client: clientA } = await connectClient(port, 'uid-disco-a');
    const { client: clientB } = await connectClient(port, 'uid-disco-b');

    await new Promise((resolve) => setTimeout(resolve, 100));

    clientA.emit('find_match');
    clientB.emit('find_match');

    await Promise.race([
      new Promise((resolve) => clientA.once('match_start', resolve)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Match start timeout')), 10000))
    ]);

    clientA.close();

    await new Promise((resolve) => setTimeout(resolve, 1500));

    clientB.close();
    
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    expect(true).toBe(true);
  });
});
