# Pagination

表格底部的分页：总数、上一页 / 下一页、页码，中间页用省略号。

**提供**：`total`、`pageSize`（默认 20）、`page` + `onChange(n)` 或 `defaultPage`。

- 放在 `DataTable` 的 `footer` 里，右对齐。
- 总数加千分位：“共 1,286 条”。
- 当前页用 `brand-text` 描边与文字，不用实底。
