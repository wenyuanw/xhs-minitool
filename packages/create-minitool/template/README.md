# {{title}}

{{slogan}}

{{description}}

## 开发

在 monorepo 根目录：

```bash
pnpm install
pnpm --filter {{name}} dev
```

## 打包

```bash
pnpm --filter {{name}} build
```

产物：

- `xhs-tool/` — 提交目录
- `{{name}}-xhs-tool.zip` — 上传用压缩包

校验：

```bash
pnpm --filter {{name}} validate
```
