# ListCell

设置类列表行：“我的”页、店铺设置、详情页的信息行。

**提供**：`title`、可选 `icon`、`desc`（第二行说明）、`value`（右侧当前值）、`extra`（右侧控件，如 `Switch`）、`arrow`（可进入下一页）、`onClick`、`danger`（退出登录等）。`ListCell.Group` 把多行装进一张卡片，可传 `title`。

- 行高至少 52px，行间细线从文字起始处开始。
- 有 `arrow` 或 `onClick` 时整行可点；带 `extra` 开关的行本身不可点。
- 危险动作单独放一组，放在页面最下面。
