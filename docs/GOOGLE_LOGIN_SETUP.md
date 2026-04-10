# LeafTab Google 登录接入说明

本次代码已完成 Google 登录基础链路：

- 扩展页：调用 `chrome.identity.launchWebAuthFlow` 获取 Google `id_token`
- 网页页签：调用标准 Google OAuth popup，回跳到 `/google-auth-callback.html` 后把 `id_token` 传回主窗口
- 后端：新增 `POST /auth/google`，校验 Google `id_token` 后签发 LeafTab `token`
- 数据库：新增 `users.google_sub` / `users.auth_provider` 字段

## 1) Google 控制台配置

如果你同时支持“扩展页登录”和“网页页签登录”，建议准备两个 Google OAuth Client：

- 扩展模式：Chrome Extension / Chromium 回调模式使用的 Client ID
- 网页模式：Web application 使用的 Client ID

后端 `GOOGLE_OAUTH_CLIENT_IDS` 支持逗号分隔多个 Client ID。

### 扩展模式 Client ID

LeafTab 当前扩展模式默认使用这个 Client ID：

`352087600211-6cu9ot6j7n16927c9blblpcotnimfel2.apps.googleusercontent.com`

如果你要同时支持“Chrome 商店版”和“社区版 zip 解压安装”，Google Cloud Console 里必须同时放行这两个扩展回调地址：

- 商店版（Chrome Web Store）
  - `https://lfogogokkkpmolbfbklchcbgdiboccdf.chromiumapp.org/`
- 社区版（固定 key 后的 unpacked ID）
  - `https://plnjjlkaaonbccmjpfljbbbbaahfklem.chromiumapp.org/`

只放行其中一个时，另一个渠道会在 Google 授权页报：

`错误 400：redirect_uri_mismatch`

### 网页模式 Client ID

网页模式需要额外在 Google Cloud Console 配置一个 `Web application` 类型的 OAuth Client，并至少添加：

- Authorized JavaScript origins:
  - `http://localhost:3000`
  - `https://www.leaftab.cc`
- Authorized redirect URIs:
  - `http://localhost:3000/google-auth-callback.html`
  - `https://www.leaftab.cc/google-auth-callback.html`

然后在前端环境变量中配置：

```env
VITE_GOOGLE_WEB_OAUTH_CLIENT_ID=你的网页模式GoogleClientID
```

## 2) 后端开启 Google 登录

编辑你的后端环境变量（例如 `/etc/leaftab-backend.env`）：

```env
GOOGLE_OAUTH_CLIENT_IDS=352087600211-6cu9ot6j7n16927c9blblpcotnimfel2.apps.googleusercontent.com,你的网页模式GoogleClientID
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

扩展模式默认内置了官方 Client ID。  
如果你后续更换为自己的扩展模式 Client ID，可在构建时覆盖：

```bash
VITE_GOOGLE_OAUTH_CLIENT_ID=你的客户端ID npm run build:community
```

网页模式请额外配置：

```bash
VITE_GOOGLE_WEB_OAUTH_CLIENT_ID=你的网页模式客户端ID npm run dev
```

当前前端行为：

- 扩展页优先走 `chrome.identity.launchWebAuthFlow`
- 官网网页页签继续走 Google popup fallback
- 扩展模式默认同时兼容这两个固定扩展 ID：
  - 商店版：`lfogogokkkpmolbfbklchcbgdiboccdf`
  - 社区版：`plnjjlkaaonbccmjpfljbbbbaahfklem`

## 4) 自定义后端说明

- 当前实现支持“官方服务器”与“自定义服务器”两种登录目标。
- 只要对应后端配置了 `GOOGLE_OAUTH_CLIENT_IDS`，并且包含你当前环境使用的 Client ID（扩展模式或网页模式），即可正常使用 Google 登录。
- 若自定义后端未配置，会收到明确错误提示，不会影响原有账号密码登录。
