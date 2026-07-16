# 开发指南

本文档面向维护本 monorepo 的贡献者，说明本地开发、官网构建与 npm 发版流程。使用脚手架创建独立项目的说明见根目录 [README.md](../README.md) 与[官网文档](https://xhs-minitool.wenyuanw.me/docs/getting-started/)。

## 仓库结构

```text
.agents/skills/       # Agent skills（规范与 reference）
apps/                 # 各小工具 + website 官网
packages/
  create-minitool        # = create-xhs-minitool
  minitool-vite-config
  minitool-pack
  minitool-validate
```

## 环境要求

- Node `>= 18.17`
- pnpm `>= 9`
- Python 3（校验脚本）
- 系统 `zip` / `zipinfo`
- 部署官网：Cloudflare 账号 + `wrangler login`

## Monorepo 本地开发

```bash
pnpm install
pnpm create-minitool          # 在 apps/<name> 新建工具（workspace 依赖）
pnpm --filter <name> dev
pnpm --filter <name> build
pnpm --filter <name> validate
```

根目录脚本：

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 启动内置示例 `hello-minitool` |
| `pnpm build` | 构建全部小工具（不含网站） |
| `pnpm validate` | 校验全部小工具 |
| `pnpm create-minitool` | 在 monorepo 内新建工具 |
| `pnpm site:dev` | 同步 demos 并启动 Astro 官网 |
| `pnpm site:build` | 构建工具 + 官网 |
| `pnpm site:deploy` | 构建并 `wrangler deploy` |
| `pnpm release:check` | 对各 package 做 pack dry-run |

## 官网

线上：https://xhs-minitool.wenyuanw.me

[`apps/website`](../apps/website) 为 Astro 纯静态站，部署到 Cloudflare Workers Static Assets：

```bash
pnpm site:dev      # http://localhost:4321
pnpm site:deploy     # 需已 wrangler login
```

`sync-demos` 会把各 app 的 `xhs-tool` 同步到 `public/preview/<name>/`，供 `/demos` 与静态预览使用。

## 示例应用

- [`apps/hello-minitool`](../apps/hello-minitool) — 模板脚手架内置示例
- [`apps/shu-emoji`](../apps/shu-emoji) — 薯 Emoji

## 开发规范

- [AGENTS.md](../AGENTS.md) — 项目级 Agent 规范（顶部避让、Logo/标题居中等布局约定）
- `.agents/skills/minitool-zip-builder/` — zip 产物规范
- `.agents/skills/xiaohongshu-mini-tool-dev/` — 容器能力与审查清单

## 发版（版本 + Changelog + npm）

四个工具包**同版本**发布。发布前自检：

```bash
pnpm release:check
```

推荐流程：

```bash
# 1) bump 版本并写入 CHANGELOG（可选自动 commit / tag）
pnpm release prepare patch -m "Fix phone preview height" --commit --tag

# 2) 推到 GitHub
git push && git push --tags

# 3) 按依赖顺序发布到 npm（需已 npm login / token；2FA 时加 --otp）
pnpm release publish --otp=123456
```

一条龙（本地准备 + 发布）：

```bash
pnpm release patch -m "Fix phone preview height" --commit --tag --publish --otp=123456
```

也可用 `minor` / `major` 代替 `patch`。说明文字会写入 [CHANGELOG.md](../CHANGELOG.md)。
