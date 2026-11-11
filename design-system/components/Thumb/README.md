# Thumb

小图：菜品图或店铺 Logo，用在表格、列表的行首。

**提供**：`kind`（`dish` 默认 / `logo`）、`src`、`name`（无图时 Logo 显示首字，菜品显示碗形占位）、`size`（`md` = `size-logo` 48px / `lg` = `size-thumb-sm` 64px）。

- 表格里用 `DataTable.Media`，它把 `Thumb`、名称和副标题排好。
- 圆角统一 `radius-md`；不要拉伸，图片按 1:1 裁切。
