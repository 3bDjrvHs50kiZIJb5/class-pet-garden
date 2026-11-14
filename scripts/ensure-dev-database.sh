#!/usr/bin/env bash
# 开发环境：安装（可选）、启动 MariaDB/MySQL、创建 classpets 库与用户
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/dev-env.sh
source "$ROOT/scripts/dev-env.sh"

AUTO_INSTALL_DB="${CLASSPETS_AUTO_INSTALL_DB:-1}"

mariadb_cli() {
  if command -v mariadb >/dev/null 2>&1; then
    echo mariadb
  elif command -v mysql >/dev/null 2>&1; then
    echo mysql
  else
    return 1
  fi
}

mariadb_admin() {
  if command -v mariadb-admin >/dev/null 2>&1; then
    echo mariadb-admin
  elif command -v mysqladmin >/dev/null 2>&1; then
    echo mysqladmin
  else
    return 1
  fi
}

db_ping() {
  local cli
  cli="$(mariadb_cli)" || return 1
  "$cli" -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" "$DB_NAME" >/dev/null 2>&1
}

db_ping_admin() {
  local admin
  admin="$(mariadb_admin)" || return 1
  sudo "$admin" ping --silent 2>/dev/null
}

install_mariadb_debian() {
  if [[ "$AUTO_INSTALL_DB" != "1" ]]; then
    echo "未检测到 MariaDB/MySQL，且 CLASSPETS_AUTO_INSTALL_DB≠1，无法自动安装。" >&2
    return 1
  fi
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "当前系统无 apt-get，请手动安装 MariaDB/MySQL 或使用 Docker Compose 启动 mysql。" >&2
    return 1
  fi
  echo ">>> 安装 MariaDB（开发环境）..."
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    mariadb-server \
    mariadb-client
}

start_mariadb_service() {
  if db_ping_admin; then
    echo "MariaDB 已在运行"
    return 0
  fi
  echo ">>> 启动 MariaDB..."
  sudo service mariadb start 2>/dev/null || sudo service mysql start 2>/dev/null || true
  for _ in $(seq 1 60); do
    if db_ping_admin; then
      return 0
    fi
    sleep 1
  done
  echo "MariaDB 启动超时" >&2
  return 1
}

init_schema_and_user() {
  echo ">>> 初始化数据库与用户..."
  sudo mariadb <<'SQL'
CREATE DATABASE IF NOT EXISTS classpets CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'classpets'@'localhost' IDENTIFIED BY 'classpets';
GRANT ALL PRIVILEGES ON classpets.* TO 'classpets'@'localhost';
FLUSH PRIVILEGES;
SQL
}

try_docker_mysql() {
  command -v docker >/dev/null 2>&1 || return 1
  docker compose version >/dev/null 2>&1 || return 1
  echo ">>> 使用 Docker Compose 启动 mysql..."
  (cd "$ROOT" && docker compose up -d mysql)
  export DB_HOST=127.0.0.1
  export DB_USER=root
  export DB_PASSWORD="${MYSQL_ROOT_PASSWORD:-classpets}"
  export DB_NAME="${MYSQL_DATABASE:-classpets}"
  for _ in $(seq 1 60); do
    if (cd "$ROOT" && docker compose exec -T mysql mysqladmin ping -h 127.0.0.1 -p"$DB_PASSWORD" --silent 2>/dev/null); then
      return 0
    fi
    sleep 1
  done
  return 1
}

ensure_local_mariadb() {
  if ! mariadb_admin >/dev/null 2>&1; then
    install_mariadb_debian
  fi
  start_mariadb_service
  init_schema_and_user
  # shellcheck source=scripts/dev-env.sh
  source "$ROOT/scripts/dev-env.sh"
}

if db_ping; then
  exit 0
fi

if try_docker_mysql && db_ping; then
  echo ">>> 数据库就绪 ($DB_NAME @ $DB_HOST)"
  exit 0
fi

# shellcheck source=scripts/dev-env.sh
source "$ROOT/scripts/dev-env.sh"

if db_ping_admin; then
  init_schema_and_user
elif try_docker_mysql; then
  db_ping || { echo "Docker MySQL 已启动但应用账号无法连接" >&2; exit 1; }
  echo ">>> 数据库就绪 ($DB_NAME @ $DB_HOST)"
  exit 0
else
  ensure_local_mariadb
fi

if db_ping; then
  echo ">>> 数据库就绪 ($DB_NAME @ $DB_HOST)"
  exit 0
fi

echo "无法连接数据库，请检查 DB_* 环境变量或 MariaDB 日志。" >&2
exit 1