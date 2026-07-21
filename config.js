// Frontend Configuration
// This file is safe to commit - it contains only public, non-sensitive configuration

const CONFIG = (() => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Production backend URL - update this when deploying to production
  const PRODUCTION_BACKEND_URL = 'https://your-northflank-backend-url.com';
  
  return {
    // Multiplayer backend Socket.IO server
    BACKEND_URL: isLocalhost 
      ? 'http://localhost:3001'
      : PRODUCTION_BACKEND_URL,
    
    // Environment
    ENVIRONMENT: isLocalhost ? 'development' : 'production',
    IS_DEV: isLocalhost,
    
    // Feature flags
    ENABLE_MULTIPLAYER: true,
    ENABLE_LEADERBOARDS: true,
    ENABLE_STORE: true,
    
    // Gameplay constants
    MAX_LOBBY_PLAYERS: 30,
    MIN_LOBBY_PLAYERS: 2,
    
    // Display
    DEBUG_MODE: isLocalhost,
  };
})();

// Make CONFIG globally available
window.CONFIG = CONFIG;
