/**
 * 轻量自测：解密表往返 + 合成 EXIF JPEG 解析。
 * 运行：node apps/sony-shutter/scripts/selfcheck.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { decipherSony, extractSonyShutterCount } = await import(
  pathToFileURL(join(root, 'src/lib/sony.js')).href
);
const { parseImageExif } = await import(pathToFileURL(join(root, 'src/lib/exif.js')).href);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// 1) 解密表：对无冲突明文应可逆（抽样）
{
  const enc = new Uint8Array(256);
  for (let i = 0; i < 249; i += 1) enc[i] = (i * i * i) % 249;
  for (let i = 249; i < 256; i += 1) enc[i] = i;
  const sample = new Uint8Array([2, 3, 10, 40, 100, 200, 247, 250, 255]);
  const cipher = sample.map((b) => enc[b]);
  const plain = decipherSony(cipher);
  for (let i = 0; i < sample.length; i += 1) {
    // 冲突字节不一定回到原值；仅检查解密后重加密一致
    assert(enc[plain[i]] === cipher[i], `decipher mismatch at ${sample[i]}`);
  }
}

// 2) 合成最小 JPEG + EXIF（含假 MakerNote / 0x9050）
{
  const shutterPlain = 12345;
  const offset = 0x3a;
  const tag9050Plain = new Uint8Array(80);
  tag9050Plain[offset] = shutterPlain & 0xff;
  tag9050Plain[offset + 1] = (shutterPlain >> 8) & 0xff;
  tag9050Plain[offset + 2] = (shutterPlain >> 16) & 0xff;

  const encTable = new Uint8Array(256);
  for (let i = 0; i < 249; i += 1) encTable[i] = (i * i * i) % 249;
  for (let i = 249; i < 256; i += 1) encTable[i] = i;
  const tag9050 = tag9050Plain.map((b) => encTable[b]);

  const jpeg = buildSonyJpeg({
    model: 'ILCE-7M4',
    make: 'SONY',
    tag9050,
  });

  const exif = parseImageExif(jpeg.buffer);
  assert(exif.model === 'ILCE-7M4', `model=${exif.model}`);
  assert(exif.make === 'SONY', `make=${exif.make}`);
  assert(exif.makerNoteAbs != null, 'missing makerNote');

  const result = extractSonyShutterCount(exif);
  assert(result.shutterCount === shutterPlain, `count=${result.shutterCount}`);
}

console.log('selfcheck ok');

/**
 * @param {{ make: string, model: string, tag9050: Uint8Array }} opts
 */
function buildSonyJpeg(opts) {
  // 极简：SOI + APP1(Exif) + EOI
  const tiff = buildTiff(opts);
  const app1Payload = concat(ascii('Exif\0\0'), tiff);
  const app1Len = app1Payload.length + 2;
  const out = concat(
    Uint8Array.of(0xff, 0xd8),
    Uint8Array.of(0xff, 0xe1, (app1Len >> 8) & 0xff, app1Len & 0xff),
    app1Payload,
    Uint8Array.of(0xff, 0xd9),
  );
  return out;
}

/**
 * @param {{ make: string, model: string, tag9050: Uint8Array }} opts
 */
function buildTiff(opts) {
  // Little-endian TIFF
  // Layout:
  // 0: II 42 ifd0_offset=8
  // 8: IFD0 with Make, Model, ExifIFD
  // ExifIFD with MakerNote
  // MakerNote: "SONY DSC \0\0\0" + IFD with 0x9050

  const make = ascii(`${opts.make}\0`);
  const model = ascii(`${opts.model}\0`);
  const tag9050 = opts.tag9050;

  const parts = [];
  const mark = (size) => {
    const start = parts.reduce((n, p) => n + p.length, 0);
    parts.push(new Uint8Array(size));
    return { start, buf: parts[parts.length - 1] };
  };

  // We'll assemble with known offsets via a two-pass style using absolute positions.
  // Fixed plan:
  // 0x00 header (8)
  // 0x08 IFD0 (2 + 3*12 + 4 = 42) -> ends 0x32
  // then strings and exif IFD...

  const header = new Uint8Array(8);
  header[0] = 0x49;
  header[1] = 0x49;
  header[2] = 42;
  writeU32(header, 4, 8, true);

  // Place data after IFDs. Compute sizes:
  const ifd0Count = 3;
  const ifd0Size = 2 + ifd0Count * 12 + 4;
  const ifd0Start = 8;
  const dataCursorStart = ifd0Start + ifd0Size;

  // We'll put Make, Model, then Exif IFD, then MakerNote block
  let cursor = dataCursorStart;
  const makeOff = cursor;
  cursor += make.length;
  const modelOff = cursor;
  cursor += model.length;

  const exifCount = 1;
  const exifIfdSize = 2 + exifCount * 12 + 4;
  const exifIfdOff = cursor;
  cursor += exifIfdSize;

  const makerHeader = ascii('SONY DSC \0\0\0');
  // maker IFD: 1 entry for 0x9050
  const makerIfdSize = 2 + 12 + 4;
  const makerNoteOff = cursor;
  const makerIfdOffInNote = makerHeader.length;
  const makerNoteLen = makerHeader.length + makerIfdSize + tag9050.length;
  const tag9050Off = makerNoteOff + makerHeader.length + makerIfdSize;
  cursor += makerNoteLen;

  const buf = new Uint8Array(cursor);
  buf.set(header, 0);

  // IFD0
  writeU16(buf, ifd0Start, ifd0Count, true);
  writeIfdEntry(buf, ifd0Start + 2, 0x010f, 2, make.length, makeOff, true);
  writeIfdEntry(buf, ifd0Start + 14, 0x0110, 2, model.length, modelOff, true);
  writeIfdEntry(buf, ifd0Start + 26, 0x8769, 4, 1, exifIfdOff, true);
  writeU32(buf, ifd0Start + 2 + ifd0Count * 12, 0, true);

  buf.set(make, makeOff);
  buf.set(model, modelOff);

  // Exif IFD with MakerNote
  writeU16(buf, exifIfdOff, exifCount, true);
  writeIfdEntry(buf, exifIfdOff + 2, 0x927c, 7, makerNoteLen, makerNoteOff, true);
  writeU32(buf, exifIfdOff + 2 + exifCount * 12, 0, true);

  // MakerNote
  buf.set(makerHeader, makerNoteOff);
  const makerIfdAbs = makerNoteOff + makerIfdOffInNote;
  writeU16(buf, makerIfdAbs, 1, true);
  writeIfdEntry(buf, makerIfdAbs + 2, 0x9050, 7, tag9050.length, tag9050Off, true);
  writeU32(buf, makerIfdAbs + 2 + 12, 0, true);
  buf.set(tag9050, tag9050Off);

  return buf;
}

function writeIfdEntry(buf, abs, tag, type, count, valueOrOffset, le) {
  writeU16(buf, abs, tag, le);
  writeU16(buf, abs + 2, type, le);
  writeU32(buf, abs + 4, count, le);
  const unit = type === 2 || type === 7 ? 1 : type === 3 ? 2 : 4;
  const byteLen = unit * count;
  if (byteLen <= 4) {
    writeU32(buf, abs + 8, valueOrOffset, le);
  } else {
    writeU32(buf, abs + 8, valueOrOffset, le);
  }
}

function writeU16(buf, abs, v, le) {
  if (le) {
    buf[abs] = v & 0xff;
    buf[abs + 1] = (v >> 8) & 0xff;
  } else {
    buf[abs] = (v >> 8) & 0xff;
    buf[abs + 1] = v & 0xff;
  }
}

function writeU32(buf, abs, v, le) {
  if (le) {
    buf[abs] = v & 0xff;
    buf[abs + 1] = (v >> 8) & 0xff;
    buf[abs + 2] = (v >> 16) & 0xff;
    buf[abs + 3] = (v >> 24) & 0xff;
  } else {
    buf[abs] = (v >> 24) & 0xff;
    buf[abs + 1] = (v >> 16) & 0xff;
    buf[abs + 2] = (v >> 8) & 0xff;
    buf[abs + 3] = v & 0xff;
  }
}

function ascii(s) {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function concat(...chunks) {
  const len = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}
