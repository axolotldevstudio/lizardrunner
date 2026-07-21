const { io: Client } = require('socket.io-client');
const createServerInstance = require('../server');
const { admin } = require('../firebase');

jest.setTimeout(60000);

function makeIdToken(uid) {
  return Buffer.from(JSON.stringify({ uid, role: 'test' })).toString('base64');
}

describe('multiplayer integration', () => {
  let server;
  let port;

  beforeAll(async () => {
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    process.env.NODE_ENV = 'test';
    if (admin) {
      admin.auth = () => ({
        verifyIdToken: async (token) => {
          const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
          return { uid: decoded.uid };
        }
      });
    }
    server = createServerInstance(0);
    port = await server.start();
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  test('two players connect and authenticate', async () => {
    const clientA = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { idToken: makeIdToken('uid-a') }
    });
    const clientB = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { idToken: makeIdToken('uid-b') }
    });

    clientA.on('connect_error', (error) => {
      throw new Error(`Client A failed to connect: ${error.message}`);
    });
    clientB.on('connect_error', (error) => {
      throw new Error(`Client B failed to connect: ${error.message}`);
    });

    const payloadA = await new Promise((resolve) => clientA.once('connected', resolve));
    const payloadB = await new Promise((resolve) => clientB.once('connected', resolve));

    expect(payloadA.playerId).toBeTruthy();
    expect(payloadB.playerId).toBeTruthy();
    expect(payloadA.firebaseUid).toBe('uid-a');
    expect(payloadB.firebaseUid).toBe('uid-b');

    clientA.close();
    clientB.close();
  });
});
