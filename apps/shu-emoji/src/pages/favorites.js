import { navigate } from '../router.js';
import { getFavorites } from '../lib/db.js';
import { getByEmoji } from '../lib/search.js';
import { searchBoxHtml, bindSearchBox } from '../components/search-box.js';
import { burstSparkles } from '../components/sparkle.js';
import { icon } from '../components/icons.js';
import { emojiTileHtml } from '../components/emoji-tile.js';

export async function renderFavorites(root) {
  const favorites = await getFavorites();
  const items = favorites
    .map((f) => getByEmoji(f.emoji) || { emoji: f.emoji, name_zh: f.emoji, meaning_xhs: '', tags: [] })
    .filter(Boolean);

  root.innerHTML = `
    <div class="top-bar">
      <button type="button" class="back-btn" id="back" aria-label="返回">${icon('back', { size: 20 })}</button>
      <div style="flex:1;min-width:0">
        <div class="brand-name" style="font-size:1.35rem;margin:0">
          我的收藏
          <span class="brand-spark">${icon('heartFill', { size: 14 })}</span>
        </div>
        <p class="brand-slogan" style="margin:2px 0 0">本地保存，随时取用</p>
      </div>
    </div>

    ${
      items.length
        ? `
      ${searchBoxHtml({ id: 'fav-q', value: '' })}
      <p id="fav-count" style="margin:12px 0;color:var(--color-text-soft);font-size:0.9rem">共 ${items.length} 个</p>
      <div class="emoji-grid" id="fav-grid">
        ${items.map((item) => emojiTileHtml(item)).join('')}
      </div>
      `
        : `
      <div class="empty">
        <span class="empty-emoji empty-icon">${icon('heart', { size: 56 })}</span>
        <p>还没有收藏的 emoji 呢～快去发现吧</p>
        <button type="button" class="btn btn-primary" id="go-home" style="margin-top:18px;max-width:240px">去首页逛逛</button>
      </div>
      `
    }
  `;

  root.querySelector('#back')?.addEventListener('click', () => navigate('/'));
  root.querySelector('#go-home')?.addEventListener('click', () => navigate('/'));

  const grid = root.querySelector('#fav-grid');
  const countEl = root.querySelector('#fav-count');

  root.querySelectorAll('#fav-grid [data-emoji]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      burstSparkles(e.currentTarget.querySelector('.emoji-tile__glyph') || e.currentTarget);
      navigate(`/emoji/${encodeURIComponent(btn.dataset.emoji)}`);
    });
  });

  if (grid) {
    bindSearchBox(root, { onSubmit: () => {} });
    const input = root.querySelector('#fav-q');
    input?.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      let visible = 0;
      grid.querySelectorAll('[data-emoji]').forEach((btn) => {
        const hay = `${btn.dataset.emoji}${btn.dataset.name}${btn.dataset.tags}`.toLowerCase();
        const show = !q || hay.includes(q);
        btn.style.display = show ? '' : 'none';
        if (show) visible += 1;
      });
      if (countEl) countEl.textContent = q ? `匹配 ${visible} 个` : `共 ${items.length} 个`;
    });
  }
}
