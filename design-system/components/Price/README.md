# Price

人民币价格：`¥` 比数字小一号，数字用 `num` 字体。

**提供**：`value`（数字）、可选 `original`（划线原价）、`size`（`sm` / `md` / `lg` 对应 `price-sm` / `price` / `price-lg`）、`tone`（`brand` 默认 / `ink` / `chrome` / `on-brand`）。

- 用户端的售价用默认 `brand`（`brand-text` 色）；订单实付、商家端和管理端的金额用 `ink`。
- 整数不补小数：传 `28` 显示 `¥28`，传 `28.5` 显示 `¥28.5`。看板上的大额统计用 `StatCard`，不用 `Price`。
- 划线原价只在确有折扣时出现。
