---
name: xiaohongshu-mini-tool-dev
description: Design, build, migrate, debug, package, and review Xiaohongshu mini tools that run as offline sandboxed HTML/CSS/JavaScript. Use when the user mentions 小红书小工具, 小工具容器, 小红书小工具开发, migrating a web page into the mini-tool container, CSP/resource-loading failures, third-party library compatibility, or pre-release compatibility checks.
---

# 小红书小工具开发

把小红书小工具作为**完全离线、沙箱化、强隔离的移动端 Web 包**开发。先判断需求可行性，再生成或修改代码；不要通过伪实现掩盖平台不支持的能力。

## 必读资源

开始设计或审查前，读取 `references/container-capabilities.md`。交付前，读取 `references/release-checklist.md`。

本 Skill 提供：

| 资源 | 用途 |
|---|---|
| `references/container-capabilities.md` | 查询可用能力、禁用 API、资源白名单、WebGL 和版本边界。 |
| `references/release-checklist.md` | 完成人工测试和发布审查。 |
| `scripts/validate_xhs_tool.py` | 静态扫描项目兼容性。 |
| `scripts/test_validate_xhs_tool.py` | 修改校验器后运行的无第三方依赖回归测试。 |
| `templates/starter/` | 无构建管线的离线最小参考模板。在本 monorepo 内新建工具请优先用根目录 `pnpm create-minitool`（Vite + 原生 JS）。 |

### 路径约定

将**当前 `SKILL.md` 所在目录**记为 `<skill-dir>`，将用户项目的目标目录记为 `<project-dir>`。读取引用文件、复制模板或运行脚本时，先根据当前已加载技能的实际位置解析 `<skill-dir>`；不要假设技能位于任何固定主目录、当前用户的主目录或当前工作目录。命令中的占位符必须替换为实际绝对路径，并用双引号包裹，以兼容包含空格的路径。

## 任务分流

先判断用户意图：

| 任务 | 工作流 |
|---|---|
| 从零开发小工具 | 执行“新建工作流”。 |
| 将网页或前端项目改造成小工具 | 执行“迁移工作流”。 |
| 排查 CSP、白屏、资源或依赖错误 | 执行“排错工作流”。 |
| 检查项目是否可发布 | 执行“审查工作流”。 |

如果任务同时包含多个类型，按“可行性门禁 → 迁移／开发 → 排错 → 审查”的顺序执行。

## 可行性门禁

在写代码前完成能力判定。将每项核心需求分为：

| 结论 | 含义 | 下一步 |
|---|---|---|
| **可直接实现** | 标准本地 HTML / CSS / JS、Canvas、本地存储或经授权的媒体能力可完成。 | 进入设计和实现。 |
| **需要改写** | 原方案依赖被禁能力，但存在纯本地替代方案。 | 先说明行为变化，再采用替代方案。 |
| **当前不可实现** | 核心价值依赖网络、服务端、实时通信、WASM、Worker、系统 API、下载、外链或 iframe，且无离线替代。 | 停止伪实现，说明阻塞点并提出范围调整。 |

至少检查以下问题：核心流程断网后是否成立；是否需要账号、API、实时数据或远程素材；是否依赖 WASM、Worker 或动态代码；是否需要下载文件、打开外链、iframe、定位、剪贴板、硬件或传感器。

若不可用能力只是次要功能，删除或降级该功能并继续。若它决定产品核心价值，先向用户确认是否接受离线替代方案。

## 共同工程规则

无论采用哪种工作流，均遵守以下规则：

1. 产物必须是纯本地、自包含的静态包，不增加服务端、数据库服务、登录或托管依赖。
2. 最终包只能有一个 HTML 入口；所有 JavaScript、样式、图片、字体和 JSON 使用相对路径并打包在内。
3. 将 JavaScript 放入包内 `.js` 文件，用 `<script src>` 引入；禁止内联脚本、行内事件、动态代码和 `javascript:` URI。
4. 优先使用原生 JavaScript。引入第三方库前审查其发布产物，确认不使用网络、WASM、Worker、远程资源或动态加载。
5. 数据优先使用 localStorage 或 IndexedDB。不要承诺永久保存，不要把 Cookie 当作服务端会话。
6. 采用移动端优先设计，考虑窄屏、软键盘、触摸目标和安全区域；不依赖 hover。
7. 图片预览优先使用包内资源。使用 `data:` / `blob:` 时说明 9.37 之前版本的兼容策略。
8. 不把本地预览服务器、构建工具或开发依赖放入最终提交包。

## 新建工作流

### 1. 明确需求

确定小工具的单一核心任务、输入、输出、本地数据和异常状态。只询问影响产品行为的缺失信息；平台约束直接从参考文档获取。

### 2. 输出能力判定

在实现前给出简短表格：需求、可行性、实现方式、限制。若有“当前不可实现”项，先处理范围问题。

### 3. 创建项目

若当前仓库是本 monorepo（存在根目录 `pnpm-workspace.yaml` 与 `packages/create-minitool`），优先：

```bash
pnpm create-minitool
# 或非交互：
pnpm create-minitool --name <kebab-name> --title <标题> --theme-color '#FF2442'
```

否则再复制 skill 起始模板：

```bash
cp -R "<skill-dir>/templates/starter" "<project-dir>"
```

不要覆盖已有用户文件。若用户提供现有仓库或目录，在其结构内工作。

### 4. 实现功能

保持入口明确、状态简单、错误可见。用 `textContent` 创建用户文本，避免把不可信输入写入 `innerHTML`。需要存储时处理解析失败、配额异常和清空／重置。需要摄像头、麦克风或媒体选择时，同时实现授权、拒绝、取消和无数据状态。

### 5. 自测与交付

运行静态校验；在断网状态和移动端视口测试核心流程；按“交付要求”提供文件和结论。

## 迁移工作流

### 1. 盘点项目

列出 HTML 入口、资源、依赖、API 请求、远程 URL、动态代码、WASM、Worker、导航、下载、iframe、浏览器／系统 API 和构建产物。

### 2. 建立迁移映射

| 原能力 | 迁移策略示例 |
|---|---|
| API 返回数据 | 改为包内 JSON、用户输入或本地存储；需要实时数据时判定为不可实现。 |
| CDN 脚本／样式／字体／图片 | 下载并审查可再分发的本地资源；无法合法本地化时替换。 |
| 框架内联脚本或行内事件 | 构建为包内 JS，并改用 addEventListener。 |
| WASM / Worker 库 | 换成纯 JavaScript、单线程实现；无替代则移除功能。 |
| 服务端登录 | 改为无账号本地模式；不要模拟服务端鉴权。 |
| 下载／导出 | 改为页面内预览、复制式人工操作或删除功能；剪贴板同样不可依赖。 |
| 多页面跳转 | 合并为单入口内的状态切换。 |

### 3. 迁移最终包

把开发源码和最终提交目录分开。最终目录只保留容器支持的文件，并再次扫描。

## 排错工作流

1. 先运行校验脚本，保存完整输出。
2. 按错误类型定位：

| 症状 | 优先检查 |
|---|---|
| CSP 错误、脚本不执行 | 内联 `<script>`、行内事件、`eval`、`new Function`、动态 import。 |
| 图片、字体或样式缺失 | 外部 URL、错误相对路径、未打包资源、`data:` / `blob:` 版本差异。 |
| 第三方库无法启动 | WASM、Worker、SharedArrayBuffer、网络请求、按需远程加载。 |
| 数据或登录失效 | 网络／Cookie 服务端假设、跨工具存储、持久化假设。 |
| 文件或媒体异常 | `accept` 超出图片／视频范围、权限拒绝、用户取消、旧版预览兼容。 |
| 点击后无反应 | 行内事件被拦截、禁止导航、新窗口、下载或表单提交。 |

3. 修复根因，不要用另一个被禁 API 规避限制。
4. 重新运行校验并复测最小复现和完整流程。

## 审查工作流

运行：

```bash
python3 "<skill-dir>/scripts/validate_xhs_tool.py" "<project-dir>"
```

需要把警告也作为非零状态时运行：

```bash
python3 "<skill-dir>/scripts/validate_xhs_tool.py" "<project-dir>" --strict
```

需要机器可读结果时增加 `--json`。修复所有 `ERROR`；逐项解释并处理 `WARNING`。自动扫描之后，按照 `references/release-checklist.md` 完成人工检查。不要仅检查源码目录，必须对最终提交目录再次运行校验。

## 交付要求

交付时附上项目文件和简洁报告，包含：

| 部分 | 必须说明 |
|---|---|
| **兼容性结论** | 可发布、修复后可发布或当前不可发布。 |
| **实现摘要** | 核心功能、数据位置、使用的容器能力。 |
| **自动检查** | 扫描目录、ERROR 数、WARNING 数和关键修复。 |
| **人工验证** | 已测试的断网、移动端、权限、空状态和异常路径。 |
| **已知限制** | 平台限制、降级行为和版本兼容性。 |

不要声称“已兼容”或“可发布”，除非校验脚本没有 `ERROR`，且关键人工流程已经测试。若无法执行真实容器测试，明确写成“静态兼容性检查通过，仍需在小红书容器实机验证”。

## 技能维护

修改 `scripts/validate_xhs_tool.py` 后运行：

```bash
python3 "<skill-dir>/scripts/test_validate_xhs_tool.py"
```

回归测试通过后，再用更新后的校验器扫描 `templates/starter/`，并重新验证技能结构。
