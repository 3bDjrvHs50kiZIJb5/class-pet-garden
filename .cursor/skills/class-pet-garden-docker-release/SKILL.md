---
name: class-pet-garden-docker-release
description: >-
  班级宠物园 Docker 镜像发版：合并 main、打 Git 标签 v*、触发 GHCR 构建、compose 指定镜像版本。
  在用户说 tag docker、打标签、发镜像、发布版本、GHCR、docker 发版、v0.1.x 时使用。
---

# 班级宠物园 — Docker 镜像发版

## 机制（必读）

本仓库**不在本机用 `docker tag` 发版**。镜像由 GitHub Actions 构建并推到 **GHCR**：

| 配置 | 路径 |
|------|------|
| Workflow | `.github/workflows/docker.yml` |
| 触发条件 | 推送到 `main`/`master`，或推送 Git 标签 **`v*`** |
| 镜像仓库 | `ghcr.io/3bdjrvhs50kizijb5/class-pet-garden` |
| Dockerfile | 根目录 `Dockerfile`（多阶段：Vite 构建 + Node 服务） |
| Compose 默认 | `docker-compose.yml` → `image: ...:latest` |

推送标签 `v0.1.9` 后，metadata-action 通常还会生成：`0.1.9`、`0.1`、commit sha；在默认分支上打 tag 时还会有 `latest`。

## 发版前检查清单

1. **待发布改动已合并进 `main`**（通过 PR；不要只在功能分支上打生产 tag，除非有意发该提交的预览镜像）。
2. 本地或 CI 上 **`npm run build`** 通过（Dockerfile 会执行 `vite build`）。
3. 确认 **`server/package-lock.json`** 与 `package.json` 一致（生产阶段 `npm ci --omit=dev`）。
4. 与团队约定**版本号**（当前标签序列多为 `v0.1.x`，见 `git tag -l 'v*'`）。

## 标准发版步骤（在 `main` 上）

```bash
git checkout main
git pull origin main

# 查看是否已有该标签
git tag -l 'v0.1.9'

git tag -a v0.1.9 -m "Release v0.1.9"
git push origin v0.1.9
```

推送标签后：

1. 打开 GitHub → **Actions** → workflow **「Docker 镜像构建与推送」**。
2. 确认对应 tag 的 run **成功**（失败时看 build 日志，常见：前端构建、server `npm ci`）。
3. 在 GHCR 包页面确认出现 `0.1.9`（及 `0.1` 等）标签。

## 部署指定版本

`docker-compose.yml` 中把应用服务镜像改为固定版本，避免误用漂移中的 `latest`：

```yaml
image: ghcr.io/3bdjrvhs50kizijb5/class-pet-garden:0.1.9
```

拉取并重载：

```bash
docker compose pull app
docker compose up -d
```

环境变量（`.env`）：`TOKEN_SECRET`、`DB_*`、`MYSQL_*` 等仍按 `.env.example` 配置；**发版不改变**数据库卷。

## Agent 执行打 tag 前的确认项

用户要求「现在打 tag / tag docker」时，**必须先确认**（未确认不推送）：

| 问题 | 说明 |
|------|------|
| 打在哪个提交？ | 默认 `main` 最新；若含未合并 PR，先合并或明确要打在功能分支 SHA |
| 版本号？ | 例如 `v0.1.9` vs `v0.2.0`；查 `git tag -l` 避免重复 |
| 是否重复 tag？ | 已存在的 tag 不能同名再推，需递增或删除远程 tag（删 tag 需用户明确授权） |

有推送权限时执行：

```bash
git fetch origin main
git tag -a <版本> -m "Release <版本>" origin/main   # 或当前检出上的 main HEAD
git push origin <版本>
```

然后回报：标签名、commit SHA、Actions 链接（`https://github.com/3bDjrvHs50kiZIJb5/class-pet-garden/actions`）。

## 限制与误区

- **Cloud Agent 默认 VM 常无 Docker CLI**：不要在该环境执行 `docker build` 发版；用 Git tag + Actions。
- **仅推 `main` 不推 tag**：也会构建并更新分支相关标签，但 **semver 版本 tag 必须推 `v*`**。
- **仓库 owner 大小写**：compose 与 GHCR 路径以 GitHub 仓库为准（`3bDjrvHs50kiZIJb5/class-pet-garden`）。
- **不要**在 skill、commit message 或 PR 中写入 registry 密码；CI 使用 `GITHUB_TOKEN` 登录 GHCR。

## 排错速查

| 现象 | 方向 |
|------|------|
| Workflow 未触发 | 是否推了 `v*` 格式；是否推送到 origin |
| 前端阶段失败 | `vue-tsc` / `vite build`；lock 不同步 |
| server 阶段失败 | `server/npm ci`；缺少 lock 或 Node 版本 |
| 部署仍跑旧代码 | compose 仍 pinned `latest`；需 pull 并指定新版本 tag |
| 401/403 拉镜像 | GHCR 包可见性 / `docker login ghcr.io` |
