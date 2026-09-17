import { CHARACTERS, ITEMS, LEVELS } from './data.js';

export const STAMPS = [
  { id: 'shore', name: '初次靠岸', hint: '完成第一趟漂流', reward: 5, icon: 'dock', ready: state => state.stats.runs >= 1 || state.completed > 0 || state.challengeBest > 0 },
  { id: 'gentle', name: '无痕水面', hint: '零碰撞抵达一次', reward: 8, icon: 'leaf', ready: state => state.stats.perfectRuns >= 1 },
  { id: 'ripple', name: '五连水纹', hint: '连续拾取 5 枚贝壳', reward: 8, icon: 'wave', ready: state => state.stats.bestChain >= 5 },
  { id: 'half-atlas', name: '半册拾光', hint: '点亮 12 份图鉴', reward: 10, icon: 'book', ready: state => state.discovered.length >= Math.ceil(ITEMS.length / 2) },
  { id: 'full-atlas', name: '满册拾光', hint: '点亮全部图鉴', reward: 20, icon: 'star', ready: state => state.discovered.length >= ITEMS.length },
  { id: 'faraway', name: '远方来信', hint: '挑战漂流达到 500 米', reward: 15, icon: 'map', ready: state => state.challengeBest >= 500 },
  { id: 'six-waters', name: '六水抵达', hint: '完成全部水域', reward: 18, icon: 'sun', ready: state => state.completed >= LEVELS.length },
  { id: 'companions', name: '同舟伙伴', hint: '集齐全部漂流搭档', reward: 25, icon: 'heart', ready: state => state.characters.length >= CHARACTERS.length },
];

export function stampStats(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    runs: Number.isSafeInteger(source.runs) && source.runs >= 0 ? source.runs : 0,
    totalShells: Number.isSafeInteger(source.totalShells) && source.totalShells >= 0 ? source.totalShells : 0,
    perfectRuns: Number.isSafeInteger(source.perfectRuns) && source.perfectRuns >= 0 ? source.perfectRuns : 0,
    bestChain: Number.isSafeInteger(source.bestChain) && source.bestChain >= 0 ? source.bestChain : 0,
  };
}

export function syncStamps(state, result) {
  state.stats = stampStats(state.stats);
  state.stamps = Array.isArray(state.stamps) ? state.stamps.filter((id, index, all) => STAMPS.some(stamp => stamp.id === id) && all.indexOf(id) === index) : [];
  if (result) {
    state.stats.runs++;
    state.stats.totalShells += Number.isSafeInteger(result.shells) && result.shells > 0 ? result.shells : 0;
    if (result.mode === 'level' && result.collisions === 0) state.stats.perfectRuns++;
    state.stats.bestChain = Math.max(state.stats.bestChain, Number.isSafeInteger(result.bestChain) ? result.bestChain : 0);
  }
  const unlocked = [];
  let reward = 0;
  STAMPS.forEach(stamp => {
    if (!state.stamps.includes(stamp.id) && stamp.ready(state)) {
      state.stamps.push(stamp.id); unlocked.push(stamp); reward += stamp.reward;
    }
  });
  if (reward) state.shells += reward;
  return { unlocked, reward };
}
