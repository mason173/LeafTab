# LeafTab Google 登录接入说明

本次代码已完成 Google 登录基础链路：

- 扩展端：调用 `chrome.identity.launchWebAuthFlow` 获取 Google `id_token`
- 后端：新增 `POST /auth/google`，校验 Google `id_token` 后签发 LeafTab `token`
- 数据库：新增 `users.google_sub` / `users.auth_provider` 字段

## 1) Google 控制台配置

你已经申请了 Web Client ID（可直接使用）：

`352087600211-6cu9ot6j7n16927c9blblpcotnimfel2.apps.googleusercontent.com`

回调地址需包含当前扩展 ID 对应的：

`https://lfogogokkkpmolbfbklchcbgdiboccdf.chromiumapp.org/`

## 2) 后端开启 Google 登录

编辑你的后端环境变量（例如 `/etc/leaftab-backend.env`）：

```env
GOOGLE_OAUTH_CLIENT_IDS=352087600211-6cu9ot6j7n16927c9blblpcotnimfel2.apps.googleusercontent.com
```

然后重启后端：

```bash
sudo systemctl restart leaftab-backend
```

> 如果不配置 `GOOGLE_OAUTH_CLIENT_IDS`，后端会返回“Google login is not enabled on this server”。

### 一键脚本（推荐）

如果你不想手动改服务器文件，可以直接运行：

```bash
cd /Users/mason/Desktop/leaftabb
bash scripts/enable_google_login.sh
```

脚本会自动：

- 连接服务器
- 备份 `/etc/leaftab-backend.env`
- 写入或更新 `GOOGLE_OAUTH_CLIENT_IDS`
- 重启 `leaftab-backend` 服务
- 做一次 `https://你的域名/api/auth/google` 健康检查

如果健康检查是 `404 Cannot POST /auth/google`，说明服务器后端代码还没更新到包含该接口的版本。  
这时请执行“仅后端代码部署脚本”（不会改 Caddy 和官网静态页）：

```bash
cd /Users/mason/Desktop/leaftabb
bash scripts/deploy_backend_only.sh
```

## 3) 前端 Client ID（可选）

扩展默认内置了官方 Client ID。  
如果你后续更换为自己的 Client ID，可在构建时覆盖：

```bash
VITE_GOOGLE_OAUTH_CLIENT_ID=你的客户端ID npm run build:community
```

## 4) 自定义后端说明

- 当前实现支持“官方服务器”与“自定义服务器”两种登录目标。
- 只要对应后端配置了 `GOOGLE_OAUTH_CLIENT_IDS`，并且包含你扩展使用的 Client ID，即可正常使用 Google 登录。
- 若自定义后端未配置，会收到明确错误提示，不会影响原有账号密码登录。
