# 绿茵门神

30 秒冲刺接球小游戏：拖动球门接住足球，漏接扣生命，小心红黄牌。

## 玩法

- **足球 / 花式球 / 金球**：接到得分（连击有加成）
- **生命**：漏接足球扣 1 命，3 命耗尽即结束
- **加时**：+2 秒（有上限）
- **激励**：短时间得分 ×2
- **黄牌**：掉落变慢一段时间
- **红牌**：扣分

难度会随时间上升：掉落更快、刷得更密、球门略缩小、红黄牌更多。

## 开发

```bash
pnpm install
pnpm --filter football-catch dev
pnpm --filter football-catch build
pnpm --filter football-catch validate
```

构建产物在 `xhs-tool/`，可直接打成 zip 上传。
