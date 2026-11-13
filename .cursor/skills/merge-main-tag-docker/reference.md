# merge-main-tag-docker 参考

## Workflow 摘要（docker.yml）

```yaml
on:
  push:
    branches: [main, master]
    tags: ['v*']
  pull_request:
    branches: [main, master]
```

推送事件且非 PR 时 `push: true`；镜像名 `ghcr.io/${{ github.repository }}`。

metadata-action 会为 semver 标签生成 `{{version}}`、`{{major}}.{{minor}}` 等别名。

## 常用只读命令

```bash
gh pr list --base main
gh pr checks <PR_NUMBER>
gh run list --workflow=docker.yml --limit 5
gh run watch
```

## 仅重新构建 main 最新镜像（不打新标签）

合并后 push 到 `main` 已会触发构建并更新 `latest`（在默认分支上 enable）。若不需要新 semver，可只合并 PR，不打标签。

## 回滚标签（谨慎）

```bash
# 本地删除错误标签
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
```

删除远程标签**不会**自动删除 ghcr 上已推送的镜像层；需在 Registry 侧另行处理旧版本。
