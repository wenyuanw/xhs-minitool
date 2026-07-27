/**
 * 纯本地 JPEG / TIFF(ARW) EXIF 解析（无第三方依赖）。
 */

const TYPE_SIZE = {
  1: 1,
  2: 1,
  3: 2,
  4: 4,
  5: 8,
  7: 1,
  9: 4,
  10: 8,
};

/**
 * @param {ArrayBuffer} buffer
 */
export function parseImageExif(buffer) {
  const bytes = new Uint8Array(buffer);
  const empty = blankResult();
  if (bytes.length < 12) return empty;

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const exif = findJpegExif(bytes);
    if (!exif) return { ...empty, format: 'jpeg' };
    return { ...parseTiffExif(bytes, exif.tiffStart), format: 'jpeg' };
  }

  if (
    (bytes[0] === 0x49 && bytes[1] === 0x49) ||
    (bytes[0] === 0x4d && bytes[1] === 0x4d)
  ) {
    return { ...parseTiffExif(bytes, 0), format: 'tiff' };
  }

  return empty;
}

function blankResult() {
  return {
    make: null,
    model: null,
    datetime: null,
    orientation: null,
    exposureTime: null,
    fNumber: null,
    iso: null,
    focalLength: null,
    lensModel: null,
    whiteBalance: null,
    exposureProgram: null,
    meteringMode: null,
    flash: null,
    imageWidth: null,
    imageHeight: null,
    /** MakerNote 在文件中的绝对起点 */
    makerNoteAbs: null,
    /** MakerNote 字节长度 */
    makerNoteLen: null,
    /** 完整文件视图，供后续按 TIFF 相对偏移读取 */
    bytes: null,
    tiffStart: 0,
    tiffLittleEndian: true,
    format: 'unknown',
  };
}

/**
 * @param {Uint8Array} bytes
 */
function findJpegExif(bytes) {
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (size < 2 || offset + 2 + size > bytes.length) break;

    if (marker === 0xe1) {
      const start = offset + 4;
      if (
        bytes[start] === 0x45 &&
        bytes[start + 1] === 0x78 &&
        bytes[start + 2] === 0x69 &&
        bytes[start + 3] === 0x66 &&
        bytes[start + 4] === 0x00 &&
        bytes[start + 5] === 0x00
      ) {
        return { tiffStart: start + 6 };
      }
    }
    offset += 2 + size;
  }
  return null;
}

/**
 * @param {Uint8Array} bytes
 * @param {number} tiffStart
 */
function parseTiffExif(bytes, tiffStart) {
  const result = blankResult();
  result.bytes = bytes;
  result.tiffStart = tiffStart;
  if (tiffStart + 8 > bytes.length) return result;

  const b0 = bytes[tiffStart];
  const b1 = bytes[tiffStart + 1];
  const le = b0 === 0x49 && b1 === 0x49;
  const be = b0 === 0x4d && b1 === 0x4d;
  if (!le && !be) return result;
  result.tiffLittleEndian = le;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ifd0 = tiffStart + view.getUint32(tiffStart + 4, le);
  const ifd0Tags = readIfd(bytes, view, tiffStart, ifd0, le);

  result.make = asAscii(ifd0Tags[0x010f]);
  result.model = asAscii(ifd0Tags[0x0110]);
  result.datetime = asAscii(ifd0Tags[0x0132]);
  result.orientation = asNumber(ifd0Tags[0x0112]);
  result.imageWidth = asNumber(ifd0Tags[0x0100]) ?? asNumber(ifd0Tags[0xa002]);
  result.imageHeight = asNumber(ifd0Tags[0x0101]) ?? asNumber(ifd0Tags[0xa003]);

  const exifPtr = asNumber(ifd0Tags[0x8769]);
  if (exifPtr != null) {
    const exifTags = readIfd(bytes, view, tiffStart, tiffStart + exifPtr, le);
    result.exposureTime = asRational(exifTags[0x829a]);
    result.fNumber = asRational(exifTags[0x829d]);
    result.iso =
      asNumber(exifTags[0x8827]) ??
      (Array.isArray(exifTags[0x8833]) ? Number(exifTags[0x8833][0]) : asNumber(exifTags[0x8833]));
    result.focalLength = asRational(exifTags[0x920a]);
    result.lensModel = asAscii(exifTags[0xa434]);
    result.whiteBalance = asNumber(exifTags[0xa403]);
    result.exposureProgram = asNumber(exifTags[0x8822]);
    result.meteringMode = asNumber(exifTags[0x9207]);
    result.flash = asNumber(exifTags[0x9209]);
    result.datetime =
      result.datetime || asAscii(exifTags[0x9003]) || asAscii(exifTags[0x9004]);
    result.imageWidth = result.imageWidth ?? asNumber(exifTags[0xa002]);
    result.imageHeight = result.imageHeight ?? asNumber(exifTags[0xa003]);

    const makerMeta = exifTags.__makerNoteMeta;
    if (makerMeta) {
      result.makerNoteAbs = makerMeta.abs;
      result.makerNoteLen = makerMeta.len;
    }
  }

  return result;
}

/**
 * @param {Uint8Array} bytes
 * @param {DataView} view
 * @param {number} tiffStart
 * @param {number} ifdAbs
 * @param {boolean} le
 */
function readIfd(bytes, view, tiffStart, ifdAbs, le) {
  /** @type {Record<number | string, any>} */
  const tags = {};
  if (ifdAbs < 0 || ifdAbs + 2 > bytes.length) return tags;

  const count = view.getUint16(ifdAbs, le);
  for (let i = 0; i < count; i += 1) {
    const entry = ifdAbs + 2 + i * 12;
    if (entry + 12 > bytes.length) break;
    const tag = view.getUint16(entry, le);
    const type = view.getUint16(entry + 2, le);
    const num = view.getUint32(entry + 4, le);
    const unit = TYPE_SIZE[type] || 1;
    const byteLen = unit * num;
    let valueAbs;
    if (byteLen <= 4) {
      valueAbs = entry + 8;
    } else {
      valueAbs = tiffStart + view.getUint32(entry + 8, le);
    }
    if (valueAbs < 0 || valueAbs + Math.min(byteLen, 1) > bytes.length) continue;

    if (tag === 0x927c) {
      tags.__makerNoteMeta = {
        abs: valueAbs,
        len: Math.min(byteLen, bytes.length - valueAbs),
      };
      continue;
    }

    tags[tag] = readValue(bytes, view, valueAbs, type, num, le, byteLen);
  }
  return tags;
}

/**
 * @param {Uint8Array} bytes
 * @param {DataView} view
 * @param {number} abs
 * @param {number} type
 * @param {number} num
 * @param {boolean} le
 * @param {number} byteLen
 */
function readValue(bytes, view, abs, type, num, le, byteLen) {
  if (type === 2) {
    let end = abs;
    const limit = abs + num;
    while (end < limit && end < bytes.length && bytes[end] !== 0) end += 1;
    return new TextDecoder('ascii').decode(bytes.subarray(abs, end));
  }
  if (num === 1) {
    if (type === 1) return bytes[abs];
    if (type === 3) return view.getUint16(abs, le);
    if (type === 4) return view.getUint32(abs, le);
    if (type === 5 && abs + 8 <= bytes.length) {
      const n = view.getUint32(abs, le);
      const d = view.getUint32(abs + 4, le);
      return d ? n / d : null;
    }
    if (type === 9) return view.getInt32(abs, le);
    if (type === 10 && abs + 8 <= bytes.length) {
      const n = view.getInt32(abs, le);
      const d = view.getInt32(abs + 4, le);
      return d ? n / d : null;
    }
  }
  if (type === 3 && num <= 16) {
    const out = [];
    for (let i = 0; i < num; i += 1) out.push(view.getUint16(abs + i * 2, le));
    return out;
  }
  if (type === 1 || type === 7) {
    return bytes.slice(abs, abs + Math.min(byteLen, bytes.length - abs));
  }
  return null;
}

function asAscii(v) {
  if (typeof v === 'string') {
    const s = v.replace(/\0+$/g, '').trim();
    return s || null;
  }
  return null;
}

function asNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (Array.isArray(v) && typeof v[0] === 'number') return v[0];
  return null;
}

function asRational(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
}
