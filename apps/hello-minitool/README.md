# 你好小工具

从这里开始写小红书小工具

Monorepo 内置可运行示例：展示 Vite + 原生 JS 模板与打包流水线。

## 开发

在 monorepo 根目录：

```bash
pnpm install
pnpm --filter hello-minitool dev
```

## 打包

```bash
pnpm --filter hello-minitool build
```

产物：

- `xhs-tool/` — 提交目录
- `hello-minitool-xhs-tool.zip` — 上传用压缩包

校验：

```bash
pnpm --filter hello-minitool validate
```
