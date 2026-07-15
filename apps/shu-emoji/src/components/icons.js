/** 可爱圆润 SVG 图标（inline，currentColor） */

const PATHS = {
  home: `
    <path d="M4.5 10.2 12 3.8l7.5 6.4v8.1a1.6 1.6 0 0 1-1.6 1.6H6.1a1.6 1.6 0 0 1-1.6-1.6z" fill="currentColor" opacity=".18"/>
    <path d="M4.8 10.5 12 4.2l7.2 6.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M7 20.2V12.8a1.2 1.2 0 0 1 1.2-1.2h7.6A1.2 1.2 0 0 1 17 12.8v7.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M10.2 20.2v-4.1a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1v4.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  `,
  grid: `
    <rect x="4.2" y="4.2" width="6.2" height="6.2" rx="1.8" fill="currentColor" opacity=".2"/>
    <rect x="13.6" y="4.2" width="6.2" height="6.2" rx="1.8" fill="currentColor" opacity=".35"/>
    <rect x="4.2" y="13.6" width="6.2" height="6.2" rx="1.8" fill="currentColor" opacity=".35"/>
    <rect x="13.6" y="13.6" width="6.2" height="6.2" rx="1.8" fill="currentColor" opacity=".2"/>
    <rect x="4.2" y="4.2" width="6.2" height="6.2" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <rect x="13.6" y="4.2" width="6.2" height="6.2" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <rect x="4.2" y="13.6" width="6.2" height="6.2" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <rect x="13.6" y="13.6" width="6.2" height="6.2" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/>
  `,
  heart: `
    <path d="M12 20s-7.2-4.4-7.2-9.1A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7.2 3.3C19.2 15.6 12 20 12 20z" fill="currentColor" opacity=".22"/>
    <path d="M12 20s-7.2-4.4-7.2-9.1A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7.2 3.3C19.2 15.6 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
  `,
  heartFill: `
    <path d="M12 20.2s-7.4-4.5-7.4-9.3A4 4 0 0 1 12 7.4a4 4 0 0 1 7.4 3.5c0 4.8-7.4 9.3-7.4 9.3z" fill="currentColor"/>
    <circle cx="9.2" cy="10.2" r="1.1" fill="#fff" opacity=".55"/>
  `,
  search: `
    <circle cx="10.5" cy="10.5" r="5.6" fill="currentColor" opacity=".14"/>
    <circle cx="10.5" cy="10.5" r="5.6" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="m15.2 15.2 4.1 4.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="9.2" cy="9.2" r="1.2" fill="currentColor" opacity=".35"/>
  `,
  back: `
    <circle cx="12" cy="12" r="8.2" fill="currentColor" opacity=".1"/>
    <path d="M13.8 7.8 8.6 12l5.2 4.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  sparkle: `
    <path d="M12 3.2c.4 3.2 2.4 5.2 5.6 5.6-3.2.4-5.2 2.4-5.6 5.6-.4-3.2-2.4-5.2-5.6-5.6 3.2-.4 5.2-2.4 5.6-5.6z" fill="currentColor"/>
    <path d="M18.2 14.2c.2 1.5 1.1 2.4 2.6 2.6-1.5.2-2.4 1.1-2.6 2.6-.2-1.5-1.1-2.4-2.6-2.6 1.5-.2 2.4-1.1 2.6-2.6z" fill="currentColor" opacity=".55"/>
  `,
  moon: `
    <path d="M14.8 4.6a7.6 7.6 0 1 0 4.7 12.6 6.2 6.2 0 1 1-4.7-12.6z" fill="currentColor" opacity=".2"/>
    <path d="M14.8 4.6a7.6 7.6 0 1 0 4.7 12.6 6.2 6.2 0 1 1-4.7-12.6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
    <circle cx="9.6" cy="10.4" r=".8" fill="currentColor" opacity=".45"/>
    <circle cx="12.2" cy="13.8" r=".55" fill="currentColor" opacity=".35"/>
  `,
  star: `
    <path d="m12 3.4 2.2 5.3 5.7.5-4.3 3.7 1.3 5.5L12 15.6 6.9 18.4l1.3-5.5-4.3-3.7 5.7-.5z" fill="currentColor" opacity=".22"/>
    <path d="m12 3.4 2.2 5.3 5.7.5-4.3 3.7 1.3 5.5L12 15.6 6.9 18.4l1.3-5.5-4.3-3.7 5.7-.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  `,
  flower: `
    <circle cx="12" cy="12" r="2.3" fill="currentColor"/>
    <circle cx="12" cy="6.4" r="2.5" fill="currentColor" opacity=".35"/>
    <circle cx="12" cy="17.6" r="2.5" fill="currentColor" opacity=".35"/>
    <circle cx="6.4" cy="12" r="2.5" fill="currentColor" opacity=".35"/>
    <circle cx="17.6" cy="12" r="2.5" fill="currentColor" opacity=".35"/>
    <circle cx="8" cy="8" r="2.2" fill="currentColor" opacity=".22"/>
    <circle cx="16" cy="8" r="2.2" fill="currentColor" opacity=".22"/>
    <circle cx="8" cy="16" r="2.2" fill="currentColor" opacity=".22"/>
    <circle cx="16" cy="16" r="2.2" fill="currentColor" opacity=".22"/>
  `,
  leaf: `
    <path d="M18.5 5.5c-5.8-.6-10.8 2.4-12.4 7.8-1.4 4.6 1.4 7.8 5.8 6.8 5.2-1.2 9-6.6 6.6-14.6z" fill="currentColor" opacity=".22"/>
    <path d="M18.5 5.5c-5.8-.6-10.8 2.4-12.4 7.8-1.4 4.6 1.4 7.8 5.8 6.8 5.2-1.2 9-6.6 6.6-14.6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M10.2 17.4c1.6-2.6 4-5.6 7.4-8.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  pin: `
    <path d="M12 21.2s5.6-5.2 5.6-9.4A5.6 5.6 0 0 0 6.4 11.8c0 4.2 5.6 9.4 5.6 9.4z" fill="currentColor" opacity=".2"/>
    <path d="M12 21.2s5.6-5.2 5.6-9.4A5.6 5.6 0 0 0 6.4 11.8c0 4.2 5.6 9.4 5.6 9.4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
    <circle cx="12" cy="11.4" r="2" fill="currentColor"/>
  `,
  smile: `
    <circle cx="12" cy="12" r="7.4" fill="currentColor" opacity=".14"/>
    <circle cx="12" cy="12" r="7.4" fill="none" stroke="currentColor" stroke-width="1.7"/>
    <circle cx="9.2" cy="10.4" r="1" fill="currentColor"/>
    <circle cx="14.8" cy="10.4" r="1" fill="currentColor"/>
    <path d="M8.8 13.6c.9 1.6 2.4 2.4 3.2 2.4s2.3-.8 3.2-2.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  `,
  spark: `
    <path d="M12 4.2c.3 2.5 1.8 4 4.3 4.3-2.5.3-4 1.8-4.3 4.3-.3-2.5-1.8-4-4.3-4.3 2.5-.3 4-1.8 4.3-4.3z" fill="currentColor"/>
  `,
  potato: `
    <ellipse cx="12" cy="12.2" rx="6.8" ry="8" fill="currentColor" opacity=".22"/>
    <ellipse cx="12" cy="12.2" rx="6.8" ry="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <circle cx="9.6" cy="11" r=".9" fill="currentColor"/>
    <circle cx="14.2" cy="11.2" r=".9" fill="currentColor"/>
    <path d="M9.8 14.2c.8 1.2 2.1 1.7 2.4 1.7s1.5-.5 2.2-1.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="16.4" cy="8.6" r=".7" fill="currentColor" opacity=".4"/>
  `,
  arrowRight: `
    <circle cx="12" cy="12" r="8.2" fill="currentColor" opacity=".12"/>
    <path d="M10 8.2 14.8 12 10 15.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
  `,
};

export function icon(name, { size = 20, className = '', label = '' } = {}) {
  const body = PATHS[name] || PATHS.sparkle;
  const cls = ['ui-icon', className].filter(Boolean).join(' ');
  const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" ${aria}>${body}</svg>`;
}

/** 分类入口用的 emoji（比 SVG 更贴合本工具气质） */
export const CATEGORY_EMOJIS = {
  强调装饰: '✨',
  情感表达: '🥰',
  种草推荐: '🌱',
  视觉美化: '🌸',
  符号标记: '📌',
};
