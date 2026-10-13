# 格格图

最多 12 张图拼成一张，配图文字可以直接发成小红书笔记。

## 小红书小工具提交包

在 monorepo 根目录：

```bash
pnpm install
pnpm --filter gegetu build
```

产物（位于本目录）：

- 目录：`xhs-tool/`
- 压缩包：`gegetu-xhs-tool.zip`（`index.html` 在 zip 根目录）

校验：

```bash
pnpm --filter gegetu validate
```

## 本地开发

```bash
pnpm --filter gegetu dev
```
