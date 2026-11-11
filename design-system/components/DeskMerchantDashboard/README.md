# DeskMerchantDashboard

商家后台工作台：今日数据、近 7 日营业额、待处理事项、新订单。

- `DesktopShell role="merchant"`，侧栏底部放营业开关，关闭前弹 `Dialog variant="modal"` 确认。
- 第一行 4 张 `StatCard`，只有今日营业额用 `brand`；第二行 `TrendChart` + 待处理 `ListCell.Group`；第三行新订单三列，可直接接单。
