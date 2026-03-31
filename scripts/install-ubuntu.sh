#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

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

echo "[3/4] Building and starting containers"
cd "$ROOT_DIR"
docker compose -f docker-compose.prod.yml up -d --build

echo "[4/4] Completed"
echo "Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "Backend API: http://localhost:${BACKEND_PORT:-8000}"
echo "First-run onboarding: http://localhost:${FRONTEND_PORT:-3000}/onboarding"
