#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-3000}"
API_URL="http://localhost:${API_PORT}"
WEB_URL="http://localhost:${WEB_PORT}"
LOG_DIR="${ROOT_DIR}/.logs"
PID_DIR="${LOG_DIR}/pids"
API_LOG_FILE="${LOG_DIR}/api.log"
WEB_LOG_FILE="${LOG_DIR}/web.log"
API_PID_FILE="${PID_DIR}/api.pid"
WEB_PID_FILE="${PID_DIR}/web.pid"
API_LOG_TAIL_PID_FILE="${PID_DIR}/api-log-tail.pid"
API_LOG_LEVEL="${API_LOG_LEVEL:-debug}"
PYTHON_BIN="${PYTHON_BIN:-}"
LOCKED_CONDA_ENV_NAME="${LOCKED_CONDA_ENV_NAME:-agent-core}"
LOCKED_PYTHON_BIN="${LOCKED_PYTHON_BIN:-${HOME}/miniconda3/envs/${LOCKED_CONDA_ENV_NAME}/bin/python}"

cd "$ROOT_DIR"
mkdir -p "$LOG_DIR" "$PID_DIR"
source "${ROOT_DIR}/scripts/lib/dev-processes.sh"

require_command() {
  local command_name="$1"
  local install_hint="$2"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: ${command_name}. ${install_hint}" >&2
    return 1
  fi
}

select_python() {
  supports_python_version() {
    local python_bin="$1"
    "$python_bin" -c 'import sys; raise SystemExit(0 if (3, 11) <= sys.version_info < (3, 13) else 1)' >/dev/null 2>&1
  }

  if [ -n "$PYTHON_BIN" ]; then
    require_command "$PYTHON_BIN" "Set PYTHON_BIN to a Python 3.11 or 3.12 executable."
  else
    local conda_base=""

    if command -v conda >/dev/null 2>&1; then
      conda_base="$(conda info --base 2>/dev/null || true)"
    fi

    if [ -n "$conda_base" ] && [ -x "${conda_base}/envs/${LOCKED_CONDA_ENV_NAME}/bin/python" ]; then
      PYTHON_BIN="${conda_base}/envs/${LOCKED_CONDA_ENV_NAME}/bin/python"
    else
      PYTHON_BIN="$LOCKED_PYTHON_BIN"
    fi
  fi

  if [ ! -x "$PYTHON_BIN" ]; then
    echo "Locked Python not found: ${PYTHON_BIN}" >&2
    echo "Expected conda env: ${LOCKED_CONDA_ENV_NAME}. Override with PYTHON_BIN or LOCKED_PYTHON_BIN if needed." >&2
    return 1
  fi

  supports_python_version "$PYTHON_BIN" || {
    echo "${PYTHON_BIN} must be Python 3.11 or 3.12." >&2
    return 1
  }

  echo "Using Python: ${PYTHON_BIN}"
}

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
require_command docker "Install Docker Desktop and start the Docker daemon."
require_command curl "Install curl and ensure it is available in PATH."
require_command lsof "Install lsof and ensure it is available in PATH."
select_python

docker compose version >/dev/null
if ! docker info >/dev/null 2>&1; then
  echo "Docker is installed, but the Docker daemon is not available. Start Docker Desktop and retry." >&2
  exit 1
fi

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

read_env_value() {
  local key="$1"
  sed -n "s/^${key}=//p" .env | tail -n 1
}

ENABLE_WORKSPACE_PREVIEWS="${ENABLE_WORKSPACE_PREVIEWS:-$(read_env_value ENABLE_WORKSPACE_PREVIEWS)}"
ENABLE_WORKSPACE_PREVIEWS="${ENABLE_WORKSPACE_PREVIEWS:-false}"

cleanup_previous_run() {
  stop_pid_file "$API_LOG_TAIL_PID_FILE" "API log tail" "tail -n +1 -F ${API_LOG_FILE}"
  stop_pid_file "$API_PID_FILE" "FastAPI" "uvicorn app.main:app"
  stop_pid_file "$WEB_PID_FILE" "Next.js" "next dev"
  stop_port "$API_PORT"
  stop_port "$WEB_PORT"
}

remove_owned_pid_file() {
  local pid_file="$1"
  local expected_pid="$2"

  if [ -f "$pid_file" ] && [ "$(tr -dc '0-9' <"$pid_file")" = "$expected_pid" ]; then
    rm -f "$pid_file"
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
  remove_owned_pid_file "$API_LOG_TAIL_PID_FILE" "${API_LOG_TAIL_PID:-}"
  remove_owned_pid_file "$API_PID_FILE" "${API_PID:-}"
  remove_owned_pid_file "$WEB_PID_FILE" "${WEB_PID:-}"
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

echo "Cleaning processes from previous runs..."
cleanup_previous_run

echo "Starting local infrastructure..."
docker compose -f infra/docker-compose.yml up -d --wait --wait-timeout 60

if [ ! -e "apps/web/node_modules/next" ]; then
  echo "Installing frontend dependencies..."
  "${PNPM_CMD[@]}" install --frozen-lockfile
fi

echo "Preparing backend virtual environment..."
cd "${ROOT_DIR}/services/api"
if [ ! -d ".venv" ]; then
  "$PYTHON_BIN" -m venv .venv
fi
VENV_PYTHON="${ROOT_DIR}/services/api/.venv/bin/python"
"$VENV_PYTHON" -m pip install -e ".[dev]" >/dev/null

echo "Running database migrations..."
"${ROOT_DIR}/services/api/.venv/bin/alembic" upgrade head

cd "$ROOT_DIR"
echo "Cleaning Next.js dev cache..."
rm -rf apps/web/.next
: >"$API_LOG_FILE"
: >"$WEB_LOG_FILE"

echo "Starting FastAPI on ${API_URL} with ${API_LOG_LEVEL} logs..."
(
  cd "${ROOT_DIR}/services/api"
  PYTHONUNBUFFERED=1 "${ROOT_DIR}/services/api/.venv/bin/uvicorn" app.main:app --reload --host 127.0.0.1 --port "$API_PORT" --log-level "$API_LOG_LEVEL" --access-log
) >"$API_LOG_FILE" 2>&1 &
API_PID="$!"
printf '%s\n' "$API_PID" >"$API_PID_FILE"
tail -n +1 -F "$API_LOG_FILE" &
API_LOG_TAIL_PID="$!"
printf '%s\n' "$API_LOG_TAIL_PID" >"$API_LOG_TAIL_PID_FILE"

wait_for_url "${API_URL}/health" "FastAPI"

echo "Starting Next.js on ${WEB_URL}..."
(
  NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-${API_URL}}" \
    ENABLE_WORKSPACE_PREVIEWS="$ENABLE_WORKSPACE_PREVIEWS" \
    "${PNPM_CMD[@]}" --filter @astraos/web exec next dev -p "$WEB_PORT"
) >"$WEB_LOG_FILE" 2>&1 &
WEB_PID="$!"
printf '%s\n' "$WEB_PID" >"$WEB_PID_FILE"

wait_for_url "${WEB_URL}/workspace" "Next.js Workspace"

cat <<MSG

AstraOS development environment is running.

Workspace:     ${WEB_URL}/workspace
Login:         ${WEB_URL}/login
API:           ${API_URL}
Health:        ${API_URL}/health

Logs:
  backend logs are streaming in this terminal
  tail -f .logs/api.log
  tail -f .logs/web.log

Press Ctrl+C to stop the API and web dev servers.
Run "pnpm infra:down" when you also want to stop PostgreSQL and Qdrant.
MSG

wait "$API_PID" "$WEB_PID"
