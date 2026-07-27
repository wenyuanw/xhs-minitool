import { FALLBACK_OFFSETS, lookupSonyModel } from './models.js';

/**
 * ExifTool 同款置换：密文 c = (明文 b³) % 249（249–255 不变换）。
 * 冲突时取最小明文（与常见 JS 实现一致）。
 */
const ENC = (() => {
  const table = new Uint8Array(256);
  for (let i = 0; i < 249; i += 1) table[i] = (i * i * i) % 249;
  for (let i = 249; i < 256; i += 1) table[i] = i;
  return table;
})();

const DECIPHER = (() => {
  const table = new Uint8Array(256);
  table.fill(255);
  for (let plain = 0; plain < 256; plain += 1) {
    const cipher = ENC[plain];
    if (table[cipher] === 255) table[cipher] = plain;
  }
  for (let i = 0; i < 256; i += 1) {
    if (table[i] === 255) table[i] = i;
  }
  return table;
})();

/**
 * @param {Uint8Array} data
 */
export function decipherSony(data) {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 1) out[i] = DECIPHER[data[i]];
  return out;
}

/**
 * @param {{
 *   bytes: Uint8Array | null,
 *   tiffStart: number,
 *   makerNoteAbs: number | null,
 *   makerNoteLen: number | null,
 *   model: string | null,
 * }} exif
 */
export function extractSonyShutterCount(exif) {
  const modelInfo = lookupSonyModel(exif.model || '');
  const { bytes, tiffStart, makerNoteAbs, makerNoteLen } = exif;

  if (!bytes || makerNoteAbs == null || !makerNoteLen) {
    return {
      shutterCount: null,
      source: null,
      modelInfo,
      note: '未找到索尼 MakerNote，可能不是原机照片或元数据已被清除。',
    };
  }

  const tag9050 = findSonyMakerTag(bytes, tiffStart, makerNoteAbs, makerNoteLen, 0x9050);
  if (!tag9050) {
    return {
      shutterCount: null,
      source: null,
      modelInfo,
      note: 'MakerNote 中没有快门次数字段（0x9050）。请尽量使用相机直出的 JPEG / ARW。',
    };
  }

  const plain = decipherSony(tag9050);
  const offsets = modelInfo ? [modelInfo.offset] : FALLBACK_OFFSETS;

  for (const offset of offsets) {
    const count = readCount24(plain, offset);
    if (isPlausibleCount(count)) {
      return {
        shutterCount: count,
        source: modelInfo
          ? `Tag9050 @ 0x${offset.toString(16)}`
          : `Tag9050 探测 @ 0x${offset.toString(16)}`,
        modelInfo,
        note: modelInfo
          ? null
          : '机型未在内置表中，已按常见偏移探测；结果仅供参考。',
      };
    }
  }

  return {
    shutterCount: null,
    source: null,
    modelInfo,
    note: '已找到加密快门数据，但未能解出合理次数。该机型偏移可能尚未收录，或当前为电子快门专用布局。',
  };
}

/**
 * Sony MakerNote IFD：偏移相对 TIFF 头（与标准 EXIF 一致）。
 * @param {Uint8Array} bytes
 * @param {number} tiffStart
 * @param {number} makerAbs
 * @param {number} makerLen
 * @param {number} wantedTag
 */
function findSonyMakerTag(bytes, tiffStart, makerAbs, makerLen, wantedTag) {
  const makerEnd = Math.min(bytes.length, makerAbs + makerLen);
  let ifdAbs = makerAbs;

  if (
    makerAbs + 12 <= makerEnd &&
    bytes[makerAbs] === 0x53 &&
    bytes[makerAbs + 1] === 0x4f &&
    bytes[makerAbs + 2] === 0x4e &&
    bytes[makerAbs + 3] === 0x59
  ) {
    ifdAbs = makerAbs + 12;
  }

  if (ifdAbs + 2 > makerEnd) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Sony MakerNote IFD 实务上多为小端；若失败再试大端
  let tagData = readMakerIfd(view, bytes, tiffStart, makerAbs, makerEnd, ifdAbs, wantedTag, true);
  if (!tagData) {
    tagData = readMakerIfd(view, bytes, tiffStart, makerAbs, makerEnd, ifdAbs, wantedTag, false);
  }
  return tagData;
}

/**
 * @param {DataView} view
 * @param {Uint8Array} bytes
 * @param {number} tiffStart
 * @param {number} makerAbs
 * @param {number} makerEnd
 * @param {number} ifdAbs
 * @param {number} wantedTag
 * @param {boolean} le
 */
function readMakerIfd(view, bytes, tiffStart, makerAbs, makerEnd, ifdAbs, wantedTag, le) {
  const count = view.getUint16(ifdAbs, le);
  if (count <= 0 || count > 512) return null;

  for (let i = 0; i < count; i += 1) {
    const entry = ifdAbs + 2 + i * 12;
    if (entry + 12 > makerEnd) break;
    const tag = view.getUint16(entry, le);
    if (tag !== wantedTag) continue;

    const type = view.getUint16(entry + 2, le);
    const num = view.getUint32(entry + 4, le);
    const unit = type === 3 ? 2 : type === 4 ? 4 : 1;
    const byteLen = unit * num;

    let dataAbs;
    if (byteLen <= 4) {
      dataAbs = entry + 8;
    } else {
      // 标准：相对 TIFF 头
      dataAbs = tiffStart + view.getUint32(entry + 8, le);
      // 兜底：偶见相对 MakerNote 起点
      if (dataAbs < makerAbs || dataAbs + Math.min(byteLen, 8) > bytes.length) {
        const rel = view.getUint32(entry + 8, le);
        const alt = makerAbs + rel;
        if (alt >= makerAbs && alt < makerEnd) dataAbs = alt;
      }
    }

    if (dataAbs < 0 || dataAbs >= bytes.length) return null;
    const len = Math.min(byteLen, bytes.length - dataAbs);
    if (len <= 0) return null;
    return bytes.slice(dataAbs, dataAbs + len);
  }
  return null;
}

/**
 * @param {Uint8Array} data
 * @param {number} offset
 */
function readCount24(data, offset) {
  if (offset + 3 >= data.length) return null;
  return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16);
}

/**
 * @param {number | null} n
 */
function isPlausibleCount(n) {
  return typeof n === 'number' && n >= 1 && n <= 5_000_000;
}
