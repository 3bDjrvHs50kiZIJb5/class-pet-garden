---
name: class-pet-garden
description: >-
  班级宠物园开发与部署：Vue3 + Express + MySQL、Cursor Cloud Agent 环境（MariaDB + npm start）、
  本地/云端预览、GHCR Docker 发版（v* 标签）。在用户问启动项目、云开发预览、environment.json、
  npm ci 失败、MariaDB、docker compose、打 tag 发镜像时使用。
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

**仅 Cloud Agent 且已配置环境时：**

```bash
bash .cursor/cloud-agent-install.sh   # 首次 / Build 阶段
bash .cursor/start.sh                   # MariaDB + tmux 内 npm start
# 日志：/tmp/class-pet-garden/dev.log ；会话：tmux attach -t class_pet_garden
```

## Cloud Agent 环境（Config as code）

| 文件 | 职责 |
|------|------|
| `.cursor/environment.json` | `install` / `start` / `ports` |
| `.cursor/cloud-agent-install.sh` | apt 安装 MariaDB + `npm ci` |
| `.cursor/start.sh` | 启库、建 `classpets` 用户、tmux `npm start` |

用户流程：合并 `.cursor/` → 仪表盘绑定 `environment.json` → **Trigger build** → **新开 Agent**（旧 Agent 不会重跑 `start`）。

**Secrets（可选）：** `TOKEN_SECRET` 覆盖启动脚本中的开发默认值。

**常见失败：**

1. `npm ci` / lock 与 `package.json` 不一致 → 本地 `npm install` 同步 `package-lock.json` 并提交。
2. `install` 失败后仍执行 `start.sh` → `concurrently: not found`；先修好依赖再 `start.sh`。
3. 无 Docker 的 Cloud VM → 用 MariaDB，不要用 `docker compose up mysql`（除非镜像内已装 Docker）。

## 生产 Docker

- 构建：`Dockerfile`；Compose：`docker-compose.yml`；默认镜像 `ghcr.io/3bdjrvhs50kizijb5/class-pet-garden:latest`
- **打标签、发 GHCR 镜像、部署指定版本**：读取并遵循  
  `.cursor/skills/class-pet-garden-docker-release/SKILL.md`

## 前端约定

- 路径别名 `@/`
- 注册页：提交前弹出 `SlideVerify`（`src/components/SlideVerify.vue`），验证成功后再 `POST /auth/register`
- 样式：Tailwind，主色 `#ff5c00`

## Agent 操作原则

1. 改 Cloud 环境后提醒用户 **新开会话** 或查看 `/tmp/cursor/start-user/start-user.log`。
2. 不在聊天或 skill 中写入真实 `TOKEN_SECRET`、生产数据库密码。
3. 验证功能：`npm run build`（`vue-tsc` + vite）；无自动化 E2E 时可视需要手动打开 3001。
4. 分支命名（Cloud Agent 任务）：`cursor/<描述>-afcc`。
