# 小工具 JSBridge API 规范（现行网页补充）

来源：[官方能力清单 §3](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3)，核验于 **2026-09-16**，页面标注更新日期 2026-09-10。使用保存图片、发笔记、临时文件或业务数据缓存时读取；参数或版本有疑问时重新核对官方页面。

官方 1.6.0 下载包与当前网页的 API 章节存在差异：原包缺少 Storage / getLaunchOptions，实况字段为 `live_photo_resources`，另列 `openRedPage`、`tags` 及笔记网络媒体地址。本文按当前网页维护这些契约，不混用字段。`writeTempFile` 始终传完整 data URI（原包拒绝裸 base64），兼容两份文档；发布前按目标客户端和上传页当前指引验证。

## 入口与调用语义

- 容器自动注入 `window.xhs.miniTool`，无需引入 SDK。先用 `window.xhs && window.xhs.miniTool` 判空，再检查具体方法是否为函数。普通浏览器可能没有 SDK，应显示预览／环境说明，不能伪报成功。
- 仅调用官方公开 API：`postNote`、`saveImageToPhotosAlbum`、`writeTempFile`、`getLaunchOptions`、`setStorage`、`getStorage`、`getStorageInfo`、`removeStorage`、`clearStorage`。不探测私有桥接方法。
- 不传回调时返回 Promise；传入 `success`、`fail`、`complete` 中任意一个即返回 `undefined`。不要同时用回调与 `await` 推断完成。
- 成功结果包含 `errMsg: "<api>:ok"`；失败对象包含 `errMsg: "<api>:fail ..."`，可带 `errCode`。SDK 与客户端都会校验参数，未声明字段不要传；错误码未列明时不要自行假定含义。
- 图片、视频和封面字段仅接受 base64 data URI 或本地文件路径，不接受网络地址；`blob:` 预览 URL 不作为端 API 路径传入。

## 保存图片与临时文件

| API | 入参 | 成功结果／约束 |
|---|---|---|
| `saveImageToPhotosAlbum` | `{ filePath: string }` | 图片 data URI 或 `writeTempFile` 返回的路径。须由用户点击等主动操作触发，拒绝相册权限会失败。 |
| `writeTempFile` | `{ data: string }` | 统一传完整 `data:<mime>;base64,...`；结果含 `filePath`。仅支持 png、jpeg、webp、gif、mp4 等官方列出的图片／视频类型。 |

小图可直接传 `canvas.toDataURL("image/png")`；大图建议先写临时文件，减少后续 API 传递的 base64 体积。临时路径即用即弃，不保存到 Storage，不保证跨会话有效。支持运行时视频临时文件，不等于 zip 文件白名单允许 `.mp4`。

以下代码放入包内 `.js` 文件，由保存按钮的点击事件调用；`showStatus` 是项目自行提供的页面反馈函数：

```js
async function saveCanvasImage(canvas, showStatus) {
  const api = window.xhs && window.xhs.miniTool;
  if (!api || typeof api.saveImageToPhotosAlbum !== "function") {
    showStatus("请在支持保存图片的小红书容器中使用");
    return;
  }
  try {
    let filePath = canvas.toDataURL("image/png");
    if (typeof api.writeTempFile === "function") {
      const result = await api.writeTempFile({ data: filePath });
      filePath = result.filePath;
    }
    await api.saveImageToPhotosAlbum({ filePath });
    showStatus("图片已保存到相册");
  } catch (error) {
    showStatus((error && error.errMsg) || "保存失败，请检查相册权限后重试");
  }
}
```

不要把失败回退为 `a[download]`、Blob 下载、外链或系统分享 API。

## 发笔记：`postNote`

功能是带入内容并唤起 App 的发布页，用户仍可编辑或取消。成功回调表示发布页唤起且用户点击了发布，**不表示最终审核通过**，不可作为强一致业务凭据。无 SDK／取消／失败时保留用户作品，不标记为已发布。

| 字段 | 必填 | 约束 |
|---|---|---|
| `title` | 否 | 字符串，最多 20 字。 |
| `content` | 否 | 字符串，最多 1000 字。 |
| `pageType` | 否 | `video_publish`、`photo_publish`、`slides_edit`；官方标注客户端 9.43+。 |
| `mediaInfo` | 是 | 以下三类至少一种，也可同时传。 |
| `mediaInfo.image_resources` | 否 | 1–18 项数组，每项 `{ url }`。 |
| `mediaInfo.video_resources` | 否 | 单个对象 `{ video_url, cover_url? }`。 |
| `mediaInfo.live_photo_sources` | 否 | 1–18 项数组，每项 `{ url, video_url }`；客户端 9.43+。 |

最小图文调用参数（在 SDK 检查及 `try/catch` 内执行，`imagePath` 为有效 data URI 或本地路径）：

```js
await api.postNote({
  title: "今日手作",
  content: "记录这次创作",
  mediaInfo: { image_resources: [{ url: imagePath }] },
});
```

需要 `pageType` 或实况照片时先判断 9.43+；版本未知时省略可选 `pageType`，实况需求提示版本限制或经产品允许改普通图片。官方未在当前页给出其他媒体 API 的统一最低版本，不自行编造；始终检查方法并处理失败。

## 客户端版本判断

`buildVersion` 最后 3 位是编译序号；例如 `9462004` 对应 9.46.2，应先 `Math.floor(buildVersion / 1000)` 得到 `9462`，再与 `9460`（9.46.0）比较。不要直接按原始数值或字符串比较客户端版本。

先读 `window.xhs.launchOptions.miniToolEnv.buildVersion`，每层判空；缺失时检查并调用异步 `miniTool.getLaunchOptions()`，从返回对象相同字段读取。两路失败按未知版本处理，不启用 Storage API。

```js
function readBuildVersion(options) {
  const env = options && options.miniToolEnv;
  const value = Number(env && env.buildVersion);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

async function getClientVersion() {
  const xhs = window.xhs;
  let build = readBuildVersion(xhs && xhs.launchOptions);
  const api = xhs && xhs.miniTool;
  if (!build && api && typeof api.getLaunchOptions === "function") {
    try {
      build = readBuildVersion(await api.getLaunchOptions());
    } catch (error) {
      build = 0;
    }
  }
  return Math.floor(build / 1000);
}
```

## Storage：客户端 9.46.0+

| API | 业务参数 | 结果／说明 |
|---|---|---|
| `setStorage` | `{ key: string, data: any, encrypt?: boolean }` | 写入／覆盖，`data` 须可 JSON 序列化。 |
| `getStorage` | `{ key: string, encrypt?: boolean }` | 成功结果的 `data` 是所存数据。 |
| `getStorageInfo` | 无 | 结果含 `keys`、`currentSize`、`limitSize`，容量单位 KB。 |
| `removeStorage` | `{ key: string }` | 删除单个 key。 |
| `clearStorage` | 无 | 清空当前小工具全部缓存。仅用户明确选择重置整个工具时使用。 |

- 每个 key 上限 1 MB，工具全部缓存上限 10 MB；不要把大图／视频 base64 当作日常业务缓存。
- `encrypt` 默认 `false`，读取时须与写入一致；不要自行对其安全效果做额外承诺。
- 版本达到 `9460` 才使用 Storage，并检查业务所需的方法。新版缺方法应提示环境异常／暂用内存；已选 Storage 的调用失败应反馈失败，不悄悄切换浏览器存储造成两份状态。
- 低版本或版本未知时可降级 localStorage / IndexedDB 等；所有访问（包括读取存储对象本身）、解析和写入均置于异常处理内，数据可能缺失、失效或被清理。失败时保留当前内存数据并明确提示没有保存成功。
- 读写使用同一后端和相同的 `encrypt`。初始化完成前避免编辑覆盖恢复数据，异步写入串行处理或采用应用自己的顺序控制。

下面只演示**单次写入选择**，不是完整存储适配器；读取、删除和迁移必须遵守同样的后端选择：

```js
async function setLocalData(key, data) {
  const version = await getClientVersion();
  const api = window.xhs && window.xhs.miniTool;
  try {
    if (version >= 9460) {
      if (!api || typeof api.setStorage !== "function") return false;
      await api.setStorage({ key, data });
    } else {
      localStorage.setItem(key, JSON.stringify(data));
    }
    return true;
  } catch (error) {
    return false;
  }
}
```

调用者必须检查返回值；`false` 不能显示“已保存”。业务如需只删自己的数据，使用 `removeStorage`，避免 `clearStorage` 清掉其他模块的缓存。

### 从旧浏览器存储升级

迁移与一致性由开发者维护，平台不会自动搬迁。建议按业务 key 明确制定策略：先成功读取原生状态或通过 `getStorageInfo().keys` 确认缺失；只有确认未迁移时才尝试读取并校验旧数据，写入原生且确认成功后再标记迁移完成／清理旧副本。不要把任意读取失败当成 key 不存在，也不要用旧浏览器副本覆盖已有原生数据。迁移失败保留旧数据并提供重试；如需支持客户端降级，另外定义冲突解决规则。

## 验证重点

无 SDK、低版本、版本未知、异步获取版本、9.46.0 边界、存储失败／配额／迁移、`encrypt` 一致性；保存按钮主动触发、拒绝权限、大图临时文件、发布页取消及失败。本地 mock 只验证逻辑，保存到相册、发布页和原生持久化必须在小红书 iOS／Android 容器验证。
