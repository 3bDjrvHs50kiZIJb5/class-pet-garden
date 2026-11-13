# release-docker 参考

## 如何从仓库推断规则

```bash
ls .github/workflows
rg -n 'tags:|branches:|IMAGE_NAME|REGISTRY' .github/workflows
```

本仓库 workflow 摘要：

```yaml
on:
  push:
    branches: [main, master]
    tags: ['v*']
```

## 常用只读命令

```bash
gh pr list --base main
gh pr checks <PR_NUMBER>
gh run list --limit 5
gh run watch
```

## 只更新 latest、不打新标签

不少仓库在 push 默认分支时已构建并打 `latest`。若不需要新 semver，合并 PR 即可，可跳过打标签。

## 删除错误远程标签（谨慎）

```bash
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
```

不会自动删除 Registry 中已推送的镜像。
