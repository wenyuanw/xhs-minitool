export function renderResult(root, ctx) {
  const hasImage = Boolean(ctx.state.resultImage);

  root.innerHTML = `
    <header class="tool-brand tool-brand--compact">
      <h1 class="tool-brand__title">
        <span class="tool-brand__mark">炫彩</span>
        <span class="tool-brand__name">momo</span>
      </h1>
    </header>

    <section class="module module--preview result-card">
      ${
        hasImage
          ? `
        <img class="result-image" src="${ctx.state.resultImage}" alt="已生成的头像图片" />
        <p class="result-tip">长按图片可保存到相册</p>
      `
          : `
        <div class="empty-result">
          <strong>还没有生成头像</strong>
        </div>
      `
      }
    </section>

    <section class="action-bar action-bar--single">
      <button class="primary-btn" type="button" data-nav-editor>${hasImage ? '继续编辑' : '返回编辑'}</button>
    </section>
  `;

  root.querySelector('[data-nav-editor]')?.addEventListener('click', () => ctx.actions.goEditor());
}
