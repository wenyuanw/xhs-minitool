/** emoji 展示卡片：图标 + 中文名 */

export function emojiTileHtml(item, { extraAttrs = '' } = {}) {
  const name = item.name_zh || item.emoji;
  const tags = (item.tags || []).join(',');
  return `
    <button
      type="button"
      class="emoji-tile emoji-hit"
      data-emoji="${item.emoji}"
      data-name="${escapeAttr(name)}"
      data-tags="${escapeAttr(tags)}"
      title="${escapeAttr(name)}"
      aria-label="${escapeAttr(name)}"
      ${extraAttrs}
    >
      <span class="emoji-tile__glyph" aria-hidden="true">${item.emoji}</span>
      <span class="emoji-tile__name">${escapeHtml(name)}</span>
    </button>
  `;
}

export function emojiPillHtml(item) {
  const name = item.name_zh || item.emoji;
  return `
    <button
      type="button"
      class="emoji-pill emoji-hit"
      data-emoji="${item.emoji}"
      title="${escapeAttr(name)}"
      aria-label="${escapeAttr(name)}"
    >
      <span class="emoji-pill__glyph" aria-hidden="true">${item.emoji}</span>
      <span class="emoji-pill__name">${escapeHtml(name)}</span>
    </button>
  `;
}

export function altChipHtml(item) {
  return `
    <button
      type="button"
      class="alt-item emoji-hit"
      data-emoji="${item.emoji}"
      title="${escapeAttr(item.name_zh)}"
      aria-label="${escapeAttr(item.name_zh)}"
    >
      <span class="alt-item__glyph">${item.emoji}</span>
      <span class="alt-item__name">${escapeHtml(item.name_zh)}</span>
    </button>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}
