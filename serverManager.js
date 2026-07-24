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
  const root = typeof window !== 'undefined' ? window : globalThis;
  if (!root.SERVER_CONFIG) root.SERVER_CONFIG = {};

  const DEFAULT_HEALTH_PATH = '/health';
  const HEALTH_TIMEOUT_MS = 4000;
  const CONNECT_TIMEOUT_MS = 6000;
  const RECHECK_FAILED_MS = 45000; // 45s

  const state = {
    servers: {}, // region -> { url, status, latency, lastChecked, lastFailure }
  };

  function initServers() {
    Object.keys(root.SERVER_CONFIG).forEach(region => {
      state.servers[region] = {
        url: root.SERVER_CONFIG[region],
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
    // Avoid mixed-content: if the page is served over HTTPS, prefer HTTPS health checks.
    let baseUrl = info.url;
    if (location && location.protocol === 'https:') {
      if (baseUrl.startsWith('http://')) {
        // try https variant first
        baseUrl = baseUrl.replace(/^http:\/\//i, 'https://');
      }
    }
    // If still an insecure http URL on an https page, skip to avoid browser blocking
    if (location && location.protocol === 'https:' && baseUrl.startsWith('http://')) {
      info.status = 'UNAVAILABLE';
      info.latency = null;
      info.lastChecked = Date.now();
      info.lastFailure = Date.now();
      return { available: false, error: new Error('insecure_protocol') };
    }

    const healthUrl = baseUrl.replace(/\/$/, '') + DEFAULT_HEALTH_PATH;
    const queueUrl = baseUrl.replace(/\/$/, '') + '/matchmaking/queue';
    const start = Date.now();
    try {
      const res = await timeoutFetch(healthUrl, { method: 'GET', mode: 'cors' }, HEALTH_TIMEOUT_MS);
      if (!res.ok) throw new Error('bad status ' + res.status);
      const json = await res.json().catch(() => ({}));
      const queueRes = await timeoutFetch(queueUrl, { method: 'GET', mode: 'cors' }, HEALTH_TIMEOUT_MS).catch(() => null);
      let queueInfo = null;
      if (queueRes && queueRes.ok) {
        queueInfo = await queueRes.json().catch(() => null);
      }
      const latency = Date.now() - start;
      info.status = 'AVAILABLE';
      info.latency = latency;
      info.queueInfo = queueInfo && queueInfo.queue ? queueInfo.queue : null;
      info.lastChecked = Date.now();
      return { available: true, latency, info, json, queueInfo: info.queueInfo };
    } catch (err) {
      info.status = 'UNAVAILABLE';
      info.latency = null;
      info.queueInfo = null;
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

  async function findBestServer(preferredUrl = null) {
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
      return { region: r, res: { available: info.status === 'AVAILABLE', latency: info.latency, queueInfo: info.queueInfo } };
    });

    const results = await Promise.all(checks);
    const available = results.filter(r => r.res && r.res.available).map(r => ({
      region: r.region,
      latency: r.res.latency || Number.MAX_SAFE_INTEGER,
      url: state.servers[r.region]?.url || null,
      queueInfo: r.res.queueInfo || state.servers[r.region]?.queueInfo || null,
    }));
    if (!available.length) return null;
    const ranked = rankServerCandidates(available, preferredUrl);
    return ranked[0]?.region || null;
  }

  function rankServerCandidates(candidates = [], preferredUrl = null) {
    const normalizedPreferred = preferredUrl ? preferredUrl.replace(/\/$/, '') : null;
    return candidates
      .filter((entry) => entry && entry.url)
      .map((entry) => ({
        ...entry,
        preferred: Boolean(normalizedPreferred && entry.url.replace(/\/$/, '') === normalizedPreferred),
        queueScore: Number(entry.queueInfo?.totalWaiting || 0),
        hasWaiters: Number(entry.queueInfo?.totalWaiting || 0) > 0,
      }))
      .sort((a, b) => {
        const aHasWaiters = a.hasWaiters;
        const bHasWaiters = b.hasWaiters;
        if (a.preferred && aHasWaiters && !(b.preferred && bHasWaiters)) return -1;
        if (b.preferred && bHasWaiters && !(a.preferred && aHasWaiters)) return 1;
        if (aHasWaiters !== bHasWaiters) return aHasWaiters ? -1 : 1;
        if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
        if (b.queueScore !== a.queueScore) return b.queueScore - a.queueScore;
        const aLatency = Number.isFinite(a.latency) ? a.latency : Number.MAX_SAFE_INTEGER;
        const bLatency = Number.isFinite(b.latency) ? b.latency : Number.MAX_SAFE_INTEGER;
        return aLatency - bLatency;
      });
  }

  async function connectToServer(region, authPayload = {}) {
    return new Promise((resolve, reject) => {
      const info = state.servers[region];
      if (!info || !info.url) return reject(new Error('no-url'));
      try {
        // If the page is https, prefer https endpoints to avoid mixed content blocks
        let connectUrl = info.url;
        if (location && location.protocol === 'https:') {
          if (connectUrl.startsWith('http://')) {
            connectUrl = connectUrl.replace(/^http:\/\//i, 'https://');
          }
        }

        if (location && location.protocol === 'https:' && connectUrl.startsWith('http://')) {
          return reject(new Error('insecure_protocol'));
        }

        const socket = io(connectUrl, {
          ...buildSocketOptions(authPayload),
          reconnection: false // we handle reconnection/failover ourselves
        });

        const onConnect = () => {
          socket.off('connect_error', onError);
          resolve({ socket, region, url: connectUrl });
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
        }, CONNECT_TIMEOUT_MS);

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

  async function connectToBestServer(authPayload = {}, preferredUrl = null) {
    const best = await findBestServer(preferredUrl);
    if (best) {
      return connectToServer(best, authPayload);
    }

    const regions = Object.keys(state.servers);
    for (const region of regions) {
      const info = state.servers[region];
      if (!info || !info.url) continue;
      try {
        const result = await connectToServer(region, authPayload);
        return result;
      } catch (err) {
        state.servers[region].status = 'UNAVAILABLE';
        state.servers[region].lastFailure = Date.now();
      }
    }

    throw new Error('no_available_servers');
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
  root.serverManager = root.serverManager || {
    initServers,
    checkServerHealth,
    checkAllServers,
    findBestServer,
    connectToServer,
    connectToBestServer,
    attemptFailover,
    rankServerCandidates,
    state
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      rankServerCandidates,
    };
  }

  // initialize once
  initServers();
})();
