import { icon } from './icons.js';

export function burstSparkles(anchorEl) {
  if (!anchorEl) return;
  const rect = anchorEl.getBoundingClientRect();
  const host = document.body;
  const origins = [
    [-28, -24],
    [24, -28],
    [-18, 18],
    [30, 12],
    [0, -34],
  ];
  origins.forEach(([dx, dy], i) => {
    const star = document.createElement('span');
    star.className = 'sparkle sparkle-svg';
    star.innerHTML = icon(i % 2 ? 'sparkle' : 'star', { size: 14 });
    star.style.left = `${rect.left + rect.width / 2}px`;
    star.style.top = `${rect.top + rect.height / 2}px`;
    star.style.setProperty('--dx', `${dx}px`);
    star.style.setProperty('--dy', `${dy}px`);
    star.style.position = 'fixed';
    host.appendChild(star);
    setTimeout(() => star.remove(), 720);
  });
}

export function showHeartPop() {
  const heart = document.createElement('div');
  heart.className = 'heart-pop heart-pop-svg';
  heart.innerHTML = icon('heartFill', { size: 48 });
  document.body.appendChild(heart);
  setTimeout(() => heart.remove(), 780);
}
