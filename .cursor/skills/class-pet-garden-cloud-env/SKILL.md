---
name: class-pet-garden-cloud-env
description: >-
  班级宠物园 Cloud 环境特例：端口 3001/3002、classpets 库、本项目 .cursor 脚本路径。
  通用「任意项目配 Cloud 全栈环境」流程用个人 skill cloud-agent-fullstack-dev-env。
---

# 班级宠物园 — Cloud 环境（项目层）

**先读个人 skill（跨项目通用）：**

- 本仓库 `/` 列表：`.cursor/skills/cloud-agent-fullstack-dev-env/`
- 其它项目或全局：`~/.cursor/skills/cloud-agent-fullstack-dev-env/`（从 `personal-skills/` 复制）
- Cloud Agent：在 Settings → Agents 开启 **Sync Skills for Cloud Agents** 后同步个人 skill

通用步骤（发现 → install/start 三件套 → Build → 新开 Agent）**不要在本文件重复维护**，以 `cloud-agent-fullstack-dev-env` 为准。

## 本项目参数

| 项 | 值 |
|----|-----|
| 前端 | Vue Vite **3001** |
| API | Express **3002** |
| 一键 dev | 根目录 `npm start`（concurrently）；缺依赖时 `scripts/ensure-npm-deps.sh` 自动 `npm ci` |
| DB（Cloud） | MariaDB，`classpets` / 用户 `classpets` |
| 健康检查 | `GET http://127.0.0.1:3002/api/health` |
| tmux 会话 | `class_pet_garden` |
| 日志 | `/tmp/class-pet-garden/dev.log` |

## 仓库内配置文件（权威）

- `.cursor/environment.json`
- `.cursor/cloud-agent-install.sh`
- `.cursor/start.sh`

环境变量与 `.env.example` 对齐；`TOKEN_SECRET` 可用 Cursor Secrets 覆盖 start 脚本中的开发默认。

## 本项目冒烟命令

```bash
bash .cursor/cloud-agent-install.sh
bash .cursor/start.sh
curl -sf http://127.0.0.1:3002/api/health
curl -sf -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/
```

## 相关

- 日常开发：`../class-pet-garden/SKILL.md`
- Docker 发版：`../class-pet-garden-docker-release/SKILL.md`
- 平台机制：`env-setup` skill
