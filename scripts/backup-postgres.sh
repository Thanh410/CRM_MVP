#!/usr/bin/env bash
# ============================================================
# CRM PostgreSQL Backup Script
#
# Tạo backup nén của database, lưu local + upload S3/MinIO.
# Giữ local 7 ngày, S3 30 ngày.
#
# Setup cron (daily 1h sáng):
#   0 1 * * * /opt/crm/scripts/backup-postgres.sh >> /var/log/crm-backup.log 2>&1
#
# Required env vars (load từ .env hoặc systemd EnvironmentFile):
#   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
#   BACKUP_DIR           (default: /var/backups/crm)
#   BACKUP_RETENTION_DAYS (default: 7)
#   S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BACKUP_BUCKET (optional)
# ============================================================

set -euo pipefail

# ── Config ──────────────────────────────────────────────────
PG_HOST="${POSTGRES_HOST:-localhost}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_USER="${POSTGRES_USER:-crm}"
PG_DB="${POSTGRES_DB:-crm_prod}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/crm}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/crm_${TIMESTAMP}.sql.gz"

# ── Setup ───────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Bắt đầu backup ${PG_DB} → ${BACKUP_FILE}"

# ── Dump + compress ─────────────────────────────────────────
# -F c: custom format (compressed, dùng pg_restore)
# -Z 6: gzip compression level 6 (cân bằng tốc độ/dung lượng)
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "$PG_HOST" \
  -p "$PG_PORT" \
  -U "$PG_USER" \
  -d "$PG_DB" \
  --no-owner \
  --no-acl \
  --verbose \
  2>>"${BACKUP_DIR}/pg_dump.log" \
  | gzip -6 > "$BACKUP_FILE"

# ── Verify backup ───────────────────────────────────────────
if [ ! -s "$BACKUP_FILE" ]; then
  echo "[ERROR] Backup file rỗng hoặc không tạo được"
  exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Backup hoàn tất: ${BACKUP_SIZE}"

# ── Upload to S3/MinIO (nếu có) ─────────────────────────────
if [ -n "${S3_ENDPOINT:-}" ] && [ -n "${S3_BACKUP_BUCKET:-}" ] && command -v aws &>/dev/null; then
  S3_KEY="postgres/$(date +%Y/%m)/$(basename "$BACKUP_FILE")"
  echo "[$(date -Iseconds)] Upload S3: s3://${S3_BACKUP_BUCKET}/${S3_KEY}"

  AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
  AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
  aws s3 cp "$BACKUP_FILE" "s3://${S3_BACKUP_BUCKET}/${S3_KEY}" \
    --endpoint-url "$S3_ENDPOINT" \
    --no-progress \
    || echo "[WARN] S3 upload thất bại, backup local vẫn còn"
fi

# ── Cleanup old backups (local) ─────────────────────────────
echo "[$(date -Iseconds)] Xóa backup cũ hơn ${RETENTION_DAYS} ngày"
find "$BACKUP_DIR" -name "crm_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date -Iseconds)] ✓ Backup script hoàn tất"
