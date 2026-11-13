# 小灶外卖平台 · 详细规格

配合根目录 `AGENTS.md` 使用。业务规则以 `design-system/architecture.md` 为准，本文件把它落到路由、接口、数据和验收上。

## 1. 路由表

### PC 端（frontend，base `/`）

| 路径 | 页面 | 视觉稿 |
| --- | --- | --- |
| `/` | 用户网页首页 | DeskUserHome |
| `/store/:id` | 店铺点餐 | DeskUserStore |
| `/checkout` | 确认订单（顶部配送 / 自提、地址面板、独立滚动清单、左栏底部备注、右侧店铺切换与固定费用摘要） | PageHeader + 共享结算组件 |
| `/orders` | 我的订单 | DeskUserOrders |
| `/orders/:id` | 订单详情（状态、明细、操作） | PageHeader + InfoList + DataTable |
| `/addresses` | 收货地址，新增 / 编辑弹窗 | PageHeader + ListCell + Dialog |
| `/me` | 账号设置 | PageHeader + InfoList |
| `/login` | 用户登录（账号 + 密码） |  |
| `/merchant` → `/merchant/dashboard` | 工作台 | DeskMerchantDashboard |
| `/merchant/orders` | 状态 Tab + 紧凑订单行 + 居中详情弹窗 | DeskMerchantOrders（按确认方案改造） |
| `/merchant/products` | 商品管理 | DeskMerchantProducts |
| `/merchant/products/new`、`/merchant/products/:id/edit` | 新增 / 编辑商品 | DeskMerchantProductEdit |
| `/merchant/store` | 店铺设置（名称、Logo、公告、营业时间、起送价、配送费） | PageHeader + 表单卡片 |
| `/merchant/apply` | 商家入驻申请 / 审核进度 / 驳回后修改 | 表单卡片 |
| `/merchant/login` | 商家登录（账号 + 密码） |  |
| `/admin` → `/admin/overview` | 数据总览 | DeskAdminDashboard |
| `/admin/merchants` | 商家管理 | DeskAdminMerchants |
| `/admin/audit`、`/admin/audit/:id` | 入驻审核（`:id` 打开右侧抽屉） | DeskAdminAudit |
| `/admin/products` | 商品巡检（强制下架） | DataTable |
| `/admin/orders` | 订单监管 | DataTable |
| `/admin/disputes` | 退款纠纷 | DataTable + drawer |
| `/admin/categories` | 平台类目管理 | DataTable + modal |
| `/admin/accounts` | 账号管理（筛选、授权、启停用、密码重置） | DataTable + modal |
| `/admin/login` | 管理员登录（账号 + 密码） |  |
| `/__ui` | 组件画廊（仅开发环境） |  |

PC 的 `/orders`、`/orders/:id`、`/addresses`、`/me` 共用个人中心父路由布局和账号侧栏，地址及设置切换后保留导航；订单详情仍选中我的订单。登录保护继承父路由，原有路径不变。我的评价和优惠券尚无独立接口，继续禁用入口。

### 手机端（mobile，Vite base `/mobile/`）

| 路径 | 页面 | 视觉稿 |
| --- | --- | --- |
| `/mobile/` | 首页 | UserHome |
| `/mobile/store/:id` | 店铺点餐 | UserStore |
| `/mobile/checkout` | 确认订单（单列信息、可编辑清单、固定底部金额与提交） | 共享结算组件 |
| `/mobile/orders`、`/mobile/orders/:id` | 订单列表 / 详情 | UserOrders |
| `/mobile/me` | 用户我的（身份卡、订单／地址快捷入口） | 共享手机个人中心 |
| `/mobile/settings` | 当前身份设置（账号／外观／退出） | ListCell + sheet |
| `/mobile/account/profile` | 本人资料编辑（昵称／联系手机） | Input + 固定保存栏 |
| `/mobile/password` | 修改密码（含首次强制改密） | Input + Button |
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
| `/mobile/admin/accounts` | 账号管理（列表、编辑与操作） | 共享表单 + sheet |
| `/mobile/__ui` | 组件画廊（仅开发环境） |  |

手机三端我的共用身份卡、快捷入口及授权角色选择 sheet；商家店铺入口复用 merchantStoreEntry，管理员管理工具保留现有真实路由。设置与资料页不显示业务底部 Tab，顶栏沿用当前身份，直接进入时返回当前身份我的。资料未修改不可保存，保存失败保留输入；脏草稿离开需确认，身份失效不阻拦安全跳转。手机移除电脑版入口；主题、改密、退出集中到设置，PC 布局不变。详见 MOBILE_ACCOUNT.md。

购物车按账号和店铺隔离：游客保存在浏览器 `xz-guest-cart`，用户身份登录后以服务器 SQLite 为准；旧 `xz-cart` 启动时删除且不导入。登录自动合并游客商品，同商品数量相加并受库存／限购约束，保留已有账号购物车的配送、地址和备注；幂等合并成功后清理游客副本。账号购物车不写浏览器持久存储，进入页面、恢复焦点和可见状态时同步，多设备写入通过 revision 检查并提示冲突。退出或换账号立即清空内存中的旧账号资料。两端确认订单通过 `?storeId=…` 指定单店，每次仅提交一家；下单事务只清理对应店铺的匹配版本。店铺页仅展示自己的购物车，PC 顶栏角标为所有店铺商品总件数。详见 SERVER_CART.md。

PC 与手机业务路径对应 `/x` 与 `/mobile/x`，自动跳转保留查询参数、登录回跳及锚点。明确访问 `/mobile`、`/mobile/` 及其子路径时保留手机版，无前缀入口才按设备识别：优先 navigator.userAgentData.mobile（false 有效），缺失时回退手机 UA 与 MacIntel 多点触控的 iPad 辅助识别；Windows 触屏电脑及未知设备使用 PC，窗口宽度不参与分流。

设备版本偏好和所有手动切换入口删除；两端启动只尝试删除旧 xz-device，不读取或重新保存。普通入口在本次自动跳转和站内浏览期间继续实时检测；自动 replace 携带内部临时参数 `__xz_auto_entry=1`，目标应用在挂载前立即清理，仅在文档内存中保留 automaticEntry，不向历史状态、localStorage、sessionStorage 或 Cookie 写入来源。刷新已清理的 /mobile 地址后固定手机版；重新进入无前缀地址恢复自动识别。此规则替代旧的版本偏好及始终双向检测规则。

PC 后台列表采用固定页头、唯一主要纵向内容视口和固定底部右对齐分页；仪表盘及账号只滚正文，设置与编辑固定操作区。商家侧栏根据店铺状态在入驻申请与店铺设置之间二选一：未入驻／PENDING／REJECTED 对应 apply，OPEN／CLOSED／FROZEN 对应 store，FROZEN 只读。旧路径按状态替换；设置分组共用草稿，待审核保留修改重提，已通过资质仅查看。

## 2. 账号与鉴权

- 账号使用唯一 username（小写 3–32 位英文、数字、下划线或连字符），手机号选填；账号启用状态与角色授权分开保存，一个账号可拥有 USER／MERCHANT／ADMIN 中的多个角色。
- 统一账号密码登录；公开注册仅 USER，商家角色由管理员授予，店铺仍走现有入驻审核。密码至少 8 字符且不超过 bcrypt 72 字节，服务端仅保存哈希。不提供短信和默认凭据。
- 一个浏览器使用 xz_refresh HttpOnly Cookie（7 天）与当前身份 access token（2 小时）；角色切换由服务端核验授权、增加会话版本并签发新凭据。refresh 仅恢复服务端当前身份，不接受客户端指定另一身份。旧角色 Cookie 失效并清理。
- authenticate 每次读取会话、账号状态与授权，requireRole 验证当前身份，商家店铺归属只取登录态。临时密码首次登录须改密，仅允许身份查询、改密及退出；停用、改密、重置密码、角色变更撤销全部会话。
- 管理端账号列表／详情、创建、修改资料、角色授权、状态、密码重置和审计，两端均有 /admin/accounts（手机含 /mobile 前缀）。保留固定分页与后台既有骨架。保护自身与最后管理员；商家停用／撤权冻结店铺，启用不自动解冻。
- 原 User.role 迁移为 UserRole；旧账号禁用且密码清空，业务 ID 与关联不变。首管理员由本机交互 CLI 创建，无固定账号。详见 ACCOUNTS_MIGRATION.md。

## 3. API 清单（前缀 `/api/v1`）

公共 `public`

- `GET /public/categories` 平台类目
- `GET /public/stores?categoryId&sort=default|distance|sales|minOrder&page` 营业中 + 休息中的店铺（冻结、待审核、驳回的不返回）
- `GET /public/stores/:id` 店铺详情 + 菜品分组 + 在售 / 售罄商品
- `GET /public/stores/:id/reviews?page&pageSize` 可见店铺的公开评价，仅 ID、评分、正文、商家回复。

用户 `user`

- `POST /auth/register`：username、password、name、phone?，严格拒绝角色字段，只授予 USER。
- `POST /auth/login`：username、password、role?；返回 accessToken、activeRole 和安全 user（含 roles、当前 role 兼容字段、mustChangePassword），角色未授权时拒绝。
- `POST /auth/refresh`、`GET /auth/me`、`POST /auth/switch-role`（role）、`POST /auth/logout`、`POST /auth/password`（oldPassword、password）。旧短信及分角色登录／注册端点删除。
- `PUT /auth/me`：仅接受本人 `{ name, phone? }`，昵称修剪后 1–30 字；省略手机保留，空字符串或 null 清空。拒绝任何额外字段，事务内重新核验会话、账号状态、当前授权及首次改密限制。返回 `{ user, activeRole }` 安全资料，不轮换凭据、不撤销正常会话；仅资料实际变化时记录 `account-profile` 审计，不含手机正文。
- `GET /admin/accounts?keyword&role&status&page&pageSize`、`GET /admin/accounts/:id`、`GET /admin/accounts/:id/audit`。
- `POST /admin/accounts`（username、name、phone?、password、roles）、`PUT /admin/accounts/:id`（name、phone?）、`PUT /admin/accounts/:id/roles|status|password`（分别 roles、status 或 password）。创建／重置设置首次改密；不提供物理删除。
- `GET|POST|PUT|DELETE /user/addresses`
- `GET /user/cart`：当前用户全部店铺购物车，返回 `{ version: 2, carts }`，每店含 revision、配送方式、本人地址 ID、备注、安全店铺摘要及最新商品资料，不返回完整地址、联系电话或资质。
- `PUT /user/cart/:storeId`：严格接受 `{ revision, type, addressId, note, items: [{ productId, qty }] }`；新店 revision=0，更新须匹配当前版本。仅能使用本人地址、该店商品；新增数量校验营业／上架／库存／限购，不预占库存。清空保留空版本记录。409 后读取最新状态，不自动覆盖另一设备修改；同内容重试返回当前结果。
- `POST /user/cart/merge`：严格接受 `{ guestId, carts: [{ storeId, type, note, items }] }`，guestId 为随机合并标识，不包含账号 ID、地址正文或金额。服务端事务合并并保存幂等回执，重复请求不累加；同标识不会再导入另一账号。响应 `{ snapshot, issues }`，跳过失效商品或约束数量时明确提示。
- `POST /user/orders/preview` 后端计算金额（小计、配送费、满减、实付），另返回 minOrderCents、shortfallCents、checkoutAllowed；未达起送价仍返回报价，创建订单时继续严格校验，PICKUP 不受起送价限制。
- 报价的 `items` 包含 `productId`、`qty`、`name`、`priceCents`、`lineTotalCents`；行小计由后端计算，前端按商品 ID 匹配，等待报价时保留已显示金额。
- `POST /user/orders` 下单（扣库存，事务）→ `POST /user/orders/:id/pay`（模拟支付）。账号购物车增加 cartRevision 和随机 requestId：事务校验整车快照、复核金额及库存、创建订单并清空对应版本；相同账号 requestId 重试返回原订单，不能重复扣库存。不携带新增字段的原有调用保持兼容。
- `GET /user/orders?status&requestId`、`GET /user/orders/:id`；requestId 仅在用户命名空间筛选本人订单，用于丢失创建响应后的只读确认，不自动重试创建。
- 用户列表另支持 `tab=all|ongoing|unreviewed|refund`：进行中包括待支付到待自提；待评价仅已完成且无评价；退款仅退款中。与 status 条件取交集后统一分页和计数；列表及详情返回 `review: { id } | null`。
- 订单创建、列表、详情及操作响应的商品项包含后端计算的 `lineTotalCents`（快照单价 × 数量），供商家卡片展示行金额；前端不重新计算金额。
- `POST /user/orders/:id/cancel`、`POST /user/orders/:id/refund`、`POST /user/orders/:id/review`

商家 `merchant`

- 商家不开放独立注册；统一登录及管理员角色授权见认证接口。
- `GET|PUT /merchant/application`（入驻资料、证照图片）：营业执照、食品经营许可证分别选填，均不上传或只上传一张也能提交待审核；有图片时仍校验本人私有证照归属。有效期选填，null 可清空，移除图片同步清除对应历史有效期；不改变人工审核、冻结和通过后资质只读规则。
- `GET|PUT /merchant/store`、`PUT /merchant/store/open`（营业 / 休息）
- `GET|POST|PUT|DELETE /merchant/dish-categories`
- `GET /merchant/products?status&keyword&categoryId&stock=low|soldout&page`
- 商品列表可选 `group=on|off|review`，review 包含 REVIEW 与 REJECTED；原 status 条件保留并取交集。
- 商品列表响应增加 `counts: { ON, OFF, REVIEW }`，按相同商家归属、关键词、店内分类和库存范围计数，忽略当前状态和分组；REVIEW 包含审核中及驳回。
- `POST /merchant/products`、`PUT /merchant/products/:id`、`PUT /merchant/products/:id/listing`（上架 / 下架）
- `POST /merchant/products/batch`（批量上架 / 下架 / 改库存）
- `GET /merchant/orders?status&keyword&page`、`GET /merchant/orders/stream`（SSE 新订单推送）
- 商家订单列表附加 counts，限定同店和同关键词，忽略状态、stage 与分页；all 为该范围全部订单数，其余键为各订单状态。
- `GET /merchant/orders/:id` 商家只读详情，归属店铺从登录态获取，跨店 404，手机号继续脱敏，商品项提供后端行小计。
- 订单列表另支持 `stage=PENDING|PREPARING|DELIVERING|REFUNDING`，配送分组包含待自提，保留给现有客户端；PC 新列表按精确 status 分组并使用统一固定分页。
- `POST /merchant/orders/:id/accept|reject|ready|refund-approve|refund-reject`
- `GET /merchant/stats/today`、`GET /merchant/stats/trend?days=7`、`GET /merchant/todos`

管理 `admin`

- 管理员使用统一密码登录，仅已有管理员授权或本机 CLI 创建。
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

- `User`：id、username（唯一）、phone?、name、passwordHash?（迁移禁用账号可空）、status（ACTIVE／DISABLED）、mustChangePassword、lastLoginAt?、createdAt；UserRole 以 userId＋role 复合主键保存授权；RefreshSession 增加 activeRole、version。
- `Address`：userId、contact、phone、detail、isDefault
- `Category`（平台类目）：name、sort
- `Store`：ownerId、name、logo、categoryId、city、address、contactPhone、notice、openHours、minOrderCents、deliveryFeeCents、status（PENDING / OPEN / CLOSED / FROZEN / REJECTED）、rejectReason、frozenReason、licenseImage、foodPermitImage、licenseExpireAt、permitExpireAt、rating、monthlySales、submitCount
- `DishCategory`（店内分类）：storeId、name、sort
- `Product`：storeId、dishCategoryId、name、description、images（JSON 字符串）、priceCents、originalPriceCents?、stock、lowStock（默认 5）、limitPerOrder?、status（ON / OFF / REVIEW / REJECTED）、rejectReason、forcedOff、monthlySales；“已售罄”= ON 且 stock = 0，由后端派生返回 `displayStatus`
- `Promotion`：storeId、thresholdCents、discountCents（满减）
- `Cart`：userId＋storeId 唯一、version、type、addressId、note、items（商品 ID／数量及服务端名称／图片摘要 JSON）、updatedAt；不保存报价或地址正文，空记录保留版本防止旧请求复活购物车。
- `CartMerge`：全局唯一 guestId、userId、issues、createdAt；合并与回执同事务，账号删除时级联删除。无 Redis 或购物车 SSE。
- `Order`：orderNo（唯一，时间 + 随机）、serialOfDay（店铺当日流水号）、userId、storeId、type（DELIVERY / PICKUP）、status（PENDING_PAY / PENDING / PREPARING / DELIVERING / PICKUP / DONE / CANCELLED / REFUNDING）、itemsCents、deliveryFeeCents、discountCents、payCents、note、addressSnapshot（JSON）、paidAt、acceptedAt、readyAt、doneAt、cancelReason、refundReason
- `OrderItem`：orderId、productId、nameSnapshot、priceCentsSnapshot、qty、spec?
- `Order.requestId?`：与 userId 组成唯一约束，旧订单为空，不影响历史订单关联。
- `Review`：orderId、userId、storeId、rating、content、reply?
- `AuditLog`：actorId、actorRole、action、targetType、targetId、reason?、createdAt（审核、冻结、强制下架、退款介入都要记）

## 5. 状态机（`backend/src/domain/`，非法流转返回 409）

- 商家：PENDING →（admin approve）→ OPEN；PENDING →（admin reject + reason）→ REJECTED →（merchant 修改重提）→ PENDING；OPEN ↔ CLOSED（merchant）；OPEN / CLOSED →（admin freeze + reason）→ FROZEN →（admin unfreeze）→ 冻结前的状态。FROZEN 时店铺对用户不可见，商家后台只读。
- 商品：新建 → 平台开启审核（配置项 `PRODUCT_REVIEW=true`）时 REVIEW，否则 ON；REVIEW →（admin approve）→ ON /（reject + reason）→ REJECTED →（merchant 修改）→ REVIEW；ON ↔ OFF（merchant）；admin force-off → OFF 且 `forcedOff = true`，商家不能再上架直到修改后重新审核。
- 订单：PENDING_PAY →（pay）→ PENDING →（merchant accept）→ PREPARING →（merchant ready）→ DELIVERING（外卖）/ PICKUP（自提）→ DONE；PENDING →（merchant reject / user cancel）→ CANCELLED（回补库存、模拟退款）；已支付未完成 →（user refund）→ REFUNDING →（merchant approve）→ CANCELLED /（merchant reject，用户可申诉）→ 管理端介入 resolve。PENDING_PAY 超过 15 分钟自动取消（定时任务）。

## 6. 初始化数据

默认只初始化平台基础类目，不创建账号、店铺或订单。账号由公开用户注册、管理员创建或本机首管理员 CLI 建立。隔离测试库自行创建测试 fixture，不写入业务数据库。旧库升级必须先备份，迁移、核对及启用步骤见 ACCOUNTS_MIGRATION.md。

## 7. 开发者必须注意的问题

1. **越权**：商家只能读写自己店铺的数据；接口里的 storeId 一律从登录态取。为此写测试：商家 A 访问商家 B 的商品 / 订单必须 404 或 403。
2. **金额精度**：全部用整数分；满减、配送费、实付由后端算，前端提交的金额一概不信。
3. **库存与并发**：下单在事务里用 `stock >= qty` 条件更新扣减，防超卖；取消 / 拒单回补；接单、出餐等操作要幂等（重复点击不重复流转）。
4. **状态一致**：前端只按后端返回的 `status` / `displayStatus` 显示，文案和色调从 `@waimai/shared` 的映射取，和 README 状态色表一致。
5. **实时提醒**：商家新订单用 SSE 推送 + 提示音（浏览器需用户先有一次点击才能播放声音，在工作台给出“开启提醒”开关）；SSE 断线自动重连，并在重连后补拉一次订单列表。
6. **两个前端应用的路由**：Vite `base` 必须正确（mobile 为 `/mobile/`），静态资源与路由刷新（history fallback）在开发代理和生产托管下都要验证；直接在地址栏打开 `/mobile/merchant/orders` 刷新不能 404。
7. **设备分流不要死循环**：两端使用相同纯分流逻辑；明确手机版 URL 不反向分流。普通／自动入口在启动前、窗口变化、pageshow、focus 及恢复可见时检查公开设备标识，150ms 合并事件，使用最新路径；不响应旧偏好存储事件，不按宽度分流。临时自动来源参数仅跨本次跳转并在挂载前移除，跳转时停止监听，卸载／HMR 清理监听和定时器；相同设备与当前版本一致时不重复跳转。刷新已清理的手机版地址后按明确入口处理，不探测开发者工具按钮。
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
