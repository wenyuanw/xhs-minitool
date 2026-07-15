# 薯 Emoji

离线可用的小红书 emoji 含义与用法查询小工具。

**Slogan**：让你的小红书笔记表情，更懂小红书

## 功能

- 正向查询：粘贴 / 输入 emoji 查看详情
- 反向查询：中文关键词模糊搜索
- 五类分类浏览（强调装饰 / 情感表达 / 种草推荐 / 视觉美化 / 符号标记）
- 本地收藏（IndexedDB）
- 最近使用（最多 20 条，首页展示 8 条）
- 搜索历史

## 小红书小工具提交包

在 monorepo 根目录：

```bash
pnpm install
pnpm --filter shu-emoji build
```

产物（位于本目录）：

- 目录：`xhs-tool/`（单 HTML 入口、相对路径、无 PWA / Service Worker）
- 压缩包：`shu-emoji-xhs-tool.zip`（`index.html` 在 zip 根目录）

校验：

```bash
pnpm --filter shu-emoji validate
```

上传时使用 `shu-emoji-xhs-tool.zip`（或等价地上传 `xhs-tool/` 目录内容）。

## 本地开发

```bash
pnpm --filter shu-emoji dev
```

或在 monorepo 根执行 `pnpm dev`。

## 技术说明

| 项 | 说明 |
|---|---|
| 框架 | Vite + 原生 JS |
| 路由 | Hash Router（`#/`） |
| 数据 | `src/data/emojis.json`（打包进 JS） |
| 存储 | IndexedDB：`favorites` / `recent` / `searchHistory` |
| 字体 | 包内 `ZCOOLKuaiLe.woff2` |
| 提交目录 | `xhs-tool/` |
| 共享构建 | `xhs-minitool-vite-config` / `xhs-minitool-pack` / `xhs-minitool-validate` |

## 提交包说明

小红书规范见仓库 `skills/` 与官方小工具指南。
