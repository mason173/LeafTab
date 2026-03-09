# LeafTab Icon Library Template (GitHub Pages)

把这个目录里的文件复制到一个新的 GitHub 仓库（例如 `leaftab-icons`）即可快速搭建图标库并自动部署到 GitHub Pages。

## 目录结构

```
leaftab-icons/
  svgs/
    google.com.svg
    zhihu.com.svg
  scripts/
    generate-manifest.mjs
  manifest.json          # 自动生成
  package.json
  .github/workflows/pages.yml
```

## 使用方式

1. 新建 GitHub 仓库：`leaftab-icons`（Public）
2. 把本目录内容复制到仓库根目录
3. 往 `svgs/` 放你的 SVG 图标（文件名建议用可注册域：`google.com.svg`）
4. 推送到 GitHub
5. 仓库 Settings → Pages：
   - Source: **GitHub Actions**
6. 每次 push，Actions 会自动生成 `manifest.json` 并部署到 Pages

部署成功后，地址类似：

`https://{username}.github.io/leaftab-icons/`

LeafTab 管理员面板里填入上面的地址即可。

## 一键更新（放图标 → 一条命令发布）

1. 把 SVG 放进 `svgs/`（文件名用域名，比如 `google.com.svg`）
2. 在仓库根目录运行：

```bash
npm run publish
```

它会自动生成 `manifest.json`，并执行 `git add/commit/push` 触发 GitHub Actions 部署。
