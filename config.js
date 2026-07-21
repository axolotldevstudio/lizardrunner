// Frontend Configuration
// This file is safe to commit - it contains only public, non-sensitive configuration

const CONFIG = (() => {
  // Treat file:// as local dev too so opening index.html directly still connects to local server
  const isLocalhost = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Production backend URL - update this when deploying to production
  const PRODUCTION_BACKEND_URL = 'https://lizardrunnerserver.onrender.com';

  return {
    // Multiplayer backend Socket.IO server
    BACKEND_URL: isLocalhost ? 'http://localhost:3001' : PRODUCTION_BACKEND_URL,
    // Optional region mapping for multiplayer (used by region buttons in the UI)
    BACKEND_REGIONS: isLocalhost ? {
      us: 'http://localhost:3001',
      eu: 'http://localhost:3001',
      apac: 'http://localhost:3001'
    } : {
      us: PRODUCTION_BACKEND_URL,
      eu: PRODUCTION_BACKEND_URL,
      apac: PRODUCTION_BACKEND_URL
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
