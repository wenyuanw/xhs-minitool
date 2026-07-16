# 绿茵门神

左右拖动球门接住掉落的足球，避开红黄牌，捡起加时与激励道具。纯本地离线小游戏，适合小红书小工具容器。

## 玩法

- **足球 / 花式球 / 金球**：接到得分（连击有额外奖励）
- **加时**：倒计时 +5 秒
- **激励**：短时间内得分 ×2
- **黄牌**：掉落速度变慢一段时间
- **红牌**：扣除分数

## 开发

```bash
pnpm install
pnpm --filter football-catch dev
pnpm --filter football-catch build
pnpm --filter football-catch validate
```

构建产物在 `xhs-tool/`，可直接打成 zip 上传。
