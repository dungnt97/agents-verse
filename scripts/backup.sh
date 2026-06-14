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

# --- OFF-SITE (wire this up — required for a real backup) ----------------
# Encrypt then upload, e.g.:
#   gpg --symmetric --cipher-algo AES256 "$OUT"
#   rclone copy "${OUT}.gpg" remote:agentsverse-backups/
echo "[backup] local dump done. TODO: encrypt + upload off-site."
