(function(root, factory) {
  const result = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = result;
  }
  root.buildSocketOptions = result.buildSocketOptions;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  function buildSocketOptions(authPayload = {}) {
    return {
      transports: ['websocket', 'polling'],
      auth: authPayload,
      reconnection: false,
      upgrade: true,
      rememberUpgrade: true,
    };
  }

  return { buildSocketOptions };
});
