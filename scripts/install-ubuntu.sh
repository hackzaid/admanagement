#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

get_env_value() {
  local key="$1"
  local default_value="${2:-}"
  if [[ -f "$ENV_FILE" ]]; then
    local current
    current="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d '=' -f2- || true)"
    if [[ -n "$current" ]]; then
      printf '%s\n' "$current"
      return 0
    fi
  fi
  printf '%s\n' "$default_value"
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

get_git_commit() {
  if command -v git >/dev/null 2>&1; then
    git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || true
  fi
}

is_port_in_use() {
  local port="$1"

  if command -v ss >/dev/null 2>&1; then
    if ss -ltn "( sport = :$port )" 2>/dev/null | grep -q ":$port"; then
      return 0
    fi
  fi

  if command -v lsof >/dev/null 2>&1; then
    if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi
  fi

  if command -v netstat >/dev/null 2>&1; then
    if netstat -ltn 2>/dev/null | grep -q "[.:]$port[[:space:]]"; then
      return 0
    fi
  fi

  return 1
}

find_available_port() {
  local preferred_port="$1"
  local attempts="${2:-25}"
  local port="$preferred_port"
  local count=0

  while (( count < attempts )); do
    if ! is_port_in_use "$port"; then
      printf '%s\n' "$port"
      return 0
    fi
    port=$((port + 1))
    count=$((count + 1))
  done

  echo "Unable to find a free port near $preferred_port after $attempts attempts." >&2
  exit 1
}

echo "[1/4] Checking Docker"
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Engine and Docker Compose first."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is required."
  exit 1
fi

echo "[2/4] Preparing environment"
if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT_DIR/.env.example" "$ENV_FILE"
  echo "Created .env from .env.example. Review it before exposing the service."
fi

BACKEND_PORT_VALUE="$(get_env_value "BACKEND_PORT" "8000")"
FRONTEND_PORT_VALUE="$(get_env_value "FRONTEND_PORT" "3000")"

BACKEND_PORT_SELECTED="$(find_available_port "$BACKEND_PORT_VALUE")"
FRONTEND_PORT_SELECTED="$(find_available_port "$FRONTEND_PORT_VALUE")"

set_env_value "BACKEND_PORT" "$BACKEND_PORT_SELECTED"
set_env_value "FRONTEND_PORT" "$FRONTEND_PORT_SELECTED"
set_env_value "NEXT_PUBLIC_API_BASE_URL" "http://localhost:${BACKEND_PORT_SELECTED}"
set_env_value "ADMANAGEMENT_FRONTEND_ORIGINS" "[\"http://127.0.0.1:${FRONTEND_PORT_SELECTED}\",\"http://localhost:${FRONTEND_PORT_SELECTED}\"]"
set_env_value "ADMANAGEMENT_UPDATE_CHANNEL" "branch"
set_env_value "ADMANAGEMENT_UPDATE_HOST_PROJECT_PATH" "$ROOT_DIR"

GIT_COMMIT_VALUE="$(get_git_commit)"
if [[ -n "$GIT_COMMIT_VALUE" ]]; then
  set_env_value "ADMANAGEMENT_BUILD_COMMIT" "$GIT_COMMIT_VALUE"
fi

if [[ "$BACKEND_PORT_SELECTED" != "$BACKEND_PORT_VALUE" ]]; then
  echo "Backend port $BACKEND_PORT_VALUE is in use. Using $BACKEND_PORT_SELECTED instead."
fi

if [[ "$FRONTEND_PORT_SELECTED" != "$FRONTEND_PORT_VALUE" ]]; then
  echo "Frontend port $FRONTEND_PORT_VALUE is in use. Using $FRONTEND_PORT_SELECTED instead."
fi

echo "[3/4] Building and starting containers"
cd "$ROOT_DIR"
docker compose -f docker-compose.prod.yml up -d --build

echo "[4/4] Completed"
echo "Frontend: http://localhost:${FRONTEND_PORT_SELECTED}"
echo "Backend API: http://localhost:${BACKEND_PORT_SELECTED}"
echo "First-run onboarding: http://localhost:${FRONTEND_PORT_SELECTED}/onboarding"
