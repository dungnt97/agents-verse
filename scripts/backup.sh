#!/bin/sh
# Agents Verse — Postgres backup for the self-hosted `db` compose service.
# Run on the VPS via cron, e.g.:
#   0 3 * * *  cd /opt/agents-verse && ./scripts/backup.sh >> /var/log/av-backup.log 2>&1
#
# Dumps `db` to a compressed custom-format file and rotates local copies.
# IMPORTANT: a backup on the same VPS is NOT a backup. Wire the OFF-SITE upload below (R2/B2/S3)
# and ENCRYPT the dump — it contains the founder password hash + lead PII.
set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/agentsverse-${STAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "[backup] dumping db -> $OUT"
# -Fc = compressed custom format (restore with pg_restore). Creds come from the db service env.
docker compose exec -T db sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$OUT"

echo "[backup] rotating local dumps older than ${RETENTION_DAYS}d"
find "$BACKUP_DIR" -name 'agentsverse-*.dump' -type f -mtime +"$RETENTION_DAYS" -delete

# --- OFF-SITE (env-driven; a backup on the same VPS is NOT a backup) ------
# Set these on the VPS to enable encrypted off-site upload:
#   BACKUP_GPG_PASSPHRASE  symmetric AES256 passphrase (the dump holds the founder hash + lead PII)
#   RCLONE_REMOTE          rclone target, e.g. "r2:agentsverse-backups" (run `rclone config` first)
UPLOAD="$OUT"

if [ -n "${BACKUP_GPG_PASSPHRASE:-}" ]; then
  echo "[backup] encrypting (AES256)"
  printf '%s' "$BACKUP_GPG_PASSPHRASE" | \
    gpg --batch --yes --passphrase-fd 0 --symmetric --cipher-algo AES256 "$OUT"
  rm -f "$OUT"            # keep only the encrypted copy on disk
  UPLOAD="${OUT}.gpg"
else
  echo "[backup] WARNING: BACKUP_GPG_PASSPHRASE unset — dump is UNENCRYPTED (contains PII + the founder hash)."
fi

if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "[backup] uploading off-site -> ${RCLONE_REMOTE}"
  rclone copy "$UPLOAD" "$RCLONE_REMOTE"
  echo "[backup] off-site upload complete."
else
  echo "[backup] NOTICE: RCLONE_REMOTE unset — local-only backup. Set it for real off-site protection."
fi
