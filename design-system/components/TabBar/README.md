# TabBar

底部主导航，高 `size-tabbar`（50px），每端固定一组入口。

**提供**：`role`（`user` / `merchant` / `admin`，使用预设入口）或自定义 `items`（`[{key, label, icon, badge}]`）、`value` + `onChange` 或 `defaultValue`、可选 `badges`（`{orders: 3, me: true}`，数字为角标，`true` 为红点）。预设见 `TabBar.presets`。

| 端 | 入口 |
|---|---|
| 用户端 | 首页 · 订单 · 我的 |
| 商家端 | 工作台 · 订单 · 商品 · 我的 |
| 管理端 | 总览 · 商家 · 审核 · 我的 |

- 选中项用 `brand-text`，未选中 `ink-muted`。三端都一样，不要为管理端换颜色。
- 角标只标“需要处理”的数量：商家端新订单数、管理端待审核数。超过 99 显示 `99+`。
- 只放在一级页面。
