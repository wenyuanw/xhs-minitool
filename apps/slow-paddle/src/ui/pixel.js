// All UI icons use the same integer pixel grid as the game sprites.
const shapes = {
  heart: 'M2 2h4v2h4V2h4v2h2v5h-2v2h-2v2h-2v2H6v-2H4v-2H2V9H0V4h2z',
  arrow: 'M8 2h2v2h2v2h2v2h-2v2h-2v2H8v-2h2V8H2V6h8V4H8z',
  back: 'M6 2h2v2H6v2h8v2H6v2h2v2H6v-2H4V8H2V6h2V4h2z',
  leaf: 'M8 2h6v6h-2v2h-2v2H6v2H2v-2h2V8h2V4h2zm2 2v2H8v2H6v2h2V8h2V6h2V4z',
  book: 'M2 2h5v1h2V2h5v11H9v1H7v-1H2zm2 2v7h3V4zm5 0v7h3V4z',
  settings: 'M3 1h2v4h2v4H5v6H3V9H1V5h2zm8 0h2v8h2v4h-2v2h-2v-2H9V9h2z',
  board: 'M6 1h4v2h2v10h-2v2H6v-2H4V3h2zm1 2v10h2V3z',
  pause: 'M3 2h3v12H3zm7 0h3v12h-3z',
  shell: 'M5 2h6v2h3v2h1v4h-2v2h-2v2H5v-2H3v-2H1V6h1V4h3zm2 2v6h2V4zM4 6v3h1V6zm7 0v3h1V6z',
  save: 'M6 1h4v6h3v2h-2v2H9v2H7v-2H5V9H3V7h3zM1 12h2v2h10v-2h2v4H1z',
  share: 'M6 1h4v2h2v2h2v2h-4v5H6V7H2V5h2V3h2zM1 10h2v4h10v-4h2v6H1z',
  sound: 'M8 2h2v12H8v-2H6v-2H2V6h4V4h2zm4 2h2v2h1v4h-1v2h-2v-2h1V6h-1z',
  soundOff: 'M8 2h2v12H8v-2H6v-2H2V6h4V4h2zm4 3h2v2h2v2h-2v2h-2V9h2V7h-2z',
  map: 'M1 3h4V1h6v2h4v12h-4v-2H5v2H1zm2 2v7h2V5zm4-2v8h2V3zm4 2v8h2V5z',
  dock: 'M1 7h2V5h2v2h6V5h2v2h2v2H1zm0 3h14v2H1zm2 3h2v3H3zm8 0h2v3h-2zM7 1h2v4H7z',
  star: 'M7 1h2v4h2v1h4v2h-2v2h-2v2h1v3h-2v-1H9v-1H7v1H6v1H4v-3h1v-2H3V8H1V6h4V5h2z',
  check: 'M12 3h3v3h-2v2h-2v2H9v2H5v-2H3V8H1V5h3v2h2v2h2V7h2V5h2z',
  lock: 'M5 1h6v2h2v4h1v8H2V7h1V3h2zm1 2v4h4V3zm1 7v3h2v-3z',
  close: 'M2 2h3v2h2v2h2V4h2V2h3v3h-2v2h-2v2h2v2h2v3h-3v-2H9v-2H7v2H5v2H2v-3h2V9h2V7H4V5H2z',
  duck: 'M9 2h5v4h2v2h-4v5H4v-1H2v-2H1V7h2v2h5V6h1zm2 2v1h1V4z',
  bottle: 'M6 1h4v3H9v2h3v9H4V6h3V4H6zm0 7v5h4V8z',
  wave: 'M1 4h3v2h2v2h4V6h2V4h3v3h-2v2h-2v2H5V9H3V7H1zm0 8h3v2h8v-2h3v2h-2v2H3v-2H1z',
  sun: 'M7 0h2v3H7zm0 13h2v3H7zM0 7h3v2H0zm13 0h3v2h-3zM5 4h6v1h1v6h-1v1H5v-1H4V5h1z',
  moon: 'M5 1h6v2H7v2H5v6h2v2h4v-2h3v2h-2v2H5v-2H3v-2H1V5h2V3h2z',
};
export function icon(name) {
  return `<svg viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true"><path fill-rule="evenodd" d="${shapes[name] || shapes.leaf}"/></svg>`;
}
export function starRow(n) { return [0,1,2].map(i => `<span class="${i < n ? 'star-on' : 'star-off'}">${icon('star')}</span>`).join(''); }
const textCache = new Map();
export function textSprite(text, size = 16, color = '#35594b') {
  const key = text + ':' + size + ':' + color;
  if (textCache.has(key)) return textCache.get(key);
  const c = document.createElement('canvas'), ctx = c.getContext('2d');
  ctx.font = `600 ${size}px monospace, sans-serif`;
  c.width = Math.ceil(ctx.measureText(text).width) + 4; c.height = size + 8;
  ctx.font = `600 ${size}px monospace, sans-serif`; ctx.fillStyle = color; ctx.textBaseline = 'top'; ctx.fillText(text, 2, 3);
  const pixels = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = pixels.data[i] >= 100 ? 255 : 0;
  ctx.putImageData(pixels, 0, 0);
  if (textCache.size > 80) textCache.clear();
  textCache.set(key, c); return c;
}
export function decorateTitles(root) {
  root.querySelectorAll('[data-pixel-title]').forEach(heading => {
    if (heading.querySelector('canvas')) return;
    const label = heading.textContent, large = heading.classList.contains('wordmark');
    const sprite = textSprite(label, large ? 24 : 20);
    const canvas = document.createElement('canvas'); canvas.width = sprite.width * 3; canvas.height = sprite.height * 3;
    const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(sprite, 0, 0, canvas.width, canvas.height);
    canvas.setAttribute('aria-hidden', 'true');
    heading.textContent = ''; heading.setAttribute('aria-label', label); heading.appendChild(canvas);
  });
}

// Small postcard numerals use explicit bitmap glyphs so counters stay open.
export function numberSprite(text, color = '#738367') {
  const glyphs = {
    '0':['01110','11011','10001','10001','10001','11011','01110'],
    '1':['00100','01100','00100','00100','00100','00100','01110'],
    '2':['01110','10001','00001','00010','00100','01000','11111'],
    '3':['11110','00001','00001','01110','00001','00001','11110'],
    '4':['00010','00110','01010','10010','11111','00010','00010'],
    '5':['11111','10000','10000','11110','00001','00001','11110'],
    '6':['01110','10000','10000','11110','10001','10001','01110'],
    '7':['11111','00001','00010','00100','01000','01000','01000'],
    '8':['01110','10001','10001','01110','10001','10001','01110'],
    '9':['01110','10001','10001','01111','00001','00001','01110'],
    'm':['00000','00000','11010','10101','10101','10101','10101'],
    's':['00000','00000','01111','10000','01110','00001','11110'],
    '/':['00001','00001','00010','00100','01000','10000','10000'],
  };
  const scale = text.length > 15 ? 1 : 2, canvas = document.createElement('canvas');
  canvas.width = text.length * 6 * scale; canvas.height = 7 * scale;
  const c = canvas.getContext('2d'); c.fillStyle = color;
  Array.from(text).forEach((char, i) => (glyphs[char] || []).forEach((row, y) => Array.from(row).forEach((v, x) => { if (v === '1') c.fillRect((i * 6 + x) * scale, y * scale, scale, scale); })));
  return canvas;
}
