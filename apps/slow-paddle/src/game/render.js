import { textSprite, numberSprite } from '../ui/pixel.js';
import { DECOR, ENCOUNTERS, currentX } from './journey.js';
import { CHARACTERS, THEMES, SKINS, ITEMS, riverAt } from './data.js';

function rect(c, color, x, y, w, h) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function line(c, color, x, y, w) { rect(c, color, x, y, w, 1); }
function noise(n) { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); }

function pine(c, x, y, size, theme) {
  c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(size, size);
  rect(c, '#797f59', -2, -2, 4, 9);
  [[-3,-30,6,4],[-6,-26,12,5],[-9,-21,18,5],[-12,-16,24,5],[-14,-11,28,5]].forEach(r => rect(c, theme.tree, ...r));
  [[0,-26,5,5],[1,-21,8,5],[1,-16,11,5],[1,-11,13,5]].forEach(r => rect(c, theme.shade, ...r));
  rect(c, theme.light, -5, -24, 3, 2); rect(c, theme.light, -8, -15, 4, 2);
  c.restore();
}
function flower(c, x, y, color = '#fae9b2') {
  rect(c, '#648766', x, y, 1, 7);
  rect(c, color, x - 2, y, 5, 2); rect(c, color, x - 1, y - 1, 3, 4);
  rect(c, '#e4b36e', x, y, 1, 1);
}
function drawBoardSprite(c, skin, id) {
  rect(c, '#387f79', 9, 37, 23, 5);
  if (skin.shape === 'twin') {
    rect(c, skin.color, 9, 8, 7, 34); rect(c, skin.color, 24, 8, 7, 34);
    rect(c, skin.stripe, 11, 12, 3, 24); rect(c, skin.stripe, 26, 12, 3, 24);
    rect(c, '#f4d9a1', 13, 17, 14, 4); rect(c, '#f4d9a1', 13, 29, 14, 4);
    rect(c, '#8e4f4b', 9, 36, 7, 4); rect(c, '#8e4f4b', 24, 36, 7, 4);
  } else if (skin.shape === 'arrow') {
    rect(c, skin.color, 17, 5, 7, 39); rect(c, skin.color, 13, 10, 15, 29); rect(c, skin.color, 10, 17, 21, 15);
    rect(c, skin.stripe, 18, 8, 5, 28); rect(c, '#435f82', 12, 19, 17, 5); rect(c, '#435f82', 15, 30, 11, 4);
    rect(c, '#fff0ba', 19, 13, 3, 3); rect(c, '#fff0ba', 15, 24, 3, 3); rect(c, '#fff0ba', 24, 27, 2, 2);
  } else {
    rect(c, skin.color, 16, 5, 9, 39); rect(c, skin.color, 13, 12, 15, 27);
    rect(c, skin.stripe, 19, 8, 3, 31); rect(c, '#b78655', 14, 18, 13, 3); rect(c, '#f7e2b0', 15, 28, 11, 4);
  }
  rect(c, id === 2 ? '#d9dfb1' : '#735f49', 31, 14, 2, 27); rect(c, skin.stripe, 29, 33, 6, 9);
}
function drawCharacterSprite(c, character) {
  const main = character.color, accent = character.accent, dark = '#365850';
  if (character.shape === 'crab') {
    rect(c, main, 10, 15, 20, 11); rect(c, main, 7, 12, 5, 8); rect(c, main, 28, 12, 5, 8);
    rect(c, accent, 13, 13, 5, 4); rect(c, accent, 22, 13, 5, 4); rect(c, dark, 15, 14, 2, 2); rect(c, dark, 23, 14, 2, 2);
    rect(c, main, 12, 26, 4, 5); rect(c, main, 24, 26, 4, 5);
  } else if (character.shape === 'fish') {
    rect(c, main, 9, 13, 22, 12); rect(c, main, 6, 10, 6, 18); rect(c, accent, 14, 12, 10, 4);
    rect(c, dark, 27, 16, 2, 2); rect(c, accent, 17, 25, 6, 4);
  } else if (character.shape === 'frog') {
    rect(c, main, 10, 12, 20, 14); rect(c, main, 11, 8, 7, 7); rect(c, main, 23, 8, 7, 7);
    rect(c, accent, 13, 10, 3, 3); rect(c, accent, 25, 10, 3, 3); rect(c, dark, 14, 10, 2, 2); rect(c, dark, 26, 10, 2, 2);
    rect(c, accent, 15, 20, 11, 3); rect(c, main, 8, 25, 7, 5); rect(c, main, 26, 25, 7, 5);
  } else if (character.shape === 'turtle') {
    rect(c, main, 8, 16, 24, 12); rect(c, main, 11, 13, 18, 18); rect(c, accent, 14, 16, 12, 11);
    rect(c, dark, 18, 16, 2, 11); rect(c, dark, 14, 20, 12, 2); rect(c, main, 31, 19, 5, 6); rect(c, dark, 33, 20, 1, 1);
  } else if (character.shape === 'whale') {
    rect(c, main, 7, 14, 26, 13); rect(c, main, 10, 11, 18, 18); rect(c, main, 4, 10, 6, 7); rect(c, main, 4, 24, 6, 7);
    rect(c, accent, 17, 21, 13, 4); rect(c, dark, 28, 15, 2, 2); rect(c, accent, 17, 7, 2, 5); rect(c, accent, 21, 8, 2, 4);
  } else {
    rect(c, '#f0bb8a', 15, 11, 11, 10); rect(c, '#334f50', 15, 11, 11, 5);
    rect(c, main, 13, 20, 15, 11); rect(c, accent, 16, 19, 9, 5); rect(c, '#48574b', 12, 8, 17, 4); rect(c, main, 15, 5, 11, 5);
  }
}
export function makeSprites() {
  const sprites = {};
  const make = (name, draw) => { const c = document.createElement('canvas'); c.width = 40; c.height = 48; draw(c.getContext('2d')); sprites[name] = c; };
  SKINS.forEach((skin, id) => make('board' + id, c => drawBoardSprite(c, skin, id)));
  CHARACTERS.forEach((character, id) => make('character' + id, c => drawCharacterSprite(c, character)));
  make('currency', c => {
    c.translate(11, 15); rect(c, '#507d72', 0, 16, 18, 2); rect(c, '#f0d39a', 2, 5, 14, 11); rect(c, '#f0d39a', 0, 9, 18, 5);
    rect(c, '#fff1c6', 3, 5, 2, 8); rect(c, '#fff1c6', 8, 2, 2, 12); rect(c, '#bd8c62', 13, 7, 2, 8);
  });
  ITEMS.forEach(item => make('item' + item.id, c => {
    c.translate(13, 17);
    const tint = ['#fae4b6', '#d8e1a5', '#eec58e', '#aebea6', '#efaa8f', '#bcd6ec'][item.area];
    if (item.kind === 'shell') {
      rect(c, '#578d85', 0, 13, 16, 2); rect(c, tint, 2, 3, 12, 10); rect(c, tint, 0, 7, 16, 4);
      rect(c, '#fff3d5', 3, 3, 2, 7); rect(c, '#fff3d5', 7, 1, 2, 10); rect(c, '#d5ad79', 11, 5, 2, 7);
    } else if (item.kind === 'bottle') {
      rect(c, '#749885', 4, 1, 6, 3); rect(c, '#eff1ce', 5, 4, 4, 3); rect(c, '#c1e4cd', 2, 7, 10, 11);
      rect(c, '#f7eac9', 4, 10, 6, 5); rect(c, '#ffffff', 3, 8, 2, 6);
    } else if (item.kind === 'fish') {
      rect(c, tint, 3, 4, 11, 6); rect(c, tint, 0, 2, 4, 10); rect(c, '#f9efdc', 7, 3, 5, 2);
      rect(c, '#375964', 12, 5, 2, 2); rect(c, tint, 6, 10, 4, 2);
    } else if (item.kind === 'flower') {
      rect(c, '#558f74', 0, 9, 17, 4); rect(c, tint, 4, 2, 9, 11); rect(c, tint, 1, 5, 15, 5);
      rect(c, '#f9f1d3', 5, 1, 3, 5); rect(c, '#dba46c', 6, 6, 5, 3);
    } else if (item.kind === 'leaf') {
      rect(c, '#527d60', 7, 0, 3, 18); rect(c, tint, 1, 3, 8, 7); rect(c, tint, 8, 8, 9, 7); line(c, '#f2e6ae', 4, 7, 10);
    } else if (item.kind === 'feather') {
      rect(c, '#71826c', 7, 1, 2, 18); rect(c, tint, 2, 2, 6, 11); rect(c, tint, 9, 5, 6, 9); line(c, '#fff1c6', 4, 6, 8);
    } else if (item.kind === 'stone') {
      rect(c, '#596f65', 1, 12, 16, 4); rect(c, tint, 3, 5, 12, 9); rect(c, tint, 6, 2, 7, 5); rect(c, '#edf0c8', 6, 4, 5, 2);
    } else {
      rect(c, '#7b6b4d', 7, 2, 3, 5); rect(c, tint, 3, 6, 11, 11); rect(c, tint, 1, 9, 15, 5); rect(c, '#fff0bd', 5, 7, 5, 3);
    }
  }));
  return sprites;
}
export function drawItem(c, sprites, id, x, y, size = 40) { c.drawImage(sprites['item' + id], Math.round(x - size / 2), Math.round(y - size * 0.6), size, size * 1.2); }

let heroSurface;
export function drawHero(c, w, h, themeName, sprites, skin = 0, time = 0, dock = null, character = 0) {
  if (!heroSurface) { heroSurface = document.createElement('canvas'); heroSurface.width = 240; heroSurface.height = 210; }
  paintHero(heroSurface.getContext('2d'), themeName, sprites, skin, time, dock, character);
  c.save(); c.imageSmoothingEnabled = false; c.drawImage(heroSurface, 0, 0, w, h); c.restore();
}
function paintHero(c, themeName, sprites, skin, time, dock, character) {
  const t = THEMES[themeName] || THEMES.day;
  c.save(); c.imageSmoothingEnabled = false;
  rect(c, t.sky, 0, 0, 240, 210);
  // Stepped silhouettes, clouds and reflections keep the illustration pixel-native.
  rect(c, themeName === 'night' ? '#efdba1' : '#fff3ca', 178, 17, 15, 23);
  rect(c, themeName === 'night' ? '#efdba1' : '#fff3ca', 174, 21, 23, 15);
  if (themeName === 'night') rect(c, t.sky, 183, 14, 18, 20);
  for (let x = 0; x < 240; x += 4) {
    const back = Math.round((56 - Math.sin(x / 29) * 13 - Math.sin(x / 17 + 2) * 7) / 4) * 4;
    rect(c, themeName === 'night' ? '#456677' : '#bdcdb2', x, back, 4, 80 - back);
  }
  for (let x = 0; x < 240; x += 4) {
    const front = Math.round((72 - Math.sin(x / 24 + 1) * 7 - Math.sin(x / 43) * 5) / 4) * 4;
    rect(c, themeName === 'night' ? '#517c7b' : '#9cbaa1', x, front, 4, 82 - front);
  }
  [[21,22,31],[106,34,22]].forEach(a => { rect(c, themeName === 'night' ? '#456274' : '#f9f5df', a[0], a[1], a[2], 4); rect(c, themeName === 'night' ? '#456274' : '#f9f5df', a[0] + 5, a[1] - 3, a[2] - 11, 3); });
  rect(c, t.water, 0, 79, 240, 131);
  for (let i = 0; i < 90; i++) {
    const x = noise(i + 17) * 240, y = 80 + noise(i + 83) * 130;
    line(c, i % 4 === 0 ? t.light : t.deep, x + Math.sin(time + i) * 2, y, 3 + noise(i) * 11);
  }
  // Far island, landing pier and near banks.
  rect(c, t.sand, 17, 86, 70, 4); rect(c, t.land, 25, 80, 59, 6);
  [32,47,64,74].forEach((x, i) => pine(c, x, 81, 0.45 + (i % 2) * 0.18, t));
  [[194,98,46,7],[205,93,35,7],[221,86,19,10]].forEach(r => rect(c, t.sand, ...r));
  rect(c, t.land, 213, 88, 27, 11); pine(c, 227, 91, 0.8, t);
  rect(c, '#866e4e', 201, 96, 6, 23); rect(c, '#e1c18b', 198, 98, 13, 5); rect(c, '#e1c18b', 198, 105, 13, 5); rect(c, '#e1c18b', 198, 112, 13, 5);
  [[0,164,25,46],[0,176,39,34],[0,191,57,19],[217,178,23,32],[196,194,44,16]].forEach(r => rect(c, t.sand, ...r));
  [[0,171,20,39],[0,186,36,24],[0,199,51,11],[225,184,15,26],[205,201,35,9]].forEach(r => rect(c, t.land, ...r));
  pine(c, 11, 175, 1.25, t); pine(c, 24, 194, 1, t); pine(c, 237, 198, 1.25, t);
  flower(c, 36, 200); flower(c, 43, 205, '#f4c4a1');
  const bob = Math.round(Math.sin(time * 1.5) * 1.5);
  for (let i = 0; i < 4; i++) line(c, t.light, 108 - i * 2, 164 + i * 4 + bob, 20 + i * 4);
  c.drawImage(sprites['board' + skin], 97, 115 + bob);
  c.drawImage(sprites['character' + character], 97, 115 + bob);
  rect(c, '#f6efd0', 158, 125, 8, 4); rect(c, '#f6efd0', 164, 122, 4, 5); rect(c, '#d8ad63', 168, 125, 3, 2);
  if (themeName === 'night') for (let i = 0; i < 15; i++) rect(c, '#d9e0c2', noise(i + 180) * 240, noise(i + 300) * 42, 1, 1);
  if (dock) drawDock(c, dock);
  c.restore();
}

export function drawRun(c, width, height, run, themeName, sprites, skin, character, low = false) {
  const t = THEMES[themeName], anchor = height * 0.72, distance = run.distance;
  rect(c, t.water, 0, 0, width, height);
  const worldAt = y => distance + anchor - y;
  // River geometry is shared with physics, including the actual island split.
  for (let y = 0; y < height; y += 4) {
    const world = worldAt(y) - run.segmentStart;
    const r = riverAt(world, run.level);
    rect(c, t.deep, 0, y, r.left + 4, 4); rect(c, t.sand, 0, y, r.left, 4); rect(c, t.land, 0, y, r.left - 5, 4);
    rect(c, t.deep, r.right - 4, y, width - r.right + 4, 4); rect(c, t.sand, r.right, y, width - r.right, 4); rect(c, t.land, r.right + 5, y, width - r.right, 4);
    if (r.island) {
      rect(c, t.deep, r.island.x - r.island.radius - 3, y, r.island.radius * 2 + 6, 4);
      rect(c, t.sand, r.island.x - r.island.radius, y, r.island.radius * 2, 4);
      if (r.island.radius > 6) rect(c, t.land, r.island.x - r.island.radius + 4, y, r.island.radius * 2 - 8, 4);
    }
  }
  const first = Math.floor((distance - height) / 35);
  // Distant trees drift more slowly than the bank; foreground reeds move faster.
  for (let i = 0; i < Math.ceil(height / 60) + 2; i++) {
    const y = ((i * 60 + distance * 0.72) % (height + 90)) - 40;
    const r = riverAt(worldAt(y) - run.segmentStart, run.level);
    pine(c, i % 2 ? r.right + 28 : r.left - 28, y, 0.5, t);
    if (!low) {
      const ry = ((i * 65 + distance * 1.06) % (height + 70)) - 20;
      const rr = riverAt(worldAt(ry) - run.segmentStart, run.level);
      rect(c, t.tree, rr.right + 3, ry, 1, 12);
      rect(c, t.tree, rr.right + 6, ry + 3, 1, 9);
      rect(c, '#c1ab75', rr.right + 2, ry - 2, 3, 4);
    }
  }
  for (let j = first; j < first + Math.ceil(height * 2 / 35) + 4; j++) {
    const wy = j * 35, y = anchor - (wy - distance), r = riverAt(wy - run.segmentStart, run.level);
    if (y < -45 || y > height + 40) continue;
    for (let i = 0; i < (low ? 2 : 5); i++) {
      const x = r.left + 8 + noise(j * 9 + i) * (r.right - r.left - 16);
      if (!r.island || Math.abs(x - r.island.x) > r.island.radius + 8) line(c, i === 0 ? t.light : t.deep, x + Math.sin(run.time + i) * 2, y + i * 4, 4 + noise(j + i) * 10);
    }
    const side = j % 2 === 0;
    pine(c, side ? r.left - 13 : r.right + 15, y, 0.7 + noise(j) * 0.5, t);
    if (j % 3 === 0) flower(c, r.left - 6, y + 6);
    if (r.island && r.island.radius > 20 && j % 3 === 0) pine(c, r.island.x, y, 0.55, t);
  }
  drawJourney(c, height, run, t, low);
  drawWeather(c, width, height, run, t, low);
  run.entities.forEach(e => {
    const x = e.x, y = anchor - (e.y - distance);
    if (e.taken || y < -40 || y > height + 40) return;
    if (e.kind === 'collect' || e.kind === 'currency') {
      line(c, t.light, x - 8, y + 8, 16);
      if (e.kind === 'currency') c.drawImage(sprites.currency, Math.round(x - 16), Math.round(y - 19 + Math.sin(run.time * 2 + e.y) * 1.2), 32, 38);
      else drawItem(c, sprites, e.item, x, y + Math.sin(run.time * 2 + e.y) * 1.2, 32);
      if (!low && Math.sin(run.time * 3 + e.y) > 0.6) { line(c, '#fff3ca', x + 11, y - 10, 5); rect(c, '#fff3ca', x + 13, y - 12, 1, 5); }
    } else if (e.kind === 'log') {
      rect(c, t.deep, x - 16, y + 6, 34, 4); rect(c, '#947b58', x - 15, y - 4, 30, 10);
      rect(c, '#c1a471', x - 12, y - 4, 25, 3); rect(c, '#e3c391', x - 15, y - 3, 4, 8);
      rect(c, '#7e694d', x + 2, y - 8, 4, 6); line(c, '#6e674e', x - 5, y + 3, 15);
    } else if (e.kind === 'rock') {
      rect(c, t.deep, x - 15, y + 7, 31, 4); rect(c, '#858b80', x - 12, y - 6, 25, 14);
      rect(c, '#a8ad97', x - 8, y - 11, 17, 9); rect(c, '#c5c6a8', x - 7, y - 11, 11, 3);
      rect(c, '#697b73', x + 4, y - 1, 9, 9);
    } else if (e.kind === 'shoal') {
      c.globalAlpha = 0.6; rect(c, t.sand, x - 19, y - 14, 38, 28); rect(c, t.sand, x - 25, y - 7, 50, 14); c.globalAlpha = 1;
      for (let i = 0; i < 7; i++) rect(c, '#c5b888', x - 16 + noise(i) * 30, y - 10 + noise(i + 8) * 20, 3, 2);
    } else if (e.kind === 'weed') {
      for (let i = 0; i < 5; i++) { rect(c, '#6d9d75', x - 20 + i * 8, y + i % 2 * 7, 10, 6); rect(c, '#92b880', x - 19 + i * 8, y + i % 2 * 7, 5, 2); }
      flower(c, x, y - 2, '#f1d9b2');
    } else if (e.kind === 'vortex') {
      c.save(); c.translate(x, y); c.rotate(run.time * 0.7); c.strokeStyle = t.light; c.lineWidth = 1;
      c.beginPath(); for (let i = 0; i < 50; i++) { const a = i * 0.24, r = i * 0.4; c.lineTo(Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r * 0.6)); } c.stroke(); c.restore();
    } else if (e.kind === 'wind') {
      for (let i = 0; i < 4; i++) line(c, t.light, 50 + ((run.time * 24 + i * 29) % 120), y - 15 + i * 10, 20);
    } else if (e.kind === 'duck') {
      line(c, t.light, x - 10, y + 6, 20); rect(c, '#f4e7bb', x - 7, y - 2, 12, 6); rect(c, '#f4e7bb', x + 2, y - 7, 6, 7);
      rect(c, '#d89961', x + 8, y - 3, 4, 2); rect(c, '#4d6557', x + 5, y - 5, 1, 1);
    }
  });
  if (run.mode === 'level') {
    const y = anchor - (run.segmentEnd - distance);
    if (y > -20 && y < height) {
      for (let i = 0; i < 18; i++) rect(c, i % 2 ? t.light : '#f7e9ba', 32 + i * 10, y, 8, 3);
      rect(c, '#f1e2b5', 210, y - 39, 10, 34); rect(c, '#d89372', 209, y - 24, 12, 7);
      rect(c, '#f7d88e', 211, y - 42, 8, 7); rect(c, '#567d70', 208, y - 45, 14, 3);
    }
  }
  if (run.journey.glide > 0 || run.tideBoost > 0) for (let i = 0; i < (low ? 5 : 12); i++) {
    const offset = (run.time * 50 + i * 11) % 70;
    rect(c, run.tideBoost > 0 && i % 2 ? '#fff0a9' : '#c9f1d6', run.x + Math.sin(i * 3) * (9 + offset / 3), anchor + 15 + offset, 2, 4);
  }
  for (let i = 0; i < 5; i++) line(c, t.light, run.x - 5 - i * 2, anchor + 21 + i * 5 + Math.sin(run.time * 3) * 2, 10 + i * 4);
  c.save(); c.translate(Math.round(run.x), Math.round(anchor)); c.rotate(run.vx * 0.002);
  c.globalAlpha = run.cooldown > 0 ? 0.72 + Math.sin(run.time * 15) * 0.18 : 1;
  c.drawImage(sprites['board' + skin], -20, -26); c.drawImage(sprites['character' + character], -20, -26); c.restore();
  if (run.mode === 'free' && run.cooldown > 1.65) { c.globalAlpha = (run.cooldown - 1.65) * 0.45; rect(c, '#d79171', 0, 0, width, height); c.globalAlpha = 1; }
  if (!low) run.particles.forEach(p => rect(c, '#fff2bf', p.x, anchor - (p.y - distance) - (0.7 - p.life) * 20, 2, 2));
}

function drawWeather(c, width, height, run, theme, low) {
  if (!run.weather) return;
  const amount = low ? 5 : 11;
  if (run.weather.id === 'clear') {
    for (let i = 0; i < amount; i++) {
      const x = noise(i + 501) * width, y = (noise(i + 611) * height + run.time * 7) % height;
      if (Math.sin(run.time * 2 + i) > 0.35) rect(c, '#fff2b8', x, y, 2, 1);
    }
  } else if (run.weather.id === 'breeze') {
    c.globalAlpha = 0.45;
    for (let i = 0; i < amount; i++) {
      const x = (noise(i + 701) * width + run.time * 22 + i * 17) % (width + 30) - 15;
      const y = noise(i + 721) * height;
      line(c, theme.light, x, y, 10 + i % 3 * 5);
    }
    c.globalAlpha = 1;
  } else if (run.weather.id === 'drizzle') {
    c.globalAlpha = 0.38;
    for (let i = 0; i < amount + 4; i++) {
      const x = (noise(i + 801) * width + run.time * 13) % width;
      const y = (noise(i + 851) * height + run.time * 38) % height;
      rect(c, '#d9eee1', x, y, 1, 6);
    }
    c.globalAlpha = 1;
  } else if (run.weather.id === 'mist') {
    c.globalAlpha = low ? 0.08 : 0.13;
    for (let i = 0; i < 4; i++) {
      const y = (i * 91 + run.time * (i % 2 ? 3 : -3)) % (height + 50) - 25;
      rect(c, '#eef1d7', -12, y, width + 24, 18);
    }
    c.globalAlpha = 1;
  }
}

export function postcard(result, theme, sprites, skin, character) {
  if (result.mode === 'free') return challengePostcard(result, theme, sprites, skin, character);
  // Compose on the game's pixel grid, then scale once without smoothing.
  const small = document.createElement('canvas'); small.width = 240; small.height = 320;
  const c = small.getContext('2d'); c.imageSmoothingEnabled = false;
  const t = THEMES[theme] || THEMES.day;
  rect(c, '#d7dfba', 0, 0, 240, 320);
  rect(c, '#738c66', 6, 4, 228, 312); rect(c, '#738c66', 4, 6, 232, 308);
  rect(c, '#eef0d3', 7, 7, 226, 306);
  const label = (text, y, size = 9, color = '#4d6b50') => {
    const bitmap = textSprite(text, size, color); c.drawImage(bitmap, Math.round((240 - bitmap.width) / 2), y);
  };
  label('慢桨', 15, 20);
  line(c, '#bdcba1', 112, 48, 16);
  c.save(); c.translate(10, 59); drawHero(c, 220, 184, theme, sprites, skin, 2, result.dock, character); c.restore();
  rect(c, t.light, 10, 241, 220, 2);
  label(result.mode === 'free' ? '自在漂流' : result.name, 248, 18);
  const stats = numberSprite(`${result.count} / ${result.seconds}s`);
  const statsX = Math.round((240 - stats.width - 18) / 2);
  drawItem(c, sprites, 0, statsX + 7, 302, 18); c.drawImage(stats, statsX + 18, 295);
  if (result.mode === 'free') { const distance = numberSprite(`${result.distance}m`, '#8a966e'); c.drawImage(distance, Math.round((240 - distance.width) / 2), 277); }
  else for (let i = 0; i < 3; i++) {
    const x = 106 + i * 12, y = 283, color = i < result.stars ? '#b6924f' : '#cad2ad';
    rect(c, color, x + 3, y, 2, 2); rect(c, color, x, y + 2, 8, 2);
    rect(c, color, x + 2, y + 4, 4, 2); rect(c, color, x + 1, y + 6, 2, 2); rect(c, color, x + 5, y + 6, 2, 2);
  }
  const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 960;
  const out = canvas.getContext('2d'); out.imageSmoothingEnabled = false; out.drawImage(small, 0, 0, 720, 960);
  return canvas;
}


function challengePostcard(result, theme, sprites, skin, character) {
  const small = document.createElement('canvas'); small.width = 240; small.height = 320;
  const c = small.getContext('2d'); c.imageSmoothingEnabled = false;
  rect(c, '#d7dfba', 0, 0, 240, 320); rect(c, '#738c66', 4, 6, 232, 308); rect(c, '#738c66', 6, 4, 228, 312); rect(c, '#eef0d3', 7, 7, 226, 306);
  const label = (text, y, size, color = '#4d6b50') => { const bitmap = textSprite(text, size, color); c.drawImage(bitmap, Math.round((240 - bitmap.width) / 2), y); };
  label('慢桨', 12, 20);
  label(result.newRecord ? '挑战漂流 · 新纪录' : '挑战漂流', 43, 12);
  c.save(); c.translate(10, 72); drawHero(c, 220, 139, theme, sprites, skin, 2, result.dock, character); c.restore();
  const distance = numberSprite(`${result.distance}m`, '#42684e');
  const zoom = Math.min(2.5, 200 / distance.width);
  c.drawImage(distance, Math.round((240 - distance.width * zoom) / 2), 228, Math.round(distance.width * zoom), Math.round(distance.height * zoom));
  label('个人最佳', 268, 12, '#819267');
  const best = numberSprite(`${result.bestDistance || result.distance}m`, '#819267');
  c.drawImage(best, Math.round((240 - best.width) / 2), 294);
  const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 960;
  const out = canvas.getContext('2d'); out.imageSmoothingEnabled = false; out.drawImage(small, 0, 0, 720, 960);
  return canvas;
}


function tinyDuck(c, x, y) {
  rect(c, '#fff0bc', x - 6, y - 2, 11, 5); rect(c, '#fff0bc', x + 2, y - 6, 5, 5);
  rect(c, '#d99b5c', x + 7, y - 3, 3, 2); rect(c, '#426854', x + 4, y - 5, 1, 1);
}
export function drawDock(c, dock) {
  rect(c, '#5c8270', 55, 181, 132, 29);
  rect(c, '#796b4b', 60, 167, 6, 40); rect(c, '#796b4b', 181, 167, 6, 40);
  for (let i = 0; i < 6; i++) { rect(c, '#d0ad76', 57, 171 + i * 6, 129, 5); line(c, '#ead097', 60, 171 + i * 6, 122); }
  DECOR.forEach((d, i) => {
    if (!dock.equipped[i]) return;
    drawDecoration(c, i, d.x, d.y);
  });
}
export function drawDecoration(c, i, x, y) {
    if (i === 0) {
      rect(c, '#745e48', x - 6, y - 10, 3, 18); rect(c, '#745e48', x + 6, y - 10, 3, 18);
      rect(c, '#f1d6a0', x - 7, y - 9, 17, 5); rect(c, '#edbd81', x - 7, y, 17, 4);
    } else if (i === 1) {
      rect(c, '#bd8263', x - 5, y - 1, 11, 8); rect(c, '#edb788', x - 6, y - 2, 13, 3);
      flower(c, x - 2, y - 10, '#fff1bd'); flower(c, x + 3, y - 8, '#efb7af');
    } else if (i === 2) {
      rect(c, '#735f49', x, y - 27, 2, 31); rect(c, '#eaa782', x + 2, y - 26, 14, 7); rect(c, '#f6d5a3', x + 2, y - 23, 8, 2);
    } else if (i === 3) tinyDuck(c, x, y);
    else if (i === 4) {
      rect(c, '#619483', x - 4, y - 8, 9, 12); rect(c, '#bde6ce', x - 3, y - 7, 7, 10); rect(c, '#f8e8bd', x - 1, y - 5, 3, 6); rect(c, '#b19164', x - 2, y - 11, 5, 3);
    } else {
      rect(c, '#6b7253', x, y - 22, 2, 27); rect(c, '#6b7253', x - 9, y - 22, 11, 2);
      rect(c, '#f3d98a', x - 11, y - 18, 8, 10); rect(c, '#fff0b6', x - 9, y - 16, 4, 6); line(c, '#758157', x - 11, y - 19, 8);
    }
}

function drawJourney(c, height, run, theme, low) {
  const j = run.journey, anchor = height * 0.72, sy = y => anchor - (y - run.distance);
  j.currents.forEach(current => {
    for (let wy = current.start; wy <= current.end; wy += 12) {
      const y = sy(wy); if (y < -12 || y > height + 12) continue;
      const x = currentX(run, current, wy);
      c.globalAlpha = current.used ? 0.10 : 0.26;
      rect(c, '#c8eed4', x - 15, y, 30, 10); rect(c, '#c8eed4', x - 18, y + 3, 36, 4); c.globalAlpha = 1;
      if (Math.round((wy - current.start) / 12) % 3 === 0) {
        rect(c, '#f9efc0', x - 2, y + 2, 4, 2); rect(c, '#f9efc0', x - 5, y + 4, 3, 2); rect(c, '#f9efc0', x + 2, y + 4, 3, 2);
      }
    }
  });
  j.encountersNow.forEach(e => {
    const y = sy(e.y), x = e.x;
    if (e.type === 0) {
      if (e.stage === 'following') tinyDuck(c, run.x - 16, anchor + 30 + Math.sin(run.time * 3) * 2);
      else if (!e.done && y > -30 && y < height + 30) tinyDuck(c, x, y);
      const familyY = sy(e.y + 130);
      if (familyY > -30 && familyY < height + 30) for (let i = 0; i < (e.done ? 4 : 3); i++) tinyDuck(c, x + i * 12 - 12, familyY + i % 2 * 8);
    }
    if (y < -110 || y > height + 110) return;
    if (e.type === 1 && !e.done) {
      rect(c, '#e7f0ce', x - 5, y - 7, 10, 15); rect(c, '#9d8760', x - 3, y - 11, 6, 4); rect(c, '#d0b178', x - 2, y - 3, 5, 7);
      rect(c, '#fff7d2', x + 9, y - 15, 2, 7); line(c, '#fff7d2', x + 7, y - 12, 6);
    } else if (e.type === 2) {
      c.globalAlpha = 0.18; rect(c, '#304d60', x - 43, y - 90, 86, 180); c.globalAlpha = 1;
      for (let i = 0; i < (low ? 10 : 22); i++) {
        const fx = x + Math.sin(i * 7 + run.time * 0.4) * 36, fy = y - 80 + noise(i + 60) * 160;
        rect(c, Math.sin(run.time * 2 + i) > 0 ? '#fff5ad' : '#a6d293', fx, fy, 2, 2);
      }
    } else if (e.type === 3) {
      rect(c, '#756747', x - 18, y - 14, 4, 33); rect(c, '#756747', x + 12, y - 14, 4, 33);
      for (let i = 0; i < 5; i++) rect(c, '#d9b681', x - 20, y - 12 + i * 6, 38, 5);
      flower(c, x - 14, y - 17); rect(c, '#f8e5b0', x - 4, y - 5, 10, 6);
    }
    if (!e.done && e.stage !== 'following' && y > 12 && y < anchor + 50) {
      c.font = '7px sans-serif'; c.textAlign = 'center';
      rect(c, '#f4eed3', x - 27, y - (e.type === 2 ? 103 : 29), 54, 12);
      c.fillStyle = '#3e6656'; c.fillText(ENCOUNTERS[e.type].name, x, y - (e.type === 2 ? 95 : 21));
    }
  });
}
