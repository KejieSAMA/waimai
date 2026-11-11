# DishCard

用户端的一道菜：图片、名称、描述、月售、价格和加购。

**提供**：`name`、`price`、可选 `image`（1:1 菜品实拍；不传显示占位）、`desc`、`sales`、`original`（划线价）、`tags`、`soldOut`、`count` 或受控 `value` + `onChange`（加购数量）、`max`（限购）、`layout`（`row` 默认 / `grid`）。

- `row`：店铺点餐页右侧列表，图片 `size-thumb`（88px），放在白底容器里连续排列。
- `grid`：首页“推荐菜品”两列网格，不显示描述。
- 售罄时显示“已售罄”标签替代加购，名称变为 `ink-muted`；不要把售罄菜品藏起来。
- 名称不超过一行；描述只写口味和用料，不写营销语。
