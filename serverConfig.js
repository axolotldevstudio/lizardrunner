// =====================================================
// LIZARD RUNNER MULTIPLAYER SERVER CONFIGURATION
// CHANGE THESE URLS WHEN SERVERS CHANGE
// Example formats:
// http://12.34.56.78:3000
// https://example.com
// =====================================================

const SERVER_CONFIG = {
  singapore: "https://lizardrunner.onrender.com",
  europe:    "https://anti-hook-won-picked.trycloudflare.com",
  global:    "https://anti-hook-won-picked.trycloudflare.com"
};

// Expose for client scripts
window.SERVER_CONFIG = window.SERVER_CONFIG || SERVER_CONFIG;

// Export (for Node bundlers / tests if used)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SERVER_CONFIG;
}
