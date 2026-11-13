---
name: release-docker
description: 合并 PR 到 main、删除已合并分支、推送 v* 标签触发 GitHub Actions 构建 Docker 镜像。Use for merge to main, delete branch, release tag, ghcr.io, 打标签, 发布镜像, ship.
disable-model-invocation: true
icon: git-branch
color: orange
---

# 合并 main、删分支、打标签构建镜像

在 Agent 输入 **`/release-docker`**（输入 `/` 后搜索 `release`、`docker`、`标签`）即可调用本流程。

**先读当前仓库** `.github/workflows/*.yml`，确认 `on.push.tags` / 分支规则与默认分支名（`main` 或 `master`）。常见为 Docker 推送到 `ghcr.io/<owner>/<repo>`。

| 触发方式 | 推送镜像 | 典型标签 |
|----------|----------|----------|
| 合并后 push 到默认分支 | 是 | `latest`、分支名、commit sha |
| push 标签 `v*`（以 workflow 为准） | 是 | semver（如 `1.2.3`） |
| 仅 PR | 往往仅构建 | PR ref |

**发布推荐**：PR 合并到默认分支后，在 **默认分支最新提交** 上打 **`v*` 语义化标签** 并 `git push origin <tag>`，触发带版本号的镜像构建。

## 前置条件

- [ ] 目标 PR 已 review，**CI 全绿**
- [ ] 已确认版本号（如 `vMAJOR.MINOR.PATCH`），且符合 workflow 的 tag 模式
- [ ] 有权限合并 PR、删除远程分支、推送标签

## 工作流

```
Task Progress:
- [ ] 0. 阅读 .github/workflows 确认 tag 与 job 名称
- [ ] 1. 合并 PR 到默认分支
- [ ] 2. 本地同步默认分支
- [ ] 3. 删除已合并的功能分支（本地 + 远程）
- [ ] 4. 在默认分支上创建并推送 v* 标签
- [ ] 5. 在 GitHub Actions 确认镜像构建成功
```

### 0. 确认 CI 配置

在工作区根目录打开 Docker/发布相关 workflow，记录：

- 默认分支名
- `tags` 过滤（例如 `v*`）
- Actions 里显示的 workflow 名称（用于 `gh run list --workflow=...`）

### 1. 合并到默认分支

- Cloud Agent：用 **ManagePullRequest** 合并；用户未明确要求时不要擅自 `git push` 到受保护分支。
- 合并后记下 **main 上的 tip SHA**。

### 2. 同步默认分支

将 `main` 换成仓库实际默认分支：

```bash
git fetch origin main
git checkout main
git pull origin main
```

### 3. 删除已合并分支

```bash
git checkout main
git branch -d <branch>
git push origin --delete <branch>
```

若 Cloud Agent 仓库有分支命名策略，删除前核对 **已合并** 的分支名（勿删他人进行中的分支）。

### 4. 打标签并推送

标签必须匹配 workflow（示例为 `v*`）：

```bash
git fetch --tags
git tag -l 'v*' --sort=-v:refname | head -5

git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

勿对远程已有标签随意 force-push。

### 5. 验证 Actions

- GitHub → Actions → 对应 Docker workflow，确认 tag push 触发的 run 成功。
- ghcr.io Packages 中确认新版本标签。

## Cloud Agent

- PR：用 **ManagePullRequest**。
- 分支策略：遵守当前 run 的 `cloud_task_instructions`（前缀、`base_branch` 等）。

## 反模式

- 在未进默认分支的提交上打发布标签。
- 标签模式与 workflow 不一致（不触发镜像构建）。
- 删除未合并分支。

## 补充

- 见 [reference.md](reference.md)
