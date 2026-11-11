# DeskAdminAudit

运营后台入驻审核：待审核表格，点“审核”从右侧滑出审核抽屉，列表仍在背后。

- 抽屉是 `Dialog variant="drawer"`（`size-drawer`）：店铺信息用 `InfoList`，证照两列，审核记录按时间排列。
- 底部固定“驳回”（`danger-outline`，选择原因后提交）和“审核通过”（`primary`）。
- 当前审核的那一行用 `activeKey` 高亮。
