# AdminMerchants

管理端商家管理：搜索、按状态分 Tab、行内审核 / 冻结 / 解冻。

- 顶栏 `NavBar tone="admin"`，副标题显示商家总数，右侧筛选（类目、城市、入驻时间）。
- 待审核 Tab 用 `alert` 角标，与底部“审核”Tab 数量一致。
- 每行 `MerchantRow`，操作按状态默认给出；冻结、驳回先选原因。
