# 快门查询

本地读取索尼、尼康相机照片的快门次数与拍摄信息。

上传相机直出 JPEG / RAW，在设备本地解析 EXIF / MakerNote，展示快门次数、机身型号、光圈快门 ISO 等参数。不联网、不上传原图。

## 可行性

| 需求 | 可行性 | 实现方式 | 限制 |
|---|---|---|---|
| 选择照片 | 可直接实现 | `<input type="file" accept="image/*">` | 容器仅开放图片/视频 |
| 快门次数 | 可直接实现（纯 JS） | 索尼：MakerNote `0x9050`；尼康：`0x00A7` | 需原机元数据；社交软件重导出常丢失 |
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

- 索尼、尼康的快门次数都来自相机写入的 MakerNote；索尼需要按机型偏移解密，尼康读取 `0x00A7` 标签。
- 电子快门 / 静音拍摄可能不增加机械快门计数。
- 静态兼容性检查通过后，仍需在小红书容器实机验证选图与预览。
