# HTTPS 部署指南（与 `scripts/deploy.sh` 一致）

本指南以当前仓库里的 `scripts/deploy.sh` 为准，不再要求你手工写 Caddyfile。

`deploy.sh` 会自动完成这些事情：

1. 构建前端（本地机器执行 `npm run build`）。
2. 上传并部署后端（`server/`）。
3. 安装/检查 Caddy。
4. 按 `PUBLIC_ORIGIN` 自动生成并上传 `/etc/caddy/Caddyfile`。
5. 重载 Caddy、重启后端并做健康检查（含 `/api/captcha`）。

## 1) 前置条件

1. 你的域名 A 记录已解析到服务器 IP。
2. 服务器可通过 `root@<IP>`（或你自定义用户）SSH 登录。
3. 服务器已放行 80/443 端口。

## 2) 最推荐执行方式

在项目根目录执行（推荐显式传入线上域名，避免误配置）：

```bash
LEAFTAB_SERVER_IP=你的服务器IP \
LEAFTAB_PUBLIC_ORIGIN=https://你的域名 \
bash scripts/deploy.sh
```

例如：

```bash
LEAFTAB_SERVER_IP=83.229.123.206 \
LEAFTAB_PUBLIC_ORIGIN=https://www.leaftab.cc \
bash scripts/deploy.sh
```

## 3) 交互模式（可用）

也可以直接执行：

```bash
bash scripts/deploy.sh
```

脚本会提示输入服务器地址，密码由 `ssh/scp` 原生提示输入。

注意：当前脚本默认 `PUBLIC_ORIGIN=https://www.leaftab.cc`。  
如果你不是这个域名，请务必通过环境变量覆盖 `LEAFTAB_PUBLIC_ORIGIN`。

## 4) 常用可选参数

```bash
# 后端部署目录（你自定义目录时要传）
LEAFTAB_BACKEND_REMOTE_DIR=/root/browser-start-page-server

# 后端环境文件路径
LEAFTAB_BACKEND_ENV_REMOTE_PATH=/root/browser-start-page-server/.env

# 自定义 SSH 用户
LEAFTAB_SERVER_USER=ubuntu
```

组合示例：

```bash
LEAFTAB_SERVER_IP=你的服务器IP \
LEAFTAB_SERVER_USER=root \
LEAFTAB_PUBLIC_ORIGIN=https://你的域名 \
LEAFTAB_BACKEND_REMOTE_DIR=/root/browser-start-page-server \
LEAFTAB_BACKEND_ENV_REMOTE_PATH=/root/browser-start-page-server/.env \
bash scripts/deploy.sh
```

## 5) 部署后验证

在本地执行：

```bash
curl -I https://你的域名/api/
curl -I https://你的域名/api/captcha
```

只要返回 HTTP 状态码（如 `200` / `401` / `429`），说明 HTTPS 与反代链路是通的。  
如果浏览器报 `ERR_SSL_PROTOCOL_ERROR`，通常是 Caddy 站点域名配置错误（见下一节）。

## 6) 常见问题

### 6.1 `ERR_SSL_PROTOCOL_ERROR`（最常见）

原因：`PUBLIC_ORIGIN` 用错了（或没覆盖默认值），导致服务器 Caddyfile 站点不是你访问的域名。

修复：用正确 `LEAFTAB_PUBLIC_ORIGIN` 重新执行部署。

```bash
LEAFTAB_SERVER_IP=你的服务器IP \
LEAFTAB_PUBLIC_ORIGIN=https://你的真实域名 \
bash scripts/deploy.sh
```

### 6.2 `npm run clear:domain-stats` 找不到脚本

原因：你进入的不是部署脚本实际上传的后端目录，或者服务器代码不是最新。

处理：

1. 确认你当前目录和 `LEAFTAB_BACKEND_REMOTE_DIR` 一致。  
2. 在正确目录执行 `node clear_domain_stats.js`（不依赖 npm script）。

## 7) 与扩展模式的关系说明

当前 `deploy.sh` 处于“扩展模式”：  
不会上传前端静态站点到服务器目录（日志会显示 `Skipping Frontend upload (Extension mode detected)`）。

但它仍会配置 Caddy 的 `/api/*` 反向代理，这正是登录、验证码、同步所需的 HTTPS 后端入口。
