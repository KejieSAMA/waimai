# DeskMerchantProducts

商家后台商品管理：状态 Tab、筛选、商品表格、批量上下架、分页。

- 手机端的 `ProductRow` 在桌面换成 `DataTable`：上架开关、库存预警、状态 `Tag` 都在同一行。
- 勾选后出现批量操作条（批量下架、批量改库存）；下架前仍需 `Dialog variant="modal"` 确认数量和后果。
- 审核中、审核驳回的商品在“审核中”Tab，开关禁用，驳回原因显示在名称下方。
