---
name: class-pet-garden-cloud-env
description: >-
  为班级宠物园创建或更新 Cursor Cloud Agent 环境：environment.json、install/start 脚本、
  MariaDB 与前后端 dev 服务、环境 Build 与验证。在用户要配置云开发环境、构建环境快照、
  cloud-agent-install、start.sh、Trigger build、MariaDB 在 Cloud 里启动、或复现
  cloud-env-mariadb 分支工作流时使用。
---

# 班级宠物园 — Cloud Agent 环境构建

本 skill 描述如何把本仓库做成 **可一键在 Cloud Agent 里跑全栈预览** 的环境（MariaDB + 前端 3001 + API 3002）。实现落在仓库 `.cursor/` 下，与平台侧的 **Environment Build / Save** 配合使用。

通用 Cloud 环境概念（install vs start、快照、Build）见 Cursor 内置 **env-setup** skill；本文只写 **本仓库的既定方案与操作顺序**。

## 何时读取本 skill

| 场景 | 动作 |
|------|------|
| 首次为仓库配置 Cloud 环境 | 按下方「从零搭建」走完并触发 Build |
| 修改依赖、`package-lock`、系统包 | 改 `cloud-agent-install.sh`，触发新 Build |
| 修改启动逻辑、端口、DB 初始化 | 改 `start.sh`，**新开 Agent**（Build 不重跑 start） |
| 用户问「和 `cursor/cloud-env-mariadb-afcc` 一样吗」 | 该分支内容已合并进 `main` 的 `.cursor/`；新功能分支从 `main` 拉即可自带配置 |
| 本地用 Docker MySQL，Cloud 无 Docker | Cloud 用 **apt MariaDB**，不要用 `docker compose up mysql` |

## 目标架构

```
Environment Build（install 阶段）
  └─ cloud-agent-install.sh → apt mariadb-server + npm ci（根 + server）

每次 Agent 启动（start 阶段）
  └─ start.sh → MariaDB 就绪 → 建库/用户 → tmux 内 npm start
                    ├─ Vite :3001
                    └─ API  :3002
```

| 文件 | 生命周期 | 职责 |
|------|----------|------|
| `.cursor/environment.json` | 配置入口 | `install` / `start` / `ports` |
| `.cursor/cloud-agent-install.sh` | **仅 Build / 无快照时的 install** | 系统包 + `npm ci`（写入快照） |
| `.cursor/start.sh` | **每次 Agent 启动** | 数据库 + 应用进程（不进快照里的「运行中服务」） |

**原则（勿违反）：**

- **依赖安装** → `install`；**长期运行的服务** → `start`。
- Cloud VM 默认**没有 Docker**，数据库用 **MariaDB 系统服务**，与生产 `docker-compose.yml` 里的 MySQL 镜像等价但路径不同。
- `start` 必须可重复执行：检测 MariaDB 是否已 ping、tmux 会话是否已存在。

## 仓库内权威文件

修改环境时以当前 `main` 上这三份为准（勿在 skill 里复制过期脚本全文）：

- `.cursor/environment.json`
- `.cursor/cloud-agent-install.sh`
- `.cursor/start.sh`

`environment.json` 当前约定：

- `user`: `ubuntu`
- `install`: `bash .cursor/cloud-agent-install.sh`
- `start`: `bash .cursor/start.sh`
- `ports`: `3001`（vite）、`3002`（api）

应用环境变量（由 `start.sh` 导出，与 `.env.example` 对齐）：

| 变量 | Cloud 开发默认值 |
|------|------------------|
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `3306` |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | `classpets` / `classpets` / `classpets` |
| `TOKEN_SECRET` | 脚本内开发默认；生产用 Cursor **Secrets** 覆盖 |

## Agent 工作流：从零搭建或重建

执行前若用户要完整平台流程，可同时遵循 **env-setup** 中 create-environment 的 Todo（理解代码库 → 生成脚本 → 快照 → Build 验证 → 提案保存）。本仓库通常可收缩为下列步骤。

### 1. 理解代码库

确认：

- 根目录 `npm start` = `concurrently` 跑 `dev`（3001）与 `server`（3002）
- 后端读 `DB_*`（`server/db.js`）
- 依赖锁：`package-lock.json` 与 `server/package-lock.json` 须与 `package.json` 一致，否则 `npm ci` 在 Build 失败

### 2. 编写或更新三件套

1. **`cloud-agent-install.sh`**
   - `set -euo pipefail`
   - 检查 `node` 存在
   - `apt-get install` → `mariadb-server`、`mariadb-client`（非交互）
   - `npm ci` + `npm ci --prefix server`
   - **不要**在此启动 MariaDB 或 `npm start`（进程不进快照）

2. **`start.sh`**
   - 启动并等待 MariaDB：`mariadb-admin ping` 循环
   - `CREATE DATABASE` / `CREATE USER` / `GRANT`（幂等 SQL）
   - `export DB_*`、`TOKEN_SECRET`（可读取 Secrets）
   - 单 tmux 会话 `class_pet_garden` 跑 `npm start`，日志 ` /tmp/class-pet-garden/dev.log`
   - 结尾打印 3001/3002 与日志路径

3. **`environment.json`**
   - 指向上述两个 `bash` 脚本
   - 声明 `ports` 便于预览

详细检查项见同目录 [references/checklist.md](references/checklist.md)。

### 3. 本地冒烟（当前 VM）

在合并前于 Agent VM 上模拟两阶段：

```bash
bash .cursor/cloud-agent-install.sh
bash .cursor/start.sh
curl -sf http://127.0.0.1:3002/api/health
curl -sf -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/
```

失败则先修 lock / 脚本，勿提交坏配置。

### 4. 快照与 Build（平台）

1. 提交并合并 `.cursor/` 到默认分支（或用户指定的环境跟踪分支）。
2. 在 Cursor 环境设置中绑定仓库内 `.cursor/environment.json`（若尚未绑定）。
3. 使用 **trigger-environment-build** 触发草稿 Build，用 **environment-build-logs** 查看 `install` 是否成功。
4. Build 成功后 **propose-environment-json**（带 `buildId`）让用户 Review / Save。
5. 用 **新开的 Cloud Agent** 验证：读 `/tmp/cursor/start-user/start-user.log`，确认 `start.sh` 输出，访问 3001/3002。

**重要：** 已运行的 Agent **不会**因 Save 而重跑 `install`；改 `start` 后必须 **新开会话**。改 `install` 后需要 **新 Build + 新 Agent**（从无 Build 启动的 Agent 也不会自动补跑 install）。

### 5. 交付说明（给用户）

合并后提醒：

1. 仪表盘 → 环境 → **Trigger build**（若 install 有变）
2. **新开 Agent** 做功能开发（旧会话仍是旧快照/旧 start）
3. 可选：在 Secrets 设置 `TOKEN_SECRET`
4. 预览：3001；调试 API：3002；日志：`/tmp/class-pet-garden/dev.log` 或 `tmux attach -t class_pet_garden`

## 常见失败与修复

| 现象 | 原因 | 修复 |
|------|------|------|
| Build 失败于 `npm ci` | lock 与 `package.json` 不一致 | 本地 `npm install` / `npm install --prefix server`，提交 lock |
| `concurrently: not found` | install 未完成就启动 | 修好 Build；在 VM 手动跑 install 后再 start |
| MariaDB 启动超时 | apt 未装或服务名不同 | install 中装 `mariadb-server`；start 里 `service mariadb` 或 `mysql` |
| API 连不上库 | 未 export `DB_*` 或 tmux 未带环境变量 | 确保 `start_app` 在创建 tmux 时传入 env |
| 改了 start 无效果 | 旧 Agent 未重启 | **新开 Agent** |
| 在 Cloud 里 `docker compose up mysql` | VM 无 Docker | 只用 `start.sh` 的 MariaDB |

## 与分支策略的关系

- Cloud Agent 任务分支建议：`cursor/<描述>-2140`（或团队沿用的 `-afcc` 后缀）。
- **环境配置在 `main` 上合并后，所有从 `main` 拉出的新分支都带有 `.cursor/`**；不会因为换分支而自动「去掉 MariaDB」。
- 若要做**不含**云环境的实验，应从历史提交分叉或单独删除 `.cursor/`（一般不推荐）。

## 相关 skill

- 日常开发与端口：`../class-pet-garden/SKILL.md`
- Docker 生产发版：`../class-pet-garden-docker-release/SKILL.md`
- Cursor 平台环境机制：用户环境上的 `env-setup` skill（`install`/`start`/Build 通用规则）

## Agent 操作纪律

1. 改环境文件后提交到仓库，并明确告知用户是否需要 **Trigger build** 与 **新开 Agent**。
2. 不在 skill、PR、聊天中写入真实生产密码；Cloud 仅用开发默认或 Secrets。
3. 验证至少：`GET /api/health` + 前端 200；有 UI 改动时再 `npm run build`。
