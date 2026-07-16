import './styles/app.css';
import { showToast } from './lib/toast.js';
import {
  unlockAudio,
  startMusic,
  stopMusic,
  toggleMuted,
  isMuted,
  sfxClick,
  sfxCatch,
  sfxBonus,
  sfxCard,
  sfxMiss,
  sfxStart,
  sfxOver,
  sfxDive,
  sfxMust,
  sfxHeat,
} from './lib/audio.js';

const STORAGE_KEY = 'football-catch-best';
const ROUND_SECONDS = 30;
const MAX_LIVES = 3;
const MAX_DIVES = 2;
const HEAT_THRESHOLDS = [5, 10, 15];
const MUST_MAX = 3;

const TYPES = {
  ball: {
    kind: 'ball',
    label: '足球',
    weight: 48,
    radius: 20,
    points: 10,
  },
  ballPro: {
    kind: 'ball',
    label: '花式球',
    weight: 16,
    radius: 18,
    points: 18,
    variant: 'pro',
  },
  golden: {
    kind: 'bonus',
    label: '金球',
    weight: 7,
    radius: 19,
    points: 40,
  },
  clock: {
    kind: 'bonus',
    label: '加时',
    weight: 4,
    radius: 16,
    timeBonus: 2,
  },
  boost: {
    kind: 'bonus',
    label: '激励',
    weight: 5,
    radius: 16,
    scoreMult: 2,
    duration: 5,
  },
  yellow: {
    kind: 'penalty',
    label: '黄牌',
    weight: 8,
    radius: 15,
    slowDuration: 4,
  },
  red: {
    kind: 'penalty',
    label: '红牌',
    weight: 6,
    radius: 15,
    scorePenalty: 30,
  },
};

const TYPE_LIST = Object.values(TYPES);

const els = {
  home: document.querySelector('#screen-home'),
  play: document.querySelector('#screen-play'),
  over: document.querySelector('#screen-over'),
  help: document.querySelector('#screen-help'),
  homeBest: document.querySelector('#home-best'),
  hudScore: document.querySelector('#hud-score'),
  hudTime: document.querySelector('#hud-time'),
  hudLives: document.querySelector('#hud-lives'),
  effectBanner: document.querySelector('#effect-banner'),
  canvas: document.querySelector('#game'),
  overScore: document.querySelector('#over-score'),
  overBest: document.querySelector('#over-best'),
  overSubtitle: document.querySelector('#over-subtitle'),
  overTitle: document.querySelector('#over-title'),
  overEyebrow: document.querySelector('#over-eyebrow'),
  overRecord: document.querySelector('#over-record'),
  overFx: document.querySelector('#over-fx'),
  statCaught: document.querySelector('#stat-caught'),
  statCombo: document.querySelector('#stat-combo'),
  statLives: document.querySelector('#stat-lives'),
  btnStart: document.querySelector('#btn-start'),
  btnAgain: document.querySelector('#btn-again'),
  btnHome: document.querySelector('#btn-home'),
  btnSound: document.querySelector('#btn-sound'),
  btnSoundPlay: document.querySelector('#btn-sound-play'),
  btnDive: document.querySelector('#btn-dive'),
  diveCount: document.querySelector('#dive-count'),
  soundTip: document.querySelector('#sound-tip'),
  btnHelp: document.querySelector('#btn-help'),
  btnHelpClose: document.querySelector('#btn-help-close'),
};

const ctx = els.canvas.getContext('2d');

const state = {
  mode: 'home',
  score: 0,
  timeLeft: ROUND_SECONDS,
  lives: MAX_LIVES,
  combo: 0,
  maxCombo: 0,
  caught: 0,
  best: readBest(),
  items: [],
  floats: [],
  particles: [],
  goalX: 0.5,
  pointerActive: false,
  lastTs: 0,
  spawnAcc: 0,
  elapsed: 0,
  fallMult: 1,
  scoreMult: 1,
  yellowLeft: 0,
  boostLeft: 0,
  heatLeft: 0,
  heatLevel: 0,
  heatUnlocked: 0,
  diveLeft: 0,
  diveCharges: MAX_DIVES,
  mustNextAt: 7,
  mustSpawned: 0,
  shake: 0,
  raf: 0,
  scoreAnim: 0,
};

function readBest() {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function writeBest(n) {
  try {
    localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    /* quota / private mode */
  }
}

function showScreen(name) {
  els.home.hidden = name !== 'home';
  els.play.hidden = name !== 'play';
  els.over.hidden = name !== 'over';
  if (els.help) els.help.hidden = name !== 'help';
  state.mode = name;
}

function updateBestLabels() {
  if (els.homeBest) els.homeBest.textContent = String(state.best);
  if (els.overBest) els.overBest.textContent = `最高分 ${state.best}`;
}

function resizeCanvas() {
  const wrap = els.canvas.parentElement;
  if (!wrap) return;
  const cssW = wrap.clientWidth;
  const cssH = Math.max(320, wrap.clientHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(280, Math.floor(cssW));
  const h = Math.max(360, Math.floor(cssH));
  els.canvas.width = Math.floor(w * dpr);
  els.canvas.height = Math.floor(h * dpr);
  els.canvas.style.width = `${w}px`;
  els.canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function goalMetrics() {
  const w = els.canvas.clientWidth;
  const h = els.canvas.clientHeight;
  const shrink = Math.min(0.22, state.elapsed * 0.006);
  let widthRatio = 0.34 - shrink;
  if (state.heatLeft > 0) widthRatio += 0.08;
  if (state.diveLeft > 0) widthRatio += 0.12;
  const goalW = Math.min(w * 0.52, Math.max(72, w * widthRatio));
  const goalH = 44;
  const x = state.goalX * (w - goalW);
  // play controls sit outside the pitch; keep a small bottom gap only
  const y = h - goalH - 18;
  return { w, h, goalW, goalH, x, y };
}

function pickType() {
  const t = state.elapsed;
  const weighted = TYPE_LIST.map((type) => {
    let w = type.weight;
    if (type.label === '红牌') w += t * 0.45;
    if (type.label === '黄牌') w += t * 0.3;
    if (type.timeBonus) w = Math.max(1.5, w - t * 0.12);
    if (type.label === '金球') w = Math.max(3, w - t * 0.05);
    return { type, w };
  });
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const entry of weighted) {
    r -= entry.w;
    if (r <= 0) return entry.type;
  }
  return TYPES.ball;
}

function spawnMustBall() {
  if (state.mustSpawned >= MUST_MAX) return;
  const { w } = goalMetrics();
  const radius = 21;
  const margin = radius + 8;
  state.mustSpawned += 1;
  state.items.push({
    kind: 'ball',
    label: '必扑球',
    points: 55,
    radius,
    mustCatch: true,
    x: margin + Math.random() * (w - margin * 2),
    y: -radius - 8,
    vy: 195 + state.elapsed * 4,
    spin: Math.random() * Math.PI * 2,
    spinSpeed: (Math.random() * 4 + 2.5) * (Math.random() < 0.5 ? -1 : 1),
    wobble: Math.random() * Math.PI * 2,
    wobbleAmp: 10,
  });
  showToast('必扑球来了！接住拿高分');
  sfxMust();
}

function spawnItem() {
  const { w } = goalMetrics();
  const type = pickType();
  const margin = type.radius + 8;
  const speedRamp = 170 + Math.random() * 55 + state.elapsed * 5.5;
  state.items.push({
    ...type,
    x: margin + Math.random() * (w - margin * 2),
    y: -type.radius - 8,
    vy: speedRamp,
    spin: Math.random() * Math.PI * 2,
    spinSpeed: (Math.random() * 4 + 2) * (Math.random() < 0.5 ? -1 : 1),
    wobble: Math.random() * Math.PI * 2,
    wobbleAmp: 18 + Math.min(22, state.elapsed * 0.8),
  });
}

function addFloat(x, y, text, color) {
  state.floats.push({ x, y, text, color, life: 0.9, vy: -42 });
}

function burst(x, y, color, count = 10) {
  for (let i = 0; i < count; i += 1) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const sp = 60 + Math.random() * 120;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 40,
      life: 0.45 + Math.random() * 0.25,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function setEffectBanner() {
  const parts = [];
  if (state.diveLeft > 0) parts.push(`飞扑中 ${state.diveLeft.toFixed(1)}s`);
  if (state.heatLeft > 0) parts.push(`防守热潮 Lv.${state.heatLevel}`);
  if (state.yellowLeft > 0) parts.push(`黄牌减速 ${Math.ceil(state.yellowLeft)}s`);
  if (state.boostLeft > 0) parts.push(`激励加倍 ×${state.scoreMult}`);
  if (parts.length) {
    els.effectBanner.hidden = false;
    els.effectBanner.textContent = parts.join(' · ');
  } else {
    els.effectBanner.hidden = true;
    els.effectBanner.textContent = '';
  }
}

function syncDiveButton() {
  if (!els.btnDive) return;
  if (els.diveCount) els.diveCount.textContent = String(state.diveCharges);
  els.btnDive.disabled = state.mode !== 'play' || state.diveCharges <= 0 || state.diveLeft > 0;
  els.btnDive.classList.toggle('is-active', state.diveLeft > 0);
}

function triggerHeat(level) {
  state.heatLevel = level;
  state.heatLeft = 4.2;
  showToast(`连击 ${HEAT_THRESHOLDS[level - 1]}！防守热潮`);
  sfxHeat();
}

function checkHeatUnlock() {
  for (let i = 0; i < HEAT_THRESHOLDS.length; i += 1) {
    const level = i + 1;
    if (state.combo >= HEAT_THRESHOLDS[i] && state.heatUnlocked < level) {
      state.heatUnlocked = level;
      triggerHeat(level);
      return;
    }
  }
}

function activateDive() {
  if (state.mode !== 'play' || state.diveCharges <= 0 || state.diveLeft > 0) return;
  state.diveCharges -= 1;
  state.diveLeft = 0.85;
  sfxDive();
  showToast('飞扑！接球范围扩大');
  syncDiveButton();
}

function livesGlyph() {
  return '●'.repeat(Math.max(0, state.lives)) + '○'.repeat(Math.max(0, MAX_LIVES - state.lives));
}

function updateHud() {
  els.hudScore.textContent = String(state.score);
  els.hudTime.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
  if (els.hudLives) els.hudLives.textContent = livesGlyph();
  setEffectBanner();
  syncDiveButton();
}

function loseLife(reason) {
  if (state.mode !== 'play') return;
  state.lives = Math.max(0, state.lives - 1);
  state.combo = 0;
  state.heatLevel = 0;
  state.heatLeft = 0;
  state.heatUnlocked = 0;
  state.shake = 12;
  showToast(reason);
  sfxMiss();
  if (state.lives <= 0) {
    endGame();
  }
}

function applyCatch(item) {
  if (state.mode !== 'play') return;
  const { x, y } = item;

  if (item.kind === 'ball' || item.label === '金球' || item.mustCatch) {
    const gain = Math.round((item.points || 0) * state.scoreMult);
    state.score += gain;
    state.combo += 1;
    state.caught += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    const bonus = state.combo >= 4 ? Math.floor(state.combo / 4) * 3 : 0;
    if (bonus) state.score += bonus;
    if (item.mustCatch) {
      addFloat(x, y, `必扑 +${gain}`, '#ffd24a');
      burst(x, y, '#ffd24a', 16);
      showToast('必扑成功！');
      sfxMust();
      if (state.lives < MAX_LIVES && Math.random() < 0.35) {
        state.lives += 1;
        showToast('必扑回血 +1');
      }
    } else {
      addFloat(x, y, `+${gain}${bonus ? ` 连击` : ''}`, item.label === '金球' ? '#ffd24a' : '#ffffff');
      burst(x, y, item.label === '金球' ? '#ffd24a' : '#ffffff', 12);
      sfxCatch(item.label === '金球' ? 'gold' : 'ball');
    }
    checkHeatUnlock();
    return;
  }

  if (item.timeBonus) {
    state.timeLeft = Math.min(ROUND_SECONDS + 8, state.timeLeft + item.timeBonus);
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    addFloat(x, y, `+${item.timeBonus}秒`, '#9fe7ff');
    burst(x, y, '#7fd4ff', 12);
    showToast(`加时 +${item.timeBonus} 秒`);
    sfxBonus('clock');
    return;
  }

  if (item.scoreMult) {
    state.scoreMult = item.scoreMult;
    state.boostLeft = item.duration;
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    addFloat(x, y, '激励加倍!', '#ffd76a');
    burst(x, y, '#ffd76a', 14);
    showToast('激励道具：得分 ×2');
    sfxBonus('boost');
    return;
  }

  if (item.slowDuration) {
    state.yellowLeft = item.slowDuration;
    state.combo = 0;
    state.heatLevel = 0;
    state.heatLeft = 0;
    state.heatUnlocked = 0;
    addFloat(x, y, '黄牌!', '#ffc400');
    burst(x, y, '#ffc400', 10);
    state.shake = 8;
    showToast('黄牌：掉落变慢');
    sfxCard('yellow');
    recomputeFallMult();
    return;
  }

  if (item.scorePenalty) {
    state.score = Math.max(0, state.score - item.scorePenalty);
    state.combo = 0;
    addFloat(x, y, `-${item.scorePenalty}`, '#ff6b6b');
    burst(x, y, '#d64545', 14);
    state.shake = 14;
    showToast(`红牌：扣 ${item.scorePenalty} 分`);
    sfxCard('red');
  }
}

function missItem(item) {
  if (state.mode !== 'play') return;
  if (item.mustCatch) {
    loseLife('必扑球漏接，生命 -1');
    return;
  }
  if (item.kind === 'ball' || item.label === '金球') {
    loseLife(item.label === '金球' ? '漏接金球，生命 -1' : '漏接足球，生命 -1');
  }
}

function recomputeFallMult() {
  let m = 1;
  if (state.yellowLeft > 0) m *= 0.62;
  if (state.heatLeft > 0) m *= 0.82;
  state.fallMult = m;
}

function update(dt) {
  state.elapsed += dt;
  state.timeLeft -= dt;

  if (state.yellowLeft > 0) {
    state.yellowLeft -= dt;
    if (state.yellowLeft <= 0) {
      state.yellowLeft = 0;
      showToast('黄牌效果结束');
    }
  }

  if (state.boostLeft > 0) {
    state.boostLeft -= dt;
    if (state.boostLeft <= 0) {
      state.boostLeft = 0;
      state.scoreMult = 1;
      showToast('激励效果结束');
    }
  }

  if (state.heatLeft > 0) {
    state.heatLeft -= dt;
    if (state.heatLeft <= 0) {
      state.heatLeft = 0;
      showToast('防守热潮结束');
    }
  }

  if (state.diveLeft > 0) {
    state.diveLeft -= dt;
    if (state.diveLeft <= 0) {
      state.diveLeft = 0;
    }
  }

  recomputeFallMult();
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 40);

  if (state.elapsed >= state.mustNextAt && state.mustSpawned < MUST_MAX) {
    spawnMustBall();
    state.mustNextAt = state.elapsed + 8 + Math.random() * 3;
  }

  const spawnInterval = Math.max(0.22, 0.72 - state.elapsed * 0.018);
  state.spawnAcc += dt;
  while (state.spawnAcc >= spawnInterval) {
    state.spawnAcc -= spawnInterval;
    spawnItem();
    if (state.elapsed > 12 && Math.random() < 0.28) spawnItem();
  }

  const { h, goalW, goalH, x: gx, y: gy } = goalMetrics();
  const catchPad = state.diveLeft > 0 ? 18 : 4;

  for (const item of state.items) {
    item.y += item.vy * dt * state.fallMult;
    item.spin += item.spinSpeed * dt;
    item.wobble += dt * 3.4;
    item.x += Math.sin(item.wobble) * (item.wobbleAmp || 16) * dt;

    const inX = item.x > gx - catchPad && item.x < gx + goalW + catchPad;
    const inY = item.y + item.radius > gy + 8 && item.y - item.radius < gy + goalH;
    if (inX && inY) {
      item._caught = true;
      applyCatch(item);
    } else if (item.y - item.radius > h + 20) {
      item._gone = true;
      missItem(item);
    }
  }

  state.items = state.items.filter((it) => !it._caught && !it._gone);

  for (const f of state.floats) {
    f.life -= dt;
    f.y += f.vy * dt;
  }
  state.floats = state.floats.filter((f) => f.life > 0);

  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 220 * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  updateHud();

  if (state.mode === 'play' && state.timeLeft <= 0) {
    endGame();
  }
}

function drawPitch(w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#4bb87a');
  g.addColorStop(0.5, '#3aa86a');
  g.addColorStop(1, '#2f8f59');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  for (let i = 0; i < 9; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, (h / 9) * i, w, h / 9);
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.78)';
  ctx.lineWidth = 2.2;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  ctx.beginPath();
  ctx.arc(w / 2, h * 0.38, Math.min(w, h) * 0.14, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(12, h * 0.38);
  ctx.lineTo(w - 12, h * 0.38);
  ctx.stroke();

  // soft sky wash at top of pitch
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.22);
  sky.addColorStop(0, 'rgba(170,220,245,0.35)');
  sky.addColorStop(1, 'rgba(170,220,245,0)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.22);
}

function drawGoal(gx, gy, goalW, goalH) {
  ctx.save();
  ctx.translate(gx, gy);

  if (state.diveLeft > 0 || state.heatLeft > 0) {
    ctx.fillStyle = state.diveLeft > 0 ? 'rgba(90,168,255,0.22)' : 'rgba(255,196,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(goalW / 2, goalH / 2, goalW * 0.62, goalH * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(26,39,68,0.18)';
  ctx.beginPath();
  ctx.ellipse(goalW / 2, goalH + 6, goalW * 0.46, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 6, goalH);
  ctx.fillRect(goalW - 6, 0, 6, goalH);
  ctx.fillRect(0, 0, goalW, 6);

  ctx.strokeStyle = 'rgba(26,39,68,0.22)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    const x = (goalW / 5) * i;
    ctx.beginPath();
    ctx.moveTo(x, 6);
    ctx.lineTo(x, goalH);
    ctx.stroke();
  }
  for (let j = 1; j < 3; j += 1) {
    const y = 6 + ((goalH - 6) / 3) * j;
    ctx.beginPath();
    ctx.moveTo(6, y);
    ctx.lineTo(goalW - 6, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#ff5a3c';
  ctx.beginPath();
  ctx.moveTo(12, goalH - 2);
  ctx.quadraticCurveTo(goalW / 2, goalH + 12, goalW - 12, goalH - 2);
  ctx.quadraticCurveTo(goalW / 2, goalH - 14, 12, goalH - 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Map flat pattern coords (unit disk, |p|<=1) onto a sphere silhouette.
 * Edges compress so seams/panels wrap like a real ball.
 */
function sphereMap(px, py, R) {
  const d = Math.hypot(px, py);
  if (d < 1e-6) return { x: 0, y: 0 };
  const nd = Math.min(d, 0.995);
  const theta = nd * (Math.PI / 2) * 0.98;
  const pr = Math.sin(theta) * R;
  return { x: (px / d) * pr, y: (py / d) * pr };
}

function pathMappedPolygon(points, R) {
  ctx.beginPath();
  points.forEach((p, i) => {
    const m = sphereMap(p.x, p.y, R);
    if (i === 0) ctx.moveTo(m.x, m.y);
    else ctx.lineTo(m.x, m.y);
  });
  ctx.closePath();
}

function regularPolyPoints(cx, cy, radius, sides, rotation) {
  const pts = [];
  for (let i = 0; i < sides; i += 1) {
    const a = rotation + (i * Math.PI * 2) / sides;
    pts.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
  }
  return pts;
}

/** Flat Telstar ball — pure white / bright gold, no shadow. */
function drawBall(item) {
  const { x, y, radius: R, spin } = item;
  const isMust = Boolean(item.mustCatch);
  const isGold = item.label === '金球' || isMust;
  const isPro = item.variant === 'pro';
  const leather = isGold ? '#FFD54A' : '#FFFFFF';
  const panel = isGold ? '#7A4A00' : '#111111';
  const seam = isGold ? 'rgba(90,50,0,0.55)' : 'rgba(20,20,20,0.45)';

  ctx.save();
  ctx.translate(x, y);

  if (isMust) {
    const pulse = 0.55 + Math.sin(state.elapsed * 10) * 0.35;
    ctx.strokeStyle = `rgba(255,90,60,${0.35 + pulse * 0.45})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, R + 6 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,210,70,${0.4 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, R + 11 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.rotate(spin);

  // solid leather body — no gray gradient / no contact shadow
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = leather;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R - 0.5, 0, Math.PI * 2);
  ctx.clip();

  // center black pentagon
  const cR = 0.32;
  pathMappedPolygon(regularPolyPoints(0, 0, cR, 5, -Math.PI / 2), R);
  ctx.fillStyle = panel;
  ctx.fill();

  // seam lines from pentagon corners
  ctx.strokeStyle = seam;
  ctx.lineWidth = Math.max(1.2, R * 0.055);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const a0 = a;
    const a1 = -Math.PI / 2 + ((i + 1) * Math.PI * 2) / 5;
    const mid = (a0 + a1) / 2;
    const pts = [
      { x: Math.cos(a0) * cR, y: Math.sin(a0) * cR },
      { x: Math.cos(a0) * 0.52, y: Math.sin(a0) * 0.52 },
      { x: Math.cos(mid - Math.PI / 10) * 0.8, y: Math.sin(mid - Math.PI / 10) * 0.8 },
      { x: Math.cos(mid + Math.PI / 10) * 0.8, y: Math.sin(mid + Math.PI / 10) * 0.8 },
      { x: Math.cos(a1) * 0.52, y: Math.sin(a1) * 0.52 },
      { x: Math.cos(a1) * cR, y: Math.sin(a1) * cR },
    ];
    pathMappedPolygon(pts, R);
    ctx.stroke();
  }

  // three small edge hex-ish panels (keep leather dominant)
  for (let i = 0; i < 3; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 3 + Math.PI / 3;
    const cx = Math.cos(a) * 0.78;
    const cy = Math.sin(a) * 0.78;
    const local = regularPolyPoints(0, 0, 0.13, 5, a + Math.PI / 2);
    const pts = local.map((p) => ({
      x: cx + p.x * Math.cos(a + Math.PI) - p.y * Math.sin(a + Math.PI) * 0.6,
      y: cy + p.x * Math.sin(a + Math.PI) + p.y * Math.cos(a + Math.PI) * 0.6,
    }));
    pathMappedPolygon(pts, R);
    ctx.fillStyle = panel;
    ctx.fill();
  }

  if (isPro) {
    ctx.strokeStyle = '#FF5A3C';
    ctx.lineWidth = Math.max(2, R * 0.1);
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.04) {
      const ang = 0.45 + t * (Math.PI - 0.9);
      const p = sphereMap(Math.cos(ang) * 0.9, Math.sin(ang) * 0.9, R);
      if (t === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  ctx.restore();

  ctx.strokeStyle = isGold ? 'rgba(140,80,0,0.35)' : 'rgba(0,0,0,0.12)';
  ctx.lineWidth = Math.max(1, R * 0.03);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawCard(item, color) {
  const { x, y, radius: r, spin } = item;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(spin) * 0.25);
  const w = r * 1.4;
  const h = r * 1.95;
  // solid referee card — no lettering
  const shade = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  shade.addColorStop(0, color);
  shade.addColorStop(1, color);
  ctx.fillStyle = shade;
  roundRect(-w / 2, -h / 2, w, h, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  roundRect(-w / 2 + 2.5, -h / 2 + 2.5, w - 5, h - 5, 2);
  ctx.stroke();
  ctx.restore();
}

function drawClock(item) {
  const { x, y, radius: r, spin } = item;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#3b9dff';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(spin) * r * 0.45, Math.sin(spin) * r * 0.45);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 0.62);
  ctx.stroke();
  ctx.restore();
}

function drawBoost(item) {
  const { x, y, radius: r, spin } = item;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin * 0.3);
  ctx.fillStyle = '#ffc400';
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const a2 = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff4c2';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawItem(item) {
  if (item.label === '黄牌') drawCard(item, '#ffc400');
  else if (item.label === '红牌') drawCard(item, '#e23b3b');
  else if (item.timeBonus) drawClock(item);
  else if (item.scoreMult) drawBoost(item);
  else drawBall(item);
}

function render() {
  const { w, h, goalW, goalH, x: gx, y: gy } = goalMetrics();
  const sx = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const sy = state.shake ? (Math.random() - 0.5) * state.shake : 0;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(sx, sy);
  drawPitch(w, h);

  for (const item of state.items) drawItem(item);
  drawGoal(gx, gy, goalW, goalH);

  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const f of state.floats) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 16px "Avenir Next", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function loop(ts) {
  if (state.mode !== 'play') return;
  if (!state.lastTs) state.lastTs = ts;
  const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
  state.lastTs = ts;
  update(dt);
  render();
  state.raf = requestAnimationFrame(loop);
}

async function armAudio() {
  await unlockAudio();
  if (!isMuted()) startMusic();
}

function rankForScore(score, livesOut) {
  if (livesOut && score < 40) {
    return {
      title: '球门木桩',
      desc: '球从眼前飞过……再睁大一点眼睛！',
      tone: 'fail',
    };
  }
  if (score >= 260) {
    return {
      title: '绿茵传说',
      desc: '今天的球门，只认你一个人。',
      tone: 'legend',
    };
  }
  if (score >= 190) {
    return {
      title: '铁壁门神',
      desc: '扑得干净利落，对手都开始怀疑人生。',
      tone: 'legend',
    };
  }
  if (score >= 130) {
    return {
      title: '联赛主力',
      desc: '站位稳、反应快，已经很有门神味道。',
      tone: 'good',
    };
  }
  if (score >= 70) {
    return {
      title: '青春训练营',
      desc: '手感上来了，再冲一局冲击主力！',
      tone: 'good',
    };
  }
  if (livesOut) {
    return {
      title: '手忙脚乱',
      desc: '生命见底，但下一场一定能稳住。',
      tone: 'fail',
    };
  }
  return {
    title: '替补守门员',
    desc: '热身完成，正式比赛从下一秒开始。',
    tone: 'fail',
  };
}

function spawnConfetti(burst = false) {
  const host = els.overFx;
  if (!host) return;
  host.replaceChildren();
  const colors = ['#ff5a3c', '#ffc400', '#3b9dff', '#ffffff', '#3aa86a', '#ff8a65'];
  const count = burst ? 36 : 18;
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'over-fx__piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
    piece.style.animationDuration = `${1.6 + Math.random() * 1.8}s`;
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    piece.style.width = `${8 + Math.random() * 8}px`;
    piece.style.height = `${10 + Math.random() * 10}px`;
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    host.appendChild(piece);
  }
  window.setTimeout(() => {
    if (state.mode === 'over') host.replaceChildren();
  }, 4200);
}

function animateScoreValue(target) {
  window.cancelAnimationFrame(state.scoreAnim);
  const el = els.overScore;
  if (!el) return;
  const start = performance.now();
  const dur = Math.min(1100, 420 + target * 3);
  const tick = (now) => {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - (1 - t) ** 3;
    el.textContent = String(Math.round(target * eased));
    if (t < 1) state.scoreAnim = requestAnimationFrame(tick);
  };
  state.scoreAnim = requestAnimationFrame(tick);
}

function replayOverEnter() {
  els.over?.querySelectorAll('.home-enter').forEach((node) => {
    node.classList.remove('home-enter');
    void node.offsetWidth;
    node.classList.add('home-enter');
  });
}

function startGame() {
  cancelAnimationFrame(state.raf);
  window.cancelAnimationFrame(state.scoreAnim);
  void armAudio().then(() => sfxStart());
  state.score = 0;
  state.timeLeft = ROUND_SECONDS;
  state.lives = MAX_LIVES;
  state.combo = 0;
  state.maxCombo = 0;
  state.caught = 0;
  state.items = [];
  state.floats = [];
  state.particles = [];
  state.goalX = 0.5;
  state.lastTs = 0;
  state.spawnAcc = 0.15;
  state.elapsed = 0;
  state.fallMult = 1;
  state.scoreMult = 1;
  state.yellowLeft = 0;
  state.boostLeft = 0;
  state.heatLeft = 0;
  state.heatLevel = 0;
  state.heatUnlocked = 0;
  state.diveLeft = 0;
  state.diveCharges = MAX_DIVES;
  state.mustNextAt = 7;
  state.mustSpawned = 0;
  state.shake = 0;
  showScreen('play');
  // layout needs a frame to compute flex height
  requestAnimationFrame(() => {
    resizeCanvas();
    updateHud();
    state.raf = requestAnimationFrame(loop);
  });
}

function endGame() {
  if (state.mode !== 'play') return;
  cancelAnimationFrame(state.raf);
  state.mode = 'over';
  const livesOut = state.lives <= 0;
  const isNew = state.score > state.best;
  if (isNew) {
    state.best = state.score;
    writeBest(state.best);
  }
  updateBestLabels();

  const rank = rankForScore(state.score, livesOut);
  els.over?.classList.toggle('is-legend', rank.tone === 'legend' || isNew);
  els.over?.classList.toggle('is-fail', rank.tone === 'fail' && !isNew);
  if (els.overEyebrow) {
    els.overEyebrow.textContent = livesOut ? '提前终场' : '全场哨响';
  }
  if (els.overTitle) els.overTitle.textContent = isNew ? '新晋门神' : rank.title;
  if (els.overSubtitle) {
    els.overSubtitle.textContent = isNew
      ? `刷新纪录！${rank.desc}`
      : rank.desc;
  }
  if (els.overRecord) els.overRecord.hidden = !isNew;
  if (els.statCaught) els.statCaught.textContent = String(state.caught);
  if (els.statCombo) els.statCombo.textContent = String(state.maxCombo);
  if (els.statLives) els.statLives.textContent = String(Math.max(0, state.lives));

  animateScoreValue(state.score);
  spawnConfetti(isNew || rank.tone === 'legend');
  sfxOver(isNew || rank.tone === 'legend');
  stopMusic();
  showScreen('over');
  replayOverEnter();
}

function syncSoundButtons() {
  const muted = isMuted();
  const label = muted ? '音效关' : '音效开';
  for (const btn of [els.btnSound, els.btnSoundPlay]) {
    if (!btn) continue;
    const text = btn.querySelector('.btn-sound__label');
    if (text) text.textContent = label;
    else btn.textContent = label;
    const onIco = btn.querySelector('.btn-ico--sound-on');
    const offIco = btn.querySelector('.btn-ico--sound-off');
    if (onIco) onIco.hidden = muted;
    if (offIco) offIco.hidden = !muted;
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  }
  if (els.soundTip) els.soundTip.hidden = !muted;
}

function onToggleSound() {
  void unlockAudio().then(() => {
    toggleMuted();
    syncSoundButtons();
    if (!isMuted()) {
      sfxClick();
      startMusic();
      showToast('音效已开启，更有氛围');
    } else {
      stopMusic();
      showToast('音效已关闭');
    }
  });
}

function setGoalFromClientX(clientX) {
  const rect = els.canvas.getBoundingClientRect();
  const { goalW } = goalMetrics();
  const localX = clientX - rect.left;
  const max = Math.max(1, rect.width - goalW);
  state.goalX = Math.min(1, Math.max(0, (localX - goalW / 2) / max));
}

function bindControls() {
  const onDown = (e) => {
    if (state.mode !== 'play') return;
    state.pointerActive = true;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    setGoalFromClientX(x);
    e.preventDefault?.();
  };
  const onMove = (e) => {
    if (!state.pointerActive || state.mode !== 'play') return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    setGoalFromClientX(x);
    e.preventDefault?.();
  };
  const onUp = () => {
    state.pointerActive = false;
  };

  els.canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  els.canvas.addEventListener('touchstart', onDown, { passive: false });
  els.canvas.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);

  window.addEventListener('keydown', (e) => {
    if (state.mode !== 'play') return;
    if (e.key === 'ArrowLeft') state.goalX = Math.max(0, state.goalX - 0.05);
    if (e.key === 'ArrowRight') state.goalX = Math.min(1, state.goalX + 0.05);
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      activateDive();
    }
  });
}

els.btnStart?.addEventListener('click', () => {
  sfxClick();
  startGame();
});
els.btnAgain?.addEventListener('click', () => {
  sfxClick();
  startGame();
});
els.btnHome?.addEventListener('click', () => {
  sfxClick();
  cancelAnimationFrame(state.raf);
  stopMusic();
  showScreen('home');
  updateBestLabels();
  syncSoundButtons();
  // replay home entrance animations
  els.home?.querySelectorAll('.home-enter').forEach((node) => {
    node.classList.remove('home-enter');
    void node.offsetWidth;
    node.classList.add('home-enter');
  });
});
els.btnSound?.addEventListener('click', onToggleSound);
els.btnSoundPlay?.addEventListener('click', onToggleSound);
els.btnDive?.addEventListener('click', (e) => {
  e.stopPropagation();
  activateDive();
});
els.btnHelp?.addEventListener('click', () => {
  sfxClick();
  showScreen('help');
});
els.btnHelpClose?.addEventListener('click', () => {
  sfxClick();
  showScreen('home');
  updateBestLabels();
  syncSoundButtons();
});

window.addEventListener('resize', () => {
  if (state.mode === 'play') {
    resizeCanvas();
    render();
  }
});

bindControls();
updateBestLabels();
syncSoundButtons();
showScreen('home');
