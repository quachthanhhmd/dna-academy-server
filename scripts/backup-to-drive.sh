#!/usr/bin/env bash
#
# Nightly backup: a Postgres dump and the day's container logs, both pushed to
# Google Drive through rclone, both pruned locally afterwards.
#
#   scripts/backup-to-drive.sh            # dump + logs
#   scripts/backup-to-drive.sh db         # dump only
#   scripts/backup-to-drive.sh logs       # logs only
#
# Cron (VPS is on Asia/Ho_Chi_Minh, so 01:00 here is 01:00 VNT):
#   0 1 * * * /root/srv/dna-academy/scripts/backup-to-drive.sh >> /var/log/dna-backup.log 2>&1
#
# Set up rclone once, interactively, ON THE VPS:
#   rclone config        # new remote named `gdrive`, type `drive`
#   rclone lsd gdrive:   # must list your Drive
# The token lands in /root/.config/rclone/rclone.conf — chmod 600, never
# copied anywhere, never committed. That file IS a credential: anyone holding
# it can read and write the whole Drive it was authorised for. Prefer a
# dedicated Google account, or a service account with access to one folder.
#
# Why one script for both jobs rather than two cron lines at 01:00: this box
# has 4 GB. `pg_dump | gzip` and a log tarball competing for RAM and disk at
# the same instant is how a backup window turns into an outage. Running them
# in sequence costs a few minutes and nothing else.

set -euo pipefail

# ---- settings ---------------------------------------------------------------
COMPOSE_FILE="${COMPOSE_FILE:-/root/srv/dna-academy/docker-compose.prod.yaml}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-dna-academy}"
ENV_FILE="${ENV_FILE:-/root/srv/dna-academy/.env}"
STAGING_DIR="${STAGING_DIR:-/var/backups/dna-academy}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"
REMOTE_DB_DIR="${REMOTE_DB_DIR:-dna-academy/db}"
REMOTE_LOG_DIR="${REMOTE_LOG_DIR:-dna-academy/logs}"
# Local copies to keep after a successful upload. Drive is the archive; these
# are only so a same-day restore does not have to download anything.
KEEP_LOCAL_DAYS="${KEEP_LOCAL_DAYS:-7}"
# Days of Drive history to keep. 0 disables remote pruning.
KEEP_REMOTE_DAYS="${KEEP_REMOTE_DAYS:-30}"
# gzip before upload. SQL and logs compress roughly 5-10x, which is the
# difference between a year of dumps costing a few hundred MB of Drive or a
# few GB. Set COMPRESS=0 for plain dump-dd-mm-yyyy.sql / logs-dd-mm-yyyy.txt.
COMPRESS="${COMPRESS:-1}"

# dd-mm-yyyy, as requested. Note this sorts badly in a file listing — if you
# ever want chronological order in Drive, switch to %Y-%m-%d.
STAMP="$(date +%d-%m-%Y)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*"; }
die() { log "ERROR: $*"; exit 1; }

command -v rclone >/dev/null || die "rclone is not installed."
[ -f "$COMPOSE_FILE" ] || die "compose file not found: $COMPOSE_FILE"
mkdir -p "$STAGING_DIR"

compose() { docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" "$@"; }

# ---- database ---------------------------------------------------------------
backup_db() {
  local plain="$STAGING_DIR/dump-$STAMP.sql"
  local gzipped="$plain.gz"

  # Credentials are read inside the container from its own environment; they
  # are never placed on this command line, where `ps` would show them.
  log "Dumping database -> dump-$STAMP.sql$([ "$COMPRESS" != "0" ] && echo .gz)"
  compose exec -T postgres sh -c \
    'pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB"' \
    > "$plain"

  # An empty or truncated dump that uploads successfully is worse than a
  # failed backup, because it looks like one you have.
  [ -s "$plain" ] || die "dump is empty"
  grep -q "PostgreSQL database dump complete" "$plain" \
    || die "dump has no completion marker — it was truncated"

  local upload="$plain"
  if [ "$COMPRESS" != "0" ]; then
    gzip -f "$plain"
    upload="$gzipped"
  fi
  log "Dump OK ($(du -h "$upload" | cut -f1))"

  rclone copy "$upload" "$RCLONE_REMOTE:$REMOTE_DB_DIR/" --no-traverse
  log "Uploaded to $RCLONE_REMOTE:$REMOTE_DB_DIR/"
}

# ---- logs -------------------------------------------------------------------
backup_logs() {
  local out="$STAGING_DIR/logs-$STAMP.txt"

  # `--since 24h` and not "everything": the json-file driver rotates on its
  # own, so "all logs" is an unbounded amount of text on a 45 GB disk.
  log "Collecting last 24h of container logs -> $(basename "$out")"
  compose logs --no-color --timestamps --since 24h > "$out" || true

  [ -s "$out" ] || { log "No log output in the last 24h; skipping upload."; rm -f "$out"; return 0; }

  local upload="$out"
  if [ "$COMPRESS" != "0" ]; then
    gzip -f "$out"
    upload="$out.gz"
  fi
  log "Logs OK ($(du -h "$upload" | cut -f1))"

  rclone copy "$upload" "$RCLONE_REMOTE:$REMOTE_LOG_DIR/" --no-traverse
  log "Uploaded to $RCLONE_REMOTE:$REMOTE_LOG_DIR/"

  # Only now is it safe to let Docker's own log files go: the upload succeeded
  # (set -e would have stopped us otherwise).
  compose ps -q | while read -r container; do
    [ -n "$container" ] || continue
    local path
    path="$(docker inspect --format='{{.LogPath}}' "$container" 2>/dev/null || true)"
    [ -n "$path" ] && [ -f "$path" ] && : > "$path" && log "Truncated $(basename "$path")"
  done
}

# ---- pruning ----------------------------------------------------------------
prune() {
  find "$STAGING_DIR" -type f \( -name '*.gz' -o -name '*.sql' -o -name '*.txt' \) \
       -mtime "+$KEEP_LOCAL_DAYS" -print -delete \
    | sed 's/^/Removed local /' || true

  if [ "$KEEP_REMOTE_DAYS" -gt 0 ]; then
    rclone delete "$RCLONE_REMOTE:$REMOTE_DB_DIR/"  --min-age "${KEEP_REMOTE_DAYS}d" || true
    rclone delete "$RCLONE_REMOTE:$REMOTE_LOG_DIR/" --min-age "${KEEP_REMOTE_DAYS}d" || true
    log "Pruned Drive copies older than ${KEEP_REMOTE_DAYS}d"
  fi
}

# ---- main -------------------------------------------------------------------
case "${1:-all}" in
  db)   backup_db ;;
  logs) backup_logs ;;
  all)  backup_db; backup_logs ;;
  *)    die "Usage: $0 [all|db|logs]" ;;
esac

prune
log "Done."
