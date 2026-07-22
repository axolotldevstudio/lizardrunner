const io = require('socket.io-client');

function makeClient(name) {
  const socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });
  socket.on('connect', () => console.log(`${name} connected as ${socket.id}`));
  socket.on('disconnect', () => console.log(`${name} disconnected`));
  socket.on('lobby_update', (payload) => console.log(`${name} lobby_update:`, payload.status, payload.count));
  socket.on('match_start', (payload) => console.log(`${name} match_start:`, payload.matchId));
  socket.on('match_end', (payload) => console.log(`${name} match_end:`, payload.winnerIds));
  socket.on('ranked_result', (payload) => console.log(`${name} ranked_result:`, JSON.stringify(payload, null, 2)));
  socket.on('state', (s) => {});
  socket.on('connect_error', (err) => console.log(`${name} connect_error:`, err && err.message));
  return socket;
}

async function run() {
  const a = makeClient('Alice');
  const b = makeClient('Bob');

  await new Promise(r => setTimeout(r, 500));
  a.emit('find_match', { mode: 'ranked' });
  b.emit('find_match', { mode: 'ranked' });

  // wait up to 30s for ranked_result
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for ranked_result')), 30000);
    function cleanup() {
      clearTimeout(timeout);
      a.disconnect();
      b.disconnect();
      resolve();
    }
    a.on('ranked_result', (p) => { console.log('Alice received ranked_result'); cleanup(); });
    b.on('ranked_result', (p) => { console.log('Bob received ranked_result'); cleanup(); });
  }).catch((err) => { console.error(err && err.message); });
}

run();
