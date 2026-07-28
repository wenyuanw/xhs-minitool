import { extractSonyShutterCount } from './sony.js';

/**
 * @param {{
 *   bytes: Uint8Array | null,
 *   tiffStart: number,
 *   makerNoteAbs: number | null,
 *   makerNoteLen: number | null,
 *   tiffLittleEndian?: boolean,
 *   make: string | null,
 *   model: string | null,
 * }} exif
 */
export function extractShutterCount(exif) {
  const make = String(exif.make || '').toUpperCase();

  if (make.includes('SONY')) {
    return {
      brand: 'sony',
      ...extractSonyShutterCount(exif),
    };
  }

  if (make.includes('NIKON')) {
    return {
      brand: 'nikon',
      ...extractSimpleMakerValue(exif, {
        tag: 0x00a7,
        source: 'Nikon MakerNote 0x00A7',
        noteMissing: '未找到尼康快门标签（0x00A7）。请尽量使用相机直出 JPEG / NEF。',
      }),
    };
  }

  if (make.includes('FUJIFILM') || make.includes('FUJI')) {
    const raw = extractSimpleMakerValue(exif, {
      tag: 0x1438,
      source: 'Fujifilm MakerNote 0x1438',
      noteMissing: '未找到富士 ImageCount 标签（0x1438）。请尽量使用相机直出 JPEG / RAF。',
    });
    return {
      brand: 'fuji',
      ...raw,
      shutterCount: raw.shutterCount == null ? null : raw.shutterCount & 0x7fff,
    };
  }

  return {
    brand: 'unknown',
    shutterCount: null,
    source: null,
    modelInfo: null,
    note: '当前仅支持索尼、尼康、富士的快门次数查询；已展示可读取的基础拍摄信息。',
  };
}

/**
 * @param {Parameters<typeof extractShutterCount>[0]} exif
 * @param {{ tag: number, source: string, noteMissing: string }} options
 */
function extractSimpleMakerValue(exif, options) {
  const { bytes, makerNoteAbs, makerNoteLen } = exif;
  if (!bytes || makerNoteAbs == null || !makerNoteLen) {
    return {
      shutterCount: null,
      source: null,
      modelInfo: null,
      note: '未找到 MakerNote，可能不是原机照片或元数据已被清除。',
    };
  }

  const maker = locateMakerConfig(bytes, makerNoteAbs, makerNoteLen, exif.tiffLittleEndian !== false);
  if (!maker) {
    return {
      shutterCount: null,
      source: null,
      modelInfo: null,
      note: 'MakerNote 结构暂不支持，可能是旧机型或元数据布局不同。',
    };
  }

  const value = readMakerInt(bytes, maker, options.tag);
  if (value == null) {
    return {
      shutterCount: null,
      source: null,
      modelInfo: null,
      note: options.noteMissing,
    };
  }

  return {
    shutterCount: value,
    source: options.source,
    modelInfo: null,
    note: null,
  };
}

/**
 * @param {Uint8Array} bytes
 * @param {number} makerAbs
 * @param {number} makerLen
 * @param {boolean} parentLe
 */
function locateMakerConfig(bytes, makerAbs, makerLen, parentLe) {
  const makerEnd = Math.min(bytes.length, makerAbs + makerLen);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Fuji: "FUJIFILM" + 4-byte IFD offset, little-endian, offsets relative to maker start
  if (
    makerAbs + 12 <= makerEnd &&
    bytes[makerAbs] === 0x46 &&
    bytes[makerAbs + 1] === 0x55 &&
    bytes[makerAbs + 2] === 0x4a &&
    bytes[makerAbs + 3] === 0x49 &&
    bytes[makerAbs + 4] === 0x46 &&
    bytes[makerAbs + 5] === 0x49 &&
    bytes[makerAbs + 6] === 0x4c &&
    bytes[makerAbs + 7] === 0x4d
  ) {
    const ifdRel = view.getUint32(makerAbs + 8, true);
    const ifdAbs = makerAbs + (ifdRel || 12);
    return { baseAbs: makerAbs, ifdAbs, makerEnd, le: true };
  }

  // Nikon type 3: "Nikon\0" + version + TIFF header; offsets relative to maker TIFF header
  if (
    makerAbs + 18 <= makerEnd &&
    bytes[makerAbs] === 0x4e &&
    bytes[makerAbs + 1] === 0x69 &&
    bytes[makerAbs + 2] === 0x6b &&
    bytes[makerAbs + 3] === 0x6f &&
    bytes[makerAbs + 4] === 0x6e &&
    bytes[makerAbs + 5] === 0x00
  ) {
    const tiffBase = makerAbs + 10;
    const le = bytes[tiffBase] === 0x49 && bytes[tiffBase + 1] === 0x49;
    const be = bytes[tiffBase] === 0x4d && bytes[tiffBase + 1] === 0x4d;
    if (le || be) {
      return { baseAbs: tiffBase, ifdAbs: makerAbs + 18, makerEnd, le };
    }
    // Nikon type 1/2 fallback
    return { baseAbs: makerAbs, ifdAbs: makerAbs + 8, makerEnd, le: parentLe };
  }

  // Generic IFD
  return { baseAbs: makerAbs, ifdAbs: makerAbs, makerEnd, le: parentLe };
}

/**
 * @param {Uint8Array} bytes
 * @param {{ baseAbs: number, ifdAbs: number, makerEnd: number, le: boolean }} cfg
 * @param {number} wantedTag
 */
function readMakerInt(bytes, cfg, wantedTag) {
  const { baseAbs, ifdAbs, makerEnd, le } = cfg;
  if (ifdAbs + 2 > makerEnd) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(ifdAbs, le);
  if (count <= 0 || count > 1024) return null;

  for (let i = 0; i < count; i += 1) {
    const entry = ifdAbs + 2 + i * 12;
    if (entry + 12 > makerEnd) break;
    const tag = view.getUint16(entry, le);
    if (tag !== wantedTag) continue;
    const type = view.getUint16(entry + 2, le);
    const num = view.getUint32(entry + 4, le);
    const unit = type === 3 ? 2 : type === 4 ? 4 : 1;
    const byteLen = unit * num;
    let valueAbs = entry + 8;
    if (byteLen > 4) {
      const rel = view.getUint32(entry + 8, le);
      valueAbs = baseAbs + rel;
    }
    if (valueAbs < 0 || valueAbs + Math.min(byteLen, 4) > bytes.length) return null;

    if (type === 3) return view.getUint16(valueAbs, le);
    if (type === 4) return view.getUint32(valueAbs, le);
    if (type === 1) return bytes[valueAbs];
    return null;
  }
  return null;
}
