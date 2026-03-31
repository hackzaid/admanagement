#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

compose_up() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f docker-compose.prod.yml pull || true
    docker compose -f docker-compose.prod.yml up -d --build backend frontend
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f docker-compose.prod.yml pull || true
    docker-compose -f docker-compose.prod.yml up -d --build backend frontend
    return 0
  fi

  echo "Neither docker compose nor docker-compose is available." >&2
  exit 1
}

set_env_value() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

cd "$ROOT_DIR"
if command -v git >/dev/null 2>&1; then
  CURRENT_COMMIT="$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || true)"
  if [[ -n "${CURRENT_COMMIT:-}" ]]; then
    set_env_value "ADMANAGEMENT_BUILD_COMMIT" "$CURRENT_COMMIT"
    set_env_value "ADMANAGEMENT_UPDATE_CHANNEL" "branch"
  fi
fi
compose_up
echo "Upgrade complete."
