// leaderboard.js - display separate single-player and multiplayer leaderboards

const LEADERBOARD_MODES = {
  SINGLE_PLAYER: 'singleplayer',
  MULTIPLAYER: 'multiplayer'
};

let currentLeaderboardMode = LEADERBOARD_MODES.SINGLE_PLAYER;

document.addEventListener('DOMContentLoaded', () => {
  const openBtn = document.getElementById('leaderboard-btn');
  const modal = document.getElementById('leaderboard');
  const closeBtn = document.getElementById('lb-close');
  const listEl = document.getElementById('lb-list');
  const tabButtons = document.querySelectorAll('.lb-tab-btn');
  const multiplayerTab = document.querySelector('.lb-tab-btn[data-mode="multiplayer"]');

  if (!window.CONFIG?.ENABLE_MULTIPLAYER && multiplayerTab) {
    multiplayerTab.classList.add('hidden');
  }

  if (!window.CONFIG?.ENABLE_LEADERBOARDS) {
    openBtn?.classList.add('hidden');
    return;
  }

  async function refreshSinglePlayer() {
    console.log('[LEADERBOARD] refreshing single-player');
    listEl.innerHTML = '<li class="lb-loading">Loading single-player scores...</li>';
    try {
      const rows = await window.fbFetchTopScores(10);
      console.log('[LEADERBOARD] loaded single-player scores', { count: rows.length });
      if (!rows.length) {
        listEl.innerHTML = '<li class="lb-empty">No scores yet - be the first!</li>';
        return;
      }
      listEl.innerHTML = '';
      const medals = ['🥇', '🥈', '🥉'];
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

  async function refreshMultiplayer() {
    console.log('[LEADERBOARD] refreshing multiplayer');
    listEl.innerHTML = '<li class="lb-loading">Loading multiplayer rankings...</li>';
    try {
      const rows = await window.fbFetchMultiplayerLeaderboard(10);
      console.log('[LEADERBOARD] loaded multiplayer leaderboard', { count: rows.length });
      if (!rows.length) {
        listEl.innerHTML = '<li class="lb-empty">No competitive matches yet</li>';
        return;
      }
      listEl.innerHTML = '';
      const medals = ['🥇', '🥈', '🥉'];
      rows.forEach((r, i) => {
        const li = document.createElement('li');
        li.className = 'lb-row lb-mp' + (i < 3 ? ' lb-top' : '');
        const isMe = window.currentUser && r.username === window.currentUser.username;
        const winRate = Number(r.winRate) || 0;
        li.innerHTML = `
          <span class="lb-rank">${medals[i] || (i + 1)}</span>
          <span class="lb-name${isMe ? ' lb-me' : ''}">${r.username}</span>
          <span class="lb-stat">${r.wins}W</span>
          <span class="lb-stat">${r.matches}M</span>
          <span class="lb-stat">${winRate.toFixed(0)}%</span>
        `;
        listEl.appendChild(li);
      });
    } catch (err) {
      listEl.innerHTML = '<li class="lb-empty">Could not load leaderboard</li>';
      console.error(err);
    }
  }

  async function refresh() {
    if (currentLeaderboardMode === LEADERBOARD_MODES.MULTIPLAYER) {
      if (!window.CONFIG?.ENABLE_MULTIPLAYER) {
        currentLeaderboardMode = LEADERBOARD_MODES.SINGLE_PLAYER;
      } else {
        await refreshMultiplayer();
        return;
      }
    }
    await refreshSinglePlayer();
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentLeaderboardMode = btn.dataset.mode;
      refresh();
    });
  });

  openBtn?.addEventListener('click', async () => {
    modal.classList.remove('hidden');
    await refresh();
  });

  closeBtn?.addEventListener('click', () => modal.classList.add('hidden'));
});