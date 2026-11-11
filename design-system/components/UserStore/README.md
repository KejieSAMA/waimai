# UserStore

用户端店铺点餐页：店铺信息、点菜 / 评价 / 商家 Tab、左侧分类 + 右侧菜品、悬浮购物车。

- 顶栏无标题无细线，店铺信息区直接接在下面，店名用 `title-lg`。
- 分类用 `CategoryNav`，菜品用 `DishCard`（`row`），按分类分组，组名 `body-sm` + `ink-muted`。
- 购物车用 `CartBar`，`MobilePage` 设 `bottomTone="clear"`，列表底部留出购物车栏的高度。
