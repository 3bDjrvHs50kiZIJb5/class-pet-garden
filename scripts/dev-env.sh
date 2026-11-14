#!/usr/bin/env bash
# 本地 / Cloud 终端开发用数据库与认证环境变量（source 后生效）
export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-3306}"
export DB_USER="${DB_USER:-classpets}"
export DB_PASSWORD="${DB_PASSWORD:-classpets}"
export DB_NAME="${DB_NAME:-classpets}"
export TOKEN_SECRET="${TOKEN_SECRET:-cursor-cloud-dev-only-secret}"