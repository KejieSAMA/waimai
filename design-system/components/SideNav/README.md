# SideNav

商家端、管理端桌面版的左侧主导航，宽 `size-sidebar`（232px），顶部是品牌区。

**提供**：`role`（`merchant` / `admin`，使用预设分组）或自定义 `groups`（`[{title, items:[{key, label, icon, badge}]}]`）、`value` + `onChange` 或 `defaultValue`、可选 `badges`（`{orders: 3}`）、`footer`（底部内容，商家端放营业开关）、`brand` / `subtitle`（品牌区文字；`brand={false}` 去掉品牌区，作为卡片里的二级导航）。预设见 `SideNav.presets`。

| role | 底色 | 选中项 |
|---|---|---|
| `merchant` | `surface-raised` | `brand-soft` 底 + `brand-text` 字 |
| `admin` | `chrome` | `chrome-raised` 底 + `on-chrome` 字 |

- 与手机端 `TabBar` 一一对应，桌面多出“经营 / 店铺”“交易 / 平台”等二级入口。
- 角标只标需要处理的数量：新订单、待审核、退款纠纷。
- 768–1279px 时由 `DesktopShell` 收成 64px 只显示图标，鼠标悬停显示名称。
- 品牌区只写品牌名的文字，没有正式 Logo 前不要画图形标志。
