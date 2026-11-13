# cloud-agent-fullstack-dev-env

个人 Cursor Skill：**跨项目**搭建 Cloud Agent 全栈开发环境（install/start + DB + 预览端口）。

## 安装到本机（全局）

Cursor 从 `~/.cursor/skills/<文件夹名>/SKILL.md` 加载个人 skill（文件夹名需与 frontmatter `name` 一致）。

```bash
# 若本 skill 在 class-pet-garden 仓库的 personal-skills/ 下：
ln -s /path/to/class-pet-garden/personal-skills/cloud-agent-fullstack-dev-env \
  ~/.cursor/skills/cloud-agent-fullstack-dev-env

# 或整目录复制：
cp -a personal-skills/cloud-agent-fullstack-dev-env ~/.cursor/skills/
```

## Cloud Agent 使用同步 skill

1. Cursor → **Settings → Agents**
2. 打开 **Sync Skills for Cloud Agents**
3. 保存后 `~/.cursor/skills/` 会同步到云端（仅你本人；自动化任务不会自动加载个人 skill）

## 与仓库内 skill 的关系

- **本 skill（个人）**：通用流程、模板、排错
- **`<repo>/.cursor/skills/...`（项目）**：只写端口、库名、业务 Secrets 等特例

## 调用

在对话中说「按 cloud-agent-fullstack-dev-env 配云环境」，或使用 `/cloud-agent-fullstack-dev-env`（若已注册）。
