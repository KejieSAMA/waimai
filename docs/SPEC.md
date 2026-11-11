# 小灶外卖平台 · 详细规格

配合根目录 `AGENTS.md` 使用。业务规则以 `design-system/architecture.md` 为准，本文件把它落到路由、接口、数据和验收上。

## 1. 路由表

### PC 端（frontend，base `/`）

| 路径 | 页面 | 视觉稿 |
| --- | --- | --- |
| `/` | 用户网页首页 | DeskUserHome |
| `/store/:id` | 店铺点餐 | DeskUserStore |
| `/checkout` | 确认订单（地址、配送 / 自提、备注、金额明细、模拟支付） | 沿用 CartPanel + InfoList + Input |
| `/orders` | 我的订单 | DeskUserOrders |
| `/orders/:id` | 订单详情（状态、明细、操作） | PageHeader + InfoList + DataTable |
| `/addresses` | 收货地址，新增 / 编辑弹窗 | PageHeader + ListCell + Dialog |
| `/me` | 账号设置 | PageHeader + InfoList |
| `/login` | 用户登录（手机号 + 验证码） |  |
| `/merchant` → `/merchant/dashboard` | 工作台 | DeskMerchantDashboard |
| `/merchant/orders` | 订单看板 | DeskMerchantOrders |
| `/merchant/products` | 商品管理 | DeskMerchantProducts |
| `/merchant/products/new`、`/merchant/products/:id/edit` | 新增 / 编辑商品 | DeskMerchantProductEdit |
| `/merchant/store` | 店铺设置（名称、Logo、公告、营业时间、起送价、配送费） | PageHeader + 表单卡片 |
| `/merchant/apply` | 商家入驻申请 / 审核进度 / 驳回后修改 | 表单卡片 |
| `/merchant/login` | 商家登录（手机号 + 密码） |  |
| `/admin` → `/admin/overview` | 数据总览 | DeskAdminDashboard |
| `/admin/merchants` | 商家管理 | DeskAdminMerchants |
| `/admin/audit`、`/admin/audit/:id` | 入驻审核（`:id` 打开右侧抽屉） | DeskAdminAudit |
| `/admin/products` | 商品巡检（强制下架） | DataTable |
| `/admin/orders` | 订单监管 | DataTable |
| `/admin/disputes` | 退款纠纷 | DataTable + drawer |
| `/admin/categories` | 平台类目管理 | DataTable + modal |
| `/admin/login` | 管理员登录（账号 + 密码） |  |
| `/__ui` | 组件画廊（仅开发环境） |  |

PC 的 `/orders`、`/orders/:id`、`/addresses`、`/me` 共用个人中心父路由布局和账号侧栏，地址及设置切换后保留导航；订单详情仍选中我的订单。登录保护继承父路由，原有路径不变。我的评价和优惠券尚无独立接口，继续禁用入口。

### 手机端（mobile，Vite base `/mobile/`）

| 路径 | 页面 | 视觉稿 |
| --- | --- | --- |
| `/mobile/` | 首页 | UserHome |
| `/mobile/store/:id` | 店铺点餐 | UserStore |
| `/mobile/checkout` | 确认订单 |  |
| `/mobile/orders`、`/mobile/orders/:id` | 订单列表 / 详情 | UserOrders |
| `/mobile/me` | 我的 | ListCell |
| `/mobile/login` | 用户登录 |  |
| `/mobile/merchant/` | 工作台 | MerchantDashboard |
| `/mobile/merchant/orders` | 订单 | MerchantOrders |
| `/mobile/merchant/products` | 商品管理 | MerchantProducts |
| `/mobile/merchant/products/new`、`…/:id/edit` | 新增 / 编辑商品 | MerchantProductEdit |
| `/mobile/merchant/me`、`/mobile/merchant/login` | 我的 / 登录 |  |
| `/mobile/admin/` | 数据总览 | AdminDashboard |
| `/mobile/admin/merchants` | 商家管理 | AdminMerchants |
| `/mobile/admin/audit/:id` | 入驻审核 | AdminMerchantAudit |
| `/mobile/admin/me`、`/mobile/admin/login` | 我的 / 登录 |  |
| `/mobile/__ui` | 组件画廊（仅开发环境） |  |

PC ↔ 手机路径对应：`/x` ↔ `/mobile/x`（如 `/merchant/orders` ↔ `/mobile/merchant/orders`）；没有对应页面的跳到该角色首页。设备自动分流优先使用 `navigator.userAgentData.mobile`（明确的 false 也有效），不支持时回退到手机 UA 与 `MacIntel + 多点触控` 的 iPad 辅助识别；未知设备默认 PC，Windows 触屏电脑保持 PC，窗口宽度不参与应用分流。两端在挂载前使用同一判断，切换时保留页面路径、查询参数与锚点。手动偏好保存为 `xz-device` 的 `{ version: 2, mode, detectedMode }` JSON，仅设备状态与保存时一致时应用，状态改变后清除覆盖，旧字符串与无效记录自动清理。

## 2. 账号与鉴权

- 三种角色：`USER`、`MERCHANT`、`ADMIN`。一个手机号只对应一种角色。
- 用户：手机号 + 短信验证码。开发环境不接短信，验证码固定 `123456` 并打印到后端日志；留好 `SmsProvider` 接口。
- 商家：手机号 + 密码，注册后先提交入驻资料，审核通过才能营业。
- 管理员：账号 + 密码，只由种子数据或已有管理员创建，不开放注册。
- JWT：access token 2 小时 + refresh token 7 天（httpOnly cookie），三种角色分别存，互不覆盖（同一浏览器可同时登录用户端和商家后台）。
- 中间件：`authenticate` → `requireRole(role)`；商家额外 `attachStore`（从登录用户查出 storeId 挂到 req 上）。

## 3. API 清单（前缀 `/api/v1`）

公共 `public`

- `GET /public/categories` 平台类目
- `GET /public/stores?categoryId&sort=default|distance|sales|minOrder&page` 营业中 + 休息中的店铺（冻结、待审核、驳回的不返回）
- `GET /public/stores/:id` 店铺详情 + 菜品分组 + 在售 / 售罄商品
- `GET /public/stores/:id/reviews?page&pageSize` 可见店铺的公开评价，仅 ID、评分、正文、商家回复。

用户 `user`

- `POST /auth/user/code`、`POST /auth/user/login`、`POST /auth/refresh`、`POST /auth/logout`
- `GET|POST|PUT|DELETE /user/addresses`
- `POST /user/orders/preview` 后端计算金额（小计、配送费、满减、实付）
- 报价的 `items` 包含 `productId`、`qty`、`name`、`priceCents`、`lineTotalCents`；行小计由后端计算，前端按商品 ID 匹配，等待报价时保留已显示金额。
- `POST /user/orders` 下单（扣库存，事务）→ `POST /user/orders/:id/pay`（模拟支付）
- `GET /user/orders?status`、`GET /user/orders/:id`
- 用户列表另支持 `tab=all|ongoing|unreviewed|refund`：进行中包括待支付到待自提；待评价仅已完成且无评价；退款仅退款中。与 status 条件取交集后统一分页和计数；列表及详情返回 `review: { id } | null`。
- 订单创建、列表、详情及操作响应的商品项包含后端计算的 `lineTotalCents`（快照单价 × 数量），供商家卡片展示行金额；前端不重新计算金额。
- `POST /user/orders/:id/cancel`、`POST /user/orders/:id/refund`、`POST /user/orders/:id/review`

商家 `merchant`

- `POST /auth/merchant/register`、`POST /auth/merchant/login`
- `GET|PUT /merchant/application`（入驻资料、证照图片）
- `GET|PUT /merchant/store`、`PUT /merchant/store/open`（营业 / 休息）
- `GET|POST|PUT|DELETE /merchant/dish-categories`
- `GET /merchant/products?status&keyword&categoryId&stock=low|soldout&page`
- 商品列表可选 `group=on|off|review`，review 包含 REVIEW 与 REJECTED；原 status 条件保留并取交集。
- 商品列表响应增加 `counts: { ON, OFF, REVIEW }`，按相同商家归属、关键词、店内分类和库存范围计数，忽略当前状态和分组；REVIEW 包含审核中及驳回。
- `POST /merchant/products`、`PUT /merchant/products/:id`、`PUT /merchant/products/:id/listing`（上架 / 下架）
- `POST /merchant/products/batch`（批量上架 / 下架 / 改库存）
- `GET /merchant/orders?status`、`GET /merchant/orders/stream`（SSE 新订单推送）
- 订单列表另支持 `stage=PENDING|PREPARING|DELIVERING|REFUNDING`，配送分组包含待自提，供四列看板分别分页。
- `POST /merchant/orders/:id/accept|reject|ready|refund-approve|refund-reject`
- `GET /merchant/stats/today`、`GET /merchant/stats/trend?days=7`、`GET /merchant/todos`

管理 `admin`

- `POST /auth/admin/login`
- `GET /admin/stats/overview`、`GET /admin/stats/trend?days=14`、`GET /admin/stats/ranking`、`GET /admin/todos`
- `GET /admin/merchants?status&keyword&categoryId&city&page`、`GET /admin/merchants/:id`
- 管理列表附带 `counts`（同类目／城市／关键词范围内各状态及 all 数量），管理资料附带负责人姓名，公开列表不提供管理状态计数或负责人信息。
- 管理商家列表另返回 `filterOptions.cities`，来自完整管理范围的真实非空城市，独立于分页及当前筛选；公开列表不返回此字段。
- 总览统计另返回 `disputesPending`，仅计算退款中且已申诉的待处理纠纷，区别于全部退款申请 `refundPending`；导航角标使用实际待处理数量。
- `POST /admin/merchants/:id/approve|reject|freeze|unfreeze`（reject、freeze 必须带 reason）
- `GET /admin/products?status&keyword`、`POST /admin/products/:id/approve|reject|force-off`
- `GET /admin/orders?status&keyword`、`GET /admin/disputes`、`POST /admin/disputes/:id/resolve`
- `GET|POST|PUT|DELETE /admin/categories`
- `GET /admin/audit-logs?targetType&targetId`

上传：`POST /uploads`（登录后可用，jpg / png / webp，≤5MB，返回 URL，存 `backend/uploads/`，经 `StorageProvider` 接口以便换对象存储）。

## 4. 数据模型（Prisma，SQLite / MySQL 通用）

- `User`：id、phone（唯一）、name、role、passwordHash?、createdAt
- `Address`：userId、contact、phone、detail、isDefault
- `Category`（平台类目）：name、sort
- `Store`：ownerId、name、logo、categoryId、city、address、contactPhone、notice、openHours、minOrderCents、deliveryFeeCents、status（PENDING / OPEN / CLOSED / FROZEN / REJECTED）、rejectReason、frozenReason、licenseImage、foodPermitImage、licenseExpireAt、permitExpireAt、rating、monthlySales、submitCount
- `DishCategory`（店内分类）：storeId、name、sort
- `Product`：storeId、dishCategoryId、name、description、images（JSON 字符串）、priceCents、originalPriceCents?、stock、lowStock（默认 5）、limitPerOrder?、status（ON / OFF / REVIEW / REJECTED）、rejectReason、forcedOff、monthlySales；“已售罄”= ON 且 stock = 0，由后端派生返回 `displayStatus`
- `Promotion`：storeId、thresholdCents、discountCents（满减）
- `Order`：orderNo（唯一，时间 + 随机）、serialOfDay（店铺当日流水号）、userId、storeId、type（DELIVERY / PICKUP）、status（PENDING_PAY / PENDING / PREPARING / DELIVERING / PICKUP / DONE / CANCELLED / REFUNDING）、itemsCents、deliveryFeeCents、discountCents、payCents、note、addressSnapshot（JSON）、paidAt、acceptedAt、readyAt、doneAt、cancelReason、refundReason
- `OrderItem`：orderId、productId、nameSnapshot、priceCentsSnapshot、qty、spec?
- `Review`：orderId、userId、storeId、rating、content、reply?
- `AuditLog`：actorId、actorRole、action、targetType、targetId、reason?、createdAt（审核、冻结、强制下架、退款介入都要记）

## 5. 状态机（`backend/src/domain/`，非法流转返回 409）

- 商家：PENDING →（admin approve）→ OPEN；PENDING →（admin reject + reason）→ REJECTED →（merchant 修改重提）→ PENDING；OPEN ↔ CLOSED（merchant）；OPEN / CLOSED →（admin freeze + reason）→ FROZEN →（admin unfreeze）→ 冻结前的状态。FROZEN 时店铺对用户不可见，商家后台只读。
- 商品：新建 → 平台开启审核（配置项 `PRODUCT_REVIEW=true`）时 REVIEW，否则 ON；REVIEW →（admin approve）→ ON /（reject + reason）→ REJECTED →（merchant 修改）→ REVIEW；ON ↔ OFF（merchant）；admin force-off → OFF 且 `forcedOff = true`，商家不能再上架直到修改后重新审核。
- 订单：PENDING_PAY →（pay）→ PENDING →（merchant accept）→ PREPARING →（merchant ready）→ DELIVERING（外卖）/ PICKUP（自提）→ DONE；PENDING →（merchant reject / user cancel）→ CANCELLED（回补库存、模拟退款）；已支付未完成 →（user refund）→ REFUNDING →（merchant approve）→ CANCELLED /（merchant reject，用户可申诉）→ 管理端介入 resolve。PENDING_PAY 超过 15 分钟自动取消（定时任务）。

## 6. 种子数据（与设计稿一致，便于对照截图）

- 账号：管理员 `admin` / `admin123`；商家 `13800000001` / `merchant123`（老张家牛肉面，营业中）；用户 `13900000001`，验证码 `123456`。
- 店铺与商品、订单、待审核商家：直接取自各页面 preview.html 里的示例数据（老张家牛肉面、阿香米线、一碗好粥、深夜烧烤研究所、甜蜜工坊（已冻结）等），让每个页面一打开就和截图内容接近。

## 7. 开发者必须注意的问题

1. **越权**：商家只能读写自己店铺的数据；接口里的 storeId 一律从登录态取。为此写测试：商家 A 访问商家 B 的商品 / 订单必须 404 或 403。
2. **金额精度**：全部用整数分；满减、配送费、实付由后端算，前端提交的金额一概不信。
3. **库存与并发**：下单在事务里用 `stock >= qty` 条件更新扣减，防超卖；取消 / 拒单回补；接单、出餐等操作要幂等（重复点击不重复流转）。
4. **状态一致**：前端只按后端返回的 `status` / `displayStatus` 显示，文案和色调从 `@waimai/shared` 的映射取，和 README 状态色表一致。
5. **实时提醒**：商家新订单用 SSE 推送 + 提示音（浏览器需用户先有一次点击才能播放声音，在工作台给出“开启提醒”开关）；SSE 断线自动重连，并在重连后补拉一次订单列表。
6. **两个前端应用的路由**：Vite `base` 必须正确（mobile 为 `/mobile/`），静态资源与路由刷新（history fallback）在开发代理和生产托管下都要验证；直接在地址栏打开 `/mobile/merchant/orders` 刷新不能 404。
7. **设备分流不要死循环**：两端共用相同的浏览器设备信息和有效手动偏好判断，仅当前应用与目标类型不符时使用 replace 跳转。窗口变化、恢复缓存页面、重新获得焦点、恢复可见和其他标签页修改设备偏好时，以 150ms 合并检测最新设备信息，尺寸变化本身不触发切换；自动跳转不写入手动偏好，跳转后停止当前监听，卸载与热更新时清理事件和定时器。浏览器需要刷新才更新设备标识时，刷新后生效，不探测开发者工具按钮。
8. **主题**：只通过 `data-theme` 切换；新增样式必须在浅色、深色下都检查。
9. **资源本地化**：字体、图标、图片不走外网 CDN；React 参考实现只作移植参考，不要把 React 打进产品。
10. **上传安全**：校验 MIME 和扩展名、限制大小、重命名文件；不要把上传目录暴露成可执行路径。
11. **隐私**：手机号对商家只显示尾号；身份证 / 证照图片只对管理员可见；日志不打印密码和 token。
12. **通用安全**：bcrypt 存密码、登录接口限流、helmet、生产环境关闭 CORS 通配、禁止 `v-html` 渲染用户输入、Prisma 参数化查询。
13. **时间**：数据库存 UTC，界面按 Asia/Shanghai 显示；“今日”统计按上海时区切日。
14. **审计**：管理端的通过、驳回、冻结、解冻、强制下架、纠纷处理都写 `AuditLog`，审核抽屉里的“审核记录”就从这里读。
15. **Windows 开发**：路径用 `path.join`；换行统一 LF；脚本跨平台；SQLite 文件放 `backend/prisma/dev.db` 并加入 `.gitignore`。
16. **环境变量**：`.env.example` 列全（`PORT`、`DATABASE_URL`、`JWT_SECRET`、`JWT_REFRESH_SECRET`、`PRODUCT_REVIEW`、`UPLOAD_DIR`），真实 `.env` 不提交。
17. **性能**：三个角色分包懒加载；列表接口都分页；图片列表用 `loading="lazy"`。
18. **可访问性**：保留设计系统里的焦点环、`aria-label`、对比度；不要用 `outline: none` 去掉焦点。

## 8. 验收清单

- [ ] `pnpm install` 后 `pnpm dev` 一条命令启动三端；http://localhost:5173 打开即用户首页
- [ ] `/merchant`、`/admin`、`/mobile`、`/mobile/merchant`、`/mobile/admin` 都能访问，用种子账号登录，刷新任意子路由不 404
- [ ] 主流程走通：用户下单 → 商家收到实时提醒 → 接单 → 出餐 → 完成；退款 → 商家处理；管理员审核新商家 → 商家营业 → 上架商品 → 用户可见；管理员冻结 → 用户不可见
- [ ] 20 个页面与对应截图在浅色 / 深色下视觉一致（间距、颜色、字体、状态词）
- [ ] `frontend` 与 `mobile` 之间没有 import；业务代码里没有写死的颜色值（可用脚本 grep `#[0-9a-f]{3,6}` 检查，tokens 包除外）
- [ ] `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 全部通过
- [ ] `pnpm build && pnpm start` 后 http://localhost:3000 同时提供 PC、手机两个应用和 API
- [ ] `README.md` 写清启动、账号、目录说明；`docs/DECISIONS.md`、`docs/DEPLOY.md` 完整
