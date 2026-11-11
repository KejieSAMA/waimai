# Button

胶囊形按钮，所有可点击的动作都用它。

**提供**：`children`（2–4 字动词）、`variant`、`size`、可选 `icon`（Icon 名）、`block`（通栏）、`disabled`、`onClick`，其余属性透传给 `<button>`。

| variant | 用途 |
|---|---|
| `primary` | 一屏只有一个：去结算、保存并上架、接单、审核通过 |
| `secondary` | 与主按钮并列的次要动作：存为草稿、解冻 |
| `outline` | 中性动作：取消、查看、再来一单 |
| `text` | 卡片内的轻操作：编辑、修改 |
| `danger-outline` | 有后果但可撤回：拒单、驳回、冻结 |
| `danger-text` | 桌面表格行内的危险动作：冻结、下架 |
| `danger` | 只出现在确认弹窗里，执行不可撤回的危险动作：确认冻结 |

| size | 高度 | 用途 |
|---|---|---|
| `lg` | `size-button-lg` 48 | 页面底部通栏主按钮（配 `block`） |
| `md` | `size-button-md` 40 | 表单、弹窗 |
| `sm` | `size-button-sm` 32 | 卡片内操作 |

- 并排两个按钮时，主按钮放右边。
- 禁用态是 `surface-sunken` 底 + `ink-muted` 字，不要用透明度。
- 不要用 `primary` 做“删除”“冻结”这类危险动作。
