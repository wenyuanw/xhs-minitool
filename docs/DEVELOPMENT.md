# 开发指南

本文档面向维护本 monorepo 的贡献者，说明本地开发、官网构建与 npm 发版流程。使用脚手架创建独立项目的说明见根目录 [README.md](../README.md) 与[官网文档](https://xhs-minitool.wenyuanw.me/docs/getting-started/)。

## 仓库结构

```text
.agents/
  AGENTS.md           # 项目级 Agent 规范（布局等）
  skills/             # Agent skills（规范与 reference）
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

- [`.agents/AGENTS.md`](../.agents/AGENTS.md) — 项目级 Agent 规范（顶部避让、Logo/标题居中等布局约定）
- `.agents/skills/minitool-zip-builder/` — zip 产物规范
- `.agents/skills/xiaohongshu-mini-tool-dev/` — 容器能力与审查清单
- [官方开发者文档与能力清单](https://miniapp-sandbox.xiaohongshu.com/minitool/doc) — Web 约束与保存图片、发笔记、Storage API 的来源

维护 skills 时同时同步 `packages/create-minitool/template/.agents/skills/` 及已有的 `apps/*/.agents/skills/` 副本，确保新建项目获得相同指引。端 API 参数、版本检测和存储迁移见 `xiaohongshu-mini-tool-dev/references/native-apis.md`；文档站的「容器约束」与「官方资源」也应同步更新。正式上传从平台上传页取得当前改写口令及对应版本官方 Skill，不将仓库副本称为官方最新版本。

### 官方 1.6.0 与仓库维护版

- [已核验的官方 1.6.0 下载包](https://fe-static.xhscdn.com/mini-tool/20260831163932/minitool-zip-builder-1.6.0.skill)解压在 `.codex/minitool-zip-builder/`，保留原始内容。其 `SKILL.md` 和 `skill-package.json` 均标注 1.6.0；这不能证明它是当前唯一最新版本。
- `.agents/skills/minitool-zip-builder/` 为基于 1.6.0 的维护版，补充现行能力网页契约；来源 URL、原包 SHA-256 和本地修订标识保存在 `skill-package.json`，不要把它当作官方原包。
- JS / CSS 兼容规范、性能预算与 `audit_artifact.mjs` / `audit_artifact.py` 已从官方包同步。体积审计只检查体积，不替代 CSP、API、兼容性和真机测试。

2026-09-16 核验到的差异：

| 项目 | 官方 1.6.0 原包 | 当天能力网页／维护版处理 |
|---|---|---|
| Storage / getLaunchOptions | 未列出，仍推荐浏览器存储 | 按网页补充，Storage 要求 9.46.0+；旧版／未知版本才降级。 |
| 实况字段 | `live_photo_resources` | 使用网页中的 `live_photo_sources`，不同时传两种字段。 |
| 原生跳转与标签 | 列出 `openRedPage`、`tags` | 当前网页未列出；维护版不宣称支持，需再核对目标客户端契约。 |
| 笔记媒体地址 | 文本允许网络地址 | 网页仅允许本地路径／base64；维护版不传网络地址。 |
| writeTempFile | 要求完整 data URI，拒绝裸 base64 | 网页写 base64 可带前缀；维护版统一传完整 data URI，兼容两者。 |

重新获取官方包时，先检查包内版本与变更，再核对网页；不要无条件覆盖 Storage 等较新补充，也不要依据 URL 中日期推断发布先后。

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
