# CartBar

店铺点餐页底部悬浮的购物车栏：数量、合计、配送费和“去结算”。

**提供**：`count`、`total`、可选 `deliveryFee`、`minOrder`（起送价）、`label`（默认“去结算”）、`onCheckout`。放在 `MobilePage` 的 `bottom` 里并设 `bottomTone="clear"`。

- 三种状态由组件自动切换：未选购显示“¥20 起送”；不足起送价显示“差 ¥8 起送”且按钮不可点；满足后显示品牌色“去结算”。
- 栏体用 `chrome`，在浅色和深色页面上都能从内容里浮出来。
- 点击左侧购物车图标展开已选商品（`Dialog variant="sheet"`）。
