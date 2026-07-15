import { navigate } from '../router.js';
import { getByEmoji, pickWanderNext } from '../lib/search.js';
import { isFavorite, pushRecent, toggleFavorite } from '../lib/db.js';
import { showToast } from '../components/toast.js';
import { burstSparkles, showHeartPop } from '../components/sparkle.js';
import { icon } from '../components/icons.js';
import {
  clearWanderSeen,
  getWanderSeen,
  rememberWander,
  wanderCount,
} from '../lib/wander-session.js';

const CAPTIONS = [
  '今晚偶遇这一颗',
  '没有地图，只跟着心动走',
  '漫游途中的一封小信',
  '轻轻路过，被它撞了一下',
  '像街角忽然亮起的灯',
  '给你留下一点温柔余韵',
  '这一站，请慢一点看',
  '风把它吹到你面前了',
];

function pickCaption(seed) {
  let h = 0;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i += 1) h = (h + s.charCodeAt(i) * (i + 3)) % CAPTIONS.length;
  return CAPTIONS[h];
}

function goNext(currentEmoji) {
  rememberWander(currentEmoji);
  let exclude = getWanderSeen();
  if (exclude.length >= 40) {
    clearWanderSeen();
    rememberWander(currentEmoji);
    exclude = [currentEmoji];
  }
  const next = pickWanderNext(exclude);
  navigate(`/wander?e=${encodeURIComponent(next.emoji)}`);
}

function favLabel(on) {
  return on
    ? `${icon('heartFill', { size: 15 })}<span>已收藏</span>`
    : `${icon('heart', { size: 15 })}<span>收藏它</span>`;
}

export async function renderWander(root, { emoji } = {}) {
  let item = emoji ? getByEmoji(emoji) : null;
  if (!item) {
    item = pickWanderNext(getWanderSeen());
  }
  rememberWander(item.emoji);
  await pushRecent(item.emoji);

  let favorited = await isFavorite(item.emoji);
  const caption = pickCaption(item.emoji + item.name_zh);
  const snippet =
    item.examples?.[0] ||
    item.meaning_xhs.slice(0, 36) + (item.meaning_xhs.length > 36 ? '…' : '');

  root.innerHTML = `
    <div class="wander-page">
      <div class="top-bar">
        <button type="button" class="back-btn" id="back" aria-label="返回">${icon('back', { size: 20 })}</button>
        <div class="wander-brand">
          <div class="wander-title">
            ${icon('moon', { size: 18, className: 'wander-title-icon' })}
            <span>随机漫游</span>
          </div>
          <p class="wander-sub">已偶遇 ${wanderCount()} 颗</p>
        </div>
      </div>

      <p class="wander-caption">${caption}</p>

      <div class="wander-stage" id="wander-stage">
        <div class="wander-glow" aria-hidden="true"></div>
        <button type="button" class="wander-emoji emoji-hit" id="hero-emoji" aria-label="${item.name_zh}">
          ${item.emoji}
        </button>
        <div class="wander-orbits" aria-hidden="true">
          <span>${icon('sparkle', { size: 16 })}</span>
          <span>${icon('flower', { size: 16 })}</span>
          <span>${icon('star', { size: 16 })}</span>
        </div>
      </div>

      <div class="wander-card">
        <h1 class="wander-name">${item.name_zh}</h1>
        <p class="wander-en">${item.name_en}</p>
        <p class="wander-meaning">${item.meaning_xhs}</p>
        <p class="wander-sample">「${escapeHtml(snippet)}」</p>
        <div class="tag-row" style="justify-content:center;margin-top:12px">
          <span class="tag">${item.category}</span>
          ${item.tone.slice(0, 2).map((t) => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>

      <div class="wander-actions">
        <button type="button" class="btn btn-primary wander-next btn-with-icon" id="next-btn">
          <span>下一个</span>
          ${icon('arrowRight', { size: 18 })}
        </button>
        <div class="wander-secondary">
          <button type="button" class="btn btn-ghost btn-sm btn-with-icon" id="fav-btn">
            ${favLabel(favorited)}
          </button>
          <button type="button" class="btn btn-ghost btn-sm" id="detail-btn">
            查看详情
          </button>
        </div>
      </div>
    </div>
  `;

  root.querySelector('#back')?.addEventListener('click', () => navigate('/'));

  const hero = root.querySelector('#hero-emoji');
  hero?.addEventListener('click', () => {
    hero.classList.remove('pop');
    void hero.offsetWidth;
    hero.classList.add('pop');
    burstSparkles(hero);
  });

  root.querySelector('#next-btn')?.addEventListener('click', (e) => {
    e.currentTarget.classList.add('wander-pulse');
    root.querySelector('#wander-stage')?.classList.add('wander-swap');
    setTimeout(() => goNext(item.emoji), 180);
  });

  root.querySelector('#detail-btn')?.addEventListener('click', () => {
    navigate(`/emoji/${encodeURIComponent(item.emoji)}`);
  });

  const favBtn = root.querySelector('#fav-btn');
  favBtn?.addEventListener('click', async () => {
    favorited = await toggleFavorite(item.emoji);
    favBtn.innerHTML = favLabel(favorited);
    if (favorited) {
      showHeartPop();
      showToast('收藏成功');
    } else {
      showToast('已取消收藏');
    }
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}
