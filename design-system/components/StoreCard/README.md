# StoreCard

用户端店铺列表的一行：Logo、店名、评分月售、配送信息、优惠。

**提供**：`name`、`logo`（图片地址；不传显示店名首字）、`rating`、`sales`（“3000+”）、`time`（“30 分钟”）、`distance`（“1.2km”）、`minOrder`、`deliveryFee`（0 显示“免配送费”）、`tags`（字符串为促销描边标签，或 `{label, tone, variant}`）、`status`（`open` 默认 / `closed`）、`notice`（休息中时的营业说明）、`onClick`。

- 店名一行，超长省略；促销标签最多 3 个，优先显示力度最大的。
- 休息中的店铺排在列表最后，显示“休息中”和下次营业时间，不隐藏。
- 被管理端冻结的店铺不出现在用户端。
