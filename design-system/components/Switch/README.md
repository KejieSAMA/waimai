# Switch

立即生效的开关：商家营业 / 休息、商品上架 / 下架、通知开关。

**提供**：`checked` + `onChange(next)`（受控）或 `defaultChecked`、可选 `label`（显示在左侧；不传时必须传 `aria-label`）、`disabled`。

- 开启用 `brand` 轨道，关闭用 `line-strong` 轨道，两套主题都 ≥3:1。
- 关闭会影响用户的开关（下架在售商品、切换为休息），在 `onChange` 里先弹 `Dialog` 确认，再改状态。
- 审核中、被平台强制下架时设 `disabled`，并在旁边写明原因。
- 需要“保存”才生效的选项不要用开关。
