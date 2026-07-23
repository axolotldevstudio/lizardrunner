// Frontend Configuration
// This file is safe to commit - it contains only public, non-sensitive configuration

const CONFIG = (() => {
  // Treat file:// as local dev too so opening index.html directly still connects to local server
  const isLocalhost = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Production backend URL - update this when deploying to production
  const PRODUCTION_BACKEND_URL = 'https://lizardrunnerserver.onrender.com';

  // If `serverConfig.js` is present it exposes `window.SERVER_CONFIG`.
  // Prefer `SERVER_CONFIG.global` as the canonical production backend when present.
  const PREFERRED_GLOBAL_BACKEND = (window.SERVER_CONFIG && window.SERVER_CONFIG.global) ? window.SERVER_CONFIG.global : PRODUCTION_BACKEND_URL;

  return {
    // Multiplayer backend Socket.IO server
    BACKEND_URL: isLocalhost ? 'http://localhost:3001' : PREFERRED_GLOBAL_BACKEND,
    // Optional region mapping for multiplayer (used by region buttons in the UI)
    BACKEND_REGIONS: isLocalhost ? {
      us: 'http://localhost:3001',
      eu: 'http://localhost:3001',
      apac: 'http://localhost:3001'
    } : {
      us: PREFERRED_GLOBAL_BACKEND,
      eu: PREFERRED_GLOBAL_BACKEND,
      apac: PREFERRED_GLOBAL_BACKEND
    },
    
    // Environment
    ENVIRONMENT: isLocalhost ? 'development' : 'production',
    IS_DEV: isLocalhost,
    
    // Feature flags
    ENABLE_MULTIPLAYER: true,
    ENABLE_LEADERBOARDS: true,
    ENABLE_STORE: true,
    
    // Gameplay constants
    MAX_LOBBY_PLAYERS: 10,
    MIN_LOBBY_PLAYERS: 2,
    
    // Display
    DEBUG_MODE: isLocalhost,
  };
})();

// Make CONFIG globally available
window.CONFIG = CONFIG;
