# AGENTS.md — 小红书小工具项目规范

本文件是本仓库的**项目级 Agent 规范**。开发、改版、审查任何小工具（`apps/*`、脚手架模板）时，除遵守 `.agents/skills/` 下的技能与 reference 外，还必须遵守本文。

相关技能（细节以技能文档为准）：

- `.agents/skills/xiaohongshu-mini-tool-dev/` — 容器能力、离线约束、发布审查
- `.agents/skills/minitool-zip-builder/` — zip 产物、端能力、跨端适配

---

## 1. 顶部区域：给官方按钮留足空间

小工具运行在容器 WebView 内。容器会在**页面顶部左右两侧**叠放官方自带控件（常见：返回、分享、更多等）。这些控件**不属于页面 DOM**，不会自动推开页面内容；若顶部留白不足，页面自绘的标题、Logo、返回、操作按钮会与之重叠，导致无法点击或视觉遮挡。

### 必须遵守

1. **不要把可点击或重要文案顶到屏幕最上沿。** 首屏顶部内容必须整体下移，避开容器顶栏与系统状态栏。
2. **不要只依赖 `env(safe-area-inset-top)`。** PC 模拟器或部份机型上 inset 可能为 `0`，但容器按钮仍在；须用「系统安全区」与「容器顶栏保底高度」取较大值。
3. **viewport 须含 `viewport-fit=cover`**，并配合 `env(safe-area-inset-*)`（旧 WebKit 可再写 `constant()` 回退）。
4. **自绘顶栏左右两侧勿放关键操作**（关闭、分享、设置等），以免与官方按钮抢位。

### 推荐写法

```css
:root {
  /* 设计上边距：叠在安全区 / 容器顶栏避让之上 */
  --page-pad-top: 12px;
  /* 容器返回 / 分享 / 更多常叠在 WebView 顶部；inset 为 0 时仍须保底 */
  --chrome-top: 76px;

  --sat: 0px;
  --sat: constant(safe-area-inset-top, 0px);
  --sat: env(safe-area-inset-top, 0px);
}

.page {
  /* 顶部 = max(系统安全区, 容器顶栏保底) + 设计间距 */
  padding-top: calc(max(var(--sat), var(--chrome-top)) + var(--page-pad-top));
}
```

参考实现：`apps/shu-emoji/src/styles/tokens.css`、`apps/shu-emoji/src/styles/app.css`。

### 自检

- [ ] 真机与模拟器上，标题 / Logo / 首行按钮均不与容器左右顶栏重叠
- [ ] inset 为 0 时，顶部仍有足够保底留白（约 `--chrome-top` 量级）
- [ ] sticky / fixed 顶栏同样计入同一套顶部避让，而不是只给第一屏静态内容加 padding

---

## 2. Logo 与标题：顶部居中展示

官方按钮在顶部**左侧与右侧**。若小工具需要展示自身 **Logo + 标题**（品牌头、首页 hero、工具名），优先在顶部**水平居中**排布，把左右两侧留给容器控件。

### 必须遵守

1. **品牌头默认居中**：Logo、工具名、一句副文案纵向排列并水平居中，不要贴左或贴右做成「类原生导航栏」。
2. **不要在 Logo / 标题同一行的左右放自绘导航按钮**（返回、更多、分享），除非该页已确认无容器顶栏冲突，且有足够边距。
3. **标题不要做成通栏左对齐大标题顶满状态栏**；居中品牌区下方再进入业务内容。

### 推荐结构

```html
<header class="tool-brand">
  <img class="tool-brand__logo" src="./assets/logo.png" alt="" />
  <h1 class="tool-brand__title">工具名称</h1>
  <p class="tool-brand__desc">一句话说明</p>
</header>
```

```css
.tool-brand {
  text-align: center;
  /* 该区块本身仍处于已做顶部避让的页面容器内 */
}

.tool-brand__logo {
  display: block;
  margin-inline: auto;
}
```

参考实现：`apps/shu-emoji` 首页 `.home-hero` / `.home-hero__brand`，以及脚手架模板 `packages/create-minitool/template` 中的 `.hero` + `.logo`。

### 何时可以不居中

- 二级页、列表页等**不再展示品牌 Logo + 标题组合**，而以内页内容标题为主时，可按内容层级左对齐或其它排版，但仍须遵守第 1 节顶部避让，且左右边缘不要与官方按钮争抢。

---

## 3. 与其它规范的关系

| 主题 | 以何处为准 |
|---|---|
| 离线包、CSP、禁用 API、校验与发布 | `xiaohongshu-mini-tool-dev` skill |
| zip 目录、资源路径、端能力替代 | `minitool-zip-builder` skill |
| **顶部避让与品牌头布局** | **本文（优先级最高，布局专项）** |

新建或改版小工具时：先满足本文第 1、2 节，再按技能完成实现与打包。
