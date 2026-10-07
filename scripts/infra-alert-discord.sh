#!/usr/bin/env bash
#
# Watch the host's resource usage and alert a Discord channel when disk,
# memory, CPU load or swap crosses a threshold — and again, once, when it
# recovers. Meant for the single VPS (4 vCPU / 4 GB / 45 GB), run from a
# systemd timer every few minutes (see deploy/systemd/).
#
#   scripts/infra-alert-discord.sh            # check everything, alert if needed
#   scripts/infra-alert-discord.sh test       # send one test message and exit
#   scripts/infra-alert-discord.sh mute 20    # suppress alerts for 20 minutes
#   scripts/infra-alert-discord.sh unmute     # lift a mute early
#
# The webhook URL is a secret: anyone holding it can post to your channel.
# It is NEVER placed on the command line (where `ps` would show it) and NEVER
# committed. Put it in the env file this reads, next to the API's other
# secrets, chmod 600:
#
#   echo 'DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXX/YYY' \
#     >> /etc/dna-academy/infra-alert.env
#   chmod 600 /etc/dna-academy/infra-alert.env
#
# Create the webhook in Discord: Server Settings -> Integrations -> Webhooks
# -> New Webhook -> pick the channel -> Copy Webhook URL. That URL is the
# whole credential; no bot, no OAuth.
#
# Why thresholds + cooldown and not "alert every run": a timer firing every
# 5 minutes against a disk that sits at 88% would post 288 identical messages
# a day. This fires once when a metric goes over, stays quiet while it stays
# over (re-reminding only every REPEAT_MINUTES), and fires once more when it
# drops back under. State lives in STATE_DIR, one small file per metric.
#
# ---- Not crying wolf during a deploy ----------------------------------------
# A deploy spikes CPU and RAM for minutes: image pull, then the entrypoint
# runs 30 migrations and the seed before the API even listens (start_period
# is 300s in docker-compose.prod.yaml). Three layers keep that from paging:
#
#   1. Deploy/boot auto-detect. While ANY compose container reports Docker
#      health `starting` or state `restarting`, the whole check is skipped.
#      No human action needed: the api's 300s start_period means its health
#      reads `starting` for the entire migrate+seed window, so a normal
#      `compose up -d` is silent on its own.
#   2. Sustained-breach gate. A metric must read over its threshold on
#      CONSECUTIVE_BREACHES checks in a row before the FIRST alert fires, so a
#      single transient spike (a cron job, a GC pause, a `compose pull` that
#      does not touch container health) clears itself and never pages.
#   3. Manual mute, for maintenance the first two cannot see — a host-level
#      `docker compose pull` before the up, a package upgrade, a restore.
#      `mute [minutes]` writes a deadline; checks are skipped until it passes.
#
# A long deploy that runs past the start_period window is still covered: the
# sustained-breach gate needs the spike to persist across several checks, and
# `mute` is there for the rare case you want certainty.

set -uo pipefail

# ---- settings ---------------------------------------------------------------
# Read the webhook (and any THRESHOLD overrides) from an env file if present,
# so the secret never has to be exported by hand or baked into the unit.
ENV_FILE="${ENV_FILE:-/etc/dna-academy/infra-alert.env}"
# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

# Percent-full at or above which each metric alerts.
DISK_THRESHOLD="${DISK_THRESHOLD:-85}"       # % of the filesystem at DISK_MOUNT
MEM_THRESHOLD="${MEM_THRESHOLD:-90}"         # % of RAM in use (total - available)
SWAP_THRESHOLD="${SWAP_THRESHOLD:-50}"       # % of swap in use (0 disables)
# Load average (5-min) PER CORE. 1.0 means "fully busy, nothing queued".
# 2.0 means tasks are waiting about as long as they run — a sensible alarm.
CPU_LOAD_THRESHOLD="${CPU_LOAD_THRESHOLD:-2.0}"

DISK_MOUNT="${DISK_MOUNT:-/}"
# While a metric stays over its threshold, re-remind at most this often.
REPEAT_MINUTES="${REPEAT_MINUTES:-180}"
# How many consecutive over-threshold checks before the first alert. At the
# 5-minute timer interval, 2 means a spike must last ~5-10 minutes to page.
CONSECUTIVE_BREACHES="${CONSECUTIVE_BREACHES:-2}"
# Default window for `mute` with no minutes argument.
MUTE_DEFAULT_MINUTES="${MUTE_DEFAULT_MINUTES:-15}"
STATE_DIR="${STATE_DIR:-/var/lib/dna-academy-infra-alert}"
HOSTNAME_LABEL="${HOSTNAME_LABEL:-$(hostname -s 2>/dev/null || echo host)}"

# Used only for deploy/boot auto-detect (reading container health). The env
# file here is the COMPOSE one (${DATABASE_*} interpolation), not this
# script's secret file above.
COMPOSE_FILE="${COMPOSE_FILE:-/opt/dna-academy/docker-compose.prod.yaml}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-dna-academy}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-/etc/dna-academy/api.env}"

MUTE_FILE="$STATE_DIR/mute"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*"; }
die() { log "ERROR: $*"; exit 1; }

mkdir -p "$STATE_DIR"

# ---- mute / unmute subcommands ----------------------------------------------
# These do not need the webhook, so handle them before the webhook check.
case "${1:-}" in
  mute)
    mins="${2:-$MUTE_DEFAULT_MINUTES}"
    until_epoch=$(( $(date +%s) + mins * 60 ))
    echo "$until_epoch" > "$MUTE_FILE"
    # A fresh mute should also clear half-counted breaches, so the window
    # after it starts from a clean slate.
    find "$STATE_DIR" -name '*.pending' -delete 2>/dev/null || true
    log "Muted for ${mins}m (until $(date -d "@$until_epoch" '+%Y-%m-%d %H:%M:%S %Z' 2>/dev/null || echo "$until_epoch"))."
    exit 0 ;;
  unmute)
    rm -f "$MUTE_FILE"
    log "Mute lifted."
    exit 0 ;;
esac

DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"
[ -n "$DISCORD_WEBHOOK_URL" ] || die "DISCORD_WEBHOOK_URL is not set (see $ENV_FILE)."
command -v curl >/dev/null || die "curl is not installed."

now=$(date +%s)
repeat=$((REPEAT_MINUTES * 60))

# ---- Discord ----------------------------------------------------------------
# Posts one embed. $1 = color int (red / green), $2 = title, $3 = description.
# JSON is built by hand from controlled values; the only free-form string is
# the host label, which we escape for backslash and double-quote.
json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

notify() {
  local color="$1" title="$2" desc="$3"
  local payload
  payload=$(printf '{"username":"infra-watch","embeds":[{"color":%s,"title":"%s","description":"%s","footer":{"text":"%s"}}]}' \
    "$color" "$(json_escape "$title")" "$(json_escape "$desc")" "$(json_escape "$HOSTNAME_LABEL")")

  # --fail so a 4xx/5xx from Discord is a non-zero exit we can log; retry a
  # couple of times for a transient network blip, then give up rather than
  # wedge the timer.
  if curl -sS --fail --max-time 15 --retry 2 --retry-delay 2 \
       -H 'Content-Type: application/json' \
       -d "$payload" "$DISCORD_WEBHOOK_URL" >/dev/null; then
    log "Notified: $title"
  else
    log "WARN: Discord post failed for: $title"
  fi
}

RED=15158332     # 0xE74C3C
GREEN=3066993    # 0x2ECC71

# ---- test mode --------------------------------------------------------------
if [ "${1:-}" = "test" ]; then
  notify "$GREEN" "infra-watch test on ${HOSTNAME_LABEL}" \
    "If you can read this, the webhook works. $(date '+%Y-%m-%d %H:%M:%S %Z')"
  exit 0
fi

# ---- suppression: mute window -----------------------------------------------
if [ -f "$MUTE_FILE" ]; then
  mute_until=$(cat "$MUTE_FILE" 2>/dev/null || echo 0)
  if [ "$now" -lt "$mute_until" ]; then
    log "Muted until $mute_until — skipping checks."
    exit 0
  fi
  rm -f "$MUTE_FILE"   # stale; window has passed
fi

# ---- suppression: deploy / boot in progress ---------------------------------
# True while any compose container is still coming up (health `starting`) or
# bouncing (`restarting`). docker-compose.prod.yaml gives the api a 300s
# start_period, so a normal migrate+seed deploy sits here and stays quiet.
deploy_in_progress() {
  command -v docker >/dev/null 2>&1 || return 1
  local env_args=() id st health
  [ -f "$COMPOSE_ENV_FILE" ] && env_args=(--env-file "$COMPOSE_ENV_FILE")
  for id in $(docker compose "${env_args[@]}" -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" ps -q 2>/dev/null); do
    [ -n "$id" ] || continue
    st=$(docker inspect -f '{{.State.Status}}' "$id" 2>/dev/null || echo "")
    health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id" 2>/dev/null || echo none)
    [ "$st" = "restarting" ] && return 0
    [ "$health" = "starting" ] && return 0
  done
  return 1
}

if deploy_in_progress; then
  log "A container is starting/restarting (deploy or boot) — skipping checks to avoid false alarms."
  exit 0
fi

# ---- threshold bookkeeping --------------------------------------------------
# Per metric, two files in STATE_DIR:
#   <key>          exists while the metric is in the ALERTED state; content is
#                  the epoch of the last alert sent (for REPEAT_MINUTES).
#   <key>.pending  counts consecutive over-threshold checks BEFORE the first
#                  alert, so a transient spike never pages (layer 2 above).
#
#   $1 metric key (filename-safe)   $2 human label
#   $3 current value                $4 threshold
#   $5 unit suffix for the message (e.g. % or "")
#   $6 "ge" integer compare, or "gef" float compare (for load average)
check_metric() {
  local key="$1" label="$2" value="$3" threshold="$4" unit="$5" cmp="$6"
  local state="$STATE_DIR/$key" pend="$STATE_DIR/$key.pending"
  local over=0

  if [ "$cmp" = "gef" ]; then
    awk -v v="$value" -v t="$threshold" 'BEGIN{exit !(v+0 >= t+0)}' && over=1
  else
    [ "${value%%.*}" -ge "$threshold" ] 2>/dev/null && over=1
  fi

  if [ "$over" = "1" ]; then
    if [ -f "$state" ]; then
      # Already alerting: re-remind only every REPEAT_MINUTES.
      local last; last=$(cat "$state" 2>/dev/null || echo 0)
      if [ $((now - last)) -ge "$repeat" ]; then
        notify "$RED" "⚠️ ${label} still high on ${HOSTNAME_LABEL}" \
          "**${value}${unit}** (threshold ${threshold}${unit}) — still over after a while."
        echo "$now" > "$state"
      else
        log "$label over ($value$unit) but within cooldown — quiet."
      fi
    else
      # Not yet alerting: require CONSECUTIVE_BREACHES in a row first.
      local count; count=$(( $(cat "$pend" 2>/dev/null || echo 0) + 1 ))
      if [ "$count" -ge "$CONSECUTIVE_BREACHES" ]; then
        notify "$RED" "🔴 ${label} high on ${HOSTNAME_LABEL}" \
          "**${value}${unit}** has crossed the ${threshold}${unit} threshold."
        echo "$now" > "$state"
        rm -f "$pend"
      else
        echo "$count" > "$pend"
        log "$label over ($value$unit) — breach $count/$CONSECUTIVE_BREACHES, holding."
      fi
    fi
  else
    rm -f "$pend"   # streak broken; reset the sustained-breach counter
    if [ -f "$state" ]; then
      notify "$GREEN" "✅ ${label} back to normal on ${HOSTNAME_LABEL}" \
        "**${value}${unit}** is under the ${threshold}${unit} threshold again."
      rm -f "$state"
    fi
  fi
}

# ---- collect & check --------------------------------------------------------
# Disk: percent used of DISK_MOUNT, integer.
disk=$(df -P "$DISK_MOUNT" | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
[ -n "$disk" ] && check_metric disk "Disk ${DISK_MOUNT}" "$disk" "$DISK_THRESHOLD" "%" ge

# Memory: used = total - available, as a percentage, integer. MemAvailable is
# the honest figure (it counts reclaimable cache as free), unlike "used".
mem=$(awk '/^MemTotal:/{t=$2} /^MemAvailable:/{a=$2} END{if(t>0) printf "%d", (t-a)*100/t}' /proc/meminfo)
[ -n "$mem" ] && check_metric mem "Memory" "$mem" "$MEM_THRESHOLD" "%" ge

# Swap: percent used, integer. Skip entirely if the box has no swap or the
# threshold is 0.
if [ "$SWAP_THRESHOLD" -gt 0 ]; then
  swap=$(awk '/^SwapTotal:/{t=$2} /^SwapFree:/{f=$2} END{if(t>0) printf "%d", (t-f)*100/t}' /proc/meminfo)
  [ -n "$swap" ] && check_metric swap "Swap" "$swap" "$SWAP_THRESHOLD" "%" ge
fi

# CPU: 5-min load average divided by core count, two decimals. The 5-min
# figure (field 2 of loadavg) ignores the brief spikes a cron job or a deploy
# cause; those are not worth a page.
cores=$(nproc 2>/dev/null || echo 1)
load5=$(awk '{print $2}' /proc/loadavg)
loadpc=$(awk -v l="$load5" -v c="$cores" 'BEGIN{printf "%.2f", l/c}')
check_metric cpu "CPU load/core" "$loadpc" "$CPU_LOAD_THRESHOLD" "" gef

log "Checked disk=${disk:-?}% mem=${mem:-?}% swap=${swap:-n/a} load/core=${loadpc} (cores=$cores)"
