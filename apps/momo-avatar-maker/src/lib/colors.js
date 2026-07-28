/** Resolve a palette id or raw CSS color into a #rrggbb string for <input type="color">. */
export function toPickerHex(value, paletteLookup = {}) {
  const raw = paletteLookup[value]?.color || value || '#000000';
  return normalizeHex(raw);
}

export function normalizeHex(color) {
  const ctx = normalizeHex._ctx || (normalizeHex._ctx = document.createElement('canvas').getContext('2d'));
  if (!ctx) return '#000000';
  ctx.fillStyle = '#000000';
  ctx.fillStyle = color;
  const computed = ctx.fillStyle;
  if (computed.startsWith('#')) {
    return computed.length === 4
      ? `#${computed[1]}${computed[1]}${computed[2]}${computed[2]}${computed[3]}${computed[3]}`
      : computed;
  }
  const match = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(computed);
  if (!match) return '#000000';
  return `#${[match[1], match[2], match[3]]
    .map((n) => Number(n).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Build a soft 3-stop gradient from a single custom color. */
export function gradientFromHex(hex) {
  const base = normalizeHex(hex);
  return [mixHex(base, '#ffffff', 0.35), base, mixHex(base, '#000000', 0.22)];
}

function mixHex(a, b, amount) {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const t = Math.min(1, Math.max(0, amount));
  return `#${[0, 1, 2]
    .map((i) => Math.round(pa[i] + (pb[i] - pa[i]) * t).toString(16).padStart(2, '0'))
    .join('')}`;
}

function parseHex(hex) {
  const h = normalizeHex(hex).slice(1);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
