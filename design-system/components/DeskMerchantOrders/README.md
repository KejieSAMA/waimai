# DeskMerchantOrders

商家后台订单看板：新订单 / 备餐中 / 配送中 / 退款 四列，卡片上直接处理。

- 手机端的状态 Tab 在桌面展开成四列，订单从左往右流转；列头数量 `Tag` 按状态色。
- 卡片沿用 `OrderCard view="merchant"`；备注、退款理由用 `warning-soft` 高亮。
- 拒单、拒绝退款要选原因，弹 `Dialog variant="modal"`。
