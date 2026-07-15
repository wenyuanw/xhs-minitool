import { navigate } from '../router.js';
import { getByEmoji, resolveRelated } from '../lib/search.js';
import { isFavorite, pushRecent, toggleFavorite } from '../lib/db.js';
import { showToast } from '../components/toast.js';
import { burstSparkles, showHeartPop } from '../components/sparkle.js';
import { icon } from '../components/icons.js';
import { altChipHtml } from '../components/emoji-tile.js';

function favLabel(on) {
  return on
    ? `${icon('heartFill', { size: 16 })}<span>已收藏</span>`
    : `${icon('heart', { size: 16 })}<span>收藏</span>`;
}

export async function renderDetail(root, { emoji }) {
  const item = getByEmoji(emoji);
  if (!item) {
    root.innerHTML = `
      <div class="top-bar">
        <button type="button" class="back-btn" id="back" aria-label="返回">${icon('back', { size: 20 })}</button>
        <h2 class="section-title" style="margin:0">未找到</h2>
      </div>
      <div class="empty">
        <span class="empty-emoji empty-icon">${icon('search', { size: 52 })}</span>
        <p>暂时还没收录这个 emoji 哦～去分类里逛逛吧</p>
        <button type="button" class="btn btn-primary" id="go-cat" style="margin-top:16px;max-width:220px">去分类看看</button>
      </div>
    `;
    root.querySelector('#back')?.addEventListener('click', () => (history.length > 1 ? history.back() : navigate('/')));
    root.querySelector('#go-cat')?.addEventListener('click', () => navigate('/category'));
    return;
  }

  await pushRecent(item.emoji);
  let favorited = await isFavorite(item.emoji);
  const combos = resolveRelated(item.common_combinations);
  const alts = resolveRelated(item.alternatives);

  root.innerHTML = `
    <div class="detail-page">
      <div class="top-bar">
        <button type="button" class="back-btn" id="back" aria-label="返回">${icon('back', { size: 20 })}</button>
        <div style="flex:1"></div>
        <span class="tag">${item.category}</span>
      </div>

      <div class="detail-hero">
        <button type="button" class="detail-emoji emoji-hit" id="hero-emoji" aria-label="${item.name_zh}">${item.emoji}</button>
      </div>

      <div class="detail-names">
        <h1>${item.name_zh}</h1>
        <p class="en">${item.name_en}</p>
        <div class="tag-row">
          ${item.tone.map((t) => `<span class="tag">${t}</span>`).join('')}
          ${item.tags.slice(0, 3).map((t) => `<span class="tag">#${t}</span>`).join('')}
        </div>
      </div>

      <div class="info-stack">
        <section class="info-block">
          <p class="label">专属含义</p>
          <h2>在小红书里怎么用</h2>
          <p>${item.meaning_xhs}</p>
        </section>

        <section class="info-block">
          <p class="label">使用建议</p>
          <h2>放哪儿更自然</h2>
          <ul>
            <li>${item.usage_tips}</li>
            <li>适合位置：${item.position.join('、')}</li>
            <li>适合笔记：${item.verticals.join('、')}</li>
          </ul>
        </section>

        <section class="info-block">
          <p class="label">搭配</p>
          <h2>常见组合</h2>
          <div class="combo-row">
            ${
              combos.length
                ? combos
                    .map(
                      (c) =>
                        `<button type="button" class="combo-item" data-emoji="${c.emoji}">${item.emoji} + ${c.emoji}</button>`,
                    )
                    .join('')
                : item.common_combinations.map((c) => `<span class="combo-item">${item.emoji} + ${c}</span>`).join('')
            }
          </div>
        </section>

        <section class="info-block">
          <p class="label">替代</p>
          <h2>也可以试试</h2>
          <div class="alt-row">
            ${
              alts.length
                ? alts.map((a) => altChipHtml(a)).join('')
                : item.alternatives
                    .map((a) => `<span class="alt-item"><span class="alt-item__glyph">${a}</span></span>`)
                    .join('')
            }
          </div>
        </section>

        <section class="info-block">
          <p class="label">文案</p>
          <h2>直接套用</h2>
          <p class="bubble-hint" style="margin:0 0 4px">长按选中即可复制</p>
          ${item.examples
            .map(
              (ex) => `
            <div class="bubble bubble-static">${escapeHtml(ex)}</div>
          `,
            )
            .join('')}
        </section>
      </div>

      <div class="action-bar action-bar-single">
        <button type="button" class="btn btn-primary btn-with-icon ${favorited ? 'fav-active' : ''}" id="fav-btn">
          ${favLabel(favorited)}
        </button>
      </div>
    </div>
  `;

  root.querySelector('#back')?.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else navigate('/');
  });

  const hero = root.querySelector('#hero-emoji');
  hero?.addEventListener('click', () => {
    hero.classList.remove('pop');
    void hero.offsetWidth;
    hero.classList.add('pop');
    burstSparkles(hero);
  });

  root.querySelectorAll('[data-emoji]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const sparkTarget =
        e.currentTarget.querySelector('.alt-item__glyph, .combo-item') || e.currentTarget;
      burstSparkles(sparkTarget);
      navigate(`/emoji/${encodeURIComponent(btn.dataset.emoji)}`);
    });
  });

  const favBtn = root.querySelector('#fav-btn');
  favBtn?.addEventListener('click', async () => {
    favorited = await toggleFavorite(item.emoji);
    favBtn.classList.toggle('fav-active', favorited);
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
