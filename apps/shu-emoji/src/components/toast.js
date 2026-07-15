let timer = null;

export function showToast(message, ms = 1600) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(timer);
  timer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => {
      el.hidden = true;
    }, 250);
  }, ms);
}
