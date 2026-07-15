import { searchBoxHtml, bindSearchBox } from '../components/search-box.js';
import { navigate } from '../router.js';
import { CATEGORIES, SUGGEST_KEYWORDS, getByEmoji } from '../lib/search.js';
import { getFavorites, getRecent, getSearchHistory, pushSearchHistory } from '../lib/db.js';
import { burstSparkles } from '../components/sparkle.js';
import { CATEGORY_EMOJIS, icon } from '../components/icons.js';
import { emojiPillHtml } from '../components/emoji-tile.js';

const CAT_HINTS = {
  强调装饰: '点亮重点',
  情感表达: '语气拉满',
  种草推荐: '心动安利',
  视觉美化: '氛围感',
  符号标记: '清单排版',
};

const EMPTY_FAV_DECO = ['💕', '✨', '🌸', '🫧'];

function favCardHtml(favorites) {
  const preview = favorites.slice(0, 4).map((f) => f.emoji);
  const deco = preview.length ? preview : EMPTY_FAV_DECO;
  const hint = favorites.length
    ? `已收藏 ${favorites.length} 个表情`
    : '点亮喜欢的表情，这里会亮起来';

  return `
    <button type="button" class="fav-entry${preview.length ? '' : ' is-empty'}" id="fav-entry" aria-label="我的收藏">
      <span class="fav-entry__deco" aria-hidden="true">
        ${deco.map((e, i) => `<span class="fav-entry__emoji fav-entry__emoji--${i}">${e}</span>`).join('')}
      </span>
      <span class="fav-entry__text">
        <span class="fav-entry__title">
          ${icon('heart', { size: 15 })}
          <span>我的收藏</span>
        </span>
        <span class="fav-entry__hint">${hint}</span>
      </span>
      <span class="fav-entry__chev" aria-hidden="true">${icon('arrowRight', { size: 16 })}</span>
    </button>
  `;
}

export async function renderHome(root) {
  const [recent, history, favorites] = await Promise.all([
    getRecent(8),
    getSearchHistory(6),
    getFavorites(),
  ]);

  root.innerHTML = `
    <header class="home-hero">
      <div class="home-hero__brand">
        <h1 class="home-title">
          薯 Emoji
          <span class="brand-spark">${icon('sparkle', { size: 22 })}</span>
        </h1>
        <p class="home-slogan">让你的小红书笔记表情，更懂小红书</p>
      </div>
    </header>

    ${searchBoxHtml({ id: 'home-q' })}

    ${
      history.length
        ? `<div class="history-row" aria-label="搜索历史">
            ${history
              .map(
                (h) =>
                  `<button type="button" class="history-chip" data-q="${escapeHtml(h.query)}">${escapeHtml(h.query)}</button>`,
              )
              .join('')}
          </div>`
        : ''
    }

    <div class="home-entries">
      <button type="button" class="wander-entry" id="random-btn">
        <span class="wander-entry__icon" aria-hidden="true">🌙</span>
        <span class="wander-entry__text">
          <span class="wander-entry__title">随机漫游</span>
          <span class="wander-entry__hint">偶遇一颗刚好的表情</span>
        </span>
        <span class="wander-entry__chev" aria-hidden="true">${icon('arrowRight', { size: 16 })}</span>
      </button>
      ${favCardHtml(favorites)}
    </div>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">按场景逛逛</h2>
      </div>
      <div class="cat-launch">
        ${CATEGORIES.map(
          (c, i) => `
          <button type="button" class="cat-card chip-i-${i}" data-cat="${c}">
            <span class="cat-card__icon" aria-hidden="true">${CATEGORY_EMOJIS[c] || '✨'}</span>
            <span>
              <span class="cat-card__name">${c}</span>
              <span class="cat-card__hint">${CAT_HINTS[c] || '去看看'}</span>
            </span>
          </button>
        `,
        ).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">最近使用</h2>
      </div>
      ${
        recent.length
          ? `<div class="h-scroll" id="recent-scroll">
              ${recent
                .map((r) => {
                  const item = getByEmoji(r.emoji) || { emoji: r.emoji, name_zh: r.emoji };
                  return emojiPillHtml(item);
                })
                .join('')}
            </div>`
          : `<div class="empty" style="padding:28px 0 8px">
              <span class="empty-emoji empty-icon">${icon('potato', { size: 48 })}</span>
              <p>还没有足迹，搜一个或去分类逛逛吧</p>
              <div class="suggest-keys">
                ${SUGGEST_KEYWORDS.slice(0, 4)
                  .map((k) => `<button type="button" class="history-chip" data-q="${k}">${k}</button>`)
                  .join('')}
              </div>
            </div>`
      }
    </section>
  `;

  bindSearchBox(root, {
    onSubmit: async (q) => {
      if (!q) return;
      await pushSearchHistory(q);
      navigate(`/search?q=${encodeURIComponent(q)}`);
    },
  });

  root.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigate(`/category/${encodeURIComponent(btn.dataset.cat)}`);
    });
  });

  root.querySelectorAll('[data-emoji]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      burstSparkles(e.currentTarget.querySelector('.emoji-pill__glyph') || e.currentTarget);
      navigate(`/emoji/${encodeURIComponent(btn.dataset.emoji)}`);
    });
  });

  root.querySelectorAll('[data-q]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const q = btn.dataset.q;
      await pushSearchHistory(q);
      navigate(`/search?q=${encodeURIComponent(q)}`);
    });
  });

  root.querySelector('#random-btn')?.addEventListener('click', () => {
    navigate('/wander');
  });

  root.querySelector('#fav-entry')?.addEventListener('click', () => navigate('/favorites'));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}
