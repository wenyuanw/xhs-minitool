# {{title}}

{{slogan}}

{{description}}

这是一个用脚手架创建的小红书小工具项目。打开后已经有一个能跑的示例页面（带 logo 和点击计数），你可以在此基础上改成自己的功能。

## 快速开始

```bash
pnpm install   # 第一次先安装依赖（也可用 npm / yarn）
pnpm dev       # 本地预览，浏览器里看效果
```

## 打包上传

功能做好后：

```bash
pnpm build     # 生成 zip
pnpm validate  # 上传前检查（推荐）
```

会生成：

- `xhs-tool/` — 整理好的提交文件夹
- `{{name}}-xhs-tool.zip` — 上传到[创作服务平台](https://creator.xiaohongshu.com/new/red-app) 的压缩包

## 项目里有哪些文件夹

- `src/main.js` — 页面逻辑，你最常改这里
- `src/styles/` — 样式
- `index.html` — 页面入口
- `public/` — 图标、图片等静态资源

## AI 助手指引（可选）

`.agents/skills/` 里放了小红书小工具的开发规范。如果你用 Cursor、Claude Code 等 AI 工具写代码，它会帮你按平台要求来改。

## 更多说明

- 平台能做什么 / 不能做什么：看项目里的 `.agents/skills/xiaohongshu-mini-tool-dev/`
- 官方文档：https://xhs-minitool.wenyuanw.me/docs/getting-started/
