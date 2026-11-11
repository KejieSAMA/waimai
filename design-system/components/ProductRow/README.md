# ProductRow

商家端商品管理的一行：图片、名称、状态、月售库存、价格，以及上下架开关和编辑。

**提供**：`name`、`price`、`status`（`on` 在售 / `soldout` 已售罄 / `off` 已下架 / `review` 审核中 / `rejected` 审核驳回）、可选 `image`、`original`、`sales`、`stock`、`lowStock`（库存预警阈值，默认 5，低于时库存数字变 `warning` 色）、`category`、`reason`（驳回或强制下架原因）、`locked`（被平台强制下架时锁住开关）、`onToggle(next)`、`onEdit`、`onMore`。

- 开关就是上下架：`on` 和 `soldout` 为开，`off` 为关；`review`、`rejected`、`locked` 时开关禁用。
- 关闭在售商品前必须用 `Dialog` 确认“确认下架”。
- 驳回原因用 `danger-soft` 底完整显示在卡片里，按钮变为“修改”。
- 列表按状态分 Tab：在售（含已售罄）/ 已下架 / 审核中（含驳回）。
