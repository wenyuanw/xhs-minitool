# 小红书小工具 Monorepo

基于 **Vite + 原生 JS** 的小红书离线小工具集合仓库。用 pnpm workspace 管理多个工具，共享同一套构建、打包与静态校验流水线。

## 目录

```text
apps/                 # 各小工具（业务代码）
packages/
  minitool-vite-config   # 共享 Vite IIFE 配置
  minitool-pack          # 整理 xhs-tool + 打 zip
  minitool-validate      # 静态兼容性校验
  create-minitool        # 交互式脚手架 CLI
skills/               # Agent / 人读的规范与 reference
```

## 要求

- Node `>= 18.17`
- pnpm `>= 9`（推荐仓库锁定的版本）
- Python 3（校验脚本）
- 系统 `zip` / `zipinfo`

## 快速开始

```bash
pnpm install
pnpm create-minitool          # 交互创建，或加 flag 跳过问答
pnpm --filter <name> dev      # 本地开发
pnpm --filter <name> build    # 产出 xhs-tool/ 与 <name>-xhs-tool.zip
pnpm --filter <name> validate # 严格静态校验
```

非交互创建示例：

```bash
pnpm create-minitool --name note-helper --title '笔记助手' --slogan '离线好用的小助手' --theme-color '#FF2442'
```

根脚本：

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 启动内置示例 `hello-minitool` |
| `pnpm dev:shu-emoji` | 启动 `shu-emoji` |
| `pnpm build` | 构建全部 `apps/*` |
| `pnpm validate` | 校验全部 `apps/*` |
| `pnpm create-minitool` | 新建工具 |

## 产物约定

每个 app 构建后：

- `apps/<name>/xhs-tool/` — 容器加载目录（`index.html` 在根）
- `apps/<name>/<name>-xhs-tool.zip` — 上传用压缩包（zip 根即 `index.html`）

技术约束（CSP / 离线）：相对路径、单入口 IIFE `app.js`、无 module / PWA / 外网资源。细节见 `skills/`。

## 示例应用

- [`apps/hello-minitool`](apps/hello-minitool) — 模板脚手架内置示例（可直接 `dev` / `build`）
- [`apps/shu-emoji`](apps/shu-emoji) — 薯 Emoji（表情含义与用法查询）

## 开发规范

新建或改写小工具时，优先阅读：

- `skills/minitool-zip-builder/` — zip 产物规范
- `skills/xiaohongshu-mini-tool-dev/` — 容器能力与审查清单

**新项目请用 `pnpm create-minitool`**，不要再手抄 skill 里的平铺 `templates/starter/`（那份是无构建管线的最小参考，长期以本仓库 CLI 模板为准）。
