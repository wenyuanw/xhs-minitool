import { meters, nextMarker } from './game/challenge.js';
import { icon, starRow, decorateTitles } from './ui/pixel.js';
import { ENCOUNTERS, WISHES, DECOR, decorUnlocked, syncJourney, wishProgress } from './game/journey.js';
import './styles/app.css';
import { CHARACTERS, LEVELS, ITEMS, SKINS } from './game/data.js';
import { createRun, advance, paddle, tapCollect, finish } from './game/engine.js';
import { makeSprites, drawHero, drawRun, drawItem, drawDecoration, postcard } from './game/render.js';
import { bindInput } from './game/input.js';
import { createStorage, applyResult, defaults } from './lib/storage.js';
import { createAudio } from './lib/audio.js';
import { sendCard } from './lib/media.js';

const app = document.querySelector('#app');
const pixelIcon = name => {
  const shapes = {
    pause: '<path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"/>',
    shell: '<path fill="#eddeb0" d="M7 4h10v3h3v3h2v6h-4v4H6v-4H2v-6h2V7h3z"/><path fill="#ae9667" d="M7 8h2v7H7zm4-2h2v10h-2zm4 2h2v7h-2z"/>',
    paddle: '<path fill="#355347" d="M22 2h6v6h-3v3h-3v3h-3v3h-3v5h-3v5H8v3H2v-6h3v-5h5v-3h5v-3h3v-3h3V7h-2V4h3z"/><path fill="#efd299" d="M23 2h4v5h-3v3h-3v3h-3v3h-3v3h-3v-4h3v-3h3V9h3V6h-2V4h4zM7 17h5v3h2v5h-3v3H4v-7h3z"/><path fill="#fff0c4" d="M7 18h3v3H7v5H5v-5h2zM23 3h3v2h-3z"/>',
  };
  return `<svg viewBox="0 0 ${name === 'paddle' ? '32 32' : '24 24'}" shape-rendering="crispEdges" aria-hidden="true">${shapes[name]}</svg>`;
};
const stars = starRow;
const hearts = n => [0, 1, 2].map(i => `<span class="${i < n ? 'heart-full' : 'heart-empty'}">${icon('heart')}</span>`).join('');
app.innerHTML = `<div id="screen"></div><button id="sound-toggle" class="sound-fab" data-action="sound" aria-label="开启声音" aria-pressed="false" hidden>${icon('soundOff')}</button><div id="notice" role="status" hidden></div><div id="modal" class="overlay" hidden></div><div id="rotation" class="overlay rotation" hidden><div class="paper"><div class="rotate-icon">${icon('board')}</div><h2 data-pixel-title>竖起手机</h2><p>已暂停，转回后继续。</p></div></div>`;
const screen = document.querySelector('#screen'), notice = document.querySelector('#notice'), modal = document.querySelector('#modal'), soundToggle = document.querySelector('#sound-toggle');
let noticeTimer, state, run, view = 'loading', result, heroCanvas, gameCanvas, gameContext, cardData, gesture;
let last = 0, lastDraw = 0, animation = 0, low = false, samples = [], hudAt = 0, pausedFocus;
const sprites = (() => { try { return makeSprites(); } catch { return null; } })(), audio = createAudio();
function toast(message) { notice.textContent = message; notice.hidden = false; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.hidden = true; }, 4500); }
const storage = createStorage(window, toast);
const themeFor = level => state.settings.theme === 'auto' ? level.theme : state.settings.theme;
const sceneFor = name => ({ home: 'home', map: 'map', atlas: 'atlas', dock: 'dock', wardrobe: 'wardrobe', settings: 'settings', game: 'game', result: 'result' }[name] || 'home');
function syncSoundButton() {
  if (!state) return;
  soundToggle.hidden = false; soundToggle.className = 'sound-fab ' + (state.settings.sound ? 'is-on ' : 'is-off ') + (view === 'game' ? 'in-game' : '');
  soundToggle.innerHTML = icon(state.settings.sound ? 'sound' : 'soundOff');
  soundToggle.setAttribute('aria-label', state.settings.sound ? '关闭背景音乐和音效' : '开启背景音乐和音效');
  soundToggle.setAttribute('aria-pressed', String(state.settings.sound));
}
function header(title, subtitle = '') { return `<header class="page-head"><div class="header-sprig">${icon('leaf')}</div><h1 data-pixel-title>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</header>`; }
function backBar() { return `<button class="text-button back-button" data-action="map">${icon('back')} 路线</button>`; }
function nav() { return `<nav class="home-nav" aria-label="更多"><button data-action="dock">${icon('dock')}<span>码头</span></button><button data-action="atlas">${icon('book')}<span>图鉴</span></button><button data-action="wardrobe">${icon('board')}<span>装扮</span></button><button data-action="settings">${icon('settings')}<span>设置</span></button></nav>`; }
function setView(next) {
  if (gesture) gesture.destroy();
  view = next; heroCanvas = null; gameCanvas = null; gameContext = null; gesture = null;
  closeModal(); screen.className = next; screen.scrollTop = 0;
  if (next === 'home') home();
  else if (next === 'map') map();
  else if (next === 'atlas') atlas();
  else if (next === 'dock') dock();
  else if (next === 'wardrobe') wardrobe();
  else if (next === 'settings') settings();
  else if (next === 'game') game();
  else if (next === 'result') settlement();
  decorateTitles(screen); syncSoundButton(); audio.setScene(sceneFor(next)); resize(); ensureAnimation();
}
function home() {
  screen.innerHTML = `<main class="home-page"><div class="home-landscape"><canvas id="hero" width="480" height="420" aria-label="像素湖泊与自己的小码头"></canvas></div><header class="home-brand"><h1 class="wordmark" data-pixel-title>慢桨</h1><p>把日子，划慢一点</p></header><section class="home-paper"><button class="primary" data-action="map">${state.visited ? '继续旅程' : '出发'} ${icon('arrow')}</button><button class="home-free" data-action="free">${icon('heart')} 挑战漂流</button>${nav()}</section></main>`;
  heroCanvas = document.querySelector('#hero');
}
function map() {
  const unlocked = Math.min(6, state.completed + 1);
  screen.innerHTML = `<main class="page">${header('沿水而行', '六段水域，慢慢走')}<div class="map-summary"><span>${icon('map')} ${state.completed} / 6</span><button class="text-button" data-action="home">首页</button></div><button class="free-card" data-action="free"><span class="infinity">${icon('wave')}</span><span><strong>挑战漂流</strong><small>${state.challengeBest ? '最佳 ' + state.challengeBest + ' 米' : '三颗心，能漂多远'}</small></span>${icon('arrow')}</button><div class="route-map"><svg class="route-line" viewBox="0 0 320 660" preserveAspectRatio="none" aria-hidden="true"><path d="M44 54v46h116v55h116v54H160v56H44v110h116v55h116v55H160v55H44v110h232"/></svg>${LEVELS.map((l, i) => `<button class="route-stop stop-${i % 2} ${i < unlocked ? 'unlocked' : 'locked'} ${i === state.completed ? 'next-stop' : ''}" data-action="level" data-id="${i}" ${i >= unlocked ? 'disabled' : ''}><span class="node"><span class="node-number">${String(i + 1).padStart(2, '0')}</span>${icon(i < unlocked ? 'dock' : 'lock')}</span><span class="stop-copy"><span class="stop-name">${l.name}</span><span class="stop-note">${i >= unlocked ? '待抵达' : l.duration + ' 秒 · ' + (i === state.completed ? '下一站' : '重游')}</span><span class="stars" aria-label="${state.best[i] ? state.best[i].stars : 0} 星">${stars(state.best[i] ? state.best[i].stars : 0)}</span></span></button>`).join('')}</div>${nav()}</main>`;
}
function atlas() {
  const areas = ['青绿湖心', '芦苇缓湾', '林间双溪', '峡谷回声', '落日风岸', '星光入海'];
  screen.innerHTML = `<main class="page">${header('拾光图鉴', '每段水域，都有四份小纪念')}<div class="map-summary"><span>${state.discovered.length} / ${ITEMS.length}</span>${backBar()}</div>${areas.map((area, a) => `<section class="atlas-section"><h2><span>0${a + 1}</span> ${area}</h2><div class="collection-grid">${ITEMS.filter(it => it.area === a).map(it => { const known = state.discovered.includes(it.id); return `<button class="collection-card ${known ? '' : 'unknown'}" data-action="item" data-id="${it.id}"><canvas width="80" height="80" data-item="${it.id}" aria-hidden="true"></canvas><strong>${known ? it.name : '未曾遇见'}</strong><span>${known ? '' : '第 ' + (a + 1) + ' 段水域'}</span></button>`; }).join('')}</div></section>`).join('')}</main>`;
  screen.querySelectorAll('[data-item]').forEach(c => { const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false; drawItem(ctx, sprites, Number(c.dataset.item), 40, 40, 72); });
}
function dock() {
  const j = state.journey;
  screen.innerHTML = `<main class="page dock-page">${header('我的码头')}${backBar()}<canvas id="hero" class="dock-scene" width="480" height="420" aria-label="我的像素小码头，展示已摆放的六种装饰"></canvas><div class="dock-summary">${j.equipped.filter(Boolean).length} / 6 件小美好</div><div class="decor-grid">${DECOR.map((d,i) => { const unlocked = decorUnlocked(j,i); return `<button class="decor-card ${j.equipped[i] ? 'selected' : ''}" data-action="decor" data-id="${i}" aria-pressed="${j.equipped[i]}" ${unlocked ? '' : 'disabled'}><canvas class="decor-sprite" width="64" height="72" data-decor="${i}" aria-hidden="true"></canvas><strong>${d.name}</strong><small>${unlocked ? j.equipped[i] ? '已摆放' : '摆上' : d.hint}</small></button>`; }).join('')}</div><div class="story-shelf" aria-label="奇遇手记">${ENCOUNTERS.map((e,i) => `<button class="story-token" data-action="story" data-id="${i}" aria-label="${e.name}" ${j.encounters[i] ? '' : 'disabled'}>${icon(['duck','bottle','sun','dock'][i])}<span>${j.encounters[i] ? e.name : '未遇见'}</span></button>`).join('')}</div><button class="primary dock-depart" data-action="free">挑战更远 ${icon('arrow')}</button></main>`;
  heroCanvas = document.querySelector('#hero');
  screen.querySelectorAll('[data-decor]').forEach(canvas => { const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.scale(2, 2); drawDecoration(c, Number(canvas.dataset.decor), 15, 28); });
}
function wardrobe() {
  screen.innerHTML = `<main class="page wardrobe-page">${header('漂流装扮', '换一位搭档，也换一种划法')}<div class="map-summary shell-balance"><span>${pixelIcon('shell')} ${state.shells} 枚贝壳</span>${backBar()}</div><section class="wardrobe-section"><h2>漂流搭档 <small>${state.characters.length} / ${CHARACTERS.length}</small></h2><div class="character-grid">${CHARACTERS.map((character, i) => { const unlocked = state.characters.includes(i); return `<button class="character-card ${state.character === i ? 'selected' : ''} ${unlocked ? '' : 'locked-character'}" data-action="character" data-id="${i}" aria-pressed="${state.character === i}"><canvas width="100" height="120" data-character="${i}" aria-hidden="true"></canvas><strong>${character.name}</strong><small>${character.ability}</small><span>${state.character === i ? '已出发' : unlocked ? '选择' : pixelIcon('shell') + ' ' + character.cost}</span></button>`; }).join('')}</div></section><section class="wardrobe-section"><h2>桨板造型 <small>轮廓与花纹均不同</small></h2><div class="skin-list">${SKINS.map((skin, i) => `<button class="skin-card ${state.skin === i ? 'selected' : ''}" data-action="skin" data-id="${i}" ${state.completed < skin.unlock ? 'disabled' : ''}><canvas width="100" height="120" data-skin="${i}" aria-hidden="true"></canvas><span><strong>${skin.name}</strong><small>${state.completed < skin.unlock ? '抵达第 ' + skin.unlock + ' 段后解锁' : skin.note}</small></span><span class="skin-state">${state.skin === i ? '已选' : state.completed < skin.unlock ? '待解锁' : '换上'}</span></button>`).join('')}</div></section></main>`;
  screen.querySelectorAll('[data-skin]').forEach(c => { const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(sprites['board' + c.dataset.skin], 10, 0, 80, 96); });
  screen.querySelectorAll('[data-character]').forEach(c => { const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(sprites['character' + c.dataset.character], 10, 0, 80, 96); });
}
function settings() {
  screen.innerHTML = `<main class="page">${header('漂流设置')}${backBar()}<section class="setting-card"><h2>天色</h2><div class="theme-options">${[['auto','随水域','leaf'],['day','白昼','sun'],['sunset','黄昏','sun'],['night','夜晚','moon']].map(t => `<button class="${state.settings.theme === t[0] ? 'selected' : ''}" aria-pressed="${state.settings.theme === t[0]}" data-action="theme" data-theme="${t[0]}">${icon(t[2])}<span>${t[1]}</span></button>`).join('')}</div></section><button class="setting-link" data-action="help">${icon('board')} 怎么漂 ${icon('arrow')}</button><button class="setting-link" data-action="storage-info">${icon('book')} 旅程存档 ${icon('arrow')}</button><button class="text-button danger" data-action="reset">重新开始</button></main>`;
}
function startRun(id, mode = 'level') {
  if (mode === 'level' && (id > state.completed || id < 0 || id > 5)) return;
  run = createRun(id, mode, Math.min(6, state.completed + 1), state.journey.trips, state.character); state.journey.trips++; result = null; cardData = null; low = false; samples = [];
  run.showTutorial = !state.tutorialSeen;
  state.visited = true; storage.write(state);
  setView('game');
  if (mode === 'free' && !state.challengeSeen) {
    run.status = 'paused'; run.challengeIntro = true; run.showTutorial = false;
    openModal(`<div class="intro-hearts">${hearts(3)}</div><h2>挑战漂流</h2><p>左右拖动，避开浮木和礁石。<br>撞一次，少一颗心。<br>水流会渐渐加快。</p><button class="primary" data-action="resume">出发 ${icon('arrow')}</button>`);
  } else if (state.settings.sound) audio.start('game');
}
function completeTutorial() {
  if (!run.showTutorial) return;
  run.showTutorial = false;
  state.tutorialSeen = true;
  storage.write(state);
}
function game() {
  if (run.mode === 'free') screen.classList.add('challenge');
  screen.innerHTML = `<main class="game-page"><div class="water-stage"><canvas id="water" aria-label="漂流水域，在水面左右拖动控制桨板"></canvas></div><header class="game-heading"><span class="journey-number" aria-label="${run.mode === 'free' ? '挑战漂流' : '第 ' + (run.levelId + 1) + ' 段'}">${run.mode === 'free' ? icon('wave') : String(run.levelId + 1).padStart(2, '0')}</span><h1>${run.level.name}</h1></header><div class="game-hud"><button class="hud-button pixel-control" aria-label="暂停漂流" data-action="pause">${pixelIcon('pause')}</button><span class="collect-count" aria-label="本局拾取的贝壳">${pixelIcon('shell')}<b id="shell-count">0</b><b id="count" class="sr-only">0</b></span></div>${run.mode === 'free' ? `<div class="life-hud" id="lives" role="status" aria-label="剩余 3 颗心">${hearts(3)}</div>` : ''}<div id="wish" class="wish-hud" role="status">${icon('leaf')}<span id="wish-text"></span></div><div id="journey-message" class="journey-message" role="status" hidden></div><div id="tutorial" class="tutorial" ${run.showTutorial ? '' : 'hidden'}>左右轻拖，跟着水流走<span>拾贝壳解锁搭档，轻点收藏小物</span></div><footer class="game-bottom"><div class="journey-progress" aria-label="漂流进度"><span id="progress-text">${run.mode === 'free' ? '0 米' : '0%'}</span>${run.mode === 'free' ? `<small id="distance-target">下一站 250 米</small>` : ''}<div class="progress-track" ${run.mode === 'free' ? 'hidden' : ''}><i id="progress-fill"></i></div></div><div class="paddle-dock"><div id="paddle-hint" ${run.showTutorial ? '' : 'hidden'}>轻点小桨，向前划一下<span>↓</span></div><button class="paddle-button pixel-control" data-action="paddle" aria-label="划一桨">${pixelIcon('paddle')}<span class="paddle-charge" aria-hidden="true"><i id="paddle-charge-fill"></i></span></button></div></footer></main>`;
  gameCanvas = document.querySelector('#water'); gameContext = gameCanvas.getContext('2d');
  if (!gameContext) { setView('home'); toast('当前环境无法绘制水域，请更新客户端后重试。'); return; }
  gesture = bindInput(gameCanvas, () => run, () => gameCanvas.height);
  gameCanvas.addEventListener('water-tap', e => tapCollect(run, e.detail.x, e.detail.worldY));
  hudAt = -1;
}
function openModal(html) {
  pausedFocus = document.activeElement;
  modal.innerHTML = `<section class="paper" role="dialog" aria-modal="true" aria-label="慢桨提示">${html}</section>`;
  modal.querySelectorAll('h2').forEach(h => h.setAttribute('data-pixel-title', ''));
  decorateTitles(modal); modal.hidden = false;
  const first = modal.querySelector('button'); if (first) first.focus();
}
function closeModal() { modal.hidden = true; modal.innerHTML = ''; if (pausedFocus && document.contains(pausedFocus)) pausedFocus.focus(); }
function pause() {
  if (view !== 'game' || !run || run.status !== 'running') return;
  run.status = 'paused'; run.accumulator = 0; gesture.cancel(); audio.stop();
  openModal(`<div class="dialog-icon">${icon('pause')}</div><h2>歇一会儿</h2><button class="primary" data-action="resume">继续漂流 ${icon('arrow')}</button>${run.mode === 'free' ? '<button class="secondary" data-action="end-free">靠岸结算</button>' : '<button class="secondary" data-action="leave">返回路线</button>'}`);
}
function endRun() {
  syncJourney(state, run);
  const completed = finish(run); if (!completed) return;
  const oldCompleted = state.completed, previousBest = state.challengeBest;
  result = Object.assign(completed, { name: completed.mode === 'free' ? '挑战漂流' : LEVELS[completed.levelId].name, theme: themeFor(run.level), skin: state.skin, character: state.character, dock: JSON.parse(JSON.stringify(state.journey)) });
  applyResult(state, result);
  if (result.mode === 'free') { result.bestDistance = state.challengeBest; result.newRecord = result.distance > previousBest; }
  storage.write(state);
  result.unlock = completed.mode === 'free' ? result.endReason === 'lives' ? '三颗心用完了，下次再向前一点。' : '主动靠岸，距离已记下。' : state.completed > oldCompleted ? state.completed === 6 ? '六段水域都已抵达，星河蓝桨板已解锁。' : state.completed === 3 ? '下一段水域与落日珊瑚桨板已解锁。' : '下一段水域已点亮，风景继续。' : '熟悉的水域，也有新的小美好。';
  setView('result');
  if (state.settings.sound) { audio.setScene('result'); audio.effect('finish'); }
}
function settlement() {
  const hasNext = result.mode === 'level' && result.levelId < LEVELS.length - 1;
  const primaryAction = hasNext ? 'next-level' : result.mode === 'free' ? 'again' : 'map';
  const primaryLabel = hasNext ? '下一段 · ' + LEVELS[result.levelId + 1].name : result.mode === 'free' ? '再挑战一次' : '返回路线图';
  const secondaryActions = [
    ...(primaryAction !== 'map' ? [['map', '路线']] : []),
    ...(primaryAction !== 'again' ? [['again', '重游']] : []),
    ['dock', '码头'],
    ['card', '留张纪念'],
  ];
  screen.innerHTML = `<main class="page result-page ${result.mode === 'free' ? 'challenge-result' : ''}">${header(result.mode === 'free' ? result.newRecord ? '新纪录' : '这次漂了多远' : '靠岸了')}<div class="result-ticket ${result.mode === 'free' ? 'challenge-ticket' : ''}"><canvas id="result-scene" width="480" height="360" aria-label="本次漂流的像素水域"></canvas>${result.mode === 'level' ? `<h2>${result.name}</h2>` : ''}${result.mode === 'level' ? `<div class="result-stars" aria-label="获得 ${result.stars} 星">${stars(result.stars)}</div>` : `<div class="challenge-score"><b>${result.distance}</b><span>米</span></div><p class="challenge-best">${result.newRecord ? '刷新纪录 · ' : ''}本机最佳 ${result.bestDistance} 米</p><div class="result-hearts" aria-label="剩余 ${result.lives} 颗心">${hearts(result.lives)}</div>`}<div class="result-metrics"><div><b>${result.count}</b><span>图鉴</span></div><div><b>+${result.shells}</b><span>贝壳</span></div><div><b>${result.seconds}<small>秒</small></b><span>时光</span></div></div>${result.wishDone ? `<p class="wish-keepsake">${icon('leaf')} 小心愿达成</p>` : ''}</div><button class="primary" data-action="${primaryAction}">${primaryLabel}${icon('arrow')}</button><div class="result-actions actions-${secondaryActions.length}">${secondaryActions.map(([action, label]) => `<button class="secondary" data-action="${action}">${icon({map:'map',again:'wave',dock:'dock',card:'share'}[action])}<span>${label}</span></button>`).join('')}</div><button class="text-button result-detail" data-action="trip-details">查看手记 ${icon('book')}</button></main>`;
  const c = document.querySelector('#result-scene'); drawHero(c.getContext('2d'), c.width, c.height, result.theme, sprites, result.skin, 2, result.dock, result.character);
}
function showCard() {
  if (!cardData) cardData = postcard(result, result.theme, sprites, result.skin, result.character).toDataURL('image/png');
  openModal(`<h2>这一程</h2><img id="card-preview" class="card-preview" alt="慢桨漂流纪念明信片" /><p id="media-status" role="status"></p><div class="result-actions"><button class="secondary" data-action="save-card">${icon('save')} 保存相册</button><button class="primary" data-action="post-card">${icon('share')} 发笔记</button></div><button class="text-button" data-action="close-modal">收好</button>`);
  document.querySelector('#card-preview').src = cardData;
}
async function handleAction(button) {
  const action = button.dataset.action, id = Number(button.dataset.id);
  if (action === 'sound') {
    button.disabled = true;
    const next = !state.settings.sound;
    if (next && !await audio.start(sceneFor(view))) toast('当前环境暂不能播放声音，仍可安静地漂流。');
    else { state.settings.sound = next; if (!next) audio.disable(); await storage.write(state); }
    button.disabled = false; syncSoundButton(); return;
  }
  if (['home','map','atlas','wardrobe','settings','dock'].includes(action)) { setView(action); return; }
  if (action === 'decor') {
    if (decorUnlocked(state.journey, id)) { state.journey.equipped[id] = !state.journey.equipped[id]; storage.write(state); setView('dock'); }
  } else if (action === 'level') startRun(id);
  else if (action === 'free') startRun(0, 'free');
  else if (action === 'pause') pause();
  else if (action === 'paddle') { if (paddle(run)) { completeTutorial(); if (state.settings.sound) audio.effect('paddle'); } }
  else if (action === 'resume') {
    if (window.innerWidth > window.innerHeight && window.innerHeight < 600) return;
    if (run.challengeIntro) { state.challengeSeen = true; run.challengeIntro = false; run.showTutorial = !state.tutorialSeen; storage.write(state); }
    closeModal(); run.status = 'running'; run.accumulator = 0; last = 0; if (state.settings.sound) audio.start();
  } else if (action === 'leave') { run.status = 'abandoned'; setView('map'); }
  else if (action === 'end-free') endRun();
  else if (action === 'next-level' && view === 'result' && result.mode === 'level' && result.levelId < LEVELS.length - 1) startRun(result.levelId + 1);
  else if (action === 'again') startRun(result.mode === 'free' ? 0 : result.levelId, result.mode);
  else if (action === 'skin') { if (SKINS[id] && state.completed >= SKINS[id].unlock) { state.skin = id; storage.write(state); if (state.settings.sound) audio.effect('select'); setView('wardrobe'); } }
  else if (action === 'character') {
    const character = CHARACTERS[id]; if (!character) return;
    if (state.characters.includes(id)) { state.character = id; storage.write(state); if (state.settings.sound) audio.effect('select'); setView('wardrobe'); }
    else if (state.shells >= character.cost) openModal(`<div class="unlock-character-preview"><canvas id="unlock-character" width="100" height="120" aria-hidden="true"></canvas></div><h2>邀请${character.name}？</h2><p>${character.ability}<br>需要 ${character.cost} 枚贝壳，现有 ${state.shells} 枚。</p><button class="primary" data-action="confirm-character" data-id="${id}">用贝壳解锁</button><button class="text-button" data-action="close-modal">再想想</button>`);
    else toast('还差 ' + (character.cost - state.shells) + ' 枚贝壳，再去水面找一找。');
    const preview = document.querySelector('#unlock-character'); if (preview) { const c = preview.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(sprites['character' + id], 10, 0, 80, 96); }
  } else if (action === 'confirm-character') {
    const character = CHARACTERS[id];
    if (!character || state.characters.includes(id) || state.shells < character.cost) { closeModal(); setView('wardrobe'); return; }
    state.shells -= character.cost; state.characters.push(id); state.character = id; await storage.write(state); closeModal(); if (state.settings.sound) audio.effect('unlock'); setView('wardrobe'); toast(character.name + '已加入这趟旅程。');
  }
  else if (action === 'theme') { state.settings.theme = button.dataset.theme; storage.write(state); setView('settings'); }
  else if (action === 'story') {
    if (state.journey.encounters[id]) openModal(`<div class="dialog-icon">${icon(['duck','bottle','sun','dock'][id])}</div><h2>${ENCOUNTERS[id].name}</h2><p>${ENCOUNTERS[id].story}</p><button class="secondary" data-action="close-modal">收好</button>`);
  } else if (action === 'help') {
    openModal(`<div class="dialog-icon">${icon('board')}</div><h2>怎么漂</h2><div class="help-steps"><p>左右拖动，转向</p><p>靠近或轻点，拾取</p><p>轻点小桨，划水</p><p>在发光水流里划桨，顺流滑行</p><p>挑战漂流有三颗心，硬碰撞扣一颗</p></div><button class="secondary" data-action="close-modal">知道了</button>`);
  } else if (action === 'storage-info') {
    openModal(`<div class="dialog-icon">${icon('book')}</div><h2>旅程存档</h2><p id="storage-state">${storage.writable ? '进度自动保存在本机。<br>关闭后从路线图出发。<br>清理缓存可能丢失记录。' : '暂时无法读取存档。<br>旧记录未被覆盖。'}</p><button class="secondary" data-action="retry-storage">${storage.writable ? '重试保存' : '重新读取'}</button><button class="text-button" data-action="close-modal">返回</button>`);
  } else if (action === 'trip-details') {
    openModal(`<h2>漂流手记</h2><p>${result.unlock}</p><p>收进 ${result.count} 份图鉴 · 带回 ${result.shells} 枚贝壳 · ${result.seconds} 秒</p><p>${WISHES[result.wish].label} ${result.wishDone ? '已达成' : ''}<br>顺流 ${result.glides} 次 · 轻碰 ${result.collisions} 次</p>${result.mode === 'level' ? '<p>抵达一星 · 拾获六成一星<br>轻碰不超过两次一星</p>' : ''}${result.stories.map(i => `<p>${ENCOUNTERS[i].story}</p>`).join('')}<button class="secondary" data-action="close-modal">收好</button>`);
  } else if (action === 'item') {
    const item = ITEMS[id], known = state.discovered.includes(id);
    openModal(`<canvas id="item-detail" class="item-detail-sprite ${known ? '' : 'unknown'}" width="80" height="80" aria-hidden="true"></canvas><h2>${known ? item.name : '还未遇见'}</h2><p>${known ? item.note : '去第 ' + (item.area + 1) + ' 段水域漂一漂吧。'}</p><button class="secondary" data-action="close-modal">收好</button>`);
    const detail = document.querySelector('#item-detail'); const c = detail.getContext('2d'); c.imageSmoothingEnabled = false; drawItem(c, sprites, id, 40, 40, 72);
  } else if (action === 'close-modal') closeModal();
  else if (action === 'card') showCard();
  else if (action === 'save-card' || action === 'post-card') {
    modal.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const status = document.querySelector('#media-status'); status.textContent = '正在准备这份风景…';
    const response = await sendCard(window, cardData, action === 'save-card' ? 'save' : 'post', result);
    status.textContent = response.message;
    modal.querySelectorAll('button').forEach(b => { b.disabled = false; });
  } else if (action === 'retry-storage') {
    button.disabled = true;
    if (storage.writable) { if (await storage.write(state)) toast('当前进度已保存。'); }
    else { const restored = await storage.load(); if (storage.writable) { state = restored; toast('已读入原有存档。'); } }
    setView('settings');
  } else if (action === 'reset') {
    openModal(`<h2>重新开始？</h2><p>会清除本游戏的挑战纪录、关卡、图鉴、贝壳、角色、桨板、码头和设置。此操作不能撤销。</p><button class="secondary" data-action="close-modal">保留</button><button class="text-button danger" data-action="confirm-reset">清空本游戏记录</button>`);
  } else if (action === 'confirm-reset') {
    button.disabled = true;
    if (await storage.reset()) { state = defaults(); audio.disable(); setView('home'); toast('新的旅程，从第一桨开始。'); } else button.disabled = false;
  }
}
app.addEventListener('click', e => {
  const button = e.target.closest('button[data-action]'); if (!button || button.disabled) return;
  if (state && state.settings.sound && !audio.active && button.dataset.action !== 'sound') audio.start(sceneFor(view));
  handleAction(button).catch(() => { button.disabled = false; toast('操作暂未完成，当前旅程仍保留。'); });
});
document.addEventListener('keydown', e => {
  if (!modal.hidden && e.key === 'Tab') {
    const controls = Array.from(modal.querySelectorAll('button:not([disabled])'));
    const index = controls.indexOf(document.activeElement);
    if (controls.length && (e.shiftKey && index <= 0 || !e.shiftKey && index === controls.length - 1)) { e.preventDefault(); controls[e.shiftKey ? controls.length - 1 : 0].focus(); }
  }
  if (e.key === 'Escape' && view === 'game') pause();
  if (view === 'game' && run.status === 'running' && ['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); run.target += e.key === 'ArrowLeft' ? -12 : 12; }
});
function resize() {
  document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px');
  const sideways = window.innerWidth > window.innerHeight && window.innerHeight < 600;
  document.querySelector('#rotation').hidden = !(sideways && view === 'game');
  if (sideways && view === 'game') pause();
  if (gameCanvas) {
    const bounds = gameCanvas.getBoundingClientRect(); gameCanvas.width = 240; gameCanvas.height = Math.max(120, Math.round(bounds.height / Math.max(1, bounds.width) * 240));
    gameContext.imageSmoothingEnabled = false;
    // Resizing clears Canvas; repaint immediately, including while paused.
    drawRun(gameContext, 240, gameCanvas.height, run, themeFor(run.level), sprites, state.skin, state.character, low);
  }
}
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pause(); audio.stop(); cancelAnimationFrame(animation); animation = 0; }
  else { last = 0; ensureAnimation(); }
});
window.addEventListener('pagehide', () => { pause(); audio.stop(); });
function ensureAnimation() { if (!animation && !document.hidden) { last = 0; animation = requestAnimationFrame(frame); } }
function frame(now) {
  animation = 0;
  const elapsed = last ? (now - last) / 1000 : 0; last = now;
  if (view === 'game' && run && gameCanvas) {
    if (run.status === 'running') {
      advance(run, elapsed);
      run.events.splice(0).forEach(event => {
        const isNewItem = event.type === 'collect' && !state.discovered.includes(event.item);
        if (state.settings.sound) audio.effect(isNewItem ? 'discover' : event.type);
        if (event.type === 'damage' && event.lives) toast('剩下 ' + event.lives + ' 颗心 · 暂时受到保护');
        if (isNewItem) { state.discovered.push(event.item); storage.write(state); toast('图鉴新增「' + ITEMS[event.item].name + '」'); }
        if (event.type === 'region') { toast('慢慢漂进了「' + event.name + '」'); document.querySelector('.game-heading h1').textContent = event.name; }
      });
      const reward = syncJourney(state, run);
      if (reward.changed) storage.write(state);
      if (reward.unlocked.length) toast('码头添了「' + reward.unlocked.join('、') + '」');
      if (run.status === 'arrived' || run.status === 'wrecked') { endRun(); ensureAnimation(); return; }
      if (elapsed > 0 && elapsed < 0.2) samples.push(elapsed);
      if (samples.length >= 120) { low = samples.reduce((a, b) => a + b, 0) / samples.length > 0.024; samples = []; }
    }
    if (!low || now - lastDraw >= 32) { drawRun(gameContext, 240, gameCanvas.height, run, themeFor(run.level), sprites, state.skin, state.character, low); lastDraw = now; }
    if (now - hudAt > 100) {
      hudAt = now;
      const j = run.journey, wish = WISHES[j.wish];
      if (run.mode === 'free') {
        const life = document.querySelector('#lives');
        if (life.dataset.value !== String(run.lives)) { life.dataset.value = run.lives; life.innerHTML = hearts(run.lives); life.setAttribute('aria-label', '剩余 ' + run.lives + ' 颗心'); }
        life.classList.toggle('shielded', run.cooldown > 0);
        document.querySelector('#distance-target').textContent = '下一站 ' + nextMarker(run.distance) + ' 米';
      }
      document.querySelector('#wish-text').textContent = wish.label + ' ' + wishProgress(run) + '/' + wish.target;
      document.querySelector('#wish').classList.toggle('done', j.wishDone);
      const nearby = j.encountersNow.find(e => !e.done && e.stage === 'waiting' && e.y - run.distance > -40 && e.y - run.distance < 150);
      const message = document.querySelector('#journey-message');
      message.textContent = j.messageUntil > run.time ? j.message : j.current ? '水流亮起来了 · 轻点小桨，顺流滑行' : nearby ? ENCOUNTERS[nearby.type].hint : '';
      message.hidden = !message.textContent || run.showTutorial;
      document.querySelector('[data-action="paddle"]').classList.toggle('in-current', !!j.current || j.glide > 0);
      document.querySelector('#shell-count').textContent = run.shells;
      document.querySelector('#count').textContent = run.count;
      const progress = Math.min(100, Math.floor(run.distance / run.segmentEnd * 100));
      document.querySelector('#progress-text').textContent = run.mode === 'free' ? meters(run.distance) + ' 米' : progress + '%';
      document.querySelector('#progress-fill').style.width = run.mode === 'free' ? '100%' : progress + '%';
      if (run.time >= 8) completeTutorial();
      document.querySelector('#tutorial').hidden = !run.showTutorial;
      document.querySelector('#paddle-hint').hidden = !run.showTutorial;
      document.querySelector('#paddle-charge-fill').style.transform = 'scaleX(' + (1 - run.boost / run.boostMax) + ')';
      document.querySelector('[data-action="paddle"]').disabled = run.boost > 0 || run.status !== 'running';
    }
  } else if (heroCanvas && now - lastDraw > 50) {
    drawHero(heroCanvas.getContext('2d'), heroCanvas.width, heroCanvas.height, themeFor(LEVELS[0]), sprites, state.skin, now / 1000, state.journey, state.character); lastDraw = now;
  }
  if (view === 'game' || heroCanvas) animation = requestAnimationFrame(frame);
}
if (sprites) decorateTitles(document.querySelector('#rotation'));
screen.innerHTML = '<main class="loading"><span class="loading-leaf">≈</span><h1>慢桨</h1><p>准备出发…</p></main>';
if (!sprites) screen.innerHTML = '<main class="loading"><h1>暂时无法展开水域</h1><p>当前环境不支持 Canvas 绘制。请更新客户端后重新进入。</p></main>';
else storage.load().then(data => { state = data; setView(state.visited ? 'map' : 'home'); });
