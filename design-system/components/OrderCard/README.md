# OrderCard

一笔订单：抬头、状态、商品、实付和操作，三端共用，用 `view` 切换信息重点。

**提供**：`view`（`user` / `merchant` / `admin`）、`title`、`status`（`pending` `preparing` `delivering` `pickup` `done` `cancelled` `refunding`，文字与颜色由组件按 README「状态色」表给出；`statusText` 可覆盖文字）、`items`（`[{name, qty, price, image}]`）、`total`、可选 `serial`（商家端当日流水号）、`meta`（管理端的“商家 → 用户”）、`time`、`note`（顾客备注）、`actions`（`[{label, variant, onClick}]`）。

| view | 抬头 | 正文 | 典型操作 |
|---|---|---|---|
| `user` | 店名 + 箭头 | 缩略图 + 菜名摘要 | 再来一单、评价、联系骑手 |
| `merchant` | `#流水号` + 外卖/自提 + 尾号 | 完整菜品明细 + 备注 | 接单 / 拒单、出餐、处理退款 |
| `admin` | 订单号 + 商家 → 用户 | 菜品明细 | 查看、介入处理 |

- 顾客备注用 `warning-soft` 底高亮，商家端必须显示。
- 卡片最多两个操作按钮，主操作放右边。
- 电话号码只显示尾号。
