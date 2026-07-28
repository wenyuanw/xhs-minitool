import { drawAvatar, resolvePartDisplayHex } from '../lib/avatar-renderer.js';
import { toPickerHex } from '../lib/colors.js';

export async function renderEditor(root, ctx) {
  const state = ctx.state;
  const options = ctx.options;

  root.innerHTML = `
    <header class="tool-brand">
      <h1 class="tool-brand__title">
        <span class="tool-brand__mark">炫彩</span>
        <span class="tool-brand__name">momo</span>
      </h1>
    </header>

    <section class="module module--preview">
      <div class="preview-wrap">
        <canvas id="avatar-preview" class="preview-canvas" width="1024" height="1024" aria-label="头像预览"></canvas>
      </div>
    </section>

    <section class="module">
      <div class="part-color-board">
        <h2 class="part-color-board__head part-color-board__head--main">分区配色</h2>
        <div class="part-color-board__head part-color-board__head--custom">自定义</div>
        ${options.parts
          .map((part) => {
            const current = state.partColors?.[part.id];
            const displayHex = resolvePartDisplayHex(part.id, current, options);
            return `
              ${renderPartPresets(part, current, options)}
              ${renderPartPicker(part, displayHex, current, options)}
            `;
          })
          .join('')}
      </div>
    </section>

    <section class="action-bar action-bar--dual">
      <button class="soft-btn" type="button" data-randomize>随机</button>
      <button class="primary-btn" type="button" data-generate>生成头像</button>
    </section>
  `;

  root.querySelectorAll('[data-part-color]').forEach((button) => {
    button.addEventListener('click', () => {
      ctx.actions.setPartColor(button.dataset.part, button.dataset.partColor, true);
    });
  });

  root.querySelectorAll('[data-part-picker]').forEach((input) => {
    input.addEventListener('input', () => {
      const partId = input.dataset.partPicker;
      ctx.actions.setPartColor(partId, input.value, false);
      root.querySelectorAll(`[data-part="${partId}"][data-part-color]`).forEach((btn) => {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-selected', 'false');
      });
      input.closest('.part-picker')?.classList.add('is-active');
    });
  });

  root.querySelector('[data-randomize]')?.addEventListener('click', () => ctx.actions.randomizeCurrent());
  root.querySelector('[data-generate]')?.addEventListener('click', () => ctx.actions.generateResult());

  const canvas = root.querySelector('#avatar-preview');
  if (canvas) {
    await drawAvatar(canvas, state, options);
  }
}

function renderPartPresets(part, current, options) {
  if (part.id === 'background') {
    return renderBackgroundPresets(part, current, options.backgrounds || []);
  }

  return `
    <div class="part-color-row">
      <span class="part-color-row__label">${part.label}</span>
      <div class="part-color-row__chips" role="listbox" aria-label="${part.label}预设">
        ${options.palette
          .map(
            (item) => `
          <button
            class="mini-swatch ${item.id === current ? 'is-active' : ''}"
            type="button"
            data-part="${part.id}"
            data-part-color="${item.id}"
            aria-label="${part.label} ${item.label}"
            aria-selected="${item.id === current}"
            style="--swatch-color: ${item.color};"
            title="${item.label}"
          ></button>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderBackgroundPresets(part, current, backgrounds) {
  return `
    <div class="part-color-row">
      <span class="part-color-row__label">${part.label}</span>
      <div class="part-color-row__chips" role="listbox" aria-label="${part.label}预设">
        ${backgrounds
          .map(
            (item) => `
          <button
            class="mini-swatch mini-swatch--gradient ${item.id === current ? 'is-active' : ''}"
            type="button"
            data-part="${part.id}"
            data-part-color="${item.id}"
            aria-label="${part.label} ${item.label}"
            aria-selected="${item.id === current}"
            style="--swatch-a: ${item.palette[0]}; --swatch-b: ${item.palette[1]}; --swatch-c: ${item.palette[2]};"
            title="${item.label}"
          ></button>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderPartPicker(part, displayHex, current, options) {
  const pickerValue = toPickerHex(displayHex || '#ff6f9f');
  const presetIds =
    part.id === 'background'
      ? (options.backgrounds || []).map((item) => item.id)
      : options.palette.map((item) => item.id);
  const isCustom = Boolean(current) && !presetIds.includes(current);
  return `
    <label class="part-picker part-picker--side ${isCustom ? 'is-active' : ''}">
      <input
        class="part-picker__input"
        type="color"
        data-part-picker="${part.id}"
        value="${pickerValue}"
        aria-label="${part.label}自定义颜色"
      />
    </label>
  `;
}
