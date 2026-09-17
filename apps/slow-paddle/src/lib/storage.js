import { journeyDefaults, sanitizeJourney } from '../game/journey.js';
import { CHARACTERS, ITEMS, SKINS } from '../game/data.js';
import { STAMPS, stampStats } from '../game/stamps.js';
export const KEY = 'slow-paddle-save-v1';
export const FALLBACK_KEY = KEY + '-native-fallback-v1';
export function defaults() { return { version: 1, challengeBest: 0, challengeSeen: false, journey: journeyDefaults(), visited: false, tutorialSeen: false, completed: 0, best: [null, null, null, null, null, null], discovered: [], shells: 0, character: 0, characters: [0], stamps: [], stats: stampStats(), skin: 0, settings: { sound: false, theme: 'auto' } }; }
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
  result.stamps = Array.isArray(data.stamps) ? data.stamps.filter((v, i, a) => typeof v === 'string' && STAMPS.some(stamp => stamp.id === v) && a.indexOf(v) === i) : [];
  result.stats = stampStats(data.stats);
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
function readBuildVersion(options) {
  const build = Number(options && options.miniToolEnv && options.miniToolEnv.buildVersion);
  return Number.isFinite(build) && build > 0 ? build : 0;
}
function errorDetails(error) {
  if (!error) return { message: '未知错误' };
  const details = {};
  if (error.errCode !== undefined) details.errCode = String(error.errCode);
  if (error.errMsg !== undefined) details.errMsg = String(error.errMsg);
  if (error.name) details.name = String(error.name);
  if (error.message) details.message = String(error.message);
  if (!Object.keys(details).length) details.message = String(error);
  return details;
}
async function resolveClientVersion(env) {
  const xhs = env.xhs, api = xhs && xhs.miniTool;
  let options = xhs && xhs.launchOptions;
  let buildVersion = readBuildVersion(options), source = buildVersion ? 'window.xhs.launchOptions' : '未获取', error = null;
  if (!buildVersion && api && typeof api.getLaunchOptions === 'function') {
    try {
      options = await bounded(api.getLaunchOptions());
      buildVersion = readBuildVersion(options);
      source = buildVersion ? 'miniTool.getLaunchOptions' : 'getLaunchOptions 无 buildVersion';
    } catch (cause) {
      error = errorDetails(cause);
      source = 'getLaunchOptions 失败';
    }
  }
  return { buildVersion, clientVersion: Math.floor(buildVersion / 1000), source, error };
}
export async function clientVersion(env) {
  return (await resolveClientVersion(env)).clientVersion;
}
export function createStorage(env, notify = () => {}) {
  const apiNames = ['getLaunchOptions', 'getStorage', 'setStorage', 'getStorageInfo', 'removeStorage'];
  const logs = [];
  let backend = 'memory', writable = false, queue = Promise.resolve(), api;
  let buildVersion = 0, detectedClientVersion = 0, versionSource = '未检测', pendingWrites = 0, writeId = 0;
  function record(event, details = {}) {
    logs.push({ at: new Date().toISOString(), event, details });
    if (logs.length > 80) logs.shift();
  }
  function apiAvailability() {
    const current = env.xhs && env.xhs.miniTool;
    return apiNames.reduce((result, name) => { result[name] = !!current && typeof current[name] === 'function'; return result; }, {});
  }
  function readPendingFallback() {
    try {
      const raw = env.localStorage.getItem(FALLBACK_KEY);
      if (!raw) return null;
      const envelope = JSON.parse(raw);
      if (!envelope || envelope.schema !== 1 || typeof envelope.deleted !== 'boolean') throw new Error('兼容存档标记无效');
      if (!envelope.deleted) envelope.data = validate(envelope.data);
      return envelope;
    } catch (error) {
      record('fallback.read.fail', errorDetails(error));
      return null;
    }
  }
  function writePendingFallback(data, deleted = false) {
    const envelope = { schema: 1, savedAt: new Date().toISOString(), deleted };
    if (!deleted) envelope.data = data;
    env.localStorage.setItem(FALLBACK_KEY, JSON.stringify(envelope));
    return envelope;
  }
  function clearBrowserCopies() {
    try { env.localStorage.removeItem(FALLBACK_KEY); } catch { /* Native copy is authoritative. */ }
    try { env.localStorage.removeItem(KEY); } catch { /* Native copy is authoritative. */ }
  }
  function debugText() {
    const availability = apiAvailability();
    const lines = [
      '生成时间：' + new Date().toISOString(),
      '存档 key：' + KEY,
      'buildVersion：' + (buildVersion || '未获取'),
      '客户端版本值：' + (detectedClientVersion || '未知'),
      '版本来源：' + versionSource,
      '实际后端：' + backend,
      '可写：' + (writable ? '是' : '否'),
      '待完成写入：' + pendingWrites,
      '',
      'API 可用性：',
      ...apiNames.map(name => '- ' + name + '：' + (availability[name] ? '可用' : '缺失')),
      '',
      '最近日志（新 → 旧）：',
    ];
    logs.slice().reverse().forEach(entry => {
      const detail = Object.keys(entry.details).map(key => key + '=' + String(entry.details[key])).join(' ');
      lines.push(entry.at + '  ' + entry.event + (detail ? '  ' + detail : ''));
    });
    return lines.join('\n');
  }
  record('storage.created', { sdk: !!(env.xhs && env.xhs.miniTool) });
  async function load() {
    writable = false;
    record('load.start');
    const version = await resolveClientVersion(env);
    buildVersion = version.buildVersion;
    detectedClientVersion = version.clientVersion;
    versionSource = version.source;
    record('version.detected', { buildVersion: buildVersion || '未获取', clientVersion: detectedClientVersion || '未知', source: versionSource });
    if (version.error) record('version.error', version.error);
    api = env.xhs && env.xhs.miniTool;
    backend = detectedClientVersion >= 9460 ? 'native' : 'browser';
    record('backend.selected', { backend, api: apiNames.filter(name => typeof (api && api[name]) === 'function').join(',') || '无' });
    try {
      let data, source = '新存档';
      if (backend === 'native') {
        if (!api || !['getStorage', 'setStorage', 'getStorageInfo', 'removeStorage'].every(k => typeof api[k] === 'function')) throw new Error('当前容器存储接口不完整');
        const pending = readPendingFallback();
        if (pending) {
          try {
            let response;
            if (pending.deleted) response = await bounded(api.removeStorage({ key: KEY }));
            else response = await bounded(api.setStorage({ key: KEY, data: pending.data }));
            data = pending.deleted ? defaults() : pending.data;
            source = pending.deleted ? '兼容存储重置已同步原生' : '兼容存档已恢复原生';
            clearBrowserCopies();
            record('fallback.sync.ok', { deleted: pending.deleted, errMsg: response && response.errMsg ? response.errMsg : '未返回' });
          } catch (error) {
            backend = 'browser-fallback';
            data = pending.deleted ? defaults() : pending.data;
            source = pending.deleted ? '兼容存储重置待同步' : '兼容存档待同步';
            record('fallback.sync.fail', Object.assign({ deleted: pending.deleted }, errorDetails(error)));
            notify('原生存储仍不可用，已从兼容存储恢复进度。');
          }
        } else {
          const info = await bounded(api.getStorageInfo());
          if (!info || !Array.isArray(info.keys)) throw new Error('无法确认原生存档状态');
          record('native.info.ok', { keyCount: info.keys.length, hasSave: info.keys.includes(KEY), currentSize: info.currentSize === undefined ? '未返回' : info.currentSize, limitSize: info.limitSize === undefined ? '未返回' : info.limitSize });
          if (info.keys.includes(KEY)) { data = (await bounded(api.getStorage({ key: KEY }))).data; source = '原生存档'; }
          else {
            let old;
            try { old = env.localStorage.getItem(KEY); } catch { old = null; }
            if (old) {
              data = validate(JSON.parse(old));
              try {
                const response = await bounded(api.setStorage({ key: KEY, data }));
                record('migration.write.ok', { errMsg: response && response.errMsg ? response.errMsg : '未返回', characters: old.length });
                try { env.localStorage.removeItem(KEY); } catch { /* Native copy is authoritative. */ }
                source = '浏览器存档迁移';
              } catch (error) {
                writePendingFallback(data);
                backend = 'browser-fallback';
                source = '兼容存档迁移待同步';
                record('migration.native.fail', errorDetails(error));
                notify('原生存储写入失败，已改用兼容存储。');
              }
            }
          }
        }
      } else {
        const pending = readPendingFallback();
        if (pending) {
          backend = 'browser-fallback';
          data = pending.deleted ? defaults() : pending.data;
          source = pending.deleted ? '兼容存储重置' : '兼容存档';
        } else {
          const raw = env.localStorage.getItem(KEY);
          if (raw !== null) { data = JSON.parse(raw); source = '浏览器存档'; }
        }
      }
      const value = data === undefined ? defaults() : validate(data);
      writable = true;
      record('load.ok', { backend, source });
      return value;
    } catch (error) {
      record('load.fail', Object.assign({ backend }, errorDetails(error)));
      notify('存档暂未读入，本次只在内存中游玩。可在设置里重试。');
      return defaults();
    }
  }
  function write(data) {
    let serialized, snapshot;
    const id = ++writeId;
    try { serialized = JSON.stringify(data); snapshot = JSON.parse(serialized); }
    catch (error) {
      record('write.serialize.fail', Object.assign({ id }, errorDetails(error)));
      notify('这次进度未保存，请在设置里重试保存。');
      return Promise.resolve(false);
    }
    record('write.queued', { id, backend, characters: serialized.length });
    queue = queue.then(async () => {
      if (!writable) { record('write.skipped', { id, reason: '当前不可写' }); return false; }
      pendingWrites++;
      record('write.start', { id, backend });
      try {
        // Keep writes strictly ordered; never race a timed-out native mutation.
        let response;
        if (backend === 'native') response = await api.setStorage({ key: KEY, data: snapshot });
        else if (backend === 'browser-fallback') writePendingFallback(snapshot);
        else env.localStorage.setItem(KEY, JSON.stringify(snapshot));
        record('write.ok', { id, backend, errMsg: response && response.errMsg ? response.errMsg : '未返回' });
        return true;
      } catch (error) {
        record('write.fail', Object.assign({ id, backend }, errorDetails(error)));
        if (backend === 'native') {
          try {
            writePendingFallback(snapshot);
            backend = 'browser-fallback';
            record('fallback.write.ok', { id, backend, characters: serialized.length });
            notify('原生存储失败，已改用兼容存储。清理缓存仍可能丢失记录。');
            return true;
          } catch (fallbackError) {
            record('fallback.write.fail', Object.assign({ id }, errorDetails(fallbackError)));
          }
        }
        notify('这次进度未保存，请在设置里重试保存。');
        return false;
      } finally { pendingWrites--; }
    });
    return queue;
  }
  async function reset() {
    await queue;
    record('reset.start', { backend });
    try {
      if (backend === 'native') {
        if (!api || typeof api.removeStorage !== 'function') throw new Error('unavailable');
        try {
          const response = await api.removeStorage({ key: KEY });
          record('reset.native.ok', { errMsg: response && response.errMsg ? response.errMsg : '未返回' });
          clearBrowserCopies();
        } catch (error) {
          record('reset.native.fail', errorDetails(error));
          writePendingFallback(null, true);
          try { env.localStorage.removeItem(KEY); } catch { /* Tombstone remains authoritative. */ }
          backend = 'browser-fallback';
          writable = true;
          record('fallback.reset.ok', { backend });
          notify('原生存储暂时无法清空，已在兼容存储记录重置。');
          return true;
        }
      } else if (backend === 'browser-fallback') {
        let nativeRemoved = false;
        if (api && typeof api.removeStorage === 'function' && detectedClientVersion >= 9460) {
          try {
            const response = await api.removeStorage({ key: KEY });
            nativeRemoved = true;
            record('reset.native.ok', { errMsg: response && response.errMsg ? response.errMsg : '未返回' });
          } catch (error) { record('reset.native.fail', errorDetails(error)); }
        }
        if (nativeRemoved) { clearBrowserCopies(); backend = 'native'; }
        else {
          writePendingFallback(null, true);
          try { env.localStorage.removeItem(KEY); } catch { /* Tombstone remains authoritative. */ }
        }
      } else {
        env.localStorage.removeItem(KEY);
        try { env.localStorage.removeItem(FALLBACK_KEY); } catch { /* No pending native fallback. */ }
      }
      writable = true;
      record('reset.ok', { backend });
      return true;
    } catch (error) {
      record('reset.fail', Object.assign({ backend }, errorDetails(error)));
      notify('未能清空存档，原有记录已保留。');
      return false;
    }
  }
  return {
    load,
    write,
    reset,
    debugText,
    clearDebugLog() { logs.length = 0; record('log.cleared'); },
    get writable() { return writable; },
    get backend() { return backend; },
  };
}
