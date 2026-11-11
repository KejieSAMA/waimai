# InfoList

桌面详情的键值列表：审核详情、订单详情、店铺资料。手机端对应 `ListCell`。

**提供**：`items`（`[{label, value}]`，`value` 可以是节点）、可选 `columns`（1 默认 / 2）。

- 标签列宽 96px，`ink-muted`；值 `ink`，长文本自动换行。
- 抽屉里用 1 列；页面里宽度够时用 2 列。
- 电话、证件号只显示尾号。
