// leaderboard.js — display only, scores submitted automatically on new high score

document.addEventListener('DOMContentLoaded', () => {
  const openBtn  = document.getElementById('leaderboard-btn');
  const modal    = document.getElementById('leaderboard');
  const closeBtn = document.getElementById('lb-close');
  const listEl   = document.getElementById('lb-list');

  async function refresh() {
    console.log('[LEADERBOARD] refresh start');
    listEl.innerHTML = '<li class="lb-loading">Loading…</li>';
    try {
      const rows = await window.fbFetchTopScores(10);
      console.log('[LEADERBOARD] refresh loaded', { count: rows.length });
      if (!rows.length) {
        listEl.innerHTML = '<li class="lb-empty">No scores yet — be the first!</li>';
        return;
      }
      listEl.innerHTML = '';
      const medals = ['🥇','🥈','🥉'];
      rows.forEach((r, i) => {
        const li = document.createElement('li');
        li.className = 'lb-row' + (i < 3 ? ' lb-top' : '');
        const isMe = window.currentUser && r.username === window.currentUser.username;
        li.innerHTML = `
          <span class="lb-rank">${medals[i] || (i + 1)}</span>
          <span class="lb-name${isMe ? ' lb-me' : ''}">${r.username}</span>
          <span class="lb-score">${r.score}m</span>
        `;
        listEl.appendChild(li);
      });
    } catch (err) {
      listEl.innerHTML = '<li class="lb-empty">Could not load scores</li>';
      console.error(err);
    }
  }

  openBtn?.addEventListener('click', async () => {
    modal.classList.remove('hidden');
    await refresh();
  });

  closeBtn?.addEventListener('click', () => modal.classList.add('hidden'));
});