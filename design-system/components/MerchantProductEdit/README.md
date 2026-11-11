# MerchantProductEdit

商家端新增 / 编辑商品：图片、基础信息、价格库存、描述、上架设置，底部保存。

- 图片区单独一张卡片，主图在前，“添加图片”用 `line-strong` 虚线框。
- 字段用 `Input layout="horizontal"` 堆成表单卡片；选择类字段（分类）用只读输入 + 右箭头，点击打开 `Dialog variant="sheet"`。
- 底部固定两个按钮：“存为草稿”（`secondary`）和“保存并上架”（`primary`）。
- 平台开启商品审核时，保存后商品进入“审核中”。
