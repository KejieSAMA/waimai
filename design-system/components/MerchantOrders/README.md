# MerchantOrders

商家端订单：新订单 / 备餐中 / 配送中 / 退款，卡片上直接处理。

- 新订单 Tab 用 `alert` 角标，底部 Tab 同步数量。
- `OrderCard view="merchant"`：流水号 + 外卖/自提 + 尾号，完整菜品明细，备注高亮。
- 新订单给“拒单”（`danger-outline`，需选原因）和“接单”；备餐中给“出餐完成”；退款给“拒绝”“同意退款”。
