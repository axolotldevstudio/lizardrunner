/*
  serverManager.js
  Client-side server connection manager: health checks, latency, failover
  Attaches `window.serverManager` for multiplayer.js to use.

  Behavior summary:
  - Reads server list from `window.SERVER_CONFIG`
  - Exposes: checkServerHealth(region), checkAllServers(), findBestServer(),
    connectToServer(region, authPayload), connectToBestServer(authPayload),
    attemptFailover(oldSocket, authPayload)
*/

(function(){
  if (!window.SERVER_CONFIG) window.SERVER_CONFIG = {};

  const DEFAULT_HEALTH_PATH = '/health';
  const HEALTH_TIMEOUT_MS = 4000;
  const RECHECK_FAILED_MS = 45000; // 45s

  const state = {
    servers: {}, // region -> { url, status, latency, lastChecked, lastFailure }
  };

  function initServers() {
    Object.keys(window.SERVER_CONFIG).forEach(region => {
      state.servers[region] = {
        url: window.SERVER_CONFIG[region],
        status: 'CHECKING',
        latency: null,
        lastChecked: 0,
        lastFailure: 0
      };
    });
  }

  function timeoutFetch(url, options = {}, timeout = HEALTH_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const ac = new AbortController();
      const id = setTimeout(() => {
        ac.abort();
        reject(new Error('timeout'));
      }, timeout);
      fetch(url, { signal: ac.signal, ...options }).then(res => {
        clearTimeout(id);
        resolve(res);
      }).catch(err => {
        clearTimeout(id);
        reject(err);
      });
    });
  }

  async function checkServerHealth(region) {
    const info = state.servers[region];
    if (!info || !info.url) return { available: false };
    const healthUrl = info.url.replace(/\/$/, '') + DEFAULT_HEALTH_PATH;
    const start = Date.now();
    try {
      const res = await timeoutFetch(healthUrl, { method: 'GET', mode: 'cors' }, HEALTH_TIMEOUT_MS);
      if (!res.ok) throw new Error('bad status ' + res.status);
      const json = await res.json().catch(() => ({}));
      const latency = Date.now() - start;
      info.status = 'AVAILABLE';
      info.latency = latency;
      info.lastChecked = Date.now();
      return { available: true, latency, info, json };
    } catch (err) {
      info.status = 'UNAVAILABLE';
      info.latency = null;
      info.lastChecked = Date.now();
      info.lastFailure = Date.now();
      return { available: false, error: err };
    }
  }

  async function checkAllServers() {
    const regions = Object.keys(state.servers);
    const checks = regions.map(r => checkServerHealth(r).then(res => ({ region: r, res })).catch(err => ({ region: r, res: { available: false, error: err } })));
    const results = await Promise.all(checks);
    return results.reduce((acc, cur) => { acc[cur.region] = cur.res; return acc; }, {});
  }

  function availableServers() {
    return Object.entries(state.servers).filter(([r, info]) => info && info.status === 'AVAILABLE' && info.url).map(([r]) => r);
  }

  async function findBestServer() {
    // If no servers initialized, init
    if (!Object.keys(state.servers).length) initServers();

    // Re-check servers that haven't been checked recently or were failed long ago
    const regions = Object.keys(state.servers);
    const now = Date.now();
    const checks = regions.map(async (r) => {
      const info = state.servers[r];
      if (!info.url) return { region: r, available: false };
      // if lastChecked older than RECHECK_FAILED_MS or status is CHECKING, test it
      if (!info.lastChecked || (now - info.lastChecked > RECHECK_FAILED_MS) || info.status === 'CHECKING') {
        return { region: r, res: await checkServerHealth(r) };
      }
      return { region: r, res: { available: info.status === 'AVAILABLE', latency: info.latency } };
    });

    const results = await Promise.all(checks);
    const available = results.filter(r => r.res && r.res.available).map(r => ({ region: r.region, latency: r.res.latency || Number.MAX_SAFE_INTEGER }));
    if (!available.length) return null;
    available.sort((a,b) => a.latency - b.latency);
    return available[0].region;
  }

  function connectToServer(region, authPayload = {}) {
    return new Promise((resolve, reject) => {
      const info = state.servers[region];
      if (!info || !info.url) return reject(new Error('no-url'));
      try {
        const socket = io(info.url, {
          transports: ['polling'],
          auth: authPayload,
          reconnection: false // we handle reconnection/failover ourselves
        });

        const onConnect = () => {
          socket.off('connect_error', onError);
          resolve({ socket, region });
        };

        const onError = (err) => {
          socket.off('connect', onConnect);
          try { socket.disconnect(); } catch(e) {}
          reject(err || new Error('connect_error'));
        };

        socket.once('connect', onConnect);
        socket.once('connect_error', onError);

        // Safety: timeout
        const t = setTimeout(() => {
          socket.off('connect', onConnect);
          socket.off('connect_error', onError);
          try { socket.disconnect(); } catch(e) {}
          reject(new Error('connect_timeout'));
        }, 8000);

        // Clear timeout on settle
        Promise.resolve().then(() => {
          socket.once('connect', () => clearTimeout(t));
          socket.once('connect_error', () => clearTimeout(t));
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  async function connectToBestServer(authPayload = {}) {
    const best = await findBestServer();
    if (!best) throw new Error('no_available_servers');
    return connectToServer(best, authPayload);
  }

  async function attemptFailover(oldSocket, authPayload = {}) {
    // mark old server as failed and try others
    try {
      const prevUrl = oldSocket?.io?.uri || oldSocket?.nsp || null;
      // mark server as unavailable if matching one in config
      Object.entries(state.servers).forEach(([r, info]) => {
        if (info && info.url && prevUrl && info.url.indexOf(prevUrl) !== -1) {
          info.status = 'UNAVAILABLE';
          info.lastFailure = Date.now();
        }
      });
    } catch (_) {}

    const regions = Object.keys(state.servers);
    // try others ordered by last known latency
    const candidates = regions.map(r => ({ region: r, info: state.servers[r] })).filter(c => c.info && c.info.url && c.info.status !== 'UNAVAILABLE');
    // re-check health quickly for candidates
    for (const c of candidates) {
      const res = await checkServerHealth(c.region);
      if (res.available) {
        try {
          const { socket } = await connectToServer(c.region, authPayload);
          return { socket, region: c.region };
        } catch (err) {
          // mark failed and continue
          state.servers[c.region].status = 'UNAVAILABLE';
          state.servers[c.region].lastFailure = Date.now();
        }
      }
    }

    // Final attempt: re-run findBestServer which may re-check servers
    const best = await findBestServer();
    if (!best) throw new Error('no_available_servers');
    const result = await connectToServer(best, authPayload);
    return result;
  }

  // Expose manager
  window.serverManager = window.serverManager || {
    initServers,
    checkServerHealth,
    checkAllServers,
    findBestServer,
    connectToServer,
    connectToBestServer,
    attemptFailover,
    state
  };

  // initialize once
  initServers();
})();
