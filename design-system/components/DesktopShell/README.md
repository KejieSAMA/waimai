# DesktopShell

商家端、管理端桌面版的页面骨架：左侧 `SideNav`、顶栏（搜索、消息、账号）、可滚动的内容区。

**提供**：`role`（`merchant` / `admin`）、`children`（页面内容，通常以 `PageHeader` 开头）、可选 `nav`（传给 `SideNav` 的参数：`value`、`badges`、`footer`…）、`search`（顶栏搜索框的 placeholder）或 `topLeft`、`topRight`（消息图标左侧的额外内容）、`notices`（消息数）、`user`（`{name, role}`）、`overlay`（桌面 `Dialog`，盖住整个壳）。

- 容器给它视口高度；内容区内边距 `space-6`，独立滚动，侧栏和顶栏固定。
- 根元素带 `xz-desk`，在它里面输入框、下拉高度统一为 `size-button-md`，卡片有悬停抬起。
- 断点：≥1280px 完整侧栏；768–1279px 侧栏收为 `size-sidebar-collapsed`；<768px 不用它，换手机端 `MobilePage` + `TabBar`。
