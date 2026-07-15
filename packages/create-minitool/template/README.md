# {{title}}

{{slogan}}

{{description}}

内置示例：logo + 点击计数（localStorage）。

## Agent Skills

项目自带 `.agents/skills/`（小红书小工具规范与校验指引），便于 Cursor / Claude Code 等 Agent 直接读取：

- `minitool-zip-builder` — zip 产物规范
- `xiaohongshu-mini-tool-dev` — 容器能力与开发审查

## 开发

```bash
pnpm install
pnpm dev
```

Monorepo 内也可用：`pnpm --filter {{name}} dev`

## 打包

```bash
pnpm build
```

产物：

- `xhs-tool/` — 提交目录
- `{{name}}-xhs-tool.zip` — 上传用压缩包

校验：

```bash
pnpm validate
```
