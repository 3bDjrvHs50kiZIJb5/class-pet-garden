# 通用 Cloud 环境检查清单

## 发现

- [ ] 列出 dev 命令、端口、DB 驱动与环境变量名
- [ ] 确认 lock 文件存在且与 manifest 一致
- [ ] 与用户确认 Cloud 预览端口与 Secrets 名称

## install

- [ ] 幂等、非交互、`set -euo pipefail`
- [ ] 无 dev server / 无 `service start` 数据库
- [ ] 系统 DB 包（若需要）仅 apt install
- [ ] 各 package 根依赖安装成功

## start

- [ ] DB ready 探针 + 超时失败
- [ ] 初始化 SQL 幂等
- [ ] env 传入 tmux / 子进程
- [ ] tmux 会话去重
- [ ] 无 apt / npm ci

## environment.json

- [ ] `user`: ubuntu（默认镜像）
- [ ] `ports` 与真实监听一致

## 平台

- [ ] install 变更 → Trigger build
- [ ] start 变更 → 新开 Agent
- [ ] 验证 health / 前端 HTTP
