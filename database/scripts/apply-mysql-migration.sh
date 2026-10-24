#!/usr/bin/env bash
# 把 database/migrations/ 下的 SQL 应用到指定 MySQL 环境（测试/生产）。
# 本机没有 mysql 客户端时自动改用 Docker 运行 mysql 客户端。
#
# 用法：
#   DB_HOST=10.0.0.10 DB_PORT=3306 DB_USERNAME=novel DB_PASSWORD=****** \
#   DB_DATABASE=novel_platform \
#   ./database/scripts/apply-mysql-migration.sh \
#   database/migrations/20261024_disable_idle_auto_transfer.sql
#
# 服务器上 MySQL 跑在 Docker 里（没有 mysql 客户端）时，直接指定容器名：
#   DB_CONTAINER=mysql DB_USERNAME=root DB_PASSWORD=****** \
#   DB_DATABASE=novel_platform \
#   ./database/scripts/apply-mysql-migration.sh \
#   database/migrations/20261024_disable_idle_auto_transfer.sql
#
# 可选环境变量：
#   DB_CONTAINER        已有 MySQL 容器的名字，使用容器内的 mysql 客户端
#   MYSQL_CLIENT_IMAGE  Docker 镜像，默认 mysql:8.0
#   DRY_RUN=1           只打印将要执行的命令，不连接数据库
#
# 注意：Docker 容器里的 127.0.0.1 指向容器自身，数据库在宿主机时请使用
#       DB_HOST=host.docker.internal（Docker Desktop / macOS）。
set -euo pipefail

SQL_FILE="${1:-}"
if [[ -z "${SQL_FILE}" ]]; then
  echo "用法: DB_HOST=... DB_PORT=3306 DB_USERNAME=... DB_PASSWORD=... DB_DATABASE=... $0 <sql 文件>" >&2
  exit 1
fi
if [[ ! -f "${SQL_FILE}" ]]; then
  echo "找不到 SQL 文件: ${SQL_FILE}" >&2
  exit 1
fi

DB_CONTAINER="${DB_CONTAINER:-}"
DB_PORT="${DB_PORT:-3306}"
DB_PASSWORD="${DB_PASSWORD:-}"
MYSQL_CLIENT_IMAGE="${MYSQL_CLIENT_IMAGE:-mysql:8.0}"

if [[ -n "${DB_CONTAINER}" ]]; then
  # 在 MySQL 容器内执行，127.0.0.1 就是数据库本身
  DB_HOST="${DB_HOST:-127.0.0.1}"
else
  : "${DB_HOST:?请先设置 DB_HOST（或使用 DB_CONTAINER）}"
fi
: "${DB_USERNAME:?请先设置 DB_USERNAME}"
: "${DB_DATABASE:?请先设置 DB_DATABASE}"

MYSQL_ARGS=(
  -h "${DB_HOST}"
  -P "${DB_PORT}"
  -u "${DB_USERNAME}"
  --default-character-set=utf8mb4
  "${DB_DATABASE}"
)

echo ">> 目标: ${DB_USERNAME}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}"
echo ">> SQL : ${SQL_FILE}"

if [[ -n "${DB_CONTAINER}" ]]; then
  RUNNER=(docker exec -i -e "MYSQL_PWD=${DB_PASSWORD}" "${DB_CONTAINER}" mysql "${MYSQL_ARGS[@]}")
  echo ">> 使用容器 ${DB_CONTAINER} 内的 mysql 客户端"
elif command -v mysql >/dev/null 2>&1; then
  RUNNER=(mysql "${MYSQL_ARGS[@]}")
  echo ">> 使用本机 mysql 客户端"
else
  if [[ "${DB_HOST}" == "127.0.0.1" || "${DB_HOST}" == "localhost" ]]; then
    echo "!! 未找到 mysql 客户端，且 DB_HOST=${DB_HOST} 在 Docker 容器内不可达。" >&2
    echo "!! 请改用 DB_HOST=host.docker.internal，或设置 DB_CONTAINER=<mysql 容器名>。" >&2
    exit 1
  fi
  RUNNER=(docker run --rm -i -e "MYSQL_PWD=${DB_PASSWORD}" "${MYSQL_CLIENT_IMAGE}" mysql "${MYSQL_ARGS[@]}")
  echo ">> 未找到 mysql 客户端，使用 Docker 镜像 ${MYSQL_CLIENT_IMAGE}"
fi

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  DISPLAY_CMD="${RUNNER[*]}"
  if [[ -n "${DB_PASSWORD}" ]]; then
    DISPLAY_CMD="${DISPLAY_CMD//${DB_PASSWORD}/******}"
  fi
  echo ">> DRY_RUN: ${DISPLAY_CMD} < ${SQL_FILE}"
  exit 0
fi

if [[ "${RUNNER[0]}" == "mysql" ]]; then
  MYSQL_PWD="${DB_PASSWORD}" "${RUNNER[@]}" < "${SQL_FILE}"
else
  "${RUNNER[@]}" < "${SQL_FILE}"
fi

echo ">> 执行完成: ${SQL_FILE}"
