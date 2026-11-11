# DeskAdminMerchants

运营后台商家管理：状态 Tab、筛选栏、商家表格、行内审核 / 冻结 / 解冻、分页。

- 手机端的 `MerchantRow` 在桌面换成 `DataTable`；操作按状态给出，危险动作用 `danger-text`。
- 冻结、驳回点击后弹 `Dialog variant="modal"` 选择原因；“审核”打开右侧审核抽屉（见 DeskAdminAudit）。
