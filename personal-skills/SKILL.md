---
name: cloud-agent-fullstack-dev-env
description: >-
  为任意仓库搭建 Cursor Cloud Agent 开发环境：发现启动命令与端口、编写 environment.json、
  install（依赖与系统包）与 start（数据库 + dev 服务）、Trigger Build、验证与排错。
  Cloud VM 常无 Docker 时用 apt MariaDB/PostgreSQL 替代 compose。在用户说「配云环境」、
  environment.json、install.sh、start.sh、MariaDB 云开发、环境快照、全栈预览时使用。
environments: [cloud]
---

# Cloud Agent 全栈开发环境（通用）

把**任意项目**做成：Agent 启动后自动有数据库（如需要）+ 开发服务器可预览。

**平台机制**（install / start / Build / 快照）先读 Cursor 内置 **env-setup** skill；本 skill 是**可复用的实施 playbook**，不绑定某个仓库名。

## 适用与不适用

| 适用 | 不适用 |
|------|--------|
| Node / Python / Go 等需在 VM 里 `dev` + DB | 仅静态站点、无长期服务 |
| Cloud Agent 上要可点击预览（`ports`） | 用户只要本地 Docker、从不用 Cloud |
| 生产用 Docker Compose，Cloud 上无 Docker | 必须用 K8s 复杂编排（需单独设计） |

## 心智模型

```
install（Build 时一次，写入快照）
  → 系统包（DB 等）+ 语言依赖（npm ci / pip / …）
  → 必须退出；不启动 dev server

start（每次 Agent 启动）
  → 启动 DB / 队列等守护服务并 wait ready
  → 启动 dev server（tmux 或前台 exec）
  → 幂等：已运行则跳过
```

**禁止：** 在 `install` 里跑 `npm run dev`；在 `start` 里 `apt-get` / `npm ci`（拖慢每次启动且 belong in install）。

## 阶段 0：发现（每个新项目必做）

在改 `.cursor/` 前并行确认：

1. **启动命令**：`package.json` scripts、`Makefile`、`README`、`AGENTS.md`
2. **进程数**：单命令（`npm start`）还是前后端分离（两个端口）
3. **端口**：Vite/Next/API；写进 `environment.json` 的 `ports`
4. **数据库**：连接串环境变量名；本地是否 `docker compose`；驱动（mysql2、pg、sqlite）
5. **锁文件**：`package-lock` / `pnpm-lock` / `poetry.lock` — install 必须可 `ci` / `frozen`
6. **Secrets**：列出名称（如 `TOKEN_SECRET`），不在 skill/PR 写值；用 Cursor Secrets + start 里 `${VAR:-dev-default}`

向用户确认（未确认不假设）：

- 预览要暴露哪些端口？
- Cloud 上 DB 用 **原生服务** 还是 **用户明确要求 Docker-in-VM**（少见）？
- monorepo 要装几个 package 根？

## 阶段 1：选型（Cloud VM 默认路径）

| 本地习惯 | Cloud Agent 推荐 |
|----------|------------------|
| `docker compose up mysql` | `apt` 安装 **MariaDB** 或 **PostgreSQL**，`service start` + ready 探针 |
| SQLite 文件库 | 可继续用文件 DB；注意路径在仓库内、权限、多 Agent 隔离 |
| 仅内存 / mock | start 可省略 DB 段 |
| Redis | `redis-server` apt 或 embed；按项目需要 |

MySQL 协议栈：优先 **MariaDB**（`mariadb-admin ping`），与用户/生产 MySQL 8 通常兼容。

## 阶段 2：落地文件（仓库内 Config as Code）

在目标仓库创建（路径可固定为 `.cursor/`）：

| 文件 | 作用 |
|------|------|
| `environment.json` | `user`、`install`、`start`、`ports` |
| `cloud-agent-install.sh`（名可自定） | install 入口 |
| `start.sh` | start 入口 |

### environment.json 模板

```json
{
  "name": "<项目可读名>",
  "user": "ubuntu",
  "install": "bash .cursor/cloud-agent-install.sh",
  "start": "bash .cursor/start.sh",
  "ports": [
    { "port": 3000, "name": "web" },
    { "port": 3001, "name": "api" }
  ]
}
```

按发现结果改端口与 `name`。

### install 脚本要点

见 [references/install-template.sh](references/install-template.sh)。

- `set -euo pipefail`
- 缺 Node/Python 时：用默认镜像已有工具，或建议 Dockerfile（读 env-setup）
- DB：**仅安装包**，不 `service start`
- 依赖：`npm ci` / `pnpm install --frozen-lockfile` / 等价物；monorepo 逐根安装
- 打印明确成功日志后 **exit 0**

### start 脚本要点

见 [references/start-template.sh](references/start-template.sh)。

- 函数化：`start_database` → `ensure_schema` → `export_env` → `start_dev_servers`
- DB ready：循环 ping（`mariadb-admin` / `pg_isready`），超时 **exit 1**（写入 start-user.log）
- SQL 初始化：`CREATE DATABASE IF NOT EXISTS`、`CREATE USER IF NOT EXISTS`（幂等）
- Dev server：**单个 tmux 会话**或 `exec` 前台；日志 tee 到 `/tmp/<project>/dev.log`
- 已存在 tmux 会话 / DB 已 up → 跳过
- 创建 tmux 时**传入** `DB_*` 等 env（子 shell 不继承 export 时显式前缀）

### 不用 `terminals` 字段

用 `start.sh` 里建 tmux，便于控 quoting、就绪与日志。与 env-setup 一致。

## 阶段 3：本地验证（当前 Agent VM）

```bash
bash .cursor/cloud-agent-install.sh
bash .cursor/start.sh
# 按项目加 health：curl API、HTTP 前端
```

失败不提交；lock 不同步先修 lock。

## 阶段 4：平台 Build 与用户 Save

1. 合并 `.cursor/` 到环境跟踪分支（通常 `main`）
2. 绑定仓库 `environment.json`
3. **trigger-environment-build** → 看 **environment-build-logs**
4. 成功 → **propose-environment-json**（带 `buildId`）
5. 用户 Save 后 → **新开 Cloud Agent** 验证
6. 读 `/tmp/cursor/start-user/start-user.log` 与项目 dev 日志

**变更规则：**

- 改 **install** → 新 Build + 新 Agent
- 改 **start** → 至少新 Agent（Build 不重跑 start）
- 已跑着的 Agent 不热更新环境

详细检查清单：[references/checklist.md](references/checklist.md)。

## 阶段 5：交付用户（话术）

1. 合并后去环境页 **Trigger build**（若 install 变了）
2. **新开 Agent** 做开发
3. 可选 Secrets 列表（仅名称）
4. 预览 URL 对应 `ports`；排错看 start-user.log 与 `/tmp/<project>/dev.log`

## 排错速查

| 现象 | 方向 |
|------|------|
| Build 在 `npm ci` 失败 | lock 与 manifest 不一致 |
| `command not found`（concurrently 等） | install 未完成或未进快照 |
| DB 连接拒绝 | start 未 export env；或 DB 未 ready 就起 app |
| MariaDB 超时 | install 未装 server；service 名 `mariadb` vs `mysql` |
| Cloud 跑 compose 失败 | 无 Docker → 改 apt DB |
| 改 start 无效 | 未新开 Agent |

## 参考实现

完整实例（Vue + Express + MariaDB + 3001/3002）：任意仓库搜索

- `.cursor/environment.json`
- `.cursor/cloud-agent-install.sh`
- `.cursor/start.sh`

例如开源项目 **class-pet-garden** 的 `.cursor/`（仅作模板，端口与库名按目标项目改）。

## Agent 纪律

1. 每个新项目走「发现 → 三件套 → 冒烟 → Build 提案」，不复制旧项目端口/库名 blindly。
2. 不把生产密码写进仓库；Cloud 用开发默认或 Secrets。
3. 与 **env-setup** 冲突时以 env-setup 平台规则为准。
4. 项目若另有 `.cursor/skills/*` 只写**项目特例**（端口、业务 env）；通用流程以本 skill 为准。
