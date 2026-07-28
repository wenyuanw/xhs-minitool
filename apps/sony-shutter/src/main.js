import './styles/app.css';
import { parseImageExif } from './lib/exif.js';
import { extractSonyShutterCount } from './lib/sony.js';
import {
  formatCount,
  formatDateTime,
  formatExposureProgram,
  formatExposureTime,
  formatFNumber,
  formatFocal,
  formatIso,
  formatLife,
  formatMetering,
  formatWhiteBalance,
} from './lib/format.js';
import { showToast } from './lib/toast.js';

const page = document.querySelector('#page');

/** @type {string | null} */
let previewUrl = null;

page.innerHTML = `
  <header class="tool-brand">
    <div class="brand-mark" aria-hidden="true">
      <svg class="brand-mark__ring" viewBox="0 0 96 96" width="88" height="88">
        <circle cx="48" cy="48" r="44" fill="none" stroke="currentColor" stroke-width="2.5" opacity="0.35"/>
        <circle cx="48" cy="48" r="32" fill="none" stroke="currentColor" stroke-width="2.5" opacity="0.55"/>
        <circle cx="48" cy="48" r="20" fill="none" stroke="currentColor" stroke-width="2.5" opacity="0.75"/>
        <circle cx="48" cy="48" r="8" fill="currentColor"/>
        <path d="M48 4v8M48 84v8M4 48h8M84 48h8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
      </svg>
    </div>
    <h1 class="tool-brand__title">索尼快门</h1>
    <p class="tool-brand__desc">本地读取快门次数与拍摄信息</p>
  </header>

  <section class="upload" aria-label="选择照片">
    <input id="file-input" class="upload__input" type="file" accept="image/*" />
    <label for="file-input" class="upload__hit" id="upload-hit">
      <span class="upload__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M12 16V4m0 0l-4 4m4-4l4 4"/>
          <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"/>
        </svg>
      </span>
      <span class="upload__title">选择索尼相机照片</span>
      <span class="upload__hint">优先使用相机直出 JPEG；处理全程在本地完成</span>
    </label>
  </section>

  <p class="status" id="status" hidden></p>

  <section class="result" id="result" hidden></section>

  <section class="tips">
    <h2 class="tips__title">使用说明</h2>
    <ul class="tips__list">
      <li>请选择索尼相机原图（直出 JPEG）。经社交软件压缩或重导出的照片，快门次数通常会丢失。</li>
      <li>小工具容器一般只能选图片；ARW 若能选中也可解析，但移动端相册里往往看不到。</li>
      <li>快门次数来自 MakerNote 加密字段，不同机型偏移不同；未知机型会尝试常见偏移。</li>
      <li>电子快门／静音拍摄可能不增加机械快门计数。</li>
    </ul>
  </section>
`;

const fileInput = document.querySelector('#file-input');
const statusEl = document.querySelector('#status');
const resultEl = document.querySelector('#result');
const uploadHit = document.querySelector('#upload-hit');

fileInput?.addEventListener('change', () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  void handleFile(file);
  fileInput.value = '';
});

/**
 * @param {File} file
 */
async function handleFile(file) {
  setStatus('正在本地解析…');
  resultEl.hidden = true;
  resultEl.innerHTML = '';
  revokePreview();

  try {
    if (!file.type.startsWith('image/') && !/\.(jpe?g|arw|dng|tif{1,2})$/i.test(file.name)) {
      setStatus('请选择图片文件（建议索尼直出 JPEG）。');
      showToast('不支持的文件类型');
      return;
    }

    const buffer = await file.arrayBuffer();
    const exif = parseImageExif(buffer);
    const shutter = extractSonyShutterCount(exif);

    const make = (exif.make || '').toUpperCase();
    const isSony = make.includes('SONY') || Boolean(shutter.modelInfo);

    if (!exif.model && !exif.makerNoteAbs) {
      setStatus('未读到 EXIF 信息。请换一张相机原图试试。');
      showToast('未找到拍摄信息');
      return;
    }

    previewUrl = URL.createObjectURL(file);
    renderResult({
      fileName: file.name,
      previewUrl,
      exif,
      shutter,
      isSony,
    });
    setStatus('');
    statusEl.hidden = true;
    showToast(shutter.shutterCount != null ? '快门次数已读出' : '已解析拍摄信息');
  } catch (err) {
    console.error(err);
    setStatus('解析失败，请换一张原图重试。');
    showToast('解析失败');
  }
}

/**
 * @param {{
 *   fileName: string,
 *   previewUrl: string,
 *   exif: ReturnType<typeof parseImageExif>,
 *   shutter: ReturnType<typeof extractSonyShutterCount>,
 *   isSony: boolean,
 * }} data
 */
function renderResult(data) {
  const { fileName, previewUrl: url, exif, shutter, isSony } = data;
  const label = shutter.modelInfo?.label || exif.model || '未知机型';
  const life = formatLife(shutter.shutterCount, shutter.modelInfo?.rated);
  const countText =
    shutter.shutterCount != null ? formatCount(shutter.shutterCount) : '未能读出';

  const rows = [
    ['文件', fileName],
    ['品牌', exif.make || '—'],
    ['型号', exif.model || '—'],
    ['拍摄时间', formatDateTime(exif.datetime)],
    ['快门', formatExposureTime(exif.exposureTime)],
    ['光圈', formatFNumber(exif.fNumber)],
    ['感光度', formatIso(exif.iso)],
    ['焦距', formatFocal(exif.focalLength)],
    ['镜头', exif.lensModel || '—'],
    ['测光', formatMetering(exif.meteringMode)],
    ['曝光模式', formatExposureProgram(exif.exposureProgram)],
    ['白平衡', formatWhiteBalance(exif.whiteBalance)],
  ];

  resultEl.hidden = false;
  resultEl.replaceChildren();

  const preview = el('div', 'result__preview');
  const img = el('img', 'result__img');
  img.alt = '所选照片预览';
  img.src = url;
  preview.appendChild(img);

  const hero = el('div', 'result__hero');
  const modelEl = el('p', 'result__model');
  modelEl.textContent = label;
  const countLabel = el('p', 'result__count-label');
  countLabel.textContent = '快门次数';
  const countEl = el('p', 'result__count');
  countEl.textContent = countText;
  if (shutter.shutterCount == null) countEl.classList.add('is-empty');
  hero.append(modelEl, countLabel, countEl);

  if (life) {
    const lifeWrap = el('div', 'result__life');
    const bar = el('div', 'result__life-bar');
    const fill = el('span', 'result__life-fill');
    fill.style.width = `${Math.max(2, life.percent)}%`;
    bar.appendChild(fill);
    const lifeText = el('p', 'result__life-text');
    lifeText.textContent = life.text;
    lifeWrap.append(bar, lifeText);
    hero.appendChild(lifeWrap);
  }

  if (shutter.note) {
    const note = el('p', 'result__note');
    note.textContent = shutter.note;
    hero.appendChild(note);
  } else if (!isSony) {
    const note = el('p', 'result__note');
    note.textContent = '品牌看起来不是索尼。仍展示已读到的 EXIF；快门次数仅对索尼机身有效。';
    hero.appendChild(note);
  }

  const meta = el('div', 'result__meta');
  const metaTitle = el('h2', 'result__meta-title');
  metaTitle.textContent = '拍摄信息';
  meta.appendChild(metaTitle);

  const list = el('dl', 'meta-list');
  for (const [k, v] of rows) {
    const row = el('div', 'meta-list__row');
    const dt = el('dt', 'meta-list__key');
    dt.textContent = k;
    const dd = el('dd', 'meta-list__val');
    dd.textContent = v;
    row.append(dt, dd);
    list.appendChild(row);
  }
  meta.appendChild(list);

  const again = el('button', 'again-btn');
  again.type = 'button';
  again.textContent = '再选一张';
  again.addEventListener('click', () => {
    fileInput?.click();
  });

  resultEl.append(preview, hero, meta, again);
  resultEl.classList.remove('is-in');
  void resultEl.offsetWidth;
  resultEl.classList.add('is-in');

  uploadHit?.classList.add('is-done');
}

/**
 * @param {string} tag
 * @param {string} className
 */
function el(tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

/**
 * @param {string} text
 */
function setStatus(text) {
  if (!statusEl) return;
  if (!text) {
    statusEl.hidden = true;
    statusEl.textContent = '';
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = text;
}

function revokePreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
}
