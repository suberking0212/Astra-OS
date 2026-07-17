#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${ROOT_DIR}/scripts/lib/dev-processes.sh"

TMP_DIR="$(mktemp -d)"
cleanup() {
  [ -z "${UNKNOWN_PID:-}" ] || kill "$UNKNOWN_PID" 2>/dev/null || true
  [ -z "${OWNED_PID:-}" ] || kill "$OWNED_PID" 2>/dev/null || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

"${ROOT_DIR}/scripts/tests/fixture-owned-service.sh" &
OWNED_PID="$!"
printf '%s\n' "$OWNED_PID" >"${TMP_DIR}/owned.pid"
stop_pid_file "${TMP_DIR}/owned.pid" "fixture" "fixture-owned-service.sh"
if kill -0 "$OWNED_PID" 2>/dev/null; then
  echo "Owned process was not stopped." >&2
  exit 1
fi
OWNED_PID=""

PORT="$((42000 + RANDOM % 1000))"
python3 -m http.server "$PORT" --bind 127.0.0.1 >"${TMP_DIR}/unknown.log" 2>&1 &
UNKNOWN_PID="$!"
for _ in $(seq 1 30); do
  lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 && break
  sleep 0.1
done

if stop_port "$PORT"; then
  echo "Unknown port owner should have been rejected." >&2
  exit 1
fi
kill -0 "$UNKNOWN_PID"

ASTRAOS_FORCE_PORT_CLEANUP=true stop_port "$PORT"
if kill -0 "$UNKNOWN_PID" 2>/dev/null; then
  echo "Explicit force cleanup did not stop the process." >&2
  exit 1
fi
UNKNOWN_PID=""

echo "dev process cleanup contract passed"
