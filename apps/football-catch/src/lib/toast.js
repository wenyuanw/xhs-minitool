const toastEl = () => document.querySelector('#toast');

let hideTimer = 0;
let lastShownAt = 0;
let lastMessage = '';

/**
 * 轻量 toast：默认较短，同文案短时间内不重复刷屏。
 * @param {string} message
 * @param {number} [ms]
 */
export function showToast(message, ms = 1400) {
  const el = toastEl();
  if (!el) return;
  const now = Date.now();
  if (message === lastMessage && now - lastShownAt < 900) return;
  lastMessage = message;
  lastShownAt = now;
  el.textContent = message;
  el.hidden = false;
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    el.hidden = true;
  }, ms);
}
