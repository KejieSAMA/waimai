# AdminDashboard

管理端数据总览：平台 GMV、核心指标、待办。

- 顶栏 `NavBar tone="admin"`，GMV 用 `StatCard tone="chrome"` 放在顶栏 children 里，与顶栏连成一块。
- 4 项核心指标用 `StatCard size="sm"` 两列。
- 待办用 `ListCell.Group`，数量 `Tag` 按状态色：入驻 `warning`、商品审核 `info`、纠纷 `danger`。
