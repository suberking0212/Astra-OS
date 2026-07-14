#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-3000}"
API_URL="http://localhost:${API_PORT}"
WEB_URL="http://localhost:${WEB_PORT}"
LOG_DIR="${ROOT_DIR}/.logs"
API_LOG_FILE="${LOG_DIR}/api.log"
WEB_LOG_FILE="${LOG_DIR}/web.log"
API_LOG_LEVEL="${API_LOG_LEVEL:-debug}"

cd "$ROOT_DIR"
mkdir -p "$LOG_DIR"

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi

  if ! command -v corepack >/dev/null 2>&1; then
    echo "Neither pnpm nor corepack is available in PATH." >&2
    return 1
  fi

  echo "Bootstrapping pnpm via corepack..."
  corepack enable pnpm >/dev/null 2>&1 || true

  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi

  echo "pnpm is still unavailable after corepack bootstrap." >&2
  return 1
}

ensure_pnpm
PNPM_CMD=(pnpm)

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

stop_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"

  if [ -z "$pids" ]; then
    return
  fi

  echo "Stopping stale local process on port ${port}: ${pids}"
  kill $pids 2>/dev/null || true
  sleep 0.8

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "Force stopping process on port ${port}: ${pids}"
    kill -9 $pids 2>/dev/null || true
  fi
}

cleanup_children() {
  if [ -n "${API_LOG_TAIL_PID:-}" ] && kill -0 "$API_LOG_TAIL_PID" 2>/dev/null; then
    kill "$API_LOG_TAIL_PID" 2>/dev/null || true
  fi
  if [ -n "${API_PID:-}" ] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi
  if [ -n "${WEB_PID:-}" ] && kill -0 "$WEB_PID" 2>/dev/null; then
    kill "$WEB_PID" 2>/dev/null || true
  fi
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts="${3:-40}"

  for _ in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "${label} is ready: ${url}"
      return
    fi
    sleep 1
  done

  echo "${label} did not become ready: ${url}" >&2
  return 1
}

trap cleanup_children EXIT INT TERM

echo "AstraOS local development restart"
echo "Root: ${ROOT_DIR}"

stop_port "$API_PORT"
stop_port "$WEB_PORT"
stop_port 3001

echo "Starting local infrastructure..."
docker compose -f infra/docker-compose.yml up -d

echo "Preparing backend virtual environment..."
cd "${ROOT_DIR}/services/api"
if [ ! -d ".venv" ]; then
  python -m venv .venv
fi
source .venv/bin/activate
pip install -e ".[dev]" >/dev/null

echo "Running database migrations..."
alembic upgrade head

cd "$ROOT_DIR"
echo "Cleaning Next.js dev cache..."
rm -rf apps/web/.next
: >"$API_LOG_FILE"
: >"$WEB_LOG_FILE"

echo "Starting FastAPI on ${API_URL} with ${API_LOG_LEVEL} logs..."
(
  cd "${ROOT_DIR}/services/api"
  source .venv/bin/activate
  PYTHONUNBUFFERED=1 uvicorn app.main:app --reload --host 127.0.0.1 --port "$API_PORT" --log-level "$API_LOG_LEVEL" --access-log
) >"$API_LOG_FILE" 2>&1 &
API_PID="$!"
tail -n +1 -F "$API_LOG_FILE" &
API_LOG_TAIL_PID="$!"

wait_for_url "${API_URL}/health" "FastAPI"

echo "Starting Next.js on ${WEB_URL}..."
(
  NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-${API_URL}}" \
    "${PNPM_CMD[@]}" --filter @astraos/web exec next dev -p "$WEB_PORT"
) >"$WEB_LOG_FILE" 2>&1 &
WEB_PID="$!"

wait_for_url "${WEB_URL}/workspace" "Next.js Workspace"

cat <<MSG

AstraOS Phase 3 is running.

Workspace:     ${WEB_URL}/workspace
Login:         ${WEB_URL}/login
Admin Console: ${WEB_URL}/admin/projects
Knowledge:     ${WEB_URL}/admin/projects/[projectId]/knowledge
AI Employees:  ${WEB_URL}/admin/projects/[projectId]/employees
API:           ${API_URL}
Health:        ${API_URL}/health

Logs:
  backend logs are streaming in this terminal
  tail -f .logs/api.log
  tail -f .logs/web.log

Press Ctrl+C to stop the API and web dev servers.
MSG

wait "$API_PID" "$WEB_PID"
