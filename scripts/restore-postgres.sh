#!/usr/bin/env bash
# ============================================================
# CRM PostgreSQL Restore Script
#
# Khôi phục database từ backup file.
# Usage: ./restore-postgres.sh /path/to/crm_20260514_010000.sql.gz
#
# CẢNH BÁO: Sẽ DROP toàn bộ data hiện tại trước khi restore.
# Chỉ chạy khi đã chắc chắn (có disaster recovery scenario).
# ============================================================

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
PG_HOST="${POSTGRES_HOST:-localhost}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_USER="${POSTGRES_USER:-crm}"
PG_DB="${POSTGRES_DB:-crm_prod}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[ERROR] Backup file không tồn tại: $BACKUP_FILE"
  exit 1
fi

echo "⚠️  CẢNH BÁO: Sắp xóa toàn bộ data của database '${PG_DB}' và restore từ:"
echo "    ${BACKUP_FILE}"
read -rp "Gõ 'YES' để xác nhận: " confirm
if [ "$confirm" != "YES" ]; then
  echo "Hủy bỏ."
  exit 0
fi

echo "[$(date -Iseconds)] Drop + recreate database ${PG_DB}"
PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS ${PG_DB};" \
  -c "CREATE DATABASE ${PG_DB};"

echo "[$(date -Iseconds)] Restore từ ${BACKUP_FILE}"
gunzip -c "$BACKUP_FILE" | PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB"

echo "[$(date -Iseconds)] ✓ Restore hoàn tất"
