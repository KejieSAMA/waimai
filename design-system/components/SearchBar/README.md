# SearchBar

胶囊形搜索框，放在导航栏下方或列表顶部。

**提供**：`placeholder`（写清楚能搜什么）、可选 `value`、`tone`（`default` 用 `surface-sunken` 底；`brand` 放在品牌色顶栏里，用 `surface-raised` 底）、`action` + `onAction`（右侧文字按钮）。

- 用户端首页放在 `NavBar tone="brand"` 的 children 里，用 `tone="brand"`。
- 商家端商品管理、管理端商家管理放在 Tabs 上方，用默认 tone。
- placeholder 写“搜索店铺、菜品”“搜索商家名称 / 负责人”，不要只写“搜索”。
