import emojis from '../data/emojis.json';

export const CATEGORIES = ['强调装饰', '情感表达', '种草推荐', '视觉美化', '符号标记'];

/** @deprecated UI 请用 components/icons.js 的 CATEGORY_EMOJIS */
export const CATEGORY_ICONS = {
  强调装饰: '✨',
  情感表达: '🥰',
  种草推荐: '🌱',
  视觉美化: '🌸',
  符号标记: '📌',
};

export const SUGGEST_KEYWORDS = ['种草', '开心', '强调', '避坑', '真实', '高级', '清单'];

const EMOJI_RE =
  /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu;

export function getAllEmojis() {
  return emojis;
}

export function getByEmoji(char) {
  return emojis.find((item) => item.emoji === char) || null;
}

export function getByCategory(category) {
  return emojis
    .filter((item) => item.category === category)
    .sort((a, b) => b.popularity - a.popularity);
}

function extractEmojis(text) {
  return text.match(EMOJI_RE) || [];
}

function scoreItem(item, keyword) {
  const q = keyword.toLowerCase();
  let score = 0;
  if (item.name_zh.includes(keyword)) score += 40;
  if (item.name_en.toLowerCase().includes(q)) score += 20;
  if (item.tags.some((t) => t.includes(keyword))) score += 30;
  if (item.meaning_xhs.includes(keyword)) score += 18;
  if (item.tone.some((t) => t.includes(keyword))) score += 12;
  if (item.verticals.some((t) => t.includes(keyword))) score += 12;
  if (item.usage_tips.includes(keyword)) score += 8;
  if (item.examples.some((e) => e.includes(keyword))) score += 6;
  if (item.category.includes(keyword)) score += 10;
  return score + item.popularity / 100;
}

export function search(query) {
  const raw = String(query || '').trim();
  if (!raw) return { mode: 'empty', items: [] };

  const foundEmojis = extractEmojis(raw);
  if (foundEmojis.length) {
    const items = [];
    const seen = new Set();
    for (const e of foundEmojis) {
      const hit = getByEmoji(e);
      if (hit && !seen.has(hit.emoji)) {
        seen.add(hit.emoji);
        items.push(hit);
      }
    }
    return { mode: 'emoji', items };
  }

  const keyword = raw.replace(/\s+/g, '');
  const ranked = emojis
    .map((item) => ({ item, score: scoreItem(item, keyword) }))
    .filter((row) => row.score >= 6)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.item);

  return { mode: 'keyword', items: ranked };
}

export function pickRandom() {
  return pickWanderNext([]);
}

/** 随机漫游：全库抽取，略偏情感/视觉与温柔语气；避开 exclude 中近期已出现的 */
export function pickWanderNext(exclude = []) {
  const blocked = new Set(exclude);
  let pool = emojis.filter((item) => !blocked.has(item.emoji));
  if (pool.length === 0) pool = [...emojis];

  const weighted = pool.flatMap((item) => {
    let w = 1;
    if (item.category === '情感表达' || item.category === '视觉美化') w += 2;
    if (item.tone?.some((t) => /温柔|浪漫|治愈|甜美|梦幻|喜爱|喜欢/.test(t))) w += 2;
    if (item.popularity >= 80) w += 1;
    return Array(w).fill(item);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
}

export function resolveRelated(chars) {
  return chars.map((c) => getByEmoji(c)).filter(Boolean);
}
