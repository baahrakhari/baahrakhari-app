#!/usr/bin/env bash
#
# dev_ios.sh — one-command local iOS testing: boot the simulator, ensure
# Metro is running, then build+install+launch the app.
#
# Usage:
#   ./scripts/dev_ios.sh ["Simulator Name"] [-- extra args passed to react-native run-ios]
#
# Env vars:
#   SIMULATOR_NAME  Device name (default: iPhone 17 Pro, falls back automatically)

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SIM_NAME="${1:-${SIMULATOR_NAME:-}}"
if [[ -n "${1:-}" && "$1" != --* ]]; then
  shift
fi

"$REPO_ROOT/scripts/ios_simulator.sh" boot "$SIM_NAME"
"$REPO_ROOT/scripts/metro.sh" start

RESOLVED_NAME="$SIM_NAME"
if [[ -z "$RESOLVED_NAME" ]]; then
  RESOLVED_NAME="$("$REPO_ROOT/scripts/ios_simulator.sh" status 2>/dev/null | awk -F': *' '/^Device:/ {print $2}')"
fi
RESOLVED_NAME="${RESOLVED_NAME:-iPhone 17 Pro}"

echo "▼ Installing + launching on iOS simulator '${RESOLVED_NAME}'…"
cd "$REPO_ROOT"
exec npx react-native run-ios --no-packager --simulator "$RESOLVED_NAME" "$@"
