# Input

单行或多行文本输入，带标签、提示和错误信息。

**提供**：`label`、`placeholder`、`value` 或 `defaultValue`（受控时加 `onChange`）、可选 `required`、`hint`、`error`（替换 hint 并标红）、`prefix` / `suffix`（如 `¥`、`元`、`份`）、`multiline`、`layout`（`vertical` 默认 / `horizontal`），其余属性透传给 `<input>`。

- `vertical`：标签在上，`surface-sunken` 底，用于登录、搜索筛选、弹窗内输入。
- `horizontal`：标签在左 88px，白底整行，多行连续堆叠成表单卡片，用于商家端商品编辑、店铺设置等长表单。外层容器负责圆角。
- 错误文案说清楚原因和规则（“起送价不能低于 ¥20”），不要只写“格式错误”。
- 单位放 `suffix`，不要写进 placeholder。
