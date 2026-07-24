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
  ],

  // ── Premium (real-money) items ─────────────────────────────────────
  // priceNZD is a display dollar amount. The actual charge amount lives in
  // Stripe (see functions/premiumStore.js) — never trust the client for price.
  premiumSkins: [
    { id: 'p_pirate_skin',  name: 'Buccaneer',      icon: '🏴‍☠️', price: 349,  priceNZD: 3.49, premium: true, slot: 'skin',
      body: [30,60,45],  belly: [60,100,80],  fx: 'embers',
      desc: 'Weathered sea-green scales with a scorched edge' },
    { id: 'p_obsidian',     name: 'Obsidian King',  icon: '⚫',    price: 349,  priceNZD: 3.49, premium: true, slot: 'skin',
      body: [18,18,22],  belly: [150,20,20],  fx: 'embers',
      desc: 'Black armour scales with crimson veins' },
    { id: 'p_aurora',       name: 'Aurora',         icon: '🌈',    price: 399,  priceNZD: 3.99, premium: true, slot: 'skin',
      body: [130,70,190], belly: [190,140,255], fx: 'rainbow',
      desc: 'Colour-shifting rainbow scales that never repeat' },
    { id: 'p_golden_tuatara', name: 'Golden Tuatara', icon: '🦎✨', price: 499, priceNZD: 4.99, premium: true, slot: 'skin',
      body: [212,175,55], belly: [255,223,120], fx: 'shimmer',
      desc: 'Shimmering legendary gold — an NZ icon reborn' },
    { id: 'p_galaxy',       name: 'Galaxy',         icon: '🌌',    price: 599,  priceNZD: 5.99, premium: true, slot: 'skin',
      body: [15,10,40],  belly: [80,60,160],  fx: 'starfield',
      desc: 'A living starfield swirls across your scales' },
    { id: 'p_ancient_dragon', name: 'Ancient Dragon', icon: '🐲',  price: 999,  priceNZD: 9.99, premium: true, slot: 'skin',
      body: [140,20,20], belly: [220,80,30],  fx: 'embers', special: 'horns',
      desc: 'Massive curved horns and molten dragon scales — the ultimate flex' },
  ],
  premiumHats: [
    { id: 'p_wizard',       name: 'Wizard Hat',    icon: '🧙', price: 249, priceNZD: 2.49, premium: true, slot: 'hat', type: 'wizard',
      desc: 'Arcane pointed hat, crackling with magic' },
    { id: 'p_pirate_hat',   name: 'Pirate Hat',    icon: '🏴', price: 249, priceNZD: 2.49, premium: true, slot: 'hat', type: 'pirate',
      desc: 'Ahoy, matey' },
    { id: 'p_diamondcrown', name: 'Diamond Crown', icon: '💎', price: 299, priceNZD: 2.99, premium: true, slot: 'hat', type: 'diamondcrown',
      desc: 'Sparkling, faceted, blinding' },
    { id: 'p_dragonhelm',   name: 'Dragon Helm',   icon: '🐉', price: 399, priceNZD: 3.99, premium: true, slot: 'hat', type: 'dragonhelm',
      desc: 'Fearsome horned helm forged in fire' },
  ],
};

// Combined premium catalog, used by the "premium" tab and by any lookup
// that needs to search across both regular and premium items.
STORE_ITEMS.premium = [...STORE_ITEMS.premiumSkins, ...STORE_ITEMS.premiumHats];

function getAllSkins()  { return [...STORE_ITEMS.skins,  ...STORE_ITEMS.premiumSkins]; }
function getAllHats()   { return [...STORE_ITEMS.hats,   ...STORE_ITEMS.premiumHats]; }
function getAllTrails() { return [...STORE_ITEMS.trails]; }

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

// Called after a Stripe checkout redirects back with ?success=true, and on
// normal login, to pull any server-granted paidOwned items into the local
// owned set. Assumes a window.fbLoadUserData() hook exists (mirrors the
// existing window.fbSaveUserData) that resolves with { owned: [...] } merged
// from both freeOwned and paidOwned on the backend.
async function refreshOwnedFromServer() {
  if (!window.fbLoadUserData) return;
  try {
    const data = await window.fbLoadUserData();
    if (data && Array.isArray(data.owned)) {
      data.owned.forEach(id => window.LR.owned.add(id));
      saveData();
    }
  } catch (err) {
    console.error('[STORE] refreshOwnedFromServer failed', err);
  }
}

// ── Store UI ────────────────────────────────────────────────────────
let currentTab = 'skins';
let previewSelected = null; // id of item being previewed
let previewOverride = {};  // { skin, hat, trail } — temporary preview picks, reset on tab change

function openStore() {
  if (!window.CONFIG?.ENABLE_STORE) {
    return;
  }
  document.getElementById('store-screen').classList.remove('hidden');
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
  updateScalesDisplay();
  previewOverride = {};
  renderTab(currentTab);
  schedulePreview();
  console.log('[STORE] openStore', { currentTab, equipped: window.LR.equipped });

  // If we just came back from a successful Stripe checkout, pull the
  // freshly-unlocked item(s) down from the server.
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === 'true') {
    refreshOwnedFromServer().then(() => renderTab(currentTab));
  }
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
  previewOverride = {};
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const items  = STORE_ITEMS[tab];
  const grid   = document.getElementById('store-grid');
  grid.innerHTML = '';

  items.forEach(item => {
    const slot     = itemSlot(tab, item);
    const owned    = window.LR.owned.has(item.id);
    const equipped = window.LR.equipped[slot] === item.id;
    const card     = document.createElement('div');
    card.className = 'store-card' + (equipped ? ' equipped' : '') + (item.premium ? ' premium-card' : '');
    card.dataset.id = item.id;

    let badgeHTML = '';
    if (equipped)          badgeHTML = '<span class="card-badge equipped-badge">Equipped</span>';
    else if (owned)        badgeHTML = '<span class="card-badge owned">Owned</span>';
    else if (item.premium) badgeHTML = '<span class="card-badge premium-badge">💎 PREMIUM</span>';

    card.innerHTML = `
      <div class="card-icon">${item.icon}</div>
      <div class="card-name">${item.name}</div>
      ${!owned ? (item.premium
          ? `<div class="card-price premium-price">$${item.priceNZD.toFixed(2)} NZD</div>`
          : `<div class="card-price">🦎 ${item.price}</div>`)
        : ''}
      ${badgeHTML}
    `;
    card.addEventListener('click', () => selectStoreItem(tab, item));
    grid.appendChild(card);
  });
}

function selectStoreItem(tab, item) {
  const slot = itemSlot(tab, item);
  previewSelected = { tab, item };
  document.getElementById('preview-name').textContent = item.name;
  console.log('[STORE] selectStoreItem', { tab, itemId: item.id, itemName: item.name, slot });
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
  const equipped = window.LR.equipped[slot] === item.id;

  const btn = document.createElement('button');
  btn.className = 'store-action';
  if (equipped) {
    btn.textContent = '✓ Equipped';
    btn.disabled = true;
  } else if (owned) {
    btn.textContent = 'Equip';
    btn.addEventListener('click', () => equipItem(tab, item));
  } else if (item.premium) {
    btn.textContent = `💳 Buy — $${item.priceNZD.toFixed(2)} NZD`;
    btn.classList.add('premium-buy');
    btn.addEventListener('click', () => buyPremiumItem(item));
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

  // Preview: whichever slot this item belongs to gets a live override,
  // regardless of which tab we're browsing (fixes hats/trails not previewing).
  previewOverride[slot] = item.id;
  schedulePreview();
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

// Kicks off a Stripe Checkout session for a premium (real-money) item.
// Requires window.fbCreateCheckoutSession — a Firebase callable function,
// see functions/premiumStore.js — that verifies the item, creates the
// Checkout session server-side, and returns { url }.
async function buyPremiumItem(item) {
  if (!window.fbCreateCheckoutSession) {
    alert('Sign in required to buy premium items.');
    return;
  }
  const btn = document.querySelector('.store-action');
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Redirecting to checkout…'; }
    const result = await window.fbCreateCheckoutSession({ cosmeticId: item.id });
    if (!result || !result.url) throw new Error('No checkout url returned');
    window.location.href = result.url;
  } catch (err) {
    console.error('[STORE] buyPremiumItem failed', err);
    if (btn) {
      btn.disabled = false;
      btn.classList.add('premium-buy');
      btn.textContent = `💳 Buy — $${item.priceNZD.toFixed(2)} NZD`;
    }
    alert('Something went wrong starting checkout. Please try again.');
  }
}

function equipItem(tab, item) {
  const slot = itemSlot(tab, item);
  console.log('[STORE] equipItem', { tab, itemId: item.id, slot });
  window.LR.equipped[slot] = item.id;
  delete previewOverride[slot];
  saveData();
  renderTab(tab);
  selectStoreItem(tab, item);
}

// Regular tabs map 1:1 to a slot; the combined "premium" tab holds a mix
// of skins and hats, so each premium item carries its own `slot`.
function tabToSlot(tab) {
  return { skins: 'skin', trails: 'trail', hats: 'hat', powerups: 'powerup' }[tab];
}
function itemSlot(tab, item) {
  return item.slot || tabToSlot(tab);
}

// ── Preview canvas renderer (vanilla canvas, not p5) ────────────────
function schedulePreview() {
  if (window._previewRaf) cancelAnimationFrame(window._previewRaf);
  let frame = 0;
  function loop() {
    drawPreview(frame);
    frame++;
    window._previewRaf = requestAnimationFrame(loop);
  }
  loop();
}

function skinBodyColor(skin, frame) {
  if (skin.fx === 'rainbow') return `hsl(${(frame * 2) % 360}, 70%, 55%)`;
  return `rgb(${skin.body.join(',')})`;
}
function skinBellyColor(skin, frame) {
  if (skin.fx === 'rainbow') return `hsl(${(frame * 2 + 40) % 360}, 80%, 75%)`;
  return `rgb(${skin.belly.join(',')})`;
}

function drawPreview(frame) {
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

  const skinId  = previewOverride.skin  || window.LR.equipped.skin;
  const hatId   = previewOverride.hat   || window.LR.equipped.hat;
  const trailId = previewOverride.trail || window.LR.equipped.trail;

  const skin  = getAllSkins().find(s => s.id === skinId)   || getAllSkins()[0];
  const hat   = getAllHats().find(h => h.id === hatId)     || getAllHats()[0];
  const trail = getAllTrails().find(t => t.id === trailId) || getAllTrails()[0];

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

  const bodyFill  = skinBodyColor(skin, frame);
  const bellyFill = skinBellyColor(skin, frame);
  const [br, bg, bb] = skin.body; // used for shading (spines/legs/head tint) even on fx skins

  // Tail
  ctx.fillStyle = bodyFill;
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy);
  ctx.quadraticCurveTo(cx - 42, cy - 4, cx - 50, cy + 8);
  ctx.quadraticCurveTo(cx - 42, cy + 12, cx - 22, cy + 8);
  ctx.closePath();
  ctx.fill();

  // Body
  ctx.fillStyle = bodyFill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 30, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly
  ctx.fillStyle = bellyFill;
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

  // Ancient Dragon horns — curling back from the head
  if (skin.special === 'horns') {
    ctx.fillStyle = `rgb(${Math.max(0,br-50)},${Math.max(0,bg-50)},${Math.max(0,bb-50)})`;
    ctx.beginPath();
    ctx.moveTo(cx + 30, cy - 9);
    ctx.quadraticCurveTo(cx + 24, cy - 22, cx + 17, cy - 27);
    ctx.quadraticCurveTo(cx + 27, cy - 20, cx + 32, cy - 11);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 39, cy - 9);
    ctx.quadraticCurveTo(cx + 45, cy - 22, cx + 52, cy - 25);
    ctx.quadraticCurveTo(cx + 43, cy - 18, cx + 40, cy - 10);
    ctx.closePath();
    ctx.fill();
  }

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

  // Premium skin FX (drawn over the body, under the hat)
  applySkinFX(ctx, skin, cx, cy, frame);

  // Hat
  drawHatCanvas(ctx, hat.type, cx + 34, cy - 14, frame);
}

function applySkinFX(ctx, skin, cx, cy, frame) {
  if (!skin.fx) return;
  if (skin.fx === 'shimmer') {
    for (let i = 0; i < 5; i++) {
      const ang = frame * 0.05 + i * (Math.PI * 2 / 5);
      const x = cx + Math.cos(ang) * 32;
      const y = cy + Math.sin(ang) * 14;
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(frame * 0.15 + i));
      ctx.fillStyle = '#fff8c0';
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  } else if (skin.fx === 'starfield') {
    for (let i = 0; i < 8; i++) {
      const sx = cx - 25 + ((i * 97 + frame * 2) % 50);
      const sy = cy - 8 + ((i * 53) % 16);
      ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(frame * 0.1 + i * 1.3));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(sx, sy, 1, 0, Math.PI * 2); ctx.fill();
    }
  } else if (skin.fx === 'embers') {
    for (let i = 0; i < 6; i++) {
      const t = (frame * 1.3 + i * 23) % 40;
      const ex = cx - 20 + i * 8 + Math.sin(frame * 0.1 + i) * 3;
      const ey = cy + 10 - t;
      ctx.globalAlpha = Math.max(0, 1 - t / 40);
      ctx.fillStyle = i % 2 === 0 ? '#ff8c30' : '#ffcf60';
      ctx.beginPath(); ctx.arc(ex, ey, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
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
  } else if (type === 'wizard') {
    ctx.fillStyle = '#4b2e83';
    ctx.beginPath();
    ctx.moveTo(hx-11,hy+5); ctx.lineTo(hx+3,hy-22); ctx.lineTo(hx+11,hy+2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(hx+3, hy-22, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = `rgba(180,140,255,${0.5 + 0.3*Math.sin(frame*0.2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(hx+3, hy-10, 10 + Math.sin(frame*0.2)*2, 0, Math.PI*2); ctx.stroke();
  } else if (type === 'pirate') {
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(hx-14,hy+2); ctx.quadraticCurveTo(hx,hy-14,hx+14,hy+2);
    ctx.quadraticCurveTo(hx,hy+8,hx-14,hy+2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(hx, hy-4, 1.8, 0, Math.PI*2); ctx.fill();
  } else if (type === 'diamondcrown') {
    ctx.fillStyle = '#cfe8ff';
    ctx.beginPath();
    ctx.moveTo(hx-11,hy+4); ctx.lineTo(hx-6,hy-14); ctx.lineTo(hx,hy-4);
    ctx.lineTo(hx+6,hy-14); ctx.lineTo(hx+11,hy+4);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.5 + 0.5*Math.abs(Math.sin(frame*0.2));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(hx, hy-8, 1.8, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (type === 'dragonhelm') {
    ctx.fillStyle = '#3a1a1a';
    ctx.fillRect(hx-9, hy-10, 18, 14);
    ctx.fillStyle = '#8a1a1a';
    ctx.beginPath();
    ctx.moveTo(hx-9,hy-8); ctx.quadraticCurveTo(hx-16,hy-18,hx-18,hy-24);
    ctx.quadraticCurveTo(hx-10,hy-16,hx-7,hy-10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx+9,hy-8); ctx.quadraticCurveTo(hx+16,hy-18,hx+18,hy-24);
    ctx.quadraticCurveTo(hx+10,hy-16,hx+7,hy-10);
    ctx.fill();
  }
  ctx.restore();
}

// ── Init store wiring ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  console.log('[STORE] DOMContentLoaded');
  loadData();
  updateScalesDisplay();

  if (!window.CONFIG?.ENABLE_STORE) {
    document.getElementById('store-btn')?.classList.add('hidden');
    document.getElementById('go-store-btn')?.classList.add('hidden');
  }

  document.getElementById('store-btn')?.addEventListener('click', () => openStore());
  document.getElementById('go-store-btn')?.addEventListener('click', () => openStore());
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