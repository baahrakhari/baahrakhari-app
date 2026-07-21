#!/usr/bin/env bash
#
# metro.sh — ensure the Metro bundler is running for Baahrakhari, starting it
# in the background (with logs) only if it isn't already up.
#
# Usage:
#   ./scripts/metro.sh start    # start if not running, wait until it responds (default)
#   ./scripts/metro.sh status   # report running/not running, no side effects
#   ./scripts/metro.sh stop     # stop the background instance started by this script
#
# Env vars:
#   RCT_METRO_PORT   Metro port (default: 8081)

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly PORT="${RCT_METRO_PORT:-8081}"
readonly LOG_DIR="${REPO_ROOT}/build/logs"
readonly LOG_FILE="${LOG_DIR}/metro.log"
readonly PID_FILE="${LOG_DIR}/metro.pid"

usage() {
  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
}

is_up() {
  curl -sf --max-time 2 "http://localhost:${PORT}/status" >/dev/null 2>&1
}

cmd_start() {
  if is_up; then
    echo "✓ Metro already running on :${PORT}."
    return 0
  fi

  mkdir -p "$LOG_DIR"
  echo "▼ Starting Metro on :${PORT}  (log: ${LOG_FILE})"
  (
    cd "$REPO_ROOT"
    exec npx react-native start --port "$PORT"
  ) >"$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" >"$PID_FILE"
  disown "$pid" 2>/dev/null || true

  local waited=0
  while (( waited < 30 )); do
    if is_up; then
      echo "✓ Metro is up (pid ${pid})."
      return 0
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "✗ Metro process exited early — check ${LOG_FILE}" >&2
      return 1
    fi
    sleep 1
    (( waited += 1 ))
  done
  echo "✗ Metro didn't respond on :${PORT} after 30s — check ${LOG_FILE}" >&2
  return 1
}

cmd_status() {
  if is_up; then
    echo "✓ Metro running on :${PORT}."
  else
    echo "✗ Metro not running on :${PORT}."
    return 1
  fi
}

cmd_stop() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      echo "✓ Stopped Metro (pid ${pid})."
    else
      echo "  • no process running for recorded pid ${pid}."
    fi
    rm -f "$PID_FILE"
  else
    echo "  • no pid file — if Metro is running it wasn't started by this script."
    echo "    Find/stop it manually: lsof -i :${PORT}"
  fi
}

COMMAND="${1:-start}"
case "$COMMAND" in
  start) cmd_start ;;
  status) cmd_status ;;
  stop) cmd_stop ;;
  -h|--help|help) usage ;;
  *)
    echo "Unknown command: ${COMMAND}" >&2
    usage
    exit 2
    ;;
esac
