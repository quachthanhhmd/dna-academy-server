#!/usr/bin/env bash
#
# Watch the host's resource usage and alert a Discord channel when disk,
# memory, CPU load or swap crosses a threshold — and again, once, when it
# recovers. Meant for the single VPS (4 vCPU / 4 GB / 45 GB), run from a
# systemd timer every few minutes (see deploy/systemd/).
#
#   scripts/infra-alert-discord.sh            # check everything, alert if needed
#   scripts/infra-alert-discord.sh test       # send one test message and exit
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
# 3 minutes against a disk that sits at 88% would post 480 identical messages
# a day. This fires once when a metric goes over, stays quiet while it stays
# over (re-reminding only every REPEAT_MINUTES), and fires once more when it
# drops back under. State lives in STATE_DIR, one small file per metric.

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
STATE_DIR="${STATE_DIR:-/var/lib/dna-academy-infra-alert}"
HOSTNAME_LABEL="${HOSTNAME_LABEL:-$(hostname -s 2>/dev/null || echo host)}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*"; }
die() { log "ERROR: $*"; exit 1; }

[ -n "$DISCORD_WEBHOOK_URL" ] || die "DISCORD_WEBHOOK_URL is not set (see $ENV_FILE)."
command -v curl >/dev/null || die "curl is not installed."
mkdir -p "$STATE_DIR"

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

# ---- threshold bookkeeping --------------------------------------------------
# A metric's state file exists while it is in breach; its mtime (epoch, also
# written as content) is when we last alerted. check_metric decides whether to
# fire a new alert, stay quiet, re-remind, or fire a recovery.
#
#   $1 metric key (filename-safe)   $2 human label
#   $3 current value                $4 threshold
#   $5 unit suffix for the message (e.g. % or "")
#   $6 "ge" integer compare, or "gef" float compare (for load average)
check_metric() {
  local key="$1" label="$2" value="$3" threshold="$4" unit="$5" cmp="$6"
  local state="$STATE_DIR/$key"
  local over=0

  if [ "$cmp" = "gef" ]; then
    awk -v v="$value" -v t="$threshold" 'BEGIN{exit !(v+0 >= t+0)}' && over=1
  else
    [ "${value%%.*}" -ge "$threshold" ] 2>/dev/null && over=1
  fi

  if [ "$over" = "1" ]; then
    if [ -f "$state" ]; then
      local last; last=$(cat "$state" 2>/dev/null || echo 0)
      if [ $((now - last)) -ge "$repeat" ]; then
        notify "$RED" "⚠️ ${label} still high on ${HOSTNAME_LABEL}" \
          "**${value}${unit}** (threshold ${threshold}${unit}) — still over after a while."
        echo "$now" > "$state"
      else
        log "$label over threshold ($value$unit) but within cooldown — quiet."
      fi
    else
      notify "$RED" "🔴 ${label} high on ${HOSTNAME_LABEL}" \
        "**${value}${unit}** has crossed the ${threshold}${unit} threshold."
      echo "$now" > "$state"
    fi
  else
    if [ -f "$state" ]; then
      notify "$GREEN" "✅ ${label} back to normal on ${HOSTNAME_LABEL}" \
        "**${value}${unit}** is under the ${threshold}${unit} threshold again."
      rm -f "$state"
    fi
  fi
}

# ---- test mode --------------------------------------------------------------
if [ "${1:-}" = "test" ]; then
  notify "$GREEN" "infra-watch test on ${HOSTNAME_LABEL}" \
    "If you can read this, the webhook works. $(date '+%Y-%m-%d %H:%M:%S %Z')"
  exit 0
fi

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
