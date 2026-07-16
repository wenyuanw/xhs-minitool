import './styles/app.css';
import { showToast } from './lib/toast.js';

const STORAGE_KEY = 'football-catch-best';
const ROUND_SECONDS = 60;

const TYPES = {
  ball: {
    kind: 'ball',
    label: '足球',
    weight: 52,
    radius: 18,
    points: 10,
  },
  ballPro: {
    kind: 'ball',
    label: '花式球',
    weight: 18,
    radius: 16,
    points: 18,
    variant: 'pro',
  },
  golden: {
    kind: 'bonus',
    label: '金球',
    weight: 8,
    radius: 17,
    points: 35,
  },
  clock: {
    kind: 'bonus',
    label: '加时',
    weight: 8,
    radius: 16,
    timeBonus: 5,
  },
  boost: {
    kind: 'bonus',
    label: '激励',
    weight: 6,
    radius: 16,
    scoreMult: 2,
    duration: 6,
  },
  yellow: {
    kind: 'penalty',
    label: '黄牌',
    weight: 5,
    radius: 15,
    slowDuration: 7,
  },
  red: {
    kind: 'penalty',
    label: '红牌',
    weight: 3,
    radius: 15,
    scorePenalty: 25,
  },
};

const TYPE_LIST = Object.values(TYPES);

const els = {
  home: document.querySelector('#screen-home'),
  play: document.querySelector('#screen-play'),
  over: document.querySelector('#screen-over'),
  homeBest: document.querySelector('#home-best'),
  hudScore: document.querySelector('#hud-score'),
  hudTime: document.querySelector('#hud-time'),
  hudCombo: document.querySelector('#hud-combo'),
  effectBanner: document.querySelector('#effect-banner'),
  canvas: document.querySelector('#game'),
  overScore: document.querySelector('#over-score'),
  overBest: document.querySelector('#over-best'),
  overSubtitle: document.querySelector('#over-subtitle'),
  btnStart: document.querySelector('#btn-start'),
  btnAgain: document.querySelector('#btn-again'),
  btnHome: document.querySelector('#btn-home'),
};

const ctx = els.canvas.getContext('2d');

const state = {
  mode: 'home',
  score: 0,
  timeLeft: ROUND_SECONDS,
  combo: 0,
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
  shake: 0,
  raf: 0,
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
  state.mode = name;
}

function updateBestLabels() {
  if (els.homeBest) els.homeBest.textContent = `最高分 ${state.best}`;
  if (els.overBest) els.overBest.textContent = `最高分 ${state.best}`;
}

function resizeCanvas() {
  const wrap = els.canvas.parentElement;
  if (!wrap) return;
  const cssW = wrap.clientWidth;
  const cssH = Math.min(wrap.clientHeight || cssW * 1.45, window.innerHeight * 0.68);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(280, Math.floor(cssW));
  const h = Math.max(360, Math.floor(cssH || w * 1.45));
  els.canvas.width = Math.floor(w * dpr);
  els.canvas.height = Math.floor(h * dpr);
  els.canvas.style.width = `${w}px`;
  els.canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function goalMetrics() {
  const w = els.canvas.clientWidth;
  const h = els.canvas.clientHeight;
  const goalW = Math.min(118, w * 0.34);
  const goalH = 46;
  const x = state.goalX * (w - goalW);
  const y = h - goalH - 18;
  return { w, h, goalW, goalH, x, y };
}

function pickType() {
  const total = TYPE_LIST.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of TYPE_LIST) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return TYPES.ball;
}

function spawnItem() {
  const { w } = goalMetrics();
  const type = pickType();
  const margin = type.radius + 8;
  state.items.push({
    ...type,
    x: margin + Math.random() * (w - margin * 2),
    y: -type.radius - 8,
    vy: 110 + Math.random() * 40 + state.elapsed * 2.2,
    spin: Math.random() * Math.PI * 2,
    spinSpeed: (Math.random() * 3 + 1.5) * (Math.random() < 0.5 ? -1 : 1),
    wobble: Math.random() * Math.PI * 2,
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

function updateHud() {
  els.hudScore.textContent = String(state.score);
  els.hudTime.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
  els.hudCombo.textContent = String(state.combo);
  setEffectBanner();
}

function applyCatch(item) {
  const { x, y } = item;

  if (item.kind === 'ball' || item.label === '金球') {
    const gain = Math.round((item.points || 0) * state.scoreMult);
    state.score += gain;
    state.combo += 1;
    const bonus = state.combo >= 5 ? Math.floor(state.combo / 5) * 2 : 0;
    if (bonus) state.score += bonus;
    addFloat(x, y, `+${gain}${bonus ? ` 连击` : ''}`, item.label === '金球' ? '#d4a017' : '#f4fff0');
    burst(x, y, item.label === '金球' ? '#f3d16b' : '#ffffff', 12);
    return;
  }

  if (item.timeBonus) {
    state.timeLeft += item.timeBonus;
    state.combo += 1;
    addFloat(x, y, `+${item.timeBonus}秒`, '#9fe7ff');
    burst(x, y, '#7fd4ff', 12);
    showToast(`加时 +${item.timeBonus} 秒`);
    return;
  }

  if (item.scoreMult) {
    state.scoreMult = item.scoreMult;
    state.boostLeft = item.duration;
    state.combo += 1;
    addFloat(x, y, '激励加倍!', '#ffd76a');
    burst(x, y, '#ffd76a', 14);
    showToast('激励道具：得分 ×2');
    return;
  }

  if (item.slowDuration) {
    state.yellowLeft = item.slowDuration;
    state.fallMult = 0.55;
    state.combo = 0;
    addFloat(x, y, '黄牌!', '#e8b923');
    burst(x, y, '#e8b923', 10);
    state.shake = 8;
    showToast('黄牌：掉落速度变慢');
    return;
  }

  if (item.scorePenalty) {
    state.score = Math.max(0, state.score - item.scorePenalty);
    state.combo = 0;
    addFloat(x, y, `-${item.scorePenalty}`, '#ff6b6b');
    burst(x, y, '#d64545', 14);
    state.shake = 14;
    showToast(`红牌：扣 ${item.scorePenalty} 分`);
  }
}

function missItem(item) {
  if (item.kind === 'ball' || item.label === '金球') {
    state.combo = 0;
  }
}

function update(dt) {
  state.elapsed += dt;
  state.timeLeft -= dt;

  if (state.yellowLeft > 0) {
    state.yellowLeft -= dt;
    if (state.yellowLeft <= 0) {
      state.yellowLeft = 0;
      state.fallMult = 1;
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

  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 40);

  const spawnInterval = Math.max(0.38, 0.95 - state.elapsed * 0.012);
  state.spawnAcc += dt;
  while (state.spawnAcc >= spawnInterval) {
    state.spawnAcc -= spawnInterval;
    spawnItem();
  }

  const { h, goalW, goalH, x: gx, y: gy } = goalMetrics();
  const catchPad = 6;

  for (const item of state.items) {
    item.y += item.vy * dt * state.fallMult;
    item.spin += item.spinSpeed * dt;
    item.wobble += dt * 3;
    item.x += Math.sin(item.wobble) * 12 * dt;

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

  if (state.timeLeft <= 0) {
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

function drawBall(item) {
  const { x, y, radius: r, spin } = item;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);

  if (item.label === '金球') {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(1, '#d4a017');
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = '#f2f2f2';
  }
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * r * 0.42;
    const py = Math.sin(a) * r * 0.42;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = item.label === '金球' ? '#7a5600' : '#1a1a1a';
  ctx.fill();

  if (item.variant === 'pro') {
    ctx.strokeStyle = '#ff5a3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

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

function startGame() {
  cancelAnimationFrame(state.raf);
  state.score = 0;
  state.timeLeft = ROUND_SECONDS;
  state.combo = 0;
  state.items = [];
  state.floats = [];
  state.particles = [];
  state.goalX = 0.5;
  state.lastTs = 0;
  state.spawnAcc = 0.2;
  state.elapsed = 0;
  state.fallMult = 1;
  state.scoreMult = 1;
  state.yellowLeft = 0;
  state.boostLeft = 0;
  state.shake = 0;
  showScreen('play');
  resizeCanvas();
  updateHud();
  state.raf = requestAnimationFrame(loop);
}

function endGame() {
  cancelAnimationFrame(state.raf);
  state.mode = 'over';
  const isNew = state.score > state.best;
  if (isNew) {
    state.best = state.score;
    writeBest(state.best);
  }
  updateBestLabels();
  els.overScore.textContent = String(state.score);
  els.overSubtitle.textContent = isNew
    ? '新纪录！门将封神'
    : state.score >= 200
      ? '防守稳健，继续保持'
      : '再练几局，手感会上来';
  showScreen('over');
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
  });
}

els.btnStart?.addEventListener('click', startGame);
els.btnAgain?.addEventListener('click', startGame);
els.btnHome?.addEventListener('click', () => {
  cancelAnimationFrame(state.raf);
  showScreen('home');
  updateBestLabels();
});

window.addEventListener('resize', () => {
  if (state.mode === 'play') {
    resizeCanvas();
    render();
  }
});

bindControls();
updateBestLabels();
showScreen('home');
