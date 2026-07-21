const STORE_ITEMS = {
  skins: [
    { id: 'classic',    name: 'Classic',     icon: '🦎', price: 0,    body: [70,130,60],   belly: [90,160,75],  desc: 'The original' },
    { id: 'gecko',      name: 'Gecko',       icon: '🟡', price: 80,   body: [200,175,80],  belly: [230,210,120],desc: 'Pale & spotty' },
    { id: 'iguana',     name: 'Iguana',      icon: '🟢', price: 120,  body: [40,100,180],  belly: [60,130,200], desc: 'Ocean blue' },
    { id: 'skink',      name: 'Skink',       icon: '🟤', price: 100,  body: [140,90,50],   belly: [180,130,80], desc: 'Earthy brown' },
    { id: 'albino',     name: 'Albino',      icon: '⬜', price: 200,  body: [230,225,215], belly: [245,240,235],desc: 'Rare white' },
    { id: 'golden',     name: 'Golden',      icon: '🟡', price: 350,  body: [200,160,30],  belly: [230,195,70], desc: 'Legendary gold' },
    { id: 'night',      name: 'Night',       icon: '⬛', price: 250,  body: [30,30,50],    belly: [50,50,80],   desc: 'Dark as midnight' },
    { id: 'chameleon',  name: 'Chameleon',   icon: '🌈', price: 400,  body: [120,60,160],  belly: [160,90,200], desc: 'Vivid purple' },
    { id: 'mossy',      name: 'Mossy',       icon: '🌿', price: 150,  body: [55,95,35],    belly: [75,125,50],  desc: 'Forest camo' },
    { id: 'tuatara',    name: 'Tuatara',     icon: '🏝️', price: 500,  body: [80,100,65],   belly: [110,135,90], desc: 'NZ legend — rare' },
    { id: 'fire',       name: 'Fire Dragon', icon: '🔴', price: 450,  body: [180,40,20],   belly: [220,80,40],  desc: 'Blazing red' },
    { id: 'neon',       name: 'Neon',        icon: '💚', price: 300,  body: [20,220,120],  belly: [40,255,160], desc: 'Electric green' },
  ],
  trails: [
    { id: 'none',       name: 'No Trail',    icon: '✖️', price: 0,    col: null,           desc: 'Clean run' },
    { id: 'leaves',     name: 'Leaves',      icon: '🍃', price: 80,   col: [60,180,80],    desc: 'Forest vibes' },
    { id: 'sparks',     name: 'Sparks',      icon: '✨', price: 120,  col: [255,220,60],   desc: 'Electric' },
    { id: 'bubbles',    name: 'Bubbles',     icon: '🫧', price: 100,  col: [100,180,255],  desc: 'Aquatic' },
    { id: 'petals',     name: 'Petals',      icon: '🌸', price: 150,  col: [255,150,200],  desc: 'Floral' },
    { id: 'fire',       name: 'Fire',        icon: '🔥', price: 200,  col: [255,100,30],   desc: 'Hot pursuit' },
    { id: 'stars',      name: 'Stars',       icon: '⭐', price: 180,  col: [255,240,100],  desc: 'Cosmic' },
    { id: 'snow',       name: 'Snow',        icon: '❄️', price: 160,  col: [200,230,255],  desc: 'Icy cool' },
  ],
  hats: [
    { id: 'none',       name: 'No Hat',      icon: '✖️', price: 0,    type: null,          desc: 'Au naturel' },
    { id: 'cowboy',     name: 'Cowboy',      icon: '🤠', price: 120,  type: 'cowboy',      desc: 'Yeehaw' },
    { id: 'crown',      name: 'Crown',       icon: '👑', price: 300,  type: 'crown',       desc: 'Royalty' },
    { id: 'party',      name: 'Party',       icon: '🎉', price: 80,   type: 'party',       desc: 'Celebrate' },
    { id: 'bucket',     name: 'Bucket',      icon: '🪣', price: 100,  type: 'bucket',      desc: 'Chill' },
    { id: 'tophat',     name: 'Top Hat',     icon: '🎩', price: 200,  type: 'tophat',      desc: 'Distinguished' },
    { id: 'halo',       name: 'Halo',        icon: '😇', price: 250,  type: 'halo',        desc: 'Blessed' },
  ],
  powerups: [
    { id: 'none',       name: 'No Perk',     icon: '✖️', price: 0,    effect: null,
      desc: 'Vanilla run',
      detail: 'No bonuses, no modifiers — pure lizard skill. Your run is completely unassisted.',
      tips: 'For challenge runs or when you want to go unassisted. Max score potential with no assists.' },
    { id: 'coolblood',  name: 'Cool Blood',  icon: '🧊', price: 200,  effect: 'coolblood',
      desc: 'Heat rises 25% slower',
      detail: 'Your cold-blooded physiology kicks in, letting you stay in hot desert zones 25% longer before overheating. Heat cooldown speed is unchanged — this only slows how fast heat builds up.',
      tips: 'Best in long desert stretches. Lets you safely grab distant scale pickups that would normally be too risky.' },
    { id: 'marathon',   name: 'Marathon',    icon: '🏃', price: 180,  effect: 'marathon',
      desc: 'Burrow lasts 2× longer',
      detail: 'Time underground is doubled. Use burrow as an extended escape tool or to cross wide predator patrol zones safely. No heat builds while you\'re burrowed.',
      tips: 'Burrow cooldown is unchanged. Still cancels on obstacles. Great for boss sections with heavy predator density.' },
    { id: 'sprinter',   name: 'Sprinter',    icon: '⚡', price: 220,  effect: 'sprinter',
      desc: 'Burst cooldown halved',
      detail: 'Your speed burst recharges twice as fast, letting you chain dashes in quick succession. Burst speed and heat cost per burst are both unchanged — you just get to use it far more often.',
      tips: 'Best for aggressive runners on gap-heavy routes. Watch your heat — bursting still builds it at the normal rate.' },
    { id: 'scalemail',  name: 'Scale Mail',  icon: '🛡️', price: 300,  effect: 'scalemail',
      desc: 'One free predator hit',
      detail: 'Your armoured scales absorb one predator collision per run, completely negating the damage. The shield breaks after use and does not regenerate mid-run.',
      tips: 'Resets every run. Treat it as an emergency backup, not a strategy — play as if it\'s not there. Most valuable in later stages where predator density spikes.' },
    { id: 'hoarder',    name: 'Hoarder',     icon: '💰', price: 250,  effect: 'hoarder',
      desc: 'Earn 2× scales per run',
      detail: 'Every scale you collect is worth double at the end of the run. The single fastest way to grind the store — weak defensively, but it pays for itself quickly.',
      tips: 'Buy this first if you\'re saving up for expensive items. Focus on scale-dense routes to maximise the multiplier.' },
  ]
};

// ── Persistence ─────────────────────────────────────────────────────
function saveData() {
  console.log('[STORE] saveData', {
    scales: window.LR.scales,
    best: window.LR.best,
    owned: [...window.LR.owned],
    equipped: window.LR.equipped,
  });
  localStorage.setItem('lizardrun_scales',   String(window.LR.scales));
  localStorage.setItem('lizardrun_owned',    JSON.stringify([...window.LR.owned]));
  localStorage.setItem('lizardrun_equipped', JSON.stringify(window.LR.equipped));
  localStorage.setItem('lizardrun_best',     String(window.LR.best));
  // Sync full user state to Firebase if logged in
  if (window.fbSaveUserData) {
    window.fbSaveUserData({
      scales: window.LR.scales,
      bestScore: window.LR.best,
      owned: [...window.LR.owned],
      equipped: window.LR.equipped,
    }).catch(err => console.error('[STORE] fbSaveUserData failed', err));
  }
}

function loadData() {
  window.LR = {
    scales:   parseInt(localStorage.getItem('lizardrun_scales')   || '0'),
    best:     parseInt(localStorage.getItem('lizardrun_best')      || '0'),
    owned:    new Set(JSON.parse(localStorage.getItem('lizardrun_owned') || '["classic","none"]')),
    equipped: JSON.parse(localStorage.getItem('lizardrun_equipped') || JSON.stringify({
      skin: 'classic', trail: 'none', hat: 'none', powerup: 'none'
    }))
  };
  // Always own free items
  ['classic','none'].forEach(id => window.LR.owned.add(id));
  console.log('[STORE] loadData', {
    scales: window.LR.scales,
    best: window.LR.best,
    owned: [...window.LR.owned],
    equipped: window.LR.equipped,
  });
}

// ── Store UI ────────────────────────────────────────────────────────
let currentTab = 'skins';
let previewSelected = null; // id of item being previewed

function openStore() {
  document.getElementById('store-screen').classList.remove('hidden');
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
  updateScalesDisplay();
  renderTab(currentTab);
  schedulePreview(window.LR.equipped.skin);
  console.log('[STORE] openStore', { currentTab, equipped: window.LR.equipped });
}

function closeStore(fromGameover) {
  document.getElementById('store-screen').classList.add('hidden');
  if (fromGameover) {
    document.getElementById('gameover-screen').classList.remove('hidden');
  } else {
    document.getElementById('start-screen').classList.remove('hidden');
  }
  if (window._previewRaf) cancelAnimationFrame(window._previewRaf);
  console.log('[STORE] closeStore', { fromGameover });
}

function updateScalesDisplay() {
  document.getElementById('start-scales').textContent  = window.LR.scales;
  document.getElementById('store-scales').textContent  = window.LR.scales;
}

function renderTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const items  = STORE_ITEMS[tab];
  const grid   = document.getElementById('store-grid');
  grid.innerHTML = '';

  items.forEach(item => {
    const owned    = window.LR.owned.has(item.id);
    const equipped = window.LR.equipped[tabToSlot(tab)] === item.id;
    const card     = document.createElement('div');
    card.className = 'store-card' + (equipped ? ' equipped' : '');
    card.dataset.id = item.id;

    let badgeHTML = '';
    if (equipped)   badgeHTML = '<span class="card-badge equipped-badge">Equipped</span>';
    else if (owned) badgeHTML = '<span class="card-badge owned">Owned</span>';

    card.innerHTML = `
      <div class="card-icon">${item.icon}</div>
      <div class="card-name">${item.name}</div>
      ${!owned ? `<div class="card-price">🦎 ${item.price}</div>` : ''}
      ${badgeHTML}
    `;
    card.addEventListener('click', () => selectStoreItem(tab, item));
    grid.appendChild(card);
  });
}

function selectStoreItem(tab, item) {
  previewSelected = { tab, item };
  document.getElementById('preview-name').textContent = item.name;
  console.log('[STORE] selectStoreItem', { tab, itemId: item.id, itemName: item.name });
  document.querySelectorAll('.store-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.id === item.id);
  });

  // Remove old action button and perk detail panel
  let existing = document.querySelector('.store-action');
  if (existing) existing.remove();
  let existingDetail = document.getElementById('perk-detail-panel');
  if (existingDetail) existingDetail.remove();

  // Show action button
  const owned    = window.LR.owned.has(item.id);
  const equipped = window.LR.equipped[tabToSlot(tab)] === item.id;

  const btn = document.createElement('button');
  btn.className = 'store-action';
  if (equipped) {
    btn.textContent = '✓ Equipped';
    btn.disabled = true;
  } else if (owned) {
    btn.textContent = 'Equip';
    btn.addEventListener('click', () => equipItem(tab, item));
  } else if (window.LR.scales >= item.price) {
    btn.textContent = `Buy — 🦎 ${item.price}`;
    btn.addEventListener('click', () => buyItem(tab, item));
  } else {
    btn.textContent = `Need 🦎 ${item.price - window.LR.scales} more`;
    btn.disabled = true;
  }
  document.getElementById('store-preview').appendChild(btn);

  // Show perk detail panel for powerups
  if (tab === 'powerups' && item.detail) {
    const panel = document.createElement('div');
    panel.id = 'perk-detail-panel';
    panel.style.cssText = [
      'margin-top:12px',
      'padding:12px 14px',
      'width:calc(100% - 32px)',
      'background:rgba(0,0,0,0.25)',
      'border-radius:8px',
      'border-left:3px solid #5a9e3a',
      'font-size:12px',
      'line-height:1.6',
      'text-align:left',
    ].join(';');
    panel.innerHTML = `
      <div style="font-weight:600; margin-bottom:5px; color:#a8d878;">${item.desc}</div>
      <div style="color:#d0e8b0; margin-bottom:8px;">${item.detail}</div>
      <div style="color:#7aaa5a;">💡 ${item.tips}</div>
    `;
    document.getElementById('store-preview').appendChild(panel);
  }

  if (tab === 'skins') schedulePreview(item.id);
  else schedulePreview(window.LR.equipped.skin);
} 

function buyItem(tab, item) {
  if (window.LR.scales < item.price) return;
  window.LR.scales -= item.price;
  window.LR.owned.add(item.id);
  console.log('[STORE] buyItem', { tab, itemId: item.id, price: item.price, remainingScales: window.LR.scales });
  saveData();
  updateScalesDisplay();
  equipItem(tab, item);
}

function equipItem(tab, item) {
  console.log('[STORE] equipItem', { tab, itemId: item.id });
  window.LR.equipped[tabToSlot(tab)] = item.id;
  saveData();
  renderTab(tab);
  selectStoreItem(tab, item);
}

function tabToSlot(tab) {
  return { skins: 'skin', trails: 'trail', hats: 'hat', powerups: 'powerup' }[tab];
}

// ── Preview canvas renderer (vanilla canvas, not p5) ────────────────
function schedulePreview(skinId) {
  if (window._previewRaf) cancelAnimationFrame(window._previewRaf);
  let frame = 0;
  function loop() {
    drawPreview(skinId, frame);
    frame++;
    window._previewRaf = requestAnimationFrame(loop);
  }
  loop();
}

function drawPreview(skinId, frame) {
  const cnv = document.getElementById('preview-canvas');
  if (!cnv) return;
  const ctx = cnv.getContext('2d');
  const W = cnv.width, H = cnv.height;
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#1e2a14';
  ctx.fillRect(0, 0, W, H);

  // Ground
  ctx.fillStyle = '#2a3e1a';
  ctx.fillRect(0, H * 0.6, W, H * 0.4);

  const skin = STORE_ITEMS.skins.find(s => s.id === skinId) || STORE_ITEMS.skins[0];
  const hat  = STORE_ITEMS.hats.find(h => h.id === window.LR.equipped.hat) || STORE_ITEMS.hats[0];
  const trail = STORE_ITEMS.trails.find(t => t.id === window.LR.equipped.trail) || STORE_ITEMS.trails[0];

  const cx = W / 2, cy = H * 0.55;
  const legOff = Math.sin(frame * 0.18) * 4;

  // Trail
  if (trail.col) {
    for (let i = 0; i < 6; i++) {
      const a = (1 - i / 6) * 0.6;
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgb(${trail.col.join(',')})`;
      ctx.beginPath();
      ctx.arc(cx - 30 - i * 8, cy + Math.sin(frame * 0.18 + i) * 3, 3 - i * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Shadow
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy + 13, 28, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const [br, bg, bb] = skin.body;
  const [vr, vg, vb] = skin.belly;

  // Tail
  ctx.fillStyle = `rgb(${br},${bg},${bb})`;
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy);
  ctx.quadraticCurveTo(cx - 42, cy - 4, cx - 50, cy + 8);
  ctx.quadraticCurveTo(cx - 42, cy + 12, cx - 22, cy + 8);
  ctx.closePath();
  ctx.fill();

  // Body
  ctx.fillStyle = `rgb(${br},${bg},${bb})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 30, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly
  ctx.fillStyle = `rgb(${vr},${vg},${vb})`;
  ctx.beginPath();
  ctx.ellipse(cx + 2, cy + 5, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dorsal spines
  ctx.fillStyle = `rgb(${Math.max(0,br-20)},${Math.max(0,bg-20)},${Math.max(0,bb-20)})`;
  for (let i = -2; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 6 - 3, cy - 13);
    ctx.lineTo(cx + i * 6,     cy - 20);
    ctx.lineTo(cx + i * 6 + 3, cy - 13);
    ctx.closePath();
    ctx.fill();
  }

  // Head
  ctx.fillStyle = `rgb(${Math.min(255,br+10)},${Math.min(255,bg+10)},${Math.min(255,bb+10)})`;
  ctx.beginPath();
  ctx.ellipse(cx + 34, cy - 2, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#1a1a0a';
  ctx.beginPath(); ctx.arc(cx + 39, cy - 4, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff8aa';
  ctx.beginPath(); ctx.arc(cx + 40, cy - 5, 1.2, 0, Math.PI * 2); ctx.fill();

  // Legs
  ctx.strokeStyle = `rgb(${Math.max(0,br-15)},${Math.max(0,bg-15)},${Math.max(0,bb-15)})`;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const legs = [[cx+14, cy+12, cx+20, cy+24+legOff],[cx+14,cy+12,cx+8,cy+24-legOff],
                [cx-14, cy+12, cx-8, cy+24-legOff],[cx-14,cy+12,cx-20,cy+24+legOff]];
  legs.forEach(([x1,y1,x2,y2]) => {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  });

  // Hat
  drawHatCanvas(ctx, hat.type, cx + 34, cy - 14, frame);
}

function drawHatCanvas(ctx, type, hx, hy, frame) {
  if (!type) return;
  ctx.save();
  if (type === 'cowboy') {
    ctx.fillStyle = '#8B5E3C';
    ctx.beginPath(); ctx.ellipse(hx, hy + 6, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(hx - 8, hy - 10, 16, 16);
    ctx.fillStyle = '#6B3F1F';
    ctx.fillRect(hx - 8, hy + 2, 16, 3);
  } else if (type === 'crown') {
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(hx - 10, hy - 4, 20, 12);
    ctx.beginPath();
    ctx.moveTo(hx-10,hy-4); ctx.lineTo(hx-6,hy-12);
    ctx.lineTo(hx,  hy-6);  ctx.lineTo(hx+6,hy-12);
    ctx.lineTo(hx+10,hy-4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FF4444';
    ctx.beginPath(); ctx.arc(hx, hy-7, 2.5, 0, Math.PI*2); ctx.fill();
  } else if (type === 'party') {
    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.moveTo(hx-10,hy+4); ctx.lineTo(hx,hy-16); ctx.lineTo(hx+10,hy+4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.arc(hx, hy-17, 3, 0, Math.PI*2); ctx.fill();
  } else if (type === 'bucket') {
    ctx.fillStyle = '#4a90d9';
    ctx.fillRect(hx-10, hy-8, 20, 14);
    ctx.fillStyle = '#5aa0e9';
    ctx.fillRect(hx-12, hy-2, 24, 4);
  } else if (type === 'tophat') {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(hx-8, hy-16, 16, 18);
    ctx.fillRect(hx-12, hy+1, 24, 4);
    ctx.fillStyle = '#c8a800';
    ctx.fillRect(hx-8, hy-2, 16, 3);
  } else if (type === 'halo') {
    const pulse = 0.7 + Math.sin(frame * 0.1) * 0.3;
    ctx.strokeStyle = `rgba(255,240,100,${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(hx, hy-14, 12, 5, 0, 0, Math.PI*2); ctx.stroke();
  }
  ctx.restore();
}

// ── Init store wiring ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  console.log('[STORE] DOMContentLoaded');
  loadData();
  updateScalesDisplay();

  document.getElementById('store-btn').addEventListener('click', () => openStore());
  document.getElementById('go-store-btn').addEventListener('click', () => openStore());
  document.getElementById('store-close').addEventListener('click', () => {
    const fromGO = !document.getElementById('gameover-screen').classList.contains('hidden') ||
                   window._storeFromGameover;
    closeStore(window._storeFromGameover);
    window._storeFromGameover = false;
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => renderTab(btn.dataset.tab));
  });
}); 