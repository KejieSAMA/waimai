# Dialog

确认弹窗（`center`）与底部面板（`sheet`），桌面端还有居中弹窗（`modal`）和右侧抽屉（`drawer`），盖在页面上。

**提供**：`title`（直接写问题，带上对象名）、`children`（后果说明）、`actions`（`[{label, variant, onClick}]`，最后一个为主操作）、`variant`（`center` 默认 / `sheet` / `modal` / `drawer`）、`open`、`onClose`（点遮罩或抽屉右上角关闭）。手机端放在 `MobilePage` 的 `overlay` 里，桌面端放在 `DesktopShell` 的 `overlay` 里。

- 以下动作必须先弹确认：下架在售商品、切换为休息、拒单、驳回、冻结商家。
- 主按钮重复动作本身：“确认下架”“确认冻结”，不写“确定”。危险且不可撤回的动作，主按钮用 `variant: 'danger'`。
- 需要选择或填写（驳回原因、退款原因、规格）时，手机端用 `sheet`，桌面端用 `modal`（宽 `size-modal`，按钮右对齐不通栏）。
- 桌面端查看并处理一条记录（入驻审核、订单详情）用 `drawer`：宽 `size-drawer`，从右侧滑出，列表仍可见；操作按钮固定在底部右侧。
- 正文说清楚后果和能否恢复：“下架后用户将看不到这道菜，可随时重新上架。”
