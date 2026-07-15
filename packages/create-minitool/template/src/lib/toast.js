const toastEl = () => document.querySelector('#toast');

let hideTimer = 0;

/**
 * @param {string} message
 * @param {number} [ms]
 */
export function showToast(message, ms = 1800) {
  const el = toastEl();
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    el.hidden = true;
  }, ms);
}
