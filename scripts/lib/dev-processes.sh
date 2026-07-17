#!/usr/bin/env bash

process_command() {
  ps -p "$1" -o command= 2>/dev/null || true
}

is_owned_astraos_process() {
  local pid="$1"
  local signature="$2"
  local command
  command="$(process_command "$pid")"
  [ -n "$command" ] && [[ "$command" == *"$ROOT_DIR"* ]] && [[ "$command" == *"$signature"* ]]
}

stop_pid_file() {
  local pid_file="$1"
  local label="$2"
  local signature="$3"
  local pid

  [ -f "$pid_file" ] || return 0
  pid="$(tr -dc '0-9' <"$pid_file")"
  rm -f "$pid_file"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null || return 0

  if ! is_owned_astraos_process "$pid" "$signature"; then
    echo "Ignoring stale ${label} PID file; process ${pid} is not verified as AstraOS-owned." >&2
    echo "Command: $(process_command "$pid")" >&2
    return 0
  fi

  echo "Stopping previous ${label} process: ${pid}"
  kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 20); do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.1
  done
  echo "Force stopping previous ${label} process: ${pid}"
  kill -9 "$pid" 2>/dev/null || true
}

stop_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  [ -n "$pids" ] || return 0

  if [ "${ASTRAOS_FORCE_PORT_CLEANUP:-false}" != "true" ]; then
    echo "Port ${port} is occupied by an unverified process; refusing to terminate it." >&2
    for pid in $pids; do
      echo "PID ${pid}: $(process_command "$pid")" >&2
    done
    echo "Stop it manually, choose another API_PORT/WEB_PORT, or explicitly set ASTRAOS_FORCE_PORT_CLEANUP=true." >&2
    return 1
  fi

  echo "Force cleanup explicitly enabled for port ${port}: ${pids}"
  kill $pids 2>/dev/null || true
  sleep 0.8
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  [ -z "$pids" ] || kill -9 $pids 2>/dev/null || true
}
