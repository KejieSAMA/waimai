# Tag

一到四个字的状态或属性标签，放在名称旁边。

**提供**：`children`、`tone`（`neutral` `brand` `success` `warning` `info` `danger` `accent`）、`variant`（`soft` 默认 / `outline` / `solid`）、可选 `icon`。

- **状态**用 `soft`，颜色和用词严格按 README「状态色」表：在售 `success`、待审核 `warning`、审核中 `info`、已冻结 `danger`、已下架 `neutral`。
- **促销**用 `outline` + `brand`：“满 30 减 5”“首单立减 8”。一张卡片最多 3 个促销标签。
- **角标**用 `accent`（新店）或 `solid` + `brand`（爆款），一张卡片最多一个。
- 标签不可点击；需要点击的筛选用 `Tabs variant="chip"`。
