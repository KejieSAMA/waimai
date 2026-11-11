# SiteHeader

用户端网页的顶栏：品牌名、收货地址、搜索、导航、购物车和账号，`brand` 底。

**提供**：可选 `brand`（默认“小灶”）、`location`、`search`（placeholder）、`links`（默认 首页 / 我的订单）、`value` + `onChange` 或 `defaultValue`、`cartCount`、`user`（`{name}`；不传显示“登录”）。

- 与手机端首页的 `NavBar tone="brand"` 对应：用户端网页每一页都用它，不随页面换色。
- 内容宽度跟随 `size-content`（1200px）居中，高度 `size-topbar` + `space-2`。
- 品牌名用文字，没有正式 Logo 前不要画图形标志。
