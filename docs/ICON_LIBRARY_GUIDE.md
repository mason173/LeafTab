## GitHub Pages 图标库（LeafTab Icon Library）

LeafTab 已支持从 GitHub Pages 加载“统一风格的自定义图标库”。你只需要准备一个公开的 GitHub Pages 站点，并在根目录提供：

- `manifest.json`
- 图标文件（建议放在 `svgs/` 目录）

LeafTab 管理员面板里填写的“图标库地址”，就是你的 GitHub Pages 基础 URL。程序会自动请求：

`{图标库地址}/manifest.json`

例如：`https://yourname.github.io/leaftab-icons/manifest.json`

---

## 方案一：新建一个专门的图标库仓库（推荐）

### 1) 创建仓库

在 GitHub 新建一个仓库，例如：

- 仓库名：`leaftab-icons`
- 可见性：Public（GitHub Pages 免费版通常要求公开）

建议目录结构：

```
leaftab-icons/
  svgs/
    google.com.svg
    zhihu.com.svg
  manifest.json
```

### 2) 写 manifest.json

`manifest.json` 最小格式：

```json
{
  "version": "2026-03-09",
  "generatedAt": "2026-03-09T00:00:00Z",
  "icons": {
    "google.com": "svgs/google.com.svg",
    "zhihu.com": "svgs/zhihu.com.svg"
  }
}
```

说明：

- `icons` 的 key 建议用可注册域（例如 `google.com`、`zhihu.com`）
- value 是相对路径（相对你的 Pages 根目录）

LeafTab 会优先匹配：

- `domain`
- `registrable_domain`
- `www.registrable_domain`

### 3) 开启 GitHub Pages

进入仓库 Settings → Pages：

- **Build and deployment**：
  - Source 选择 **Deploy from a branch**
  - Branch 选择 **main**
  - Folder 选择 **/(root)**（如果你的 `manifest.json` 在仓库根目录）
- 保存后等待 1~2 分钟，GitHub 会给你一个地址：
  - `https://{username}.github.io/{repo}/`

### 4) 在 LeafTab 里填入图标库地址

LeafTab → 设置 → 连点版本号 6 次进入管理员模式 → 管理员面板：

- 图标库地址：`https://{username}.github.io/{repo}`

保存后重新打开新标签页，图标会优先走你的库。

---

## 方案二：用 GitHub Actions 部署 Pages（更自动化）

如果你想每次 push 自动部署，可以在图标库仓库加一个 workflow（示例见 `docs/icon-library-template/`）。

---

## 常见问题

### Q0：你能直接帮我登录 GitHub 并用命令创建吗？

不行。我无法获取/代替你的 GitHub 账号完成登录或创建仓库操作（也不会接触你的账号凭据）。

但我已经在本仓库提供了一个可直接复制的模板：`docs/icon-library-template/`，你按下面步骤在 GitHub 网页上创建仓库并上传即可。

### Q1：为什么我填了地址，但图标还是走 favicon？

请按顺序排查：

- `https://{username}.github.io/{repo}/manifest.json` 是否能在浏览器直接打开
- `manifest.json` 是否是合法 JSON（没有多余逗号）
- `icons` 的 value 路径是否正确（例如 `svgs/google.com.svg` 真的存在）
- 域名 key 是否写成了你快捷方式里实际的可注册域（例如你写了 `www.google.com`，但用户是 `google.com` 也能匹配；反过来不一定）

### Q2：我有几千个图标，manifest 会不会太大？

几千条一般可用，但建议后续升级为“分片索引”（00~ff 分桶）以减少首次下载体积；LeafTab 目前实现的是单 manifest（后续可扩展）。

### Q3：更新某个图标后，用户端多久能生效？

LeafTab 会缓存 manifest（默认 TTL 12 小时），也会缓存已经下载过的图标。最快生效方式：

- 在 LeafTab 里把图标库地址清除再保存一次，或者
- 等 TTL 到期自动刷新

如果你在 manifest 里给某个图标 entry 提供了 `updatedAt`（或后续扩展的 `sha256`），LeafTab 可以更可靠地触发缓存失效。

### Q4：我想“放好图标后一键更新”，怎么做？

你可以使用模板里自带的发布脚本：

- 位置：`docs/icon-library-template/scripts/publish.mjs`
- 用法：在你的图标库仓库根目录运行：

```bash
npm run publish
```

它会生成 `manifest.json`，然后自动 `git add/commit/push`，触发 GitHub Actions 部署 Pages。
