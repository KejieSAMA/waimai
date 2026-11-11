# MobilePage

手机页面骨架：状态栏、导航栏、可滚动内容、底部栏和底部安全区，三端每个页面都从它开始。

**提供**：`navBar`（一个 `NavBar`）、`children`（页面内容）、可选 `bottom`（`TabBar` 或底部操作栏）、`bottomTone`（`raised` 默认 / `clear`：底部内容悬浮在页面上，如 `CartBar`）、`statusBar`（`light` 默认 / `brand` / `admin` / `surface` / `false`，与顶栏同色）、`overlay`（`Dialog`）。

- 容器需要给它确定的高度（App 内为视口高度）；内容区独立滚动，顶栏和底部栏固定。
- 一级页面 `bottom` 放 `TabBar`；二级页面放通栏主按钮（如“保存并上架”），不放 Tab。
- 底部安全区 `size-safe-bottom` 由组件留出，不要在内容里再加。
- 预览里的圆角设备外框（`.xz-device`）只用于展示，产品代码不需要。
