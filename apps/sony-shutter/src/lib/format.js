const EXPOSURE_PROGRAM = {
  0: '未定义',
  1: '手动',
  2: '程序自动',
  3: '光圈优先',
  4: '快门优先',
  5: '创意程序',
  6: '运动',
  7: '人像',
  8: '风景',
};

const METERING = {
  0: '未知',
  1: '平均',
  2: '中央重点',
  3: '点测光',
  4: '多分区',
  5: '图案',
  6: '局部',
};

const WHITE_BALANCE = {
  0: '自动',
  1: '手动',
};

/**
 * @param {number | null | undefined} v
 */
export function formatExposureTime(v) {
  if (v == null || !Number.isFinite(v) || v <= 0) return '—';
  if (v >= 1) return `${trimNum(v)} s`;
  const den = Math.round(1 / v);
  if (Math.abs(1 / den - v) / v < 0.05) return `1/${den} s`;
  return `${v.toFixed(4)} s`;
}

/**
 * @param {number | null | undefined} v
 */
export function formatFNumber(v) {
  if (v == null || !Number.isFinite(v) || v <= 0) return '—';
  return `f/${trimNum(v)}`;
}

/**
 * @param {number | null | undefined} v
 */
export function formatFocal(v) {
  if (v == null || !Number.isFinite(v) || v <= 0) return '—';
  return `${trimNum(v)} mm`;
}

/**
 * @param {number | null | undefined} v
 */
export function formatIso(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  return `ISO ${Math.round(v)}`;
}

/**
 * @param {number | null | undefined} n
 */
export function formatCount(n) {
  if (n == null) return '—';
  return n.toLocaleString('zh-CN');
}

/**
 * @param {number | null | undefined} count
 * @param {number | null | undefined} rated
 */
export function formatLife(count, rated) {
  if (count == null || rated == null || rated <= 0) return null;
  const pct = Math.min(100, (count / rated) * 100);
  return {
    percent: pct,
    text: `约使用额定寿命的 ${pct.toFixed(1)}%（额定 ${rated.toLocaleString('zh-CN')} 次）`,
  };
}

/**
 * @param {number | null | undefined} v
 */
export function formatExposureProgram(v) {
  if (v == null) return '—';
  return EXPOSURE_PROGRAM[v] || String(v);
}

/**
 * @param {number | null | undefined} v
 */
export function formatMetering(v) {
  if (v == null) return '—';
  return METERING[v] || String(v);
}

/**
 * @param {number | null | undefined} v
 */
export function formatWhiteBalance(v) {
  if (v == null) return '—';
  return WHITE_BALANCE[v] || String(v);
}

/**
 * @param {string | null | undefined} s
 */
export function formatDateTime(s) {
  if (!s) return '—';
  // EXIF: "YYYY:MM:DD HH:MM:SS"
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return s;
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`;
}

/**
 * @param {number} n
 */
function trimNum(n) {
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(2).replace(/\.?0+$/, '');
  return s;
}
