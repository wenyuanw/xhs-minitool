export const LEVELS = [
  { id: 0, name: '湖心初漂', subtitle: '第一桨，交给微风', duration: 45, theme: 'day', kinds: ['log'], seed: 1103 },
  { id: 1, name: '芦苇缓湾', subtitle: '听芦苇说一句悄悄话', duration: 48, theme: 'day', kinds: ['weed', 'shoal', 'log'], seed: 2207 },
  { id: 2, name: '林间双溪', subtitle: '拐个弯，遇见另一片风景', duration: 52, theme: 'day', kinds: ['log', 'weed'], seed: 3301, fork: true },
  { id: 3, name: '峡谷回声', subtitle: '山谷把水声轻轻送回来', duration: 55, theme: 'day', kinds: ['rock', 'vortex', 'shoal'], seed: 4409 },
  { id: 4, name: '落日风岸', subtitle: '把今天划进橘子色的风里', duration: 60, theme: 'sunset', kinds: ['wind', 'log', 'weed'], seed: 5519, fork: true },
  { id: 5, name: '星光入海', subtitle: '顺着星光，慢慢抵达', duration: 65, theme: 'night', kinds: ['rock', 'vortex', 'wind', 'shoal'], seed: 6607, fork: true },
];
export const ITEMS = [
  ['白螺贝', 'shell', '湖心的浅水，藏着小小的螺旋。'], ['晴空瓶', 'bottle', '漂流瓶里，装着一整天的蓝。'],
  ['银尾鱼', 'fish', '看见银尾闪过，给小鱼留一条路。'], ['睡莲花', 'flower', '睡莲在安静的水面上慢慢展开。'],
  ['芦叶笛', 'leaf', '空心的芦叶，还留着风的音调。'], ['灰鸭羽', 'feather', '一根轻羽停在水面，像句号一样安静。'],
  ['青苔石', 'stone', '圆润的湖石被青苔抱住，摸上去凉凉的。'], ['芦荡种', 'seed', '芦荡送来的小种子，正等下一场雨。'],
  ['琥珀贝', 'shell', '林间的光把岸边贝壳染成蜂蜜色。'], ['回声瓶', 'bottle', '对着瓶口轻声说话，双溪会替你记得。'],
  ['金鳍鱼', 'fish', '金色鱼鳍一闪，就游进了林影。'], ['溪边蒲', 'flower', '淡黄的小花贴着水面，让岔路也变温柔。'],
  ['回声石', 'stone', '收进一小段山谷水声的深色石头。'], ['松塔舟', 'seed', '小松塔在水上打着转，像一艘迷你小舟。'],
  ['峡谷羽', 'feather', '山风留下的深绿羽毛，轻得几乎没有重量。'], ['石缝蕨', 'leaf', '从石缝里探出的小蕨叶，向水面打了个招呼。'],
  ['晚霞贝', 'shell', '落日把岸边的贝壳染成橘红色。'], ['落日瓶', 'bottle', '一封没有收件人的橘色晚安。'],
  ['霞光鱼', 'fish', '鱼背掠过一道红光，把水面剪成两半。'], ['风岸花', 'flower', '越是风大，越把小小花脸仰得高高的。'],
  ['月光贝', 'shell', '借一点月色，照亮细细的纹路。'], ['星愿瓶', 'bottle', '把心愿留给水流，不必急着回答。'],
  ['蓝影鱼', 'fish', '夜色里的蓝影，是水下的小邻居。'], ['浮光花', 'flower', '花瓣与星光，在水上短暂相遇。'],
].map((v, id) => ({ id, name: v[0], kind: v[1], note: v[2], area: Math.floor(id / 4) }));
export const SKINS = [
  { name: '薄荷狭舟', note: '修长木质·中央浪纹', color: '#edc17f', stripe: '#f9efce', shape: 'canoe', unlock: 0 },
  { name: '珊瑚双鳍', note: '宽弦双翼·方格尾纹', color: '#e27d68', stripe: '#ffe0a8', shape: 'twin', unlock: 3 },
  { name: '星河尖舟', note: '星光尖首·深蓝断带', color: '#627fa5', stripe: '#e8e7b8', shape: 'arrow', unlock: 6 },
];
export const CHARACTERS = [
  { name: '小旅人', cost: 0, shape: 'person', color: '#e5b968', accent: '#f9d78f', ability: '不急不慢，各项平衡', boost: 1.6, turn: 1, slow: 0.8, speed: 1, shellValue: 1 },
  { name: '珊瑚蟹', cost: 24, shape: 'crab', color: '#d87964', accent: '#ffd09b', ability: '拾贝·每枚贝壳额外 +1', boost: 1.6, turn: 1, slow: 0.8, speed: 1, shellValue: 2 },
  { name: '青鳍鱼', cost: 38, shape: 'fish', color: '#6fa69a', accent: '#d9efbf', ability: '逐浪·划桨加速更持久', boost: 2, turn: 1, slow: 0.8, speed: 1, shellValue: 1 },
  { name: '芦叶蛙', cost: 52, shape: 'frog', color: '#719c62', accent: '#e7e5a8', ability: '灵跳·转向响应提升 25%', boost: 1.6, turn: 1.25, slow: 0.8, speed: 1, shellValue: 1 },
  { name: '月湾龟', cost: 68, shape: 'turtle', color: '#708d78', accent: '#e7d39a', ability: '稳航·碰撞减速时间减半', boost: 1.6, turn: 1, slow: 0.4, speed: 1, shellValue: 1 },
  { name: '星光鲸', cost: 88, shape: 'whale', color: '#607f9e', accent: '#d8dfba', ability: '追星·基础航速提升 8%', boost: 1.6, turn: 1, slow: 0.8, speed: 1.08, shellValue: 1 },
];
export const WEATHERS = [
  { id: 'clear', name: '晴波', icon: 'sun', note: '划桨余韵 +0.3 秒', boost: 0.3, speed: 1, pickup: 0, drizzle: false },
  { id: 'breeze', name: '顺风', icon: 'leaf', note: '水流航速提升 6%', boost: 0, speed: 1.06, pickup: 0, drizzle: false },
  { id: 'drizzle', name: '细雨', icon: 'wave', note: '每拾 3 枚贝壳多得 1 枚', boost: 0, speed: 1, pickup: 0, drizzle: true },
  { id: 'mist', name: '薄雾', icon: 'moon', note: '拾取范围扩大', boost: 0, speed: 1, pickup: 8, drizzle: false },
];
export const THEMES = {
  day: { water: '#67b9ad', deep: '#49a99d', light: '#b3ddc7', land: '#b9c58d', sand: '#dbe0a6', tree: '#477e61', shade: '#326c59', sky: '#e7edcf' },
  sunset: { water: '#b5b996', deep: '#929f85', light: '#f7d8a2', land: '#bcb185', sand: '#efcd94', tree: '#7d8660', shade: '#596e55', sky: '#f4d6ad' },
  night: { water: '#416c7b', deep: '#325c70', light: '#8bb6b5', land: '#6c887c', sand: '#93a894', tree: '#426a65', shade: '#2a5559', sky: '#203e55' },
};
export const SPEED = 36;
export const STEP = 1 / 60;
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function random(seed) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }

export function riverAt(y, level) {
  const center = 120 + Math.sin(y / 210 + level.id) * 16 + Math.sin(y / 480) * 8;
  const width = level.id === 3 ? 148 : 170;
  const forkStart = level.duration * SPEED * 0.38;
  const forkEnd = forkStart + (level.id === 4 ? 260 : 210);
  let island = null;
  if (level.fork && y > forkStart && y < forkEnd) {
    const shape = Math.sin((y - forkStart) / (forkEnd - forkStart) * Math.PI);
    island = { x: center + (level.id === 4 ? -12 : 6), radius: shape * (level.id === 4 ? 34 : 25) };
  }
  return { left: center - width / 2, right: center + width / 2, center, island };
}

export function generateLevel(level, segment = 0) {
  const rng = random(level.seed + segment * 7919);
  const entities = [];
  const length = level.duration * SPEED;
  const add = (kind, y, x, extra = {}) => entities.push(Object.assign({ id: segment + ':' + entities.length, kind, y, x, radius: kind === 'log' ? 14 : kind === 'rock' ? 12 : 20 }, extra));
  const position = (y, fraction) => {
    const r = riverAt(y, level);
    let x = r.left + 20 + fraction * (r.right - r.left - 40);
    if (r.island && Math.abs(x - r.island.x) < r.island.radius + 20) x = r.left + 23;
    return x;
  };
  for (let y = 220; y < length - 120; y += level.id === 0 ? 195 : 125) {
    const kind = level.kinds[Math.floor(rng() * level.kinds.length)];
    // A single bounded obstacle per cross-section always leaves a safe lane.
    add(kind, y, position(y, 0.2 + rng() * 0.6));
  }
  for (let i = 0; i < 4; i++) {
    const y = Math.round(length * (i + 1) / 5);
    add('collect', y, position(y, 0.16 + rng() * 0.68), { item: level.id * 4 + i, radius: 7 });
  }
  // Five-shell curves make a readable mini-route and support the water-ripple combo.
  for (let start = 120; start < length - 100; start += 470) {
    const middle = 0.22 + rng() * 0.56;
    for (let i = 0; i < 5; i++) {
      const y = start + i * 48;
      if (y >= length - 65) break;
      add('currency', y, position(y, clamp(middle + Math.sin(i / 4 * Math.PI) * 0.18 - 0.09, 0.08, 0.92)), { amount: 1, radius: 7, chain: Math.floor(start / 470) });
    }
  }
  if (level.fork) {
    for (let i = 0; i < 4; i++) {
      const y = length * 0.38 + 35 + i * 42;
      add('currency', y, riverAt(y, level).left + 18, { amount: 1, radius: 7 });
    }
  }
  for (let y = 280; y < length - 100; y += 450) add('duck', y, position(y, rng()), { radius: 8, triggered: false });
  return entities;
}
