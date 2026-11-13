# Cloud 环境变更检查清单

在提交 `.cursor/` 改动或帮用户重建环境前逐项确认。

## install（`cloud-agent-install.sh`）

- [ ] `set -euo pipefail`，脚本可执行（`chmod +x`）
- [ ] 未启动 MariaDB / `npm start` / 其他守护进程
- [ ] `mariadb-server` + `mariadb-client` 使用 `DEBIAN_FRONTEND=noninteractive`
- [ ] 根目录 `npm ci` 成功
- [ ] `npm ci --prefix server` 成功
- [ ] 两份 `package-lock.json` 已提交且与 `package.json` 一致

## start（`start.sh`）

- [ ] MariaDB：已运行则跳过；否则 `service start` + ping 超时退出非 0
- [ ] SQL 初始化幂等（`IF NOT EXISTS`）
- [ ] `DB_*` 与 `TOKEN_SECRET` 在启动 `npm start` 前 export
- [ ] tmux 会话名固定，已存在则不重复创建
- [ ] 日志目录 `/tmp/class-pet-garden` 可写
- [ ] 未在 start 里执行 `apt-get` / `npm ci`（应放在 install）

## environment.json

- [ ] `install` / `start` 路径相对于仓库根
- [ ] `user` 为 `ubuntu`（默认镜像）
- [ ] `ports` 含 3001、3002

## 平台与用户

- [ ] install 变更 → 提醒 **Trigger environment build**
- [ ] start 变更 → 提醒 **新开 Cloud Agent**
- [ ] 提示可选 Secret：`TOKEN_SECRET`
- [ ] 指向 `start-user.log` 与 `/tmp/class-pet-garden/dev.log` 排错

## 验证命令

```bash
bash .cursor/cloud-agent-install.sh
bash .cursor/start.sh
curl -sf http://127.0.0.1:3002/api/health
curl -sf -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/
```
