# Checkbox

多选框：桌面表格的行选择与全选、表单里的多个可选项。

**提供**：`checked` + `onChange(next)` 或 `defaultChecked`、可选 `label`（不传时必须传 `aria-label`）、`indeterminate`（部分选中，表格表头用）、`disabled`。

- 选中用 `brand` 填充 + `on-brand` 对勾；未选用 `line-strong` 描边，两套主题都 ≥3:1。
- 立即生效的单个开关用 `Switch`，不用多选框。
- 点击不会冒泡，放在可点的表格行里不会触发行点击。
