#!/usr/bin/env bash
#
# ios_simulator.sh — boot the local iOS Simulator used for Baahrakhari
# day-to-day testing and wait until it is stable (fully booted).
#
# Preferred device: iPhone 17 Pro, falling back through a list of newer
# iPhones if that's not installed. Picks the newest available iOS runtime
# for whichever device name matches.
#
# Safe to re-run: skips boot if the simulator is already booted.
#
# Usage:
#   ./scripts/ios_simulator.sh boot ["Device Name"]    # boot + wait until stable (default)
#   ./scripts/ios_simulator.sh status ["Device Name"]  # report state, no side effects
#   ./scripts/ios_simulator.sh list                     # list available devices/runtimes
#
# Env vars:
#   SIMULATOR_NAME  Device name to use if none passed as an argument
#   BOOT_TIMEOUT    Seconds to wait for full boot (default: 120)
#   SHOW_UI         Set to 0 to skip opening Simulator.app (default: 1)

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

command -v xcrun >/dev/null 2>&1 || {
  echo "✗ xcrun not found; install Xcode + command line tools (xcode-select --install)." >&2
  exit 1
}
xcode-select -p >/dev/null 2>&1 || {
  echo "✗ Xcode command line tools not configured. Run: xcode-select --install" >&2
  exit 1
}

readonly BOOT_TIMEOUT="${BOOT_TIMEOUT:-120}"
readonly SHOW_UI="${SHOW_UI:-1}"
readonly DEVICE_CANDIDATES=("iPhone 17 Pro" "iPhone 17" "iPhone 17 Pro Max" "iPhone 17e" "iPhone Air" "iPhone 16 Pro")

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
}

# Resolves "name|udid|runtime" for the best match among the given device
# names (first name wins; among matches for the same name, newest runtime wins).
resolve_device() {
  xcrun simctl list devices available -j 2>/dev/null | /usr/bin/python3 -c '
import json, sys
data = json.load(sys.stdin)
names = sys.argv[1:]
best = None
for runtime, devs in data.get("devices", {}).items():
    if "iOS" not in runtime:
        continue
    for d in devs:
        if not d.get("isAvailable", True):
            continue
        if d["name"] not in names:
            continue
        rank = names.index(d["name"])
        key = (-rank, runtime)
        if best is None or key > best[0]:
            best = (key, d["name"], d["udid"], runtime)
if best:
    print(f"{best[1]}|{best[2]}|{best[3]}")
' "$@"
}

device_state() {
  # $1 = udid
  xcrun simctl list devices 2>/dev/null | grep "($1)" | sed -E 's/.*\(([A-Za-z ]+)\)[[:space:]]*$/\1/' | head -n1
}

wait_until_booted() {
  local udid="$1" waited=0 state
  while (( waited < BOOT_TIMEOUT )); do
    state="$(device_state "$udid")"
    if [[ "$state" == "Booted" ]]; then
      echo "✓ Simulator ${udid} is booted and stable."
      return 0
    fi
    sleep 2
    (( waited += 2 ))
  done
  echo "✗ Timed out waiting for simulator ${udid} to boot (>${BOOT_TIMEOUT}s)." >&2
  echo "  Try opening Simulator.app manually, or check: xcrun simctl list devices" >&2
  return 1
}

boot_device() {
  local name="$1" udid="$2"
  local state
  state="$(device_state "$udid")"
  if [[ "$state" == "Booted" ]]; then
    echo "✓ '${name}' (${udid}) already booted."
    return 0
  fi

  echo "▼ Booting '${name}' (${udid})"
  if [[ "$SHOW_UI" == "1" ]]; then
    open -a Simulator --args -CurrentDeviceUDID "$udid" >/dev/null 2>&1 || true
  fi
  xcrun simctl boot "$udid" >/dev/null 2>&1 || true
  wait_until_booted "$udid"
}

cmd_status() {
  local pair
  if [[ -n "${1:-}" ]]; then
    pair="$(resolve_device "$1")"
  else
    pair="$(resolve_device "${DEVICE_CANDIDATES[@]}")"
  fi
  if [[ -z "$pair" ]]; then
    echo "No matching simulator installed (tried: ${1:-${DEVICE_CANDIDATES[*]}})"
    return 1
  fi
  IFS='|' read -r name udid runtime <<<"$pair"
  echo "Device:  ${name}"
  echo "Runtime: ${runtime#com.apple.CoreSimulator.SimRuntime.}"
  echo "UDID:    ${udid}"
  echo "State:   $(device_state "$udid")"
}

cmd_list() {
  echo "Available iOS simulators:"
  xcrun simctl list devices available 2>/dev/null
}

# ---------- main ------------------------------------------------------------

COMMAND="${1:-boot}"
NAME_ARG="${2:-${SIMULATOR_NAME:-}}"

case "$COMMAND" in
  boot)
    pair=""
    if [[ -n "$NAME_ARG" ]]; then
      pair="$(resolve_device "$NAME_ARG")"
      [[ -n "$pair" ]] || {
        echo "✗ Simulator '${NAME_ARG}' not found/available." >&2
        exit 1
      }
    else
      pair="$(resolve_device "${DEVICE_CANDIDATES[@]}")"
      [[ -n "$pair" ]] || {
        echo "✗ None of the preferred simulators are installed: ${DEVICE_CANDIDATES[*]}" >&2
        echo "  Open Xcode → Settings → Platforms to install an iOS runtime." >&2
        exit 1
      }
    fi
    IFS='|' read -r name udid runtime <<<"$pair"
    if [[ "$name" != "iPhone 17 Pro" && -z "$NAME_ARG" ]]; then
      echo "↯ 'iPhone 17 Pro' not available — using closest fallback '${name}'." >&2
    fi
    boot_device "$name" "$udid"
    ;;
  status)
    cmd_status "$NAME_ARG"
    ;;
  list)
    cmd_list
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "Unknown command: ${COMMAND}" >&2
    usage
    exit 2
    ;;
esac
