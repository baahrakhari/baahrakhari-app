#!/usr/bin/env bash
#
# dev_android.sh — one-command local Android testing: boot the emulator,
# ensure Metro is running, then build+install+launch the app.
#
# Usage:
#   ./scripts/dev_android.sh [avd-name] [extra args passed to react-native run-android]
#
# Env vars: see android_emulator.sh (AVD_NAME, BOOT_TIMEOUT) and metro.sh.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

AVD_ARG="${1:-${AVD_NAME:-}}"
if [[ -n "${1:-}" && "$1" != --* ]]; then
  shift
fi

"$REPO_ROOT/scripts/android_emulator.sh" boot "$AVD_ARG"
"$REPO_ROOT/scripts/metro.sh" start

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
adb reverse tcp:8081 tcp:8081 2>/dev/null || true

echo "▼ Installing + launching on Android emulator…"
cd "$REPO_ROOT"
exec npx react-native run-android --no-packager "$@"
