#!/usr/bin/env bash
#
# Restarts containers that Docker has marked `unhealthy`.
#
# This exists because of a gap that surprises people: `restart: unless-stopped`
# does NOT react to a failing healthcheck. Docker's restart policy fires when a
# container EXITS. A container whose healthcheck fails forever is marked
# `unhealthy` and then left running, serving nothing, indefinitely. Compose has
# no built-in "restart when unhealthy" (Swarm does; plain Compose does not).
#
# Run from a systemd timer every minute — see deploy/systemd/.
#
# The alternative is the `autoheal` sidecar image, which needs
# /var/run/docker.sock mounted into a container. That socket is root on the
# host. This script does the same job from the host, where the privilege
# already legitimately lives.

set -uo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-/root/srv/dna-academy/docker-compose.prod.yaml}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-dna-academy}"
ENV_FILE="${ENV_FILE:-/root/srv/dna-academy/.env}"
# Restarting the same container in a tight loop hides the real fault and can
# be worse than leaving it down. After this many restarts within the window,
# stop trying and let the alerting notice.
MAX_RESTARTS="${MAX_RESTARTS:-3}"
WINDOW_MINUTES="${WINDOW_MINUTES:-30}"
STATE_DIR="${STATE_DIR:-/var/lib/dna-academy-autoheal}"

mkdir -p "$STATE_DIR"

compose() {
  docker compose --env-file "$ENV_FILE" -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" "$@"
}

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*"; }

now=$(date +%s)
window=$((WINDOW_MINUTES * 60))

for id in $(compose ps -q 2>/dev/null); do
  [ -n "$id" ] || continue

  # A container without a healthcheck reports no .State.Health at all; the
  # fallback keeps `unhealthy` from matching an empty string.
  status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id" 2>/dev/null || echo none)
  [ "$status" = "unhealthy" ] || continue

  name=$(docker inspect --format '{{.Name}}' "$id" | sed 's|^/||')
  stamp_file="$STATE_DIR/$name"

  # Drop restart timestamps older than the window, then count what is left.
  if [ -f "$stamp_file" ]; then
    awk -v cutoff="$((now - window))" '$1 >= cutoff' "$stamp_file" > "$stamp_file.tmp" \
      && mv "$stamp_file.tmp" "$stamp_file"
  else
    : > "$stamp_file"
  fi

  recent=$(wc -l < "$stamp_file" | tr -d ' ')

  if [ "$recent" -ge "$MAX_RESTARTS" ]; then
    log "$name is unhealthy but has been restarted $recent times in the last ${WINDOW_MINUTES}m — NOT restarting again. Investigate."
    continue
  fi

  log "$name is unhealthy — restarting (attempt $((recent + 1))/$MAX_RESTARTS in ${WINDOW_MINUTES}m)"
  # `restart`, not `up -d`: no image pull, no recreate, no config re-read.
  # This is recovery, not deployment.
  if docker restart "$id" >/dev/null 2>&1; then
    echo "$now" >> "$stamp_file"
    log "$name restarted"
  else
    log "$name restart FAILED"
  fi
done
