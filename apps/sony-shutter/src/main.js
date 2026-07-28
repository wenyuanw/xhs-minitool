import './styles/app.css';
import { parseImageExif } from './lib/exif.js';
import { extractShutterCount } from './lib/shutter.js';
import {
  formatCount,
  formatDateTime,
  formatExposureTime,
  formatFNumber,
  formatFocal,
  formatIso,
  formatNow,
  formatShutterGrade,
} from './lib/format.js';

const page = document.querySelector('#page');

/** @type {string | null} */
let previewUrl = null;

const fileInput = document.querySelector('#file-input');
fileInput?.addEventListener('change', () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  void handleFile(file);
  fileInput.value = '';
});

initHome();

function initHome() {
  page.innerHTML = `
    <div class="view view--home" id="view-home">
      <header class="section tool-brand">
        <div class="brand-mark" aria-hidden="true">
          <svg class="brand-mark__grid" viewBox="0 0 48 48" width="48" height="48" fill="none">
            <circle cx="24" cy="24" r="19.5" stroke="#111111" stroke-width="1"/>
            <g class="brand-mark__badge">
              <circle cx="24" cy="24" r="12.5" fill="#D90915"/>
            </g>
            <g class="brand-mark__shutter">
              <path class="brand-mark__blade brand-mark__blade--1" d="M24 15.1l4.3 2.5-4.1 7.2h-4.9L24 15.1Z" fill="#ffffff"/>
              <path class="brand-mark__blade brand-mark__blade--2" d="M32.6 19.6v5.1l-7.9-0.1-2.4-4.2 10.3-0.8Z" fill="#ffffff"/>
              <path class="brand-mark__blade brand-mark__blade--3" d="M32.4 27.9l-4.4 2.5-4-7.2 2.5-4.2 5.9 8.9Z" fill="#ffffff"/>
              <path class="brand-mark__blade brand-mark__blade--4" d="M24 32.9l-4.3-2.5 4.1-7.2h4.9L24 32.9Z" fill="#ffffff"/>
              <path class="brand-mark__blade brand-mark__blade--5" d="M15.4 27.9v-5.1l7.9 0.1 2.4 4.2-10.3 0.8Z" fill="#ffffff"/>
              <path class="brand-mark__blade brand-mark__blade--6" d="M15.6 19.6l4.4-2.5 4 7.2-2.5 4.2-5.9-8.9Z" fill="#ffffff"/>
              <path class="brand-mark__aperture" d="M24 21l2.5 1.5v3L24 27l-2.5-1.5v-3L24 21Z" fill="#D90915"/>
            </g>
          </svg>
        </div>
        <h1 class="tool-brand__title">快门次数查询</h1>
      </header>

      <section class="section upload" aria-label="选择照片">
        <p class="section__label">上传</p>
        <label for="file-input" class="upload__hit" id="upload-hit">
          <span class="upload__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M12 4v12M8 8l4-4 4 4"/>
              <path d="M4 16v3h16v-3"/>
            </svg>
          </span>
          <span class="upload__title">选择相机原图</span>
          <span class="upload__hint">支持索尼、尼康<br/>处理全程在本地完成</span>
        </label>
      </section>

      <p class="status" id="status" hidden></p>

      <section class="section tips">
        <p class="section__label">说明</p>
        <ul class="tips__list">
          <li>请选择相机直出原图。经社交软件压缩或重导出的照片，快门次数通常会丢失。</li>
          <li>当前支持索尼、尼康；其他品牌通常只能读取基础拍摄参数。</li>
          <li>电子快门／静音拍摄可能不增加机械快门计数。</li>
        </ul>
      </section>
    </div>
  `;
}

/**
 * @param {File} file
 */
async function handleFile(file) {
  setStatus('正在本地解析…');

  try {
    if (!file.type.startsWith('image/') && !/\.(jpe?g|arw|dng|tif{1,2})$/i.test(file.name)) {
      setStatus('请选择图片文件（建议相机直出 JPEG / RAW）。');
      return;
    }

    const buffer = await file.arrayBuffer();
    const exif = parseImageExif(buffer);
    const shutter = extractShutterCount(exif);

    if (!exif.model && !exif.makerNoteAbs) {
      setStatus('未读到 EXIF 信息。请换一张相机原图试试。');
      return;
    }

    revokePreview();
    previewUrl = URL.createObjectURL(file);

    const make = (exif.make || '').toUpperCase();
    const isSupportedBrand = ['SONY', 'NIKON', 'FUJIFILM', 'FUJI'].some((name) => make.includes(name));

    showResultView({
      fileName: file.name,
      previewUrl,
      exif,
      shutter,
      isSupportedBrand,
      queryTime: formatNow(),
    });

    setStatus('');
  } catch (err) {
    console.error(err);
    setStatus('解析失败，请换一张原图重试。');
  }
}

/**
 * @param {{
 *   fileName: string,
 *   previewUrl: string,
 *   exif: ReturnType<typeof parseImageExif>,
 *   shutter: ReturnType<typeof extractShutterCount>,
 *   isSupportedBrand: boolean,
 *   queryTime: string,
 * }} data
 */
function showResultView(data) {
  const { fileName, exif, shutter, isSupportedBrand, queryTime } = data;
  const rated = shutter.modelInfo?.rated ?? null;
  const grade = formatShutterGrade(shutter.shutterCount, rated);
  const countText =
    shutter.shutterCount != null ? formatCount(shutter.shutterCount) : '—';
  const cameraModel = [exif.make, exif.model].filter(Boolean).join(' ') || '—';
  const usagePct =
    grade.percent != null ? `${Math.round(grade.percent)}%` : '—';

  const segCount = 24;
  const filledSegs =
    grade.percent != null
      ? Math.max(1, Math.round((grade.percent / 100) * segCount))
      : 0;

  const segHtml = Array.from({ length: segCount }, (_, i) => {
    const on = i < filledSegs;
    return `<span class="seg-bar__cell${on ? ' is-on' : ''}"></span>`;
  }).join('');

  const gridRows = [
    ['镜头型号', exif.lensModel || '—'],
    ['镜头焦距', formatFocal(exif.focalLength)],
    ['光圈系数', formatFNumber(exif.fNumber)],
    ['曝光时间', formatExposureTime(exif.exposureTime)],
    ['感光指数', formatIso(exif.iso)],
    ['图片名称', fileName],
    ['拍摄时间', formatDateTime(exif.datetime)],
    ['查询时间', queryTime],
  ];

  const gridHtml = gridRows
    .map(
      ([k, v]) => `
        <div class="detail-cell">
          <span class="detail-cell__key">${k}</span>
          <span class="detail-cell__val">${escapeHtml(v)}</span>
        </div>`,
    )
    .join('');

  let noteHtml = '';
  if (shutter.note) {
    noteHtml = `<p class="report-note">${escapeHtml(shutter.note)}</p>`;
  } else if (!isSupportedBrand) {
    noteHtml =
      '<p class="report-note">当前仅支持索尼、尼康的快门次数查询；已展示可读取的基础拍摄信息。</p>';
  }

  page.innerHTML = `
    <div class="view view--result" id="view-result">
      <header class="result-nav">
        <p class="result-nav__title">查询结果</p>
      </header>

      <div class="report-hero">
        <div class="report-hero__col report-hero__col--count">
          <p class="report-hero__label">快门次数</p>
          <p class="report-hero__count${shutter.shutterCount == null ? ' is-empty' : ''}">${countText}</p>
          <div class="seg-bar" role="img" aria-label="已使用 ${usagePct}">
            ${segHtml}
          </div>
          <div class="report-hero__usage">
            <span>已使用</span>
            <span>${usagePct}</span>
          </div>
        </div>
        <div class="report-hero__split" aria-hidden="true"></div>
        <div class="report-hero__col report-hero__col--grade">
          <p class="report-hero__label">快门状态</p>
          <p class="report-hero__grade">${grade.grade}</p>
          <p class="report-hero__status">${grade.label}</p>
        </div>
      </div>

      <section class="report-details" aria-label="拍摄信息">
        <div class="report-details__head">
          <div class="detail-cell detail-cell--wide">
            <span class="detail-cell__key">相机型号</span>
            <span class="detail-cell__val">${escapeHtml(cameraModel)}</span>
          </div>
          <div class="detail-cell detail-cell--wide">
            <span class="detail-cell__key">快门来源</span>
            <span class="detail-cell__val">${escapeHtml(shutter.source || 'MakerNote 估算')}</span>
          </div>
        </div>
        <div class="report-details__grid">
          ${gridHtml}
        </div>
      </section>

      ${noteHtml}

      <div class="result-actions">
        <button type="button" class="again-btn" id="again-btn">再选一张</button>
        <button type="button" class="back-btn" id="back-btn">返回首页</button>
      </div>
    </div>
  `;

  document.querySelector('#back-btn')?.addEventListener('click', goHome);
  document.querySelector('#again-btn')?.addEventListener('click', () => {
    fileInput?.click();
  });

  window.scrollTo(0, 0);
}

function goHome() {
  revokePreview();
  initHome();
  window.scrollTo(0, 0);
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * @param {string} text
 */
function setStatus(text) {
  const statusEl = document.querySelector('#status');
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
