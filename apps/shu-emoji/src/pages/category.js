import { navigate } from '../router.js';
import { CATEGORIES, getByCategory } from '../lib/search.js';
import { burstSparkles } from '../components/sparkle.js';
import { CATEGORY_EMOJIS, icon } from '../components/icons.js';
import { emojiTileHtml } from '../components/emoji-tile.js';

let currentCategory = CATEGORIES[0];
let switchTimer = 0;
/** 标签切换时用 hash 同步 URL；用此标记跳过紧随其后的整页重渲染 */
let suppressHashRender = false;

function syncUrl(category) {
  const next = `#/category/${encodeURIComponent(category)}`;
  if (location.hash !== next) {
    suppressHashRender = true;
    location.hash = next;
  }
}

function bindEmojiTiles(root) {
  root.querySelectorAll('#cat-grid [data-emoji]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      burstSparkles(e.currentTarget.querySelector('.emoji-tile__glyph') || e.currentTarget);
      navigate(`/emoji/${encodeURIComponent(btn.dataset.emoji)}`);
    });
  });
}

function updateTabs(root, active) {
  root.querySelectorAll('#tabs [data-cat]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cat === active);
  });
}

function updateSubtitle(root, active, count) {
  const sub = root.querySelector('#cat-sub');
  if (sub) sub.textContent = `${active} · 共 ${count} 个`;
}

function switchCategory(root, next) {
  if (!CATEGORIES.includes(next) || next === currentCategory) return;
  currentCategory = next;

  updateTabs(root, next);
  syncUrl(next);

  const grid = root.querySelector('#cat-grid');
  const items = getByCategory(next);
  updateSubtitle(root, next, items.length);
  if (!grid) return;

  clearTimeout(switchTimer);
  grid.classList.remove('cat-grid-in');
  grid.classList.add('cat-grid-out');

  switchTimer = window.setTimeout(() => {
    grid.innerHTML = items.map((item) => emojiTileHtml(item)).join('');
    bindEmojiTiles(root);
    // 保持滚动位置更稳：若离顶部不远才轻轻回顶，避免大跳
    if (window.scrollY > 120) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    grid.classList.remove('cat-grid-out');
    void grid.offsetWidth;
    grid.classList.add('cat-grid-in');
  }, 140);
}

export async function renderCategory(root, { category } = {}) {
  if (suppressHashRender) {
    suppressHashRender = false;
    return;
  }

  currentCategory = CATEGORIES.includes(category) ? category : CATEGORIES[0];
  const items = getByCategory(currentCategory);

  root.innerHTML = `
    <div class="top-bar">
      <button type="button" class="back-btn" id="back" aria-label="返回">${icon('back', { size: 20 })}</button>
      <div style="flex:1;min-width:0">
        <div class="brand-name" style="font-size:1.35rem;margin:0">
          分类浏览
          <span class="brand-spark">${icon('sparkle', { size: 14 })}</span>
        </div>
        <p class="brand-slogan" id="cat-sub" style="margin:2px 0 0">${currentCategory} · 共 ${items.length} 个</p>
      </div>
    </div>

    <div class="tabs" id="tabs">
      ${CATEGORIES.map(
        (c, i) => `
        <button type="button" class="chip chip-i-${i} ${c === currentCategory ? 'active' : ''}" data-cat="${c}">
          <span class="chip-icon" aria-hidden="true">${CATEGORY_EMOJIS[c] || '✨'}</span>
          <span>${c}</span>
        </button>
      `,
      ).join('')}
    </div>

    <div id="cat-grid" class="emoji-grid cat-grid-in">
      ${items.map((item) => emojiTileHtml(item)).join('')}
    </div>
  `;

  root.querySelector('#back')?.addEventListener('click', () => navigate('/'));

  root.querySelectorAll('#tabs [data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchCategory(root, btn.dataset.cat);
    });
  });

  bindEmojiTiles(root);
}
