import { journeyDefaults, sanitizeJourney } from '../game/journey.js';
import { CHARACTERS, ITEMS, SKINS } from '../game/data.js';
export const KEY = 'slow-paddle-save-v1';
export function defaults() { return { version: 1, challengeBest: 0, challengeSeen: false, journey: journeyDefaults(), visited: false, tutorialSeen: false, completed: 0, best: [null, null, null, null, null, null], discovered: [], shells: 0, character: 0, characters: [0], skin: 0, settings: { sound: false, theme: 'auto' } }; }
export function validate(data) {
  if (!data || data.version !== 1 || !Number.isInteger(data.completed) || data.completed < 0 || data.completed > 6 || !Array.isArray(data.best) || data.best.length !== 6 || !Array.isArray(data.discovered)) throw new Error('存档格式无法读取');
  const result = defaults();
  result.challengeBest = Number.isSafeInteger(data.challengeBest) && data.challengeBest >= 0 ? data.challengeBest : 0;
  result.challengeSeen = data.challengeSeen === true;
  result.journey = sanitizeJourney(data.journey);
  result.completed = data.completed;
  result.tutorialSeen = data.tutorialSeen === true;
  result.visited = data.visited === true || data.completed > 0;
  result.best = data.best.map(v => {
    if (v === null) return null;
    if (!v || !Number.isInteger(v.stars) || v.stars < 1 || v.stars > 3 || !Number.isFinite(v.count) || v.count < 0) throw new Error('关卡记录损坏');
    return { stars: v.stars, count: v.count };
  });
  result.discovered = data.discovered.filter((v, i, a) => Number.isInteger(v) && v >= 0 && v < ITEMS.length && a.indexOf(v) === i);
  result.shells = Number.isSafeInteger(data.shells) && data.shells >= 0 ? data.shells : 0;
  result.characters = Array.isArray(data.characters) ? data.characters.filter((v, i, a) => Number.isInteger(v) && v >= 0 && v < CHARACTERS.length && a.indexOf(v) === i) : [0];
  if (!result.characters.includes(0)) result.characters.unshift(0);
  result.character = result.characters.includes(data.character) ? data.character : 0;
  result.skin = Number.isInteger(data.skin) && data.skin >= 0 && data.skin < SKINS.length && data.completed >= SKINS[data.skin].unlock ? data.skin : 0;
  if (data.settings) {
    result.settings.sound = data.settings.sound === true;
    result.settings.theme = ['auto', 'day', 'sunset', 'night'].includes(data.settings.theme) ? data.settings.theme : 'auto';
  }
  return result;
}
export function applyResult(save, result) {
  result.found.forEach(id => { if (!save.discovered.includes(id)) save.discovered.push(id); });
  if (Number.isSafeInteger(result.shells) && result.shells > 0) save.shells += result.shells;
  if (result.mode === 'free') {
    if (Number.isSafeInteger(result.distance) && result.distance >= 0) save.challengeBest = Math.max(save.challengeBest || 0, result.distance);
    return;
  }
  if (result.mode !== 'level') return;
  const old = save.best[result.levelId];
  save.best[result.levelId] = { stars: Math.max(old ? old.stars : 0, result.stars), count: Math.max(old ? old.count : 0, result.count) };
  save.completed = Math.max(save.completed, result.levelId + 1);
}
function bounded(promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('存储响应超时')), 5000);
    Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
export async function clientVersion(env) {
  const xhs = env.xhs, api = xhs && xhs.miniTool;
  let options = xhs && xhs.launchOptions;
  if (!(options && options.miniToolEnv && options.miniToolEnv.buildVersion) && api && typeof api.getLaunchOptions === 'function') {
    try { options = await bounded(api.getLaunchOptions()); } catch { options = null; }
  }
  const build = Number(options && options.miniToolEnv && options.miniToolEnv.buildVersion);
  return Number.isFinite(build) && build > 0 ? Math.floor(build / 1000) : 0;
}
export function createStorage(env, notify = () => {}) {
  let backend = 'memory', writable = false, queue = Promise.resolve(), api;
  async function load() {
    writable = false;
    const version = await clientVersion(env);
    api = env.xhs && env.xhs.miniTool;
    backend = version >= 9460 ? 'native' : 'browser';
    try {
      let data;
      if (backend === 'native') {
        if (!api || !['getStorage', 'setStorage', 'getStorageInfo', 'removeStorage'].every(k => typeof api[k] === 'function')) throw new Error('当前容器存储接口不完整');
        const info = await bounded(api.getStorageInfo());
        if (!info || !Array.isArray(info.keys)) throw new Error('无法确认原生存档状态');
        if (info.keys.includes(KEY)) data = (await bounded(api.getStorage({ key: KEY }))).data;
        else {
          let old;
          try { old = env.localStorage.getItem(KEY); } catch { old = null; }
          if (old) {
            data = validate(JSON.parse(old));
            await bounded(api.setStorage({ key: KEY, data }));
            try { env.localStorage.removeItem(KEY); } catch { /* Native copy is authoritative. */ }
          }
        }
      } else {
        const raw = env.localStorage.getItem(KEY);
        if (raw !== null) data = JSON.parse(raw);
      }
      const value = data === undefined ? defaults() : validate(data);
      writable = true;
      return value;
    } catch (error) {
      notify('存档暂未读入，本次只在内存中游玩。可在设置里重试。');
      return defaults();
    }
  }
  function write(data) {
    const snapshot = JSON.parse(JSON.stringify(data));
    queue = queue.then(async () => {
      if (!writable) return false;
      try {
        // Keep writes strictly ordered; never race a timed-out native mutation.
        if (backend === 'native') await api.setStorage({ key: KEY, data: snapshot });
        else env.localStorage.setItem(KEY, JSON.stringify(snapshot));
        return true;
      } catch { notify('这次进度未保存，请在设置里重试保存。'); return false; }
    });
    return queue;
  }
  async function reset() {
    await queue;
    try {
      if (backend === 'native') {
        if (!api || typeof api.removeStorage !== 'function') throw new Error('unavailable');
        await api.removeStorage({ key: KEY });
        try { env.localStorage.removeItem(KEY); } catch { /* No browser backend available. */ }
      } else env.localStorage.removeItem(KEY);
      writable = true;
      return true;
    } catch { notify('未能清空存档，原有记录已保留。'); return false; }
  }
  return { load, write, reset, get writable() { return writable; }, get backend() { return backend; } };
}
