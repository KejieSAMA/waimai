# 部署说明

## 环境准备

使用 Node 22、pnpm 10，配置随机 JWT_SECRET（至少 32 字符），生产环境使用 HTTPS。模板占位密钥和缺失密钥在开发、生产都会拒绝启动。

| 变量             | 默认值或用途                                        |
| ---------------- | --------------------------------------------------- |
| `HOST`           | `0.0.0.0`                                           |
| `PORT`           | API 和生产静态托管端口，默认 `3000`                 |
| `FRONTEND_PORT`  | PC 开发入口，默认 `13599`                           |
| `MOBILE_PORT`    | 手机开发服务，默认 `5174`                           |
| `DATABASE_URL`   | `file:./dev.db`，相对 Prisma schema 目录            |
| `JWT_SECRET`     | access token 签名，2 小时有效                       |
| `PRODUCT_REVIEW` | `true` 时新增或编辑商品进入审核                     |
| `UPLOAD_DIR`     | 上传目录，相对 backend 工作目录，默认 `./uploads`   |
| `NODE_ENV`       | 本地为 `development`，start 脚本设置为 `production` |

## 初始化与运行

以下构建步骤供人工执行，本次开发未运行生产构建。

```powershell
pnpm install --frozen-lockfile
pnpm db:setup
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

`db:setup` 生成 Prisma 客户端、部署迁移并写入基础类目，不创建演示账号。首次部署运行 `pnpm --filter @waimai/backend account:init`，在本机终端输入首管理员账号及密码。旧库升级先执行 [账号迁移说明](ACCOUNTS_MIGRATION.md)中的备份与验证；迁移会禁用旧账号、冻结店铺并撤销全部会话。增量部署使用以下命令保留业务数据。

```powershell
pnpm --filter @waimai/backend db:generate
pnpm --filter @waimai/backend db:migrate
```

`pnpm build` 生成两个前端的 `dist` 及后端的 `dist/server.js`。`pnpm start` 在 `0.0.0.0:3000` 提供 API、上传文件和两套前端，`/mobile/*` 返回手机版入口，其余页面返回 PC 入口。API 和上传的未知路径返回相应错误。

刷新凭据为服务器生成的随机值并仅存摘要，不再使用 JWT_REFRESH_SECRET；旧环境中的该变量可删除。

服务端购物车升级需先备份数据库，再生成 Prisma 客户端并部署 `20261113000000_server_cart` 迁移；新建 Cart／CartMerge 并为 Order 增加可空 requestId，不修改历史账号密码、店铺、商品或订单。Windows 上先停止本项目服务以释放 Prisma DLL，再执行上述增量命令并重启。两端旧 xz-cart 会清理且不导入，主题与登录偏好保持不变。部署及人工验收步骤见 [购物车说明](SERVER_CART.md)。

生产 refresh cookie 使用 `secure` 和 `httpOnly`，浏览器访问通过 HTTPS 入口进行。账号只使用密码，不依赖短信或固定验证码。支付当前采用规格要求的模拟支付。

## Nginx

以下配置放入已配置 TLS 证书的 HTTPS server 块中，所有业务请求通过同一域名。

```nginx
client_max_body_size 6m;

location /api/v1/merchant/orders/stream {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
}

location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /uploads/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
}

location /mobile/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

也可以将 `/mobile/` 与 `/` 都代理到 backend，沿用应用内 history fallback。证照文件由 backend 校验所有者或管理员身份，Nginx 上传路径保持代理，以执行这项访问检查。

## 数据与维护

- SQLite 数据文件默认在 `backend/prisma/dev.db`。备份时暂停写入或使用 SQLite 在线备份，同时保存 `backend/uploads`，其中包含证照访问元数据。
- 后端每分钟取消超过 15 分钟未支付的订单，并在事务内回补库存。
- SSE 断线会重连，重连后补拉订单列表。浏览器先点击开启提醒，才能播放提示音。
- 切换 MySQL 时更改 Prisma datasource provider 和连接串，重新生成对应迁移与 Prisma 客户端，并迁移业务数据。
