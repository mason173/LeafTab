# HTTPS 证书与部署指南 (使用 Caddy)

你现在的代码已经修改为使用相对路径 `/api` 请求接口，这意味着前端不再硬编码 IP 地址，而是依赖服务器转发请求。

为了实现 HTTPS 并自动获取证书，推荐使用 **Caddy** 服务器。它会自动为你申请和续期 Let's Encrypt 证书。

## 1. 准备工作

1.  **域名解析**：确保你的域名（例如 `example.com`）已经 A 记录解析到了你的服务器 IP（例如 `YOUR_SERVER_IP`）。
2.  **后端服务**：确保你的后端 API 服务正在运行，并记下它的端口（例如 3000, 8000, 8080 等）。

## 2. 安装 Caddy

在你的服务器上安装 Caddy (以 Ubuntu/Debian 为例):

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

## 3. 配置 Caddy

项目根目录下已经为你创建了一个 `Caddyfile` 模板。请按以下步骤修改：

1. 打开 `Caddyfile`。
2. 将 `your-domain.com` 替换为你的真实域名。
3. 确认 `root * ./build` 指向你的构建产物目录（运行 `npm run build` 后生成的 `build` 文件夹）。
4. 修改 `reverse_proxy` 行，将 `localhost:3000` 替换为你后端服务的实际地址和端口。

## 4. 部署与运行

1. **构建前端**：
   ```bash
   npm run build
   ```

2. **运行 Caddy**：
   在项目根目录下（包含 Caddyfile 的目录）运行：
   ```bash
   sudo caddy run
   ```
   或者在后台运行：
   ```bash
   sudo caddy start
   ```

Caddy 启动后会自动检测域名，申请 HTTPS 证书，并开启 HTTPS 访问。

## 5. 验证

访问 `https://你的域名`，此时浏览器地址栏应显示安全锁图标，且登录功能正常（请求会被转发到后端）。
