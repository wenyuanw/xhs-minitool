# 索尼快门

本地读取索尼相机照片的快门次数与拍摄信息。

上传索尼相机直出 JPEG（或可选的 ARW），在设备本地解析 EXIF / MakerNote，展示快门次数、机身型号、光圈快门 ISO 等参数。不联网、不上传原图。

## 可行性

| 需求 | 可行性 | 实现方式 | 限制 |
|---|---|---|---|
| 选择照片 | 可直接实现 | `<input type="file" accept="image/*">` | 容器仅开放图片/视频；ARW 在移动相册里往往不可选 |
| 快门次数 | 可直接实现（纯 JS） | 解析 MakerNote `0x9050` 并按 ExifTool 算法解密 | 需原机元数据；社交软件重导出常丢失；机型偏移表需维护 |
| 拍摄参数 | 可直接实现 | 标准 EXIF | 无 EXIF 时无法展示 |
| 隐私本地处理 | 可直接实现 | `File` / `ArrayBuffer` 本地解析 | — |

## 快速开始

```bash
pnpm install
pnpm --filter sony-shutter dev
```

## 打包上传

```bash
pnpm --filter sony-shutter build
pnpm --filter sony-shutter validate
```

产物：

- `xhs-tool/` — 提交文件夹
- `sony-shutter-xhs-tool.zip` — 上传压缩包

## 说明

- 快门次数来自索尼加密 MakerNote，不同世代机身偏移不同（如 `0x32` / `0x3a` / `0x0a`）。
- 电子快门 / 静音拍摄可能不增加机械快门计数。
- 静态兼容性检查通过后，仍需在小红书容器实机验证选图与预览。
