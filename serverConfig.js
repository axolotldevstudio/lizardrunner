// =====================================================
// LIZARD RUNNER MULTIPLAYER SERVER CONFIGURATION
// CHANGE THESE URLS WHEN SERVERS CHANGE
// Example formats:
// http://12.34.56.78:3000
// https://example.com
// =====================================================

const SERVER_CONFIG = {
  singapore: "PUT_SINGAPORE_SERVER_URL_HERE",
  europe:    "PUT_EUROPE_SERVER_URL_HERE",
  global:    "PUT_AWS_GLOBAL_SERVER_URL_HERE"
};

// Expose for client scripts
window.SERVER_CONFIG = window.SERVER_CONFIG || SERVER_CONFIG;

// Export (for Node bundlers / tests if used)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SERVER_CONFIG;
}
