# NavBar

顶部导航栏，高 `size-navbar`（44px），标题居中。

**提供**：`title`、可选 `subtitle`、`back` + `onBack`（显示返回）、`left`（替代返回的左侧内容，如定位）、`right`（右侧操作，图标用 `NavBar.Icon`）、`tone`、`align`（`center` 默认 / `left`：大号左对齐标题，用于商家端工作台店名）、`children`（标题下方的一行，如搜索框）、`bordered`（默认有底部细线）。

| tone | 用于 | 底色 / 文字 |
|---|---|---|
| `brand` | 用户端首页 | `brand` / `on-brand` |
| `light` | 用户端内页、商家端全部页面 | `surface-raised` / `ink` |
| `admin` | 管理端全部页面 | `chrome` / `on-chrome` |

- `NavBar.Icon`：`name`、`label`（必填，读屏用）、可选 `badge`（`true` 为红点，数字为角标）。
- 用户端首页的定位放在 `left`：一个 `<button class="xz-nav__place title-sm">`，内含 `location` 图标、地址和 `chevron-down`。
- 右侧最多两个图标或一个文字按钮。
- 标题不超过 8 个字，超长省略；副标题用于计数或店名。
- `MobilePage` 的 `statusBar` 要和 tone 一致。
