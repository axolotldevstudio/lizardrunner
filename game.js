// game.js — Lizard Run · p5.js game logic

const BASE_W = 800;
const BASE_H = 400;

const TEMP_MIN     = 8;
const TEMP_MAX     = 32;
const TEMP_SAFE_LO = 12;
const TEMP_SAFE_HI = 20;
const TEMP_START   = 15;
const LANE_COUNT   = 4;

let gameRunning = false;
let multiplayerMode = false;
let multiplayerRunning = false;
let paused = false;
let mpServerState = null;
let mpPlayers = {};
let mpMyId = null;
let mpPredatorAlert = '';

new p5(function(p) {

  let W, H, scaleX, scaleY, sc;
  let LANE_TOP, LANE_H;

  let tuatara, zones, obstacles, particles;
  let score, temp, speed, framesSurvived, earnedThisRun;
  let keys = {};
  let shieldActive = false;
  let startScreen, gameoverScreen;

  function resize() {
    W = p.windowWidth;
    H = p.windowHeight;
    scaleX = W / BASE_W;
    scaleY = H / BASE_H;
    sc     = Math.min(scaleX, scaleY);     // uniform scale for sprites
    LANE_TOP = Math.round(60  * scaleY);
    LANE_H   = Math.round((H - LANE_TOP - Math.round(20 * scaleY)) / LANE_COUNT);
    p.resizeCanvas(W, H);
  }

  // ── Setup ────────────────────────────────────────────────────────
  p.setup = function() {
    const cnv = p.createCanvas(p.windowWidth, p.windowHeight);
    cnv.parent('game-wrapper');
    cnv.style('position', 'absolute');
    cnv.style('top', '0');
    cnv.style('left', '0');
    cnv.style('z-index', '0');
    p.noSmooth();
    resize();

    startScreen    = document.getElementById('start-screen');
    gameoverScreen = document.getElementById('gameover-screen');

    document.getElementById('start-btn').addEventListener('click', () => startGame(false));
    document.getElementById('restart-btn').addEventListener('click', () => startGame(false));
    document.getElementById('go-home-btn').addEventListener('click', () => {
      gameoverScreen.classList.add('hidden');
      startScreen.classList.remove('hidden');
      multiplayerMode = false;
      multiplayerRunning = false;
    });
    const multiplayerBtn = document.getElementById('multiplayer-btn');
    if (multiplayerBtn) {
      if (window.CONFIG?.ENABLE_MULTIPLAYER) {
        multiplayerBtn.addEventListener('click', () => {
          if (window.multiplayer && window.multiplayer.show) {
            window.multiplayer.show();
          }
        });
      } else {
        multiplayerBtn.classList.add('hidden');
      }
    }
    if (!window.CONFIG?.ENABLE_LEADERBOARDS) {
      document.getElementById('leaderboard-btn')?.classList.add('hidden');
    }
    if (!window.CONFIG?.ENABLE_STORE) {
      document.getElementById('store-btn')?.classList.add('hidden');
    }

    // Multiplayer hooks from socket code
    window.onMultiplayerMatchStart = (payload) => {
      mpMatchId = payload.matchId;
      mpMyId = payload.myPlayerId || window.multiplayer?.playerId || window.multiplayer?.socket?.id || null;
      mpPlayers = {};
      multiplayerMode = true;
      multiplayerRunning = true;
      setTimeout(() => {
        document.getElementById('multiplayer-screen')?.classList.add('hidden');
        startGame(true);
      }, 100);
    };

    window.onMultiplayerState = (state) => {
      if (!multiplayerRunning) return;
      mpPlayers = state.players || {};
      if (mpMyId && mpPlayers[mpMyId] && tuatara) {
        const me = mpPlayers[mpMyId];
        score = Math.floor(me.score || 0);
        temp = Number((me.temp || TEMP_START).toFixed(1));
        tuatara.lane = Math.max(0, Math.min(LANE_COUNT - 1, me.lane || 1));
        tuatara.targetY = laneY(tuatara.lane);
        if (tuatara.y == null) tuatara.y = laneY(tuatara.lane);
        // Sync server-controlled states
        tuatara.inBurrow = !!me.inBurrow;
        tuatara.jumpTimer = Math.max(0, Number(me.jumpTimer || 0));
        tuatara.shieldHits = Number(me.shieldHits || 0);
      }
    };

    window.onMultiplayerMatchEnd = (result) => {
      if (!multiplayerRunning) return;
      multiplayerRunning = false;
      gameRunning = false;
      const winnerIds = result.winnerIds || [];
      const youWon = winnerIds.includes(mpMyId);
      const title = youWon ? 'Victory!' : 'Defeat';
      const reason = youWon ? 'You outlasted the opponent' : 'Your opponent lasted longer';
      triggerDeath(title, reason);
    };

    window.onMultiplayerPredatorIncoming = (data) => {
      if (!multiplayerRunning) return;
      mpPredatorAlert = 'Predator incoming! Dodge now.';
      setTimeout(() => { mpPredatorAlert = ''; }, 2200);
    };

    // Pause UI wiring
    const pauseScreen = document.getElementById('pause-screen');
    const pauseResume = document.getElementById('pause-resume');
    const pauseRestart = document.getElementById('pause-restart');
    const pauseHome = document.getElementById('pause-home');
    if (pauseResume) pauseResume.addEventListener('click', () => { paused = false; pauseScreen.classList.add('hidden'); });
    if (pauseRestart) pauseRestart.addEventListener('click', () => { paused = false; pauseScreen.classList.add('hidden'); startGame(false); });
    if (pauseHome) pauseHome.addEventListener('click', () => { paused = false; pauseScreen.classList.add('hidden'); gameoverScreen.classList.add('hidden'); startScreen.classList.remove('hidden'); });

    // Toggle pause with Escape or P (single-player only)
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' || ev.key === 'p' || ev.key === 'P') {
        if (multiplayerRunning) return; // don't allow pausing multiplayer
        paused = !paused;
        if (pauseScreen) pauseScreen.classList.toggle('hidden', !paused);
        ev.preventDefault();
      }
    });
  };

  p.windowResized = function() {
    resize();
  };

  // ── Start ────────────────────────────────────────────────────────
  function laneY(lane) {
    const th = Math.round(22 * sc);
    return LANE_TOP + lane * LANE_H + LANE_H / 2 - th / 2;
  }

  function startGame(isMultiplayer = false) {
    console.log('[GAME] startGame', { equipped: window.LR.equipped, multiplayer: isMultiplayer });
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');

    const powerup = window.LR.equipped.powerup;
    multiplayerMode = isMultiplayer;
    multiplayerRunning = isMultiplayer;
    mpPredatorAlert = '';

    tuatara = {
      x: Math.round(100 * scaleX), lane: 1,
      y: laneY(1), targetY: laneY(1),
      w: Math.round(44 * sc), h: Math.round(22 * sc),
      frame: 0, frameTimer: 0,
      burrowCooldown: 0, burstCooldown: 0,
      inBurrow: false, burrowTimer: 0,
      shieldHits:  powerup === 'scalemail' ? 1 : 0,
      shieldFlash: 0
    };

    zones         = [];
    obstacles     = [];
    particles     = [];
    score         = 0;
    earnedThisRun = 0;
    temp          = TEMP_START;
    speed         = 2.5 * scaleX;
    framesSurvived = 0;
    shieldActive   = tuatara.shieldHits > 0;
    gameRunning    = true;

    for (let i = 0; i < 6; i++) spawnZone(W + i * Math.round(220 * scaleX));
  }

  function drawMultiplayerPlayers() {
    if (!mpPlayers) return;
    const ids = Object.keys(mpPlayers);
    for (const id of ids) {
      const pl = mpPlayers[id];
      if (!pl) continue;
      const lane = Math.max(0, Math.min(LANE_COUNT - 1, pl.lane || 1));
      // Apply server-reported jump/burrow offsets for remote players
      const baseY = laneY(lane);
      const jumpTimer = pl.jumpTimer || 0;
      const jumpOffset = jumpTimer > 0 ? -Math.sin((jumpTimer / 20) * Math.PI) * 18 * sc : 0;
      const y = baseY + jumpOffset;
      const x = Math.round(100 * scaleX);
      p.push();
      p.translate(x, y);
      p.fill(id === mpMyId ? 90 : 160, id === mpMyId ? 220 : 140, id === mpMyId ? 100 : 80, 220);
      p.noStroke();
      p.ellipse(0, 0, 40 * sc, 20 * sc);
      p.fill(255);
      p.textSize(Math.max(10, 12 * sc));
      p.textAlign(p.LEFT, p.CENTER);
      p.text(id === mpMyId ? 'You' : 'Enemy', 24 * sc, 0);
      p.pop();
    }
    if (mpPredatorAlert) {
      p.fill(235, 80, 80, 230);
      p.textSize(Math.max(14, 16 * sc));
      p.textAlign(p.CENTER);
      p.text(mpPredatorAlert, W / 2, 30 * scaleY);
    }
  }

  // ── Draw ─────────────────────────────────────────────────────────
  p.draw = function() {
    if (!gameRunning) {
      drawBackground();
      drawGroundLanes();
      return;
    }

    // Pause handling (single-player only)
    if (paused && !multiplayerRunning) {
      render();
      drawHUD();
      return;
    }

    if (multiplayerRunning) {
      framesSurvived++;
      score = Math.floor(framesSurvived / 60 * 10);
      const hoarder = window.LR.equipped.powerup === 'hoarder';
      earnedThisRun = Math.floor(score / 10) * (hoarder ? 2 : 1);
      speed = (2.5 + framesSurvived / 2200) * scaleX;

      // In multiplayer the server is authoritative for deaths and many gameplay outcomes.
      // Client still runs update/render for visuals, but do not apply client-side death.
      update();
      render();
      drawMultiplayerPlayers();
      drawHUD();
      return;
    }

    framesSurvived++;
    score = Math.floor(framesSurvived / 60 * 10);

    const hoarder = window.LR.equipped.powerup === 'hoarder';
    earnedThisRun = Math.floor(score / 10) * (hoarder ? 2 : 1);

    speed = (2.5 + framesSurvived / 2200) * scaleX;

    update();
    render();
    checkDeath();
  };

  // ── Update ───────────────────────────────────────────────────────
  function update() {
    const eq = window.LR.equipped;

    if (!multiplayerRunning && !tuatara.inBurrow) {
      if ((keys['ArrowUp'] || keys['w']) && tuatara.lane > 0) {
        tuatara.lane--;
        tuatara.targetY = laneY(tuatara.lane);
        keys['ArrowUp'] = keys['w'] = false;
      }
      if ((keys['ArrowDown'] || keys['s']) && tuatara.lane < LANE_COUNT - 1) {
        tuatara.lane++;
        tuatara.targetY = laneY(tuatara.lane);
        keys['ArrowDown'] = keys['s'] = false;
      }
    }

    tuatara.y += (tuatara.targetY - tuatara.y) * 0.18;

    if (tuatara.burrowCooldown > 0) tuatara.burrowCooldown--;
    if (keys[' '] && tuatara.burrowCooldown === 0 && !tuatara.inBurrow) {
      console.log('[GAME] burrow start', { powerup: eq.powerup });
      const dur = eq.powerup === 'marathon' ? 180 : 90;
      tuatara.inBurrow       = true;
      tuatara.burrowTimer    = dur;
      tuatara.burrowCooldown = 180;
      keys[' ']              = false;
    }
    if (tuatara.inBurrow) {
      tuatara.burrowTimer--;
      temp -= 0.08;
      if (tuatara.burrowTimer <= 0) tuatara.inBurrow = false;
    }

    let burst = 0;
    if (tuatara.burstCooldown > 0) tuatara.burstCooldown--;
    const burstCD = eq.powerup === 'sprinter' ? 40 : 80;
    if (keys['ArrowRight'] && tuatara.burstCooldown === 0) {
      console.log('[GAME] burst start', { powerup: eq.powerup });
      burst = 2.5 * scaleX;
      tuatara.burstCooldown = burstCD;
      temp += 1.4;
      keys['ArrowRight'] = false;
    }

    // Local single-player jump handling
    if (keys['j'] && tuatara.jumpCooldown === 0 && !tuatara.inBurrow) {
      tuatara.jumpTimer = 20; // frames
      tuatara.jumpCooldown = 60;
      keys['j'] = false;
    }
    if (tuatara.jumpTimer > 0) {
      // Create a vertical offset for rendering (handled in drawLizard)
      tuatara.jumpTimer--;
    }

    const scrollSpeed = speed + burst;

    if (!multiplayerRunning) {
      for (let z of zones)     z.x -= scrollSpeed;
      for (let o of obstacles) o.x -= scrollSpeed;
      zones     = zones.filter(z => z.x + z.w > 0);
      obstacles = obstacles.filter(o => o.x + tuatara.w * 1.5 > 0);

      const lastZ = zones[zones.length - 1];
      if (!lastZ || lastZ.x + lastZ.w < W + 80) spawnZone(W + 60);

      const obsOnScreen = obstacles.filter(o => o.x > W - 20).length;
      const spawnChance = p.map(framesSurvived, 120, 4000, 0.005, 0.022);
      if (obsOnScreen === 0 && framesSurvived > 120 && p.random() < spawnChance) {
        spawnObstacle();
      }
    }

    const heatMult = eq.powerup === 'coolblood' ? 0.75 : 1.0;
    let inZone = false;
    for (let z of zones) {
      const tx = tuatara.x + tuatara.w / 2;
      const ty = tuatara.y + tuatara.h / 2;
      if (tx > z.x && tx < z.x + z.w && ty > z.yTop && ty < z.yBot) {
        inZone = true;
        const rate = z.heatRate > 0 ? z.heatRate * heatMult : z.heatRate;
        temp += rate;
      }
    }
    if (!inZone && !tuatara.inBurrow) {
      if (temp > TEMP_SAFE_HI)      temp -= 0.03;
      else if (temp < TEMP_SAFE_LO) temp -= 0.015;
      else                           temp += 0.004;
    }
    temp = p.constrain(temp, TEMP_MIN, TEMP_MAX);

    const trailItem = window.LR.equipped.trail;
    const trailData = STORE_ITEMS.trails.find(t => t.id === trailItem);
    if (trailData?.col && framesSurvived % 3 === 0 && !tuatara.inBurrow) {
      particles.push({
        x: tuatara.x + p.random(0, 10 * sc),
        y: tuatara.y + tuatara.h / 2 + p.random(-4 * sc, 4 * sc),
        vx: -p.random(0.5, 1.8) * scaleX,
        vy: p.random(-0.5, 0.5),
        life: 35, maxLife: 35,
        col: trailData.col
      });
    }

    for (let pt of particles) { pt.x += pt.vx; pt.y += pt.vy; pt.life--; }
    particles = particles.filter(pt => pt.life > 0);

    if (tuatara.shieldFlash > 0) tuatara.shieldFlash--;

    if (!tuatara.inBurrow && !multiplayerRunning) {
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o   = obstacles[i];
        const pad = 4 * sc;
        const hit = tuatara.x + tuatara.w - pad > o.x + pad &&
                    tuatara.x + pad < o.x + o.w - pad &&
                    tuatara.y + tuatara.h - pad > o.yTop &&
                    tuatara.y + pad < o.yBot;
        if (hit) {
          if (tuatara.shieldHits > 0) {
            tuatara.shieldHits--;
            tuatara.shieldFlash = 40;
            shieldActive = tuatara.shieldHits > 0;
            obstacles.splice(i, 1);
          } else {
            const labels = { rat: 'A rat', stoat: 'A stoat', cat: 'A cat' };
            triggerDeath('Caught!', (labels[o.type] || 'Something') + ' got you');
            return;
          }
        }
      }
    }

    tuatara.frameTimer++;
    if (tuatara.frameTimer > 8) {
      tuatara.frame = (tuatara.frame + 1) % 2;
      tuatara.frameTimer = 0;
    }
  }

  // ── Spawn ─────────────────────────────────────────────────────────
  function spawnZone(startX) {
    const types = ['shade','shade','sun','dappled','deepshade'];
    const type  = p.random(types);
    const laneA = Math.floor(p.random(0, LANE_COUNT));
    const laneB = Math.min(laneA + Math.floor(p.random(1, 3)), LANE_COUNT - 1);
    const rates = { sun: 0.055, dappled: 0.018, shade: -0.022, deepshade: -0.04 };
    zones.push({
      type, x: startX,
      w: p.random(110, 260) * scaleX,
      yTop: LANE_TOP + laneA * LANE_H,
      yBot: LANE_TOP + (laneB + 1) * LANE_H,
      heatRate: rates[type]
    });
  }

  function spawnObstacle() {
    const lane  = Math.floor(p.random(0, LANE_COUNT));
    const types = ['rat','stoat','cat'];
    const type  = framesSurvived > 1800 ? p.random(types) : p.random(['rat','stoat']);
    const ow    = Math.round(36 * sc);
    obstacles.push({
      type, x: W + 20, w: ow,
      yTop: LANE_TOP + lane * LANE_H + Math.round(4 * sc),
      yBot: LANE_TOP + (lane + 1) * LANE_H - Math.round(4 * sc),
      animFrame: 0
    });
  }

  // ── Render ────────────────────────────────────────────────────────
  function render() {
    drawBackground();
    drawGroundLanes();
    drawZones();
    drawParticles();
    drawObstacles();
    drawLizard();
    drawHUD();
  }

  function drawBackground() {
    p.noStroke();
    p.fill(20, 38, 15);
    p.rect(0, 0, W, LANE_TOP);
    p.fill(255, 255, 200, 40);
    for (let i = 0; i < 12; i++) {
      const sx = ((i * 137 + framesSurvived * 0.2) % W);
      const sy = (i * 53) % (LANE_TOP - 6) + 3;
      p.ellipse(sx, sy, 2, 2);
    }
  }

  function drawGroundLanes() {
    p.noStroke();
    for (let i = 0; i < LANE_COUNT; i++) {
      const y = LANE_TOP + i * LANE_H;
      p.fill(i % 2 === 0 ? p.color(38,58,28) : p.color(44,68,32));
      p.rect(0, y, W, LANE_H);
      p.stroke(30, 50, 22, 60);
      p.strokeWeight(1);
      p.line(0, y + LANE_H, W, y + LANE_H);
    }
    p.noStroke();
    p.fill(18, 30, 12);
    p.rect(0, LANE_TOP + LANE_COUNT * LANE_H, W, H - LANE_TOP - LANE_COUNT * LANE_H);
  }

  function drawZones() {
    p.noStroke();
    for (let z of zones) {
      let col;
      if (z.type === 'sun') {
        const pulse = p.sin(p.frameCount * 0.05) * 8;
        col = p.color(215 + pulse, 180, 28, 85);
      } else if (z.type === 'dappled') {
        col = p.color(175, 195, 55, 55);
      } else if (z.type === 'shade') {
        col = p.color(20, 75, 38, 60);
      } else {
        col = p.color(10, 38, 22, 85);
      }
      p.fill(col);
      p.rect(z.x, z.yTop, z.w, z.yBot - z.yTop);

      p.fill(255, 255, 255, 55);
      p.noStroke();
      p.textSize(Math.max(9, 9 * sc));
      p.textAlign(p.LEFT);
      const labels = { sun:'☀ sun', dappled:'~ dappled', shade:'● shade', deepshade:'▼ burrow' };
      p.text(labels[z.type], z.x + 4, z.yTop + Math.round(12 * scaleY));
    }
  }

  function drawParticles() {
    for (let pt of particles) {
      const a = p.map(pt.life, 0, pt.maxLife, 0, 180);
      p.noStroke();
      p.fill(pt.col[0], pt.col[1], pt.col[2], a);
      p.ellipse(pt.x, pt.y,
        p.map(pt.life, 0, pt.maxLife, 1, 5 * sc),
        p.map(pt.life, 0, pt.maxLife, 1, 5 * sc));
    }
  }

  function drawObstacles() {
    for (let o of obstacles) {
      o.animFrame = (o.animFrame || 0) + 0.12;
      const cx  = o.x + o.w / 2;
      const cy  = (o.yTop + o.yBot) / 2;
      const bob = Math.sin(o.animFrame) * 1.5 * sc;
      const s   = sc; // sprite scale
      p.noStroke();

      if (o.type === 'rat') {
        p.fill(125,105,85); p.ellipse(cx, cy+bob, 28*s, 15*s);
        p.fill(110,90,70);  p.ellipse(cx+14*s, cy-2*s+bob, 14*s, 12*s);
        p.fill(155,95,95);  p.ellipse(cx+18*s, cy-9*s+bob, 6*s, 8*s);
        p.stroke(95,75,55); p.strokeWeight(2*s); p.noFill();
        p.beginShape();
        p.curveVertex(cx-12*s,cy+bob); p.curveVertex(cx-16*s,cy+2*s+bob);
        p.curveVertex(cx-22*s,cy-4*s+bob); p.curveVertex(cx-26*s,cy+6*s+bob);
        p.endShape();
        p.noStroke(); p.fill(20); p.ellipse(cx+18*s,cy-2*s+bob,3*s,3*s);
        p.fill(255,120,100,200); p.textSize(Math.max(8,8*s)); p.textAlign(p.CENTER);
        p.text('RAT', cx, o.yTop - 3*sc);

      } else if (o.type === 'stoat') {
        p.fill(195,170,125); p.ellipse(cx,cy+bob,36*s,13*s);
        p.ellipse(cx+18*s,cy-2*s+bob,12*s,11*s);
        p.fill(75,38,18); p.ellipse(cx+22*s,cy-5*s+bob,5*s,7*s);
        p.fill(20); p.ellipse(cx+23*s,cy-3*s+bob,2.5*s,2.5*s);
        p.fill(255,160,80,200); p.textSize(Math.max(8,8*s)); p.textAlign(p.CENTER);
        p.text('STOAT', cx, o.yTop - 3*sc);

      } else {
        p.fill(180,165,145); p.ellipse(cx,cy+bob,32*s,16*s);
        p.ellipse(cx+16*s,cy-2*s+bob,18*s,14*s);
        p.fill(160,145,125);
        p.triangle(cx+12*s,cy-9*s+bob, cx+15*s,cy-18*s+bob, cx+19*s,cy-9*s+bob);
        p.triangle(cx+20*s,cy-9*s+bob, cx+23*s,cy-17*s+bob, cx+26*s,cy-9*s+bob);
        p.fill(80,60,40); p.ellipse(cx+18*s,cy-2*s+bob,5*s,5*s);
        p.fill(255,220,220,200); p.textSize(Math.max(8,8*s)); p.textAlign(p.CENTER);
        p.text('CAT', cx, o.yTop - 3*sc);
      }
    }
  }

  function drawLizard() {
    if (!window.LR) return;
    const eq   = window.LR.equipped;
    const skin = STORE_ITEMS.skins.find(s => s.id === eq.skin)  || STORE_ITEMS.skins[0];
    const hat  = STORE_ITEMS.hats.find(h => h.id === eq.hat)    || STORE_ITEMS.hats[0];

    const tx = tuatara.x, ty = tuatara.y;
    const jumpOffset = (tuatara.jumpTimer || 0) > 0 ? -Math.sin(((tuatara.jumpTimer || 0) / 20) * Math.PI) * 18 * sc : 0;
    const tw = tuatara.w, th = tuatara.h;
    const legOff = tuatara.frame === 0 ? 3*sc : -3*sc;
    const s = sc;

    p.push();
    p.translate(tx + tw/2, ty + th/2 + jumpOffset);

    if (tuatara.inBurrow) {
      p.fill(70,50,25,150); p.noStroke();
      p.ellipse(0, th/2+2*s, tw+14*s, 12*s);
      if (p.frameCount % 8 < 4) { p.pop(); return; }
    }

    if (tuatara.shieldFlash > 0 && tuatara.shieldFlash % 6 < 3) {
      p.fill(100,180,255,60); p.noStroke();
      p.ellipse(0, 0, tw + 20*s, th + 20*s);
    }

    const [br,bg,bb] = skin.body;
    const [vr,vg,vb] = skin.belly;

    p.noStroke(); p.fill(0,0,0,35);
    p.ellipse(2*s, th/2+2*s, tw-4*s, 6*s);

    // Tail
    p.fill(br,bg,bb); p.noStroke();
    p.beginShape();
    p.vertex(-tw/2, 0); p.vertex(-tw/2-16*s,-2*s);
    p.vertex(-tw/2-22*s,4*s); p.vertex(-tw/2-14*s,7*s); p.vertex(-tw/2,5*s);
    p.endShape(p.CLOSE);

    // Body
    p.fill(br,bg,bb); p.ellipse(0,0,tw-6*s,th);
    p.fill(vr,vg,vb); p.ellipse(2*s,4*s,tw-16*s,th-6*s);

    // Dorsal spines
    p.fill(Math.max(0,br-20),Math.max(0,bg-20),Math.max(0,bb-20));
    for (let i = -2; i <= 3; i++) {
      p.triangle(i*6*s, -th/2, i*6*s-3*s, -th/2-5*s, i*6*s+3*s, -th/2-5*s);
    }

    // Head
    p.fill(Math.min(255,br+10),Math.min(255,bg+10),Math.min(255,bb+10));
    p.ellipse(tw/2-2*s,-1*s,20*s,16*s);

    // Eye
    p.fill(25,18,8); p.ellipse(tw/2+2*s,-3*s,5*s,5*s);
    p.fill(255,240,80,200); p.ellipse(tw/2+3*s,-4*s,2*s,2*s);

    // Legs
    p.stroke(Math.max(0,br-15),Math.max(0,bg-15),Math.max(0,bb-15));
    p.strokeWeight(2.5*s);
    p.line(tw/4,  th/2-2*s, tw/4+6*s,   th/2+legOff+6*s);
    p.line(tw/4,  th/2-2*s, tw/4-2*s,   th/2-legOff+6*s);
    p.line(-tw/4, th/2-2*s, -tw/4+6*s,  th/2-legOff+6*s);
    p.line(-tw/4, th/2-2*s, -tw/4-4*s,  th/2+legOff+6*s);

    if (shieldActive && tuatara.shieldHits > 0) {
      p.noFill();
      p.stroke(100,180,255, 80 + p.sin(p.frameCount*0.1)*40);
      p.strokeWeight(2*s);
      p.ellipse(0,0,tw+16*s,th+16*s);
    }

    drawHatP5(hat.type, tw, th, s);
    p.pop();
  }

  function drawHatP5(type, tw, th, s) {
    if (!type) return;
    const hx = tw/2 - 2*s;
    const hy = -th/2 - 2*s;
    p.noStroke();
    if (type === 'cowboy') {
      p.fill(139,94,60); p.ellipse(hx,hy+6*s,24*s,6*s); p.rect(hx-8*s,hy-10*s,16*s,14*s);
      p.fill(100,60,30); p.rect(hx-8*s,hy+2*s,16*s,3*s);
    } else if (type === 'crown') {
      p.fill(255,215,0); p.rect(hx-10*s,hy-4*s,20*s,12*s);
      p.triangle(hx-10*s,hy-4*s, hx-6*s,hy-14*s, hx-2*s,hy-4*s);
      p.triangle(hx-1*s, hy-4*s, hx+3*s,hy-14*s, hx+7*s,hy-4*s);
      p.triangle(hx+7*s, hy-4*s, hx+11*s,hy-14*s, hx+10*s,hy-4*s);
      p.fill(255,60,60); p.ellipse(hx+1*s,hy-9*s,4*s,4*s);
    } else if (type === 'party') {
      p.fill(255,105,180);
      p.triangle(hx-9*s,hy+4*s, hx+1*s,hy-16*s, hx+9*s,hy+4*s);
      p.fill(255,220,0); p.ellipse(hx+1*s,hy-17*s,5*s,5*s);
    } else if (type === 'bucket') {
      p.fill(74,144,217); p.rect(hx-9*s,hy-8*s,18*s,14*s,2*s);
      p.fill(90,160,230); p.rect(hx-11*s,hy-1*s,22*s,4*s,1*s);
    } else if (type === 'tophat') {
      p.fill(22,22,22); p.rect(hx-8*s,hy-16*s,16*s,18*s,2*s);
      p.rect(hx-12*s,hy+1*s,24*s,4*s,1*s);
      p.fill(200,170,0); p.rect(hx-8*s,hy-2*s,16*s,3*s);
    } else if (type === 'halo') {
      p.noFill();
      p.stroke(255,240,100, 150+p.sin(p.frameCount*0.1)*80);
      p.strokeWeight(3*s); p.ellipse(hx,hy-12*s,22*s,8*s);
    }
  }

  function drawHUD() {
    // HUD bar background
    p.noStroke();
    p.fill(10,14,8,220);
    p.rect(0, 0, W, LANE_TOP - 2);

    const fs = scaleY; // font scale

    // ── Temp bar ──────────────────────────────
    const bx = Math.round(16*scaleX);
    const by = Math.round(14*scaleY);
    const bw = Math.round(220*scaleX);
    const bh = Math.round(14*scaleY);

    p.fill(28,28,18); p.rect(bx,by,bw,bh,4);

    const safeS = p.map(TEMP_SAFE_LO, TEMP_MIN, TEMP_MAX, 0, bw);
    const safeE = p.map(TEMP_SAFE_HI, TEMP_MIN, TEMP_MAX, 0, bw);
    const coldW = p.map(TEMP_SAFE_LO, TEMP_MIN, TEMP_MAX, 0, bw);

    p.fill(40,80,160,110);  p.rect(bx,by,coldW,bh,4,0,0,4);
    p.fill(40,158,60,110);  p.rect(bx+safeS,by,safeE-safeS,bh);
    p.fill(195,78,28,110);  p.rect(bx+safeE,by,bw-safeE,bh,0,4,4,0);

    const fillW = p.map(temp, TEMP_MIN, TEMP_MAX, 0, bw);
    let fillCol;
    if (temp < TEMP_SAFE_LO)       fillCol = p.color(75,125,235);
    else if (temp <= TEMP_SAFE_HI)  fillCol = p.color(75,215,95);
    else                             fillCol = p.color(235, p.map(temp,TEMP_SAFE_HI,TEMP_MAX,175,55), 38);
    p.fill(fillCol); p.rect(bx,by,fillW,bh,4);

    p.noFill(); p.stroke(255,255,255,35); p.strokeWeight(1);
    p.rect(bx,by,bw,bh,4);
    p.noStroke();

    const labelY = by - Math.round(3*scaleY);
    p.fill(195,190,165); p.textSize(Math.max(9, Math.round(10*fs))); p.textAlign(p.LEFT);
    p.text('TEMP', bx, labelY);
    p.fill(fillCol); p.textSize(Math.max(9, Math.round(11*fs))); p.textAlign(p.RIGHT);
    p.text(temp.toFixed(1)+'°C', bx+bw, labelY);

    // Danger flash
    if (temp >= 29 || temp <= 9.5) {
      const a = p.map(p.sin(p.frameCount*0.18), -1, 1, 0, 55);
      p.fill(temp>=29 ? p.color(215,55,18,a) : p.color(55,95,215,a));
      p.noStroke(); p.rect(0, LANE_TOP, W, H-LANE_TOP);
    }

    // ── Distance ──────────────────────────────
    p.noStroke();
    p.fill(195,190,165); p.textSize(Math.max(9, Math.round(10*fs))); p.textAlign(p.CENTER);
    p.text('DISTANCE', W/2, Math.round(16*scaleY));
    p.fill(215,205,135); p.textSize(Math.max(14, Math.round(18*fs)));
    p.text(score+'m', W/2, Math.round(34*scaleY));
    p.fill(150,220,150,200); p.textSize(Math.max(8, Math.round(9*fs)));
    p.text('🦎 +' + earnedThisRun, W/2, Math.round(48*scaleY));

    // ── Controls (right) ──────────────────────
    const burrowReady = tuatara.burrowCooldown === 0;
    const burstReady  = tuatara.burstCooldown  === 0;
    const rx = W - Math.round(12*scaleX);
    p.textSize(Math.max(8, Math.round(9*fs))); p.textAlign(p.RIGHT);
    p.fill(burrowReady ? p.color(95,215,110) : p.color(115,105,85));
    p.text('BURROW [SPACE]'+(tuatara.inBurrow?' ↓':burrowReady?' ✓':' '+Math.ceil(tuatara.burrowCooldown/60)+'s'), rx, Math.round(20*scaleY));
    p.fill(burstReady ? p.color(95,175,235) : p.color(115,105,85));
    p.text('BURST [→]'+(burstReady?' ✓':' '+Math.ceil(tuatara.burstCooldown/60)+'s'), rx, Math.round(34*scaleY));

    if (shieldActive && tuatara.shieldHits > 0) {
      p.fill(100,180,255); p.textSize(Math.max(8, Math.round(9*fs))); p.textAlign(p.RIGHT);
      p.text('🛡 SHIELD', rx, Math.round(48*scaleY));
    }

    const pu = window.LR.equipped.powerup;
    if (pu && pu !== 'none') {
      const pitem = STORE_ITEMS.powerups.find(x => x.id === pu);
      if (pitem) {
        p.fill(215,205,135,160); p.textSize(Math.max(8, Math.round(8*fs))); p.textAlign(p.LEFT);
        p.text(pitem.icon+' '+pitem.name, bx, Math.round(50*scaleY));
      }
    }
  }

  // ── Death ─────────────────────────────────────────────────────────
  function checkDeath() {
    if (temp >= TEMP_MAX)      triggerDeath('Too Hot!',  'You overheated in the sun');
    else if (temp <= TEMP_MIN) triggerDeath('Too Cold!', 'Your body temperature crashed');
  }

  async function triggerDeath(title, reason) {
    console.log('[GAME] triggerDeath', { title, reason, score, earnedThisRun });
    gameRunning = false;

    window.LR.scales += earnedThisRun;
    if (score > window.LR.best) window.LR.best = score;
    saveData();

    document.getElementById('go-title').textContent  = title;
    document.getElementById('go-reason').textContent = reason;
    document.getElementById('go-score').textContent  = score + 'm';
    document.getElementById('go-earned').textContent = '+' + earnedThisRun + ' 🦎';
    document.getElementById('go-best').textContent   = window.LR.best + 'm';
    document.getElementById('go-icon').textContent   =
      title.includes('Hot') ? '🔥' : title.includes('Cold') ? '🧊' : '🐀';

    document.getElementById('start-scales').textContent = window.LR.scales;

    const lbMsg = document.getElementById('go-lb-msg');
    lbMsg.classList.add('hidden');
    if (window.currentUser && score > 0) {
      try {
        const prevBest = window.currentUser.bestScore || 0;
        await window.fbSubmitScore(score);
        if (score > prevBest) {
          lbMsg.textContent = '🏆 New leaderboard best saved!';
          lbMsg.classList.remove('hidden');
        }
      } catch(e) {
        console.error('Score submit failed:', e);
      }
    }

    gameoverScreen.classList.remove('hidden');

    document.getElementById('go-store-btn').onclick = () => {
      window._storeFromGameover = true;
      openStore();
    };
  }

  // ── Keys ─────────────────────────────────────────────────────────
  p.keyPressed = function() {
    if (!gameRunning) return;
    const k = p.keyCode;
    console.log('[GAME] keyPressed', { key: p.key, keyCode: k });
    if (multiplayerRunning && window.multiplayer?.socket) {
      if (k === 38) window.multiplayer.socket.emit('input', { type: 'lane', lane: Math.max(0, (mpPlayers[mpMyId]?.lane || 1) - 1) });
      if (k === 40) window.multiplayer.socket.emit('input', { type: 'lane', lane: Math.min(LANE_COUNT - 1, (mpPlayers[mpMyId]?.lane || 1) + 1) });
      if (k === 39) window.multiplayer.socket.emit('input', { type: 'burst' });
      if (k === 32) window.multiplayer.socket.emit('input', { type: 'burrow' });
      if (k === 65) window.multiplayer.socket.emit('input', { type: 'attack' });
      if (k === 70) window.multiplayer.socket.emit('input', { type: 'flick_predator' });
      if (k === 74) window.multiplayer.socket.emit('input', { type: 'jump' });
      if ([32,38,40,39,65,70,74].includes(k)) return false;
      return;
    }
    // Local single-player jump key
    if (k === 74) keys['j'] = true;

    if (k===38) keys['ArrowUp']    = true;
    if (k===40) keys['ArrowDown']  = true;
    if (k===39) keys['ArrowRight'] = true;
    if (k===32) keys[' ']         = true;
    if (p.key)  keys[p.key]       = true;
    if ([32,38,40,39].includes(k)) return false;
  };

  p.keyReleased = function() {
    const k = p.keyCode;
    console.log('[GAME] keyReleased', { key: p.key, keyCode: k });
    if (k===38) keys['ArrowUp']    = false;
    if (k===40) keys['ArrowDown']  = false;
    if (k===39) keys['ArrowRight'] = false;
    if (k===32) keys[' ']         = false;
    if (p.key)  keys[p.key]       = false;
  };

}); // end p5 instance