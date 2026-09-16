# 小红书小工具容器能力参考

使用本参考判断需求可行性、选择技术方案和解释兼容性问题。页面将小工具描述为运行在受限沙箱中的纯 Web 应用；应将其视为“能力受限的浏览器页面”，并按完全离线、自包含方式开发。[1]

> 本参考最后核验于 **2026-09-16**（官方页面标注更新日期 2026-09-10）。涉及边界能力、版本差异或正式发布时，重新打开文末官方清单确认规则未更新；若官方内容与本参考冲突，以官方内容为准。

## 运行模型

| 维度 | 约束 |
|---|---|
| 技术栈 | 标准 HTML / CSS / JavaScript；Android 8.1 / Chrome 61、ES2017 基线，iOS 最低 18.4。 |
| 端能力 | 容器自动注入 `window.xhs.miniTool`；仅开放文档列出的方法，无需引入 SDK 脚本。 |
| 沙箱 | 敏感 Web 能力受限；文件选择、页面跳转等行为由容器统一管控。 |
| 隔离 | 每个小工具具有独立存储和运行环境；不同小工具不能访问彼此数据或通信。 |
| 网络 | 本期纯本地运行；页面、脚本、图片、字体和数据必须全部打包。 |

## 可用能力

| 领域 | 能力与说明 |
|---|---|
| 页面 | 常规 HTML / CSS / JS、Flexbox、Grid、动画、媒体查询。 |
| 样式 | `<style>`、`style="…"`、包内样式表。 |
| 脚本 | 通过 `<script src="./app.js">` 引入包内 JavaScript。 |
| 图形 | Canvas 2D 完整支持；WebGL / WebGL2 的纯本地渲染可用。 |
| 媒体采集 | `getUserMedia({video})`、`getUserMedia({audio})`，需系统授权。 |
| 文件选择 | `<input type="file">` 接入系统选择器，但只开放图片和视频类别。 |
| 播放 | `<video>`、`<audio>` 支持内联播放。 |
| 存储 | 9.46.0+ 使用 Storage JS API；浏览器存储仅作不满足版本条件时的降级。 |
| 图片保存／笔记 | `saveImageToPhotosAlbum` 保存相册，`postNote` 唤起发布页；媒体只接受本地路径或 base64 data URI。 |
| 临时文件 | `writeTempFile` 将 base64 写成临时文件供端 API 使用，不开放任意文件系统访问。 |
| 基础对话 | `alert()`、`confirm()` 可用；`window.prompt` 禁用。 |

存储按工具隔离，不承诺永久有效。浏览器的 localStorage、sessionStorage、IndexedDB、Cookie、Cache API 不保证可用或持久；仅兼容降级时使用，并容忍异常、缺失和清理。Cookie 不能提供服务端登录态。Storage 的版本判断、容量、迁移和端 API 参数见 [native-apis.md](native-apis.md)。[1]

## 兼容基线

最终脚本须满足 ES2017 / Chrome 61；高版本语法需构建转译。新 Web API 必须检测并提供降级；转译不能补齐浏览器 API。CSS 也须兼容 Chrome 61：先提供基础布局，再增强现代特性，例如在 `env()`、`max()`、`clamp()`、`dvh` 前保留可用的普通声明；Flex gap 不能成为唯一间距来源。真实最低版本验证不能用现代桌面浏览器代替。[1]

## 资源加载白名单

| 资源 | 允许 | 禁止 |
|---|---|---|
| 脚本 | 包内 `.js` 文件。 | 内联脚本、行内事件、`javascript:` URI、外部脚本、`data:` / `blob:` 脚本。 |
| 样式 | 内联样式、`<style>`、包内 CSS。 | 外部域名样式表。 |
| 图片 | 包内图片、`data:` URI、`blob:` 内存对象。 | 外部域名图片。 |
| 字体 | 包内 `.woff` / `.woff2`。 | 外部域名字体。 |
| iframe / object | 无。 | 全部禁止。 |

当前官方文档允许图片预览使用 `data:` / `blob:`。这不等同于端 API 接受 `blob:` URL；保存／发布请传 base64 data URI 或本地文件路径。[1]

## 支持的包内文件类型

最终提交包只保留下列类型：

- `.html`：必须且只能有一个入口文件。
- `.css`、`.js`。
- `.png`、`.jpg`、`.jpeg`、`.gif`、`.webp`、`.svg`。
- `.woff`、`.woff2`。
- `.json`。

不要把源码依赖树、构建缓存、Source Map、文档、服务端文件或其他格式混入最终提交包。[1]

## 禁用的 API

| 分类 | 禁用能力 |
|---|---|
| 网络与实时通信 | fetch、XMLHttpRequest、`navigator.sendBeacon`、WebSocket、EventSource / SSE、WebRTC、WebTransport、轮询所依赖的网络请求。 |
| 动态代码 | eval、new Function、WebAssembly。 |
| 后台与多线程 | Worker、SharedWorker、Service Worker、SharedArrayBuffer、OffscreenCanvas + Worker。 |
| 定位与剪贴板 | navigator.geolocation、navigator.clipboard、execCommand 的 copy / cut / paste。 |
| 硬件与传感器 | 蓝牙、USB、HID、串口、加速度计、陀螺仪、磁力计、环境光、设备运动／朝向。 |
| 屏幕与设备信息 | 屏幕共享、requestFullscreen、电池状态、网络信息、媒体设备枚举。 |
| 存储进阶与文件系统 | 持久化存储、跨域存储访问、File System Access API。 |
| 凭据与锁 | WebAuthn、navigator.credentials、Web Locks。 |
| 窗口 | window.open、window.prompt。 |

## 禁用的行为

禁止网络加载、iframe 嵌入、被外部页面嵌入、`<form>` 跳转提交、Flash 等插件、`a[download]` 或 blob 下载、`target="_blank"`、站外跳转、跨小工具跳转和长按菜单。保存图片应改用官方 `saveImageToPhotosAlbum`；笔记发布使用 `postNote`，不通过页面跳转或下载规避限制。移动端 WebView 还不支持 PaymentRequest、系统通知／推送、NFC、MIDI、XR / AR / VR、后台同步／下载、PWA 安装、窗口管理以及指针／键盘锁定。[1]

## WebGL 边界

本地资源、Canvas 和内存对象可以作为纹理。外部图片纹理、依赖 WASM 的 Draco / Basis / ONNX 等加速库、OffscreenCanvas + Worker、SharedArrayBuffer 多线程均不可用。将 WebGL 限定为使用包内资源的本地渲染；不要承诺云端模型、WASM 模型或多线程重计算。[1]

## 可行性判定

| 需求 | 判定 |
|---|---|
| 纯本地界面、计算、表单、编辑、静态内容 | 可实现。 |
| Canvas 或使用本地纹理的轻量 WebGL | 可实现。 |
| 摄像头、麦克风、图片／视频选择 | 可实现，但需授权并受类别限制。 |
| 本地数据库和偏好保存 | 使用符合版本条件的 Storage API；旧版兼容存储可能失败或丢失。 |
| 生成图片存相册／携带媒体发笔记 | 使用官方端 API；处理权限、取消、无 SDK 和版本差异。 |
| 在线 API、账号登录、实时同步、远程资源 | 当前不可实现。 |
| WASM、Worker、多线程、系统级 Web API | 当前不可实现。 |
| 任意文件下载、打开外链、iframe、跨工具导航 | 当前不可实现。 |

## References

[1]: https://miniapp-sandbox.xiaohongshu.com/minitool/doc "小红书小工具能力清单"
