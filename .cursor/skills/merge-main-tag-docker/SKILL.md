---
name: merge-main-tag-docker
description: Merges work into main, deletes the feature branch, and pushes a v* Git tag to trigger the Docker image build on GitHub Actions. Use when the user asks to merge to main, delete the current branch, release, ship, or build/push the ghcr.io image via tags.
---

# 合并 main、删分支、打标签构建镜像

本仓库镜像由 [.github/workflows/docker.yml](../../.github/workflows/docker.yml) 构建并推送到 `ghcr.io/<owner>/<repo>`。

| 触发方式 | 推送镜像 | 典型标签 |
|----------|----------|----------|
| 合并后 push 到 `main` | 是 | `latest`、分支名、commit sha |
| push 标签 `v*` | 是 | semver（如 `1.2.3`）、`latest`（若在默认分支上下文） |
| 仅 PR | 否（仅构建） | PR ref |

**发布推荐**：合并 PR 到 `main` 后，在 `main` 最新提交上打 **`v*` 语义化标签** 并 `git push origin <tag>`，以明确版本并触发带版本号的镜像。

## 前置条件

- [ ] 目标 PR 已 review，**CI 全绿**（含 `Docker 镜像构建与推送` 工作流在 PR 上的构建）
- [ ] 已确认要发布的版本号（`vMAJOR.MINOR.PATCH`，须以 `v` 开头）
- [ ] 有权限合并 PR、删除远程分支、推送标签

## 工作流

```
Task Progress:
- [ ] 1. 合并 PR 到 main
- [ ] 2. 本地同步 main
- [ ] 3. 删除已合并的功能分支（本地 + 远程）
- [ ] 4. 在 main 上创建并推送 v* 标签
- [ ] 5. 在 GitHub Actions 确认镜像构建成功
```

### 1. 合并到 main

- 使用 **ManagePullRequest**（Cloud Agent）或 GitHub 网页合并 PR；不要在不具备权限时强行 `git push` 到 `main`。
- 合并后记下 **合并提交的 SHA**（或 `main` 的 tip）。

### 2. 同步 main

```bash
git fetch origin main
git checkout main
git pull origin main
```

### 3. 删除当前/已合并分支

将 `<branch>` 换成已合并的功能分支名（本仓库 Cloud Agent 分支形如 `cursor/<name>-4983`）。

```bash
# 若当前仍在该分支，先切到 main
git checkout main

git branch -d <branch>
git push origin --delete <branch>
```

若 `git branch -d` 提示未合并，先确认 PR 已进 `main`，再使用 `git branch -D`（仅当确定已合并）。

### 4. 打标签并推送（触发镜像构建）

标签名**必须**匹配 workflow 中的 `v*`（例如 `v1.0.0`）。

```bash
# 查看已有标签（选新版本）
git fetch --tags
git tag -l 'v*' --sort=-v:refname | head -5

git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

 annotated tag 推荐用于发布；勿对已存在于远程的同名标签 force-push，除非团队明确要覆盖。

### 5. 验证 Actions

- 打开 GitHub → **Actions** → **Docker 镜像构建与推送**，确认由 **push tag** 触发的新 run 成功。
- 在 **Packages**（ghcr.io）中确认出现新版本标签。

## Cloud Agent 注意

- 合并/开 PR：用 **ManagePullRequest**；不要用 `gh pr merge` 替代用户未授权的合并操作。
- 删分支与打标签：在本地仓库执行上述 git 命令；标签 push 会触发 CI，属预期行为。
- 任务分支命名须符合仓库规则：`cursor/<descriptive-name>-4983`。

## 反模式

- 在未合并到 `main` 的分支上打 `v*` 再推送（镜像版本与生产代码不一致）。
- 删除仍有人开发的未合并分支。
- 使用不以 `v` 开头的标签（**不会**触发 workflow 的 tag 规则；仅 push `main` 仍会构建，但无清晰 semver 镜像名）。

## 补充说明

- 命令与权限细节见 [reference.md](reference.md)
