(function(root, factory) {
  const result = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = result;
  }
  root.getMultiplayerOpponentLayout = result.getMultiplayerOpponentLayout;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  function getMultiplayerOpponentLayout(index, localX, scaleX) {
    const step = Math.round(55 * scaleX);
    const side = index % 2 === 0 ? 1 : -1;
    const rank = Math.ceil((index + 1) / 2);
    return {
      x: localX + side * step * rank,
      side,
      rank,
      step,
    };
  }

  return { getMultiplayerOpponentLayout };
});
