# Select

下拉选择：桌面端筛选栏、表单里的枚举字段。用原生 `<select>`，键盘和读屏开箱即用。

**提供**：`options`（字符串或 `{value, label}`）、`value` + `onChange(value)` 或 `defaultValue`、可选 `label`（显示在框内左侧的灰字，如“类目”）、`placeholder`、`width`、`disabled`。

- 高度 `size-button-md`，`surface-sunken` 底，与 `Input` 一致。
- 筛选栏里用框内 `label` 写清维度（“类目：全部”），省掉外部标签。
- 手机端的选择改用 `Dialog variant="sheet"`，不要用原生下拉。
