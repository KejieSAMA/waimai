# MerchantRow

管理端商家列表的一行：Logo、店名、状态、类目城市、经营概况，以及按状态给出的操作。

**提供**：`name`、`status`（`pending` 待审核 / `open` 营业中 / `closed` 休息中 / `frozen` 已冻结 / `rejected` 已驳回）、可选 `logo`、`category`、`city`、`owner`、`joined`（待审核时显示为“提交于”）、`orders`、`rating`、`reason`（冻结 / 驳回原因）、`actions`（覆盖默认操作；传 `false` 不显示）。

| status | 默认操作 |
|---|---|
| `pending` | 驳回 · 查看并审核 |
| `open` / `closed` | 查看 · 冻结 |
| `frozen` | 查看 · 解冻 |
| `rejected` | 查看 |

- “通过”只在审核详情页出现，看过资料才能通过；列表里只给“查看并审核”。
- 冻结、驳回都要先选原因（`Dialog variant="sheet"`），原因会同步给商家端。
- 已冻结的商家在列表里保留，并显示原因和冻结日期。
