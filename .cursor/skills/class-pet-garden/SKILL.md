---
name: class-pet-garden
description: >-
  班级宠物园开发与部署：Vue3 + Express + MySQL、本地/云端预览、GHCR Docker 发版（v* 标签）。
  Cloud Agent 环境：个人 skill cloud-agent-fullstack-dev-env（通用）+ 本仓库 class-pet-garden-cloud-env（特例）。
  在用户问启动项目、docker compose、打 tag 发镜像时使用。
---

# 班级宠物园（Class Pet Garden）Agent 指南

## 技术栈与端口

| 层 | 技术 | 默认端口 |
|----|------|----------|
| 前端 | Vue 3 + Vite | **3001**（`host: true`，代理 `/pet-garden/api`） |
| 后端 | Node Express ESM | **3002** |
| 数据库 | **MySQL 8 / MariaDB**（`mysql2`） | 3306 |

- API 基路径：`/pet-garden/api`（Vite 代理）或生产 `/api`
- 健康检查：`GET /api/health`
- 权威结构说明见仓库根目录 `AGENTS.md`（部分文档仍写 SQLite，以 `server/db.js` 为准）

## 本地 / Cloud Agent 启动

```bash
# 根目录 + server 依赖（lock 不同步时用 npm install 修复后再 npm ci）
npm ci && npm ci --prefix server

# 数据库：docker compose up -d mysql，或 Cloud 用 .cursor/start.sh 起 MariaDB
# 环境变量见 .env.example（DB_*、TOKEN_SECRET）

npm start          # concurrently: dev + server
```

**Cloud Agent：** 配环境读 `cloud-agent-fullstack-dev-env`；本仓库端口/库名见  
`.cursor/skills/class-pet-garden-cloud-env/SKILL.md`。

## 生产 Docker

- 构建：`Dockerfile`；Compose：`docker-compose.yml`；默认镜像 `ghcr.io/3bdjrvhs50kizijb5/class-pet-garden:latest`
- **打标签、发 GHCR 镜像、部署指定版本**：读取并遵循  
  `.cursor/skills/class-pet-garden-docker-release/SKILL.md`

## 前端约定

- 路径别名 `@/`
- 注册页：提交前弹出 `TurnstileVerify`（`src/components/TurnstileVerify.vue`），验证成功后再 `POST /auth/register`（服务端 `turnstile.js` siteverify）
- 样式：Tailwind，主色 `#ff5c00`

## Agent 操作原则

1. 改 Cloud 环境后提醒用户 **新开会话** 或查看 `/tmp/cursor/start-user/start-user.log`。
2. 不在聊天或 skill 中写入真实 `TOKEN_SECRET`、生产数据库密码。
3. 验证功能：`npm run build`（`vue-tsc` + vite）；无自动化 E2E 时可视需要手动打开 3001。
4. 分支命名（Cloud Agent 任务）：`cursor/<描述>-2140`。
5. **新建/更新 Cloud 环境（任意项目）**：`cloud-agent-fullstack-dev-env`；本仓库再加  
   `class-pet-garden-cloud-env`。
