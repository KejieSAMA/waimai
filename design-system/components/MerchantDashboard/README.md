# MerchantDashboard

商家端工作台：营业开关、今日数据、待处理事项。

- 顶栏 `NavBar align="left"` 显示店名，右侧消息带数字角标。
- 营业开关放第一位，用 `ListCell` + `Switch`；关闭前弹 `Dialog` 确认。
- 今日营业额用 `StatCard tone="brand"`，其余 4 项用 `size="sm"` 两列。
- 待处理用 `ListCell.Group`，数量用 `Tag`：新订单 `brand` 实底，退款 `danger`。
