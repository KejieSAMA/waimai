# PageHeader

桌面页面的标题行：面包屑、标题、状态、副标题和页面级操作。

**提供**：`title`、可选 `breadcrumb`（字符串数组，最后一项为当前页）、`subtitle`（计数或店名）、`tag`（标题旁的 `Tag`）、`actions`（右侧按钮）、`back` + `onBack`、`children`（标题下方一行，如 `Tabs`）。

- 标题 `title-lg`；一页只有一个 `PageHeader`。
- 主操作放最右，最多一个 `primary`；“取消”“导出”用 `outline`。
- 二级页（编辑、详情）写面包屑，一级页不写。
