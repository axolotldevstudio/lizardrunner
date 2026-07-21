const http = require('http');
const { Server } = require('socket.io');
const { initFirebase, admin } = require('../firebase');
const { createServer } = require('http');

function createTestServer() {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    transports: ['websocket']
  });

  process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
  initFirebase();

  // Minimal stub for auth verification that matches the server expectations.
  if (admin && admin.auth) {
    const auth = admin.auth();
    if (!auth.verifyIdToken) {
      auth.verifyIdToken = async (token) => ({ uid: Buffer.from(token, 'base64').toString('utf8') });
    }
  }

  const server = require('../server');
  return { httpServer, io, server };
}
