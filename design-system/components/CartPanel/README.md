# CartPanel

用户端网页店铺页右侧的购物车面板：已选菜品、数量、优惠、合计和“去结算”。手机端对应 `CartBar`。

**提供**：`items`（`[{name, price, qty, spec}]`）、可选 `deliveryFee`、`discount` + `discountLabel`（如“满 30 减 5”）、`minOrder`、`label`、`onCheckout`、`onClear`。

- 宽 `size-cart-panel`（320px），在页面滚动时吸顶。
- 结算按钮状态与 `CartBar` 相同：空车显示“¥20 起送”，不足起送显示“差 ¥8 起送”且不可点。
- 优惠金额用 `brand-text`，其余明细 `ink-muted`；合计用 `price-lg`。
