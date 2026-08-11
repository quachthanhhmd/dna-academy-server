#!/usr/bin/env bash
#
# Run docker compose against one of the env/.env.<name> files.
#
#   scripts/compose.sh              -> env/.env.local, no compose args
#   scripts/compose.sh up -d        -> env/.env.local (default environment)
#   scripts/compose.sh develop up -d
#   APP_ENV=develop scripts/compose.sh up -d
#
# The env file is passed twice on purpose:
#   --env-file  -> variable interpolation inside docker-compose.yaml
#   ENV_FILE    -> the `env_file:` entry of the api service, so the same
#                  values end up inside the container
#
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_NAME="${APP_ENV:-local}"

# The first argument is the environment name unless it is a docker compose
# command or flag, so `scripts/compose.sh up -d` keeps working.
if [ $# -gt 0 ]; then
  case "$1" in
    -*) ;;
    up | down | build | config | ps | logs | exec | run | restart | stop | \
      start | pull | push | kill | rm | create | top | events | images | \
      port | pause | unpause | cp | wait | watch | version | ls | attach | \
      scale | stats) ;;
    *)
      ENV_NAME="$1"
      shift
      ;;
  esac
fi

ENV_FILE="./env/.env.${ENV_NAME}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file not found: $ENV_FILE" >&2
  echo "Available environments:" >&2
  ls env/.env.* 2>/dev/null | grep -v '\.example$' | sed 's#env/.env.#  - #' >&2
  exit 1
fi

export ENV_FILE
export APP_ENV="$ENV_NAME"

echo "[compose] environment=${ENV_NAME} env-file=${ENV_FILE}"

exec docker compose \
  --env-file "$ENV_FILE" \
  -p "dna-academy-${ENV_NAME}" \
  "$@"
