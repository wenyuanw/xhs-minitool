import { searchBoxHtml, bindSearchBox } from '../components/search-box.js';
import { navigate } from '../router.js';
import { search, SUGGEST_KEYWORDS } from '../lib/search.js';
import { pushSearchHistory } from '../lib/db.js';
import { burstSparkles } from '../components/sparkle.js';
import { icon } from '../components/icons.js';

export async function renderSearch(root, { query }) {
  const q = query?.q || '';
  const result = search(q);
  if (q) await pushSearchHistory(q);

  root.innerHTML = `
    <div class="top-bar">
      <button type="button" class="back-btn" id="back" aria-label="返回">${icon('back', { size: 20 })}</button>
      <div style="flex:1">${searchBoxHtml({ value: q, id: 'search-q' })}</div>
    </div>

    ${
      !q
        ? emptyPrompt('试着输入「种草」或粘贴一个 emoji 吧')
        : result.items.length
          ? `<p style="margin:0 0 12px;color:var(--color-text-soft);font-size:0.9rem">找到 ${result.items.length} 个相关 emoji</p>
             <div class="card-list">
               ${result.items.map(cardHtml).join('')}
             </div>`
          : emptyPrompt('没有找到匹配的 emoji 呢～换个词试试', true)
    }
  `;

  root.querySelector('#back')?.addEventListener('click', () => navigate('/'));

  bindSearchBox(root, {
    onSubmit: (next) => {
      if (!next) return;
      navigate(`/search?q=${encodeURIComponent(next)}`);
    },
  });

  root.querySelectorAll('[data-emoji]').forEach((el) => {
    el.addEventListener('click', (e) => {
      burstSparkles(e.currentTarget.querySelector('.result-emoji') || e.currentTarget);
      navigate(`/emoji/${encodeURIComponent(el.dataset.emoji)}`);
    });
  });

  root.querySelectorAll('[data-q]').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigate(`/search?q=${encodeURIComponent(btn.dataset.q)}`);
    });
  });
}

function cardHtml(item) {
  return `
    <button type="button" class="result-card" data-emoji="${item.emoji}">
      <span class="result-emoji emoji-hit">${item.emoji}</span>
      <span class="result-meta">
        <span class="result-name">${item.name_zh}</span>
        <p class="result-desc">${item.meaning_xhs}</p>
      </span>
    </button>
  `;
}

function emptyPrompt(text, showSuggest = true) {
  return `
    <div class="empty">
      <span class="empty-emoji empty-icon">${icon('search', { size: 52 })}</span>
      <p>${text}</p>
      ${
        showSuggest
          ? `<div class="suggest-keys">
              ${SUGGEST_KEYWORDS.map(
                (k) => `<button type="button" class="chip" data-q="${k}">${k}</button>`,
              ).join('')}
            </div>`
          : ''
      }
    </div>
  `;
}
