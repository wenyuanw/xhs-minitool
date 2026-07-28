import momoBaseSvg from '../assets/momo-base.svg?raw';
import { gradientFromHex } from './colors.js';
import { loadImage } from './image-loader.js';

const CANVAS_SIZE = 1024;

/**
 * Use the full SVG viewBox. Path-1 kisses the right/bottom edges; left/top
 * empty space becomes breathing room when the layout is pinned to BR.
 */
const CONTENT = { x: 0, y: 0, w: 896, h: 896 };

/** Extra left/top air on top of the SVG’s empty margin; keep right/bottom flush. */
const PAD = { top: 0.04, left: 0.04, right: 0, bottom: 0 };

/** Face interior seed in SVG viewBox coords (内侧 / 右下相对外轮廓). */
const FACE_SEED = { x: 430, y: 480 };

const MASK_SIZE = 896;
const OUTLINE = '#2a1f21';

export async function renderAvatarToDataUrl(state, options) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  await drawAvatar(canvas, state, options);
  return canvas.toDataURL('image/png');
}

export async function drawAvatar(canvas, state, options) {
  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width || CANVAS_SIZE, canvas.height || CANVAS_SIZE);
  if (!ctx) return;

  const lookups = buildLookups(options);
  const partFills = resolvePartFills(state.partColors, lookups.palette);
  const bodyFill = partFills.body || '#fff8f2';
  const background = resolveBackground(state.partColors?.background, lookups.backgrounds);
  const layout = computeLayout(size);

  ctx.clearRect(0, 0, size, size);
  drawBackground(ctx, size, background);
  await drawBodyInteriorFill(ctx, layout, bodyFill);
  await drawMomoSvg(ctx, layout, partFills);
}

function buildLookups(options) {
  return {
    palette: Object.fromEntries(options.palette.map((item) => [item.id, item])),
    backgrounds: Object.fromEntries((options.backgrounds || []).map((item) => [item.id, item]))
  };
}

export function resolvePartFills(partColors, paletteLookup) {
  const fills = {};
  for (const [partId, colorId] of Object.entries(partColors || {})) {
    if (partId === 'background') continue;
    fills[partId] = paletteLookup[colorId]?.color || colorId;
  }
  return fills;
}

/** Resolve picker/preview hex for any part including background presets. */
export function resolvePartDisplayHex(partId, value, options) {
  if (partId === 'background') {
    const bg = options.backgrounds?.find((item) => item.id === value);
    if (bg) return bg.palette[1] || bg.palette[0];
  }
  const paletteLookup = Object.fromEntries(options.palette.map((item) => [item.id, item]));
  return paletteLookup[value]?.color || value;
}

function resolveBackground(value, backgroundLookup) {
  const preset = backgroundLookup?.[value];
  if (preset) {
    return {
      id: preset.id,
      label: preset.label,
      palette: preset.palette
    };
  }
  const color = value || '#ff6f9f';
  return {
    id: 'custom',
    label: '自定义',
    color,
    palette: gradientFromHex(color)
  };
}

function computeLayout(size) {
  const padL = size * PAD.left;
  const padT = size * PAD.top;
  const padR = size * PAD.right;
  const padB = size * PAD.bottom;
  const availW = size - padL - padR;
  const availH = size - padT - padB;
  const scale = Math.min(availW / CONTENT.w, availH / CONTENT.h);
  const drawW = CONTENT.w * scale;
  const drawH = CONTENT.h * scale;
  return {
    drawW,
    drawH,
    dx: size - padR - drawW,
    dy: size - padB - drawH
  };
}

function drawBackground(ctx, size, background) {
  const stops = background.palette;
  if (stops?.length >= 2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, stops[0]);
    gradient.addColorStop(0.55, stops[1] || stops[0]);
    gradient.addColorStop(1, stops[2] || stops[1] || stops[0]);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = background.color || '#ff6f9f';
  }
  ctx.fillRect(0, 0, size, size);
}

/**
 * Fill only the interior of path 1 (data-part="body").
 * Body path is an outline ribbon that seals against the SVG bottom/right edges;
 * flood from the face seed paints the 内侧 region without using other paths.
 */
async function drawBodyInteriorFill(ctx, layout, bodyFill) {
  const bodySvg = buildBodyOnlySvg();
  const ringImg = await loadImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(bodySvg)}`
  );

  const mask = document.createElement('canvas');
  mask.width = MASK_SIZE;
  mask.height = MASK_SIZE;
  const mctx = mask.getContext('2d', { willReadFrequently: true });
  if (!mctx) return;

  // Draw full viewBox so path-1 edges that kiss x/y=897 stay sealed to the mask border.
  mctx.clearRect(0, 0, MASK_SIZE, MASK_SIZE);
  mctx.drawImage(ringImg, 0, 0, 896, 896, 0, 0, MASK_SIZE, MASK_SIZE);

  const image = mctx.getImageData(0, 0, MASK_SIZE, MASK_SIZE);
  const data = image.data;
  binarize(data);

  const seed = findInteriorSeed(data, MASK_SIZE);
  if (!seed) return;

  const filled = floodFill(data, MASK_SIZE, seed.x, seed.y, 2);
  // Top-left is exterior; if the fill reached it, the outline leaked — skip.
  if (data[3] === 2 || filled < MASK_SIZE * MASK_SIZE * 0.05) return;

  // Grow fill into the outline ribbon so cream meets the dark stroke with no gap;
  // the SVG outline draws on top and covers that overlap (no visible overflow).
  dilateMarker(data, MASK_SIZE, 2, 2);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 2) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    } else {
      data[i + 3] = 0;
    }
  }

  mctx.putImageData(image, 0, 0);
  mctx.globalCompositeOperation = 'source-in';
  mctx.fillStyle = bodyFill;
  mctx.fillRect(0, 0, MASK_SIZE, MASK_SIZE);

  // Map the CONTENT window of the mask onto the layout rect.
  const sx = (CONTENT.x / 896) * MASK_SIZE;
  const sy = (CONTENT.y / 896) * MASK_SIZE;
  const sw = (CONTENT.w / 896) * MASK_SIZE;
  const sh = (CONTENT.h / 896) * MASK_SIZE;

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(mask, sx, sy, sw, sh, layout.dx, layout.dy, layout.drawW, layout.drawH);
}

async function drawMomoSvg(ctx, layout, partFills) {
  const coloredSvg = colorizeMomoSvg(momoBaseSvg, partFills);
  const img = await loadImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(coloredSvg)}`
  );
  ctx.drawImage(
    img,
    CONTENT.x,
    CONTENT.y,
    CONTENT.w,
    CONTENT.h,
    layout.dx,
    layout.dy,
    layout.drawW,
    layout.drawH
  );
}

/** Path 1 only — data-part="body". */
function buildBodyOnlySvg() {
  const match = momoBaseSvg.match(/<path\b(?=[^>]*\bdata-part="body")[\s\S]*?\/>/i);
  if (!match) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="896" height="896" viewBox="0 0 896 896"></svg>`;
  }
  let body = match[0].replace(/\bfill="[^"]*"/i, 'fill="#000000"');
  body = body.replace(/\bstroke="[^"]*"/i, 'stroke="none"');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="896" height="896" viewBox="0 0 896 896">${body}</svg>`;
}

function colorizeMomoSvg(raw, partFills) {
  const sized = raw.replace(/\bwidth="100%"/i, 'width="896" height="896"');
  return sized.replace(/<path\b(?=[^>]*\bdata-part="([^"]+)")[\s\S]*?\/>/gi, (full, partId) => {
    const fill = partId === 'body' ? OUTLINE : partFills[partId];
    if (!fill) return full;
    return full.replace(/\bfill="[^"]*"/i, `fill="${fill}"`);
  });
}

function findInteriorSeed(data, size) {
  const preferredX = Math.round((FACE_SEED.x / 896) * size);
  const preferredY = Math.round((FACE_SEED.y / 896) * size);
  const candidates = [[preferredX, preferredY]];
  for (let r = 4; r <= 64; r += 4) {
    candidates.push(
      [preferredX + r, preferredY],
      [preferredX - r, preferredY],
      [preferredX, preferredY + r],
      [preferredX, preferredY - r],
      [preferredX + r, preferredY + r],
      [preferredX - r, preferredY - r],
      [preferredX + r, preferredY - r],
      [preferredX - r, preferredY + r]
    );
  }
  for (const [x, y] of candidates) {
    if (x < 1 || y < 1 || x >= size - 1 || y >= size - 1) continue;
    if (data[(y * size + x) * 4 + 3] === 0) return { x, y };
  }
  return null;
}

function floodFill(data, size, startX, startY, marker) {
  const start = (startY * size + startX) * 4;
  if (data[start + 3] !== 0) return 0;

  const stackX = new Int32Array(size * size);
  const stackY = new Int32Array(size * size);
  let top = 0;
  let count = 0;
  stackX[top] = startX;
  stackY[top] = startY;
  top += 1;

  while (top > 0) {
    top -= 1;
    const x = stackX[top];
    const y = stackY[top];
    if (x < 0 || y < 0 || x >= size || y >= size) continue;
    const i = (y * size + x) * 4;
    if (data[i + 3] !== 0) continue;

    let left = x;
    while (left > 0 && data[(y * size + left - 1) * 4 + 3] === 0) left -= 1;
    let right = x;
    while (right < size - 1 && data[(y * size + right + 1) * 4 + 3] === 0) right += 1;

    for (let px = left; px <= right; px += 1) {
      const pi = (y * size + px) * 4;
      data[pi] = 0;
      data[pi + 1] = 0;
      data[pi + 2] = 0;
      data[pi + 3] = marker;
      count += 1;

      if (y > 0 && data[((y - 1) * size + px) * 4 + 3] === 0) {
        stackX[top] = px;
        stackY[top] = y - 1;
        top += 1;
      }
      if (y < size - 1 && data[((y + 1) * size + px) * 4 + 3] === 0) {
        stackX[top] = px;
        stackY[top] = y + 1;
        top += 1;
      }
    }
  }

  return count;
}

function binarize(data) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 10) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    } else {
      data[i + 3] = 0;
    }
  }
}

/** Expand filled interior into neighboring barrier pixels so cream meets the outline. */
function dilateMarker(data, size, marker, radius) {
  const copy = new Uint8ClampedArray(data);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      if (copy[i + 3] === marker) continue;
      let hit = false;
      for (let dy = -radius; dy <= radius && !hit; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          if (copy[(ny * size + nx) * 4 + 3] === marker) {
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = marker;
      }
    }
  }
}
