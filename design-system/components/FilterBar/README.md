# FilterBar

桌面列表页的筛选栏：搜索框 + 若干 `Select`，右侧“重置”“查询”。

**提供**：`children`（`SearchBar`、`Select`、`Input`）、`onSearch`、`onReset`。

- 放在 `PageHeader` / `Tabs` 与 `DataTable` 之间。
- 一行放得下就不折行：搜索 + 最多 4 个筛选项。更多条件收进“更多筛选”抽屉。
- 状态筛选不放这里，用表格上方的 `Tabs`（与手机端一致）。
