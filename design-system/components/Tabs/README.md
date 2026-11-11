# Tabs

页面内切换：按状态分列表（`line`），或按类目筛选（`chip`）。

**提供**：`items`（字符串数组，或 `[{key, label, count, alert}]`）、`value` + `onChange` 或 `defaultValue`、`variant`（`line` 默认 / `chip`）。

- `line`：放在导航栏下方，2–5 项平分宽度，选中项 `ink` 加粗 + 底部 `brand` 短条。`count` 显示该状态的数量；`alert: true` 表示需要立刻处理（新订单、待审核），数量变成品牌色角标。
- `chip`：横向滚动的胶囊，用于用户端类目筛选、管理端商家类目筛选。选中 `brand-soft` 底 + `brand-text` 字。
- Tab 文案用 README「状态色」表里的状态词。
