# {{title}}

{{slogan}}

{{description}}

内置示例：logo + 点击计数（localStorage）。

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
