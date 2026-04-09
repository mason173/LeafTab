# 官网静态页部署（不影响同步后端）

这份指南用于把 `leaf-tab-official-site-main/` 部署到你的服务器，并保持现有同步后端可用。

脚本文件：

- `/Users/mason/Desktop/leaftabb/scripts/deploy_official_site.sh`

## 设计目标

- 同域名部署官网首页和隐私政策页
- 保持 `/api/*` 继续反向代理到后端（默认 `localhost:3001`）
- 可选保留旧版“无 `/api` 前缀”API 路径兼容

## 默认行为

- 官网地址：`https://leaftab.cc/`
- 隐私政策：`https://leaftab.cc/privacy/index.html`
- 后端 API：`https://leaftab.cc/api/*`（不变）
- 默认 **不修改 Caddy**（`LEAFTAB_UPDATE_CADDY=false`）
- 默认 **不重启后端服务**（只更新静态文件）
- 部署前会自动备份旧静态站点到服务器（默认 `/var/backups/leaftab-site`）

## 一键部署

在项目根目录执行：

```bash
bash scripts/deploy_official_site.sh
```

脚本会提示你输入服务器地址（如果你没有提前设置环境变量）。

## 常用环境变量

```bash
LEAFTAB_SERVER_IP=你的服务器IP或域名
LEAFTAB_SERVER_USER=root
LEAFTAB_SITE_DOMAIN=leaftab.cc
LEAFTAB_API_UPSTREAM=localhost:3001
LEAFTAB_LOCAL_SITE_DIR=leaf-tab-official-site-main
LEAFTAB_REMOTE_SITE_DIR=/var/www/leaftab
LEAFTAB_REMOTE_SITE_BACKUP_DIR=/var/backups/leaftab-site
LEAFTAB_SITE_INCLUDE_WWW=true
LEAFTAB_ENABLE_LEGACY_API_PATHS=true
LEAFTAB_UPDATE_CADDY=false
```

示例：

```bash
LEAFTAB_SERVER_IP=1.2.3.4 LEAFTAB_SERVER_USER=root bash scripts/deploy_official_site.sh
```

## 如何保证不影响同步后端

- 默认模式下脚本不改 Caddy、不改 systemd、不重启后端，仅替换静态文件目录内容。
- 你的后端路由与进程（`localhost:3001`、`leaftab-backend.service`）不会被脚本直接触碰。
- 脚本会做部署前后 `https://你的域名/api/captcha` 状态对比，帮助快速发现异常。
- 若需要让脚本顺带改 Caddy，必须显式设置 `LEAFTAB_UPDATE_CADDY=true`。

## 部署后检查

脚本会自动检查：

- `https://leaftab.cc/`
- `https://leaftab.cc/privacy/index.html`
- `https://leaftab.cc/api/captcha`

如果你使用的是非 `leaftab.cc` 域名，请在执行脚本时传 `LEAFTAB_SITE_DOMAIN`。

## 快速回滚（静态页）

脚本完成后会输出最新备份路径和回滚命令。常用回滚形态：

```bash
ssh root@你的服务器 \"rm -rf /var/www/leaftab/* && tar -xzf /var/backups/leaftab-site/site-时间戳.tgz -C /var/www/leaftab\"
```
