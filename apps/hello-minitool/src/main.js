import './styles/app.css';
import { showToast } from './lib/toast.js';

const page = document.querySelector('#page');
const STORAGE_KEY = 'hello-minitool-count';

function readCount() {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function writeCount(n) {
  try {
    localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    /* quota / private mode */
  }
}

let count = readCount();

page.innerHTML = `
  <header class="hero">
    <img
      class="logo"
      src="./icons/xhs-logo.svg"
      width="96"
      height="96"
      alt="minitool"
    />
    <p class="eyebrow">小红书小工具</p>
    <h1>你好小工具</h1>
    <p class="slogan">从这里开始写离线小工具</p>
  </header>
  <section class="card counter-card">
    <p>点一下数字，计数 +1（本地保存）</p>
    <button type="button" class="counter" id="counter-btn" aria-live="polite">
      <span class="counter-label">已点</span>
      <span class="counter-value" id="counter-value">${count}</span>
    </button>
  </section>
`;

const valueEl = document.querySelector('#counter-value');
const btn = document.querySelector('#counter-btn');

btn?.addEventListener('click', () => {
  count += 1;
  writeCount(count);
  if (valueEl) valueEl.textContent = String(count);
  btn.classList.remove('pop');
  // restart animation
  void btn.offsetWidth;
  btn.classList.add('pop');
  showToast(`+1 → ${count}`);
});
