# DataTable

桌面端的数据表格：商家端商品与订单、管理端商家与审核。手机端对应的是卡片列表（`ProductRow`、`MerchantRow`）。

**提供**：`columns`（`[{key, title, width, align, num, render(row)}]`；`num: true` 用 `num` 字体等宽数字）、`rows`、`rowKey`、可选 `selectable` + `selected` / `onSelect` 或 `defaultSelected`、`batchActions`（选中后出现在表头上方的批量操作）、`onRowClick` + `activeKey`（点行打开抽屉时高亮当前行）、`toolbar`、`footer`（通常放 `Pagination`）、`empty`。`DataTable.Media` 渲染“图片 + 名称 + 副标题”单元格。

- 行高至少 `size-row`；悬停 `surface-hover`，选中与当前行 `brand-soft`。
- 金额、数量列右对齐并设 `num: true`；状态列用 `Tag`，状态词按 README「状态色」表。
- 行内操作用 `text` 按钮（危险动作用 `danger-text`），最多 3 个，其余收进“更多”。
- 批量操作只放可撤回的动作（上架、下架、改库存）；冻结、驳回这类要填原因的不做批量。
