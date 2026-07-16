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

cd "$ROOT_DIR"
mkdir -p "$LOG_DIR" "$PID_DIR"

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

  resolve_python_candidate() {
    local candidate="$1"

    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi

    if command -v "$candidate" >/dev/null 2>&1; then
      command -v "$candidate"
      return 0
    fi

    return 1
  }

  if [ -n "$PYTHON_BIN" ]; then
    require_command "$PYTHON_BIN" "Set PYTHON_BIN to a Python 3.11 or 3.12 executable."
  else
    local candidate=""
    local resolved_candidate=""
    local candidates=(
      python3
      python
      /opt/homebrew/bin/python3
      /usr/local/bin/python3
      /opt/homebrew/bin/python3.14
      /opt/homebrew/bin/python3.13
      /opt/homebrew/bin/python3.12
      /opt/homebrew/bin/python3.11
      /usr/local/bin/python3.14
      /usr/local/bin/python3.13
      /usr/local/bin/python3.12
      /usr/local/bin/python3.11
    )

    for candidate in "${candidates[@]}"; do
      resolved_candidate="$(resolve_python_candidate "$candidate" || true)"
      if [ -z "$resolved_candidate" ]; then
        continue
      fi

      if supports_python_version "$resolved_candidate"; then
        PYTHON_BIN="$resolved_candidate"
        break
      fi
    done
  fi

  if [ -z "$PYTHON_BIN" ]; then
    echo "Python 3.11 or 3.12 is required. Set PYTHON_BIN to a compatible executable." >&2
    return 1
  fi

  supports_python_version "$PYTHON_BIN" || {
    echo "${PYTHON_BIN} must be Python 3.11 or 3.12." >&2
    return 1
  }
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

stop_pid_file() {
  local pid_file="$1"
  local label="$2"
  local pid

  if [ ! -f "$pid_file" ]; then
    return
  fi

  pid="$(tr -dc '0-9' <"$pid_file")"
  rm -f "$pid_file"

  if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
    return
  fi

  echo "Stopping previous ${label} process: ${pid}"
  kill "$pid" 2>/dev/null || true

  for _ in $(seq 1 20); do
    if ! kill -0 "$pid" 2>/dev/null; then
      return
    fi
    sleep 0.1
  done

  echo "Force stopping previous ${label} process: ${pid}"
  kill -9 "$pid" 2>/dev/null || true
}

cleanup_previous_run() {
  stop_pid_file "$API_LOG_TAIL_PID_FILE" "API log tail"
  stop_pid_file "$API_PID_FILE" "FastAPI"
  stop_pid_file "$WEB_PID_FILE" "Next.js"
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
