import { icon } from './icons.js';

export function searchBoxHtml({ value = '', autofocus = false, id = 'q' } = {}) {
  return `
    <label class="search-shell" for="${id}">
      <span class="search-icon" aria-hidden="true">${icon('search', { size: 18 })}</span>
      <input
        id="${id}"
        type="search"
        enterkeyhint="search"
        placeholder="输入 emoji 或关键词..."
        value="${escapeAttr(value)}"
        ${autofocus ? 'autofocus' : ''}
        autocomplete="off"
      />
    </label>
  `;
}

export function bindSearchBox(root, { onSubmit }) {
  const input = root.querySelector('input[type="search"]');
  if (!input) return null;
  const submit = () => onSubmit(input.value.trim());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });
  return input;
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}
