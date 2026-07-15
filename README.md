# XHS MiniTool

帮你从零开始做小红书小工具：一条命令创建项目，在电脑上写好页面，打包成 zip 上传到[创作服务平台](https://creator.xiaohongshu.com/new/red-app)即可。

- 官网（文档 + 示例）：https://xhs-minitool.wenyuanw.me
- 脚手架 npm：https://www.npmjs.com/package/create-xhs-minitool
- 源码：https://github.com/wenyuanw/xhs-minitool

## 三步上手

**1. 创建项目**（需要先安装 [Node.js](https://nodejs.org/) 18.17+）

```bash
npx create-xhs-minitool          # 按提示输入文件夹名
npx create-xhs-minitool my-tool  # 或直接指定名称
```

**2. 本地开发预览**

```bash
cd my-tool
pnpm install   # 也可用 npm / yarn
pnpm dev       # 在浏览器里预览，改代码会自动刷新
```

**3. 打包上传**

```bash
pnpm build     # 生成可上传的 zip
pnpm validate  # 上传前检查（推荐）
```

构建完成后，把 `<项目名>-xhs-tool.zip` 上传到创作服务平台。

![上传后的预览效果](docs/creator-platform-preview.png)

## 创建时会自带什么

你不用自己配环境，项目里已经准备好了：

| 工具 | 帮你做什么 |
|---|---|
| `create-xhs-minitool` | 创建新项目 |
| `xhs-minitool-vite-config` | 把代码编译成小红书能加载的格式 |
| `xhs-minitool-pack` | 整理文件并打成 zip |
| `xhs-minitool-validate` | 上传前自动检查常见问题 |

创建时只需输入文件夹名，标题、介绍、主题色等都有默认值，之后可以在项目里改。

## 看示例

不确定小工具长什么样？官网有在线 demo：https://xhs-minitool.wenyuanw.me/demos/

## 文档

- [快速开始](https://xhs-minitool.wenyuanw.me/docs/getting-started/) — 从零创建第一个项目
- [项目结构](https://xhs-minitool.wenyuanw.me/docs/project-structure/) — 文件夹和命令说明
- [打包与校验](https://xhs-minitool.wenyuanw.me/docs/packaging/) — zip 怎么打、怎么检查
- [容器约束](https://xhs-minitool.wenyuanw.me/docs/container-limits/) — 哪些功能能做、不能做
- [官方资源](https://xhs-minitool.wenyuanw.me/docs/official-resources/) — 小红书平台官方说明

## 参与开发

本仓库同时维护脚手架源码和 demo。若要贡献代码、发布 npm 或部署官网，见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

## License

[MIT](LICENSE)
