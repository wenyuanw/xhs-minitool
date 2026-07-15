# 小红书小工具容器能力参考

使用本参考判断需求可行性、选择技术方案和解释兼容性问题。页面将小工具描述为运行在受限沙箱中的纯 Web 应用；应将其视为“能力受限的浏览器页面”，并按完全离线、自包含方式开发。[1]

> 本参考最后核验于 **2026-07-15**。涉及边界能力、版本差异或正式发布时，重新打开文末官方清单确认规则未更新；若官方内容与本参考冲突，以官方内容为准。

## 运行模型

| 维度 | 约束 |
|---|---|
| 技术栈 | 使用标准 HTML、CSS、JavaScript 和标准 Web API；没有额外原生桥接接口。 |
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
| 存储 | localStorage、sessionStorage、IndexedDB、Cookie、Cache API，按小工具隔离。 |
| 基础对话 | `alert()`、`confirm()` 可用；`window.prompt` 禁用。 |

不要假设本地数据永久持久化。Cookie 只能作为本地存储，不能随网络请求传给服务端，也不能用于服务端登录态或鉴权透传；优先使用 localStorage 或 IndexedDB。[1]

## 资源加载白名单

| 资源 | 允许 | 禁止 |
|---|---|---|
| 脚本 | 包内 `.js` 文件。 | 内联脚本、行内事件、`javascript:` URI、外部脚本、`data:` / `blob:` 脚本。 |
| 样式 | 内联样式、`<style>`、包内 CSS。 | 外部域名样式表。 |
| 图片 | 包内图片、`data:` URI、`blob:` 内存对象。 | 外部域名图片。 |
| 字体 | 包内 `.woff` / `.woff2`。 | 外部域名字体。 |
| iframe / object | 无。 | 全部禁止。 |

`<img>` 加载 `data:` / `blob:` 自 9.37 版本起支持。兼容 9.37 之前版本时，使用 `createImageBitmap` 加 Canvas 绘制作为替代。[1]

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

禁止网络加载、iframe 嵌入、被外部页面嵌入、`<form>` 跳转提交、Flash 等插件、`a[download]` 或 blob 下载、`target="_blank"`、站外跳转、跨小工具跳转和长按菜单。移动端 WebView 还不支持 PaymentRequest、系统通知／推送、NFC、MIDI、XR / AR / VR、后台同步／下载、PWA 安装、窗口管理以及指针／键盘锁定。[1]

## WebGL 边界

本地资源、Canvas 和内存对象可以作为纹理。外部图片纹理、依赖 WASM 的 Draco / Basis / ONNX 等加速库、OffscreenCanvas + Worker、SharedArrayBuffer 多线程均不可用。将 WebGL 限定为使用包内资源的本地渲染；不要承诺云端模型、WASM 模型或多线程重计算。[1]

## 可行性判定

| 需求 | 判定 |
|---|---|
| 纯本地界面、计算、表单、编辑、静态内容 | 可实现。 |
| Canvas 或使用本地纹理的轻量 WebGL | 可实现。 |
| 摄像头、麦克风、图片／视频选择 | 可实现，但需授权并受类别限制。 |
| 本地数据库和偏好保存 | 可实现，但不保证永久持久化。 |
| 在线 API、账号登录、实时同步、远程资源 | 当前不可实现。 |
| WASM、Worker、多线程、系统级 Web API | 当前不可实现。 |
| 下载文件、打开外链、iframe、跨工具导航 | 当前不可实现。 |

## References

[1]: https://fe.xiaohongshu.com/ditto/vincent/9e60cefbd7024e1cb783383308cb1aa5?naviHidden=yes&fullscreen=true&source=splash "小红书小工具能力清单"
