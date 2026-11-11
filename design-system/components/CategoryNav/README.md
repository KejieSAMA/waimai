# CategoryNav

点餐页左侧的竖向分类，宽 84px，与右侧菜品列表联动。

**提供**：`items`（`[{key, label, count}]`，`count` 为该分类已加购数量）、`value` + `onChange` 或 `defaultValue`。

- 底色 `surface-sunken`；选中项变成 `surface-raised`，与右侧列表连成一片，文字 `ink` 加粗。不加左侧色条。
- 分类名不超过 4 个字。
- 点击分类时右侧滚动到对应分组；右侧滚动时同步选中项（由页面实现）。
