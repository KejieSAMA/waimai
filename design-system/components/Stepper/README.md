# Stepper

加减数量：用户端加购物车，商家端改库存。

**提供**：`value` + `onChange(n)` 或 `defaultValue`、可选 `min`（默认 0）、`max`（默认 99，达到后加号禁用）、`disabled`、`collapse`（默认 `true`：数量为 0 时只显示加号）。

- 加号用 `brand` 填充，减号用 `line-strong` 描边。圆钮视觉 24px，点击区扩到 44px，两个钮之间至少留数字的宽度。
- 菜品售罄时不显示步进器，改用 `Tag`“已售罄”（`DishCard` 已处理）。
