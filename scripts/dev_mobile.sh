#!/usr/bin/env bash
#
# dev_mobile.sh — happy-path entry point for local testing on BOTH platforms:
# boots the Android emulator and iOS simulator in parallel, starts Metro,
# then installs + launches the app on each. Keeps going even if one platform
# fails, so you still get the other running.
#
# Usage:
#   ./scripts/dev_mobile.sh
#
# Equivalent to running (in order/parallel):
#   npm run emulator:android && npm run simulator:ios   (parallel)
#   npm run metro:start
#   npm run dev:android
#   npm run dev:ios

set -uo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== Baahrakhari local dev: booting Android emulator + iOS simulator ==="
"$REPO_ROOT/scripts/android_emulator.sh" boot &
ANDROID_BOOT_PID=$!
"$REPO_ROOT/scripts/ios_simulator.sh" boot &
IOS_BOOT_PID=$!

ANDROID_BOOT_OK=0
IOS_BOOT_OK=0
wait "$ANDROID_BOOT_PID" || ANDROID_BOOT_OK=1
wait "$IOS_BOOT_PID" || IOS_BOOT_OK=1

"$REPO_ROOT/scripts/metro.sh" start || true

ANDROID_RUN_OK=0
IOS_RUN_OK=0

if [[ $ANDROID_BOOT_OK -eq 0 ]]; then
  echo ""
  echo "=== Installing on Android ==="
  "$REPO_ROOT/scripts/dev_android.sh" || ANDROID_RUN_OK=1
else
  echo "✗ Skipping Android install — emulator boot failed." >&2
  ANDROID_RUN_OK=1
fi

if [[ $IOS_BOOT_OK -eq 0 ]]; then
  echo ""
  echo "=== Installing on iOS ==="
  "$REPO_ROOT/scripts/dev_ios.sh" || IOS_RUN_OK=1
else
  echo "✗ Skipping iOS install — simulator boot failed." >&2
  IOS_RUN_OK=1
fi

echo ""
echo "=== Summary ==="
[[ $ANDROID_RUN_OK -eq 0 ]] && echo "✓ Android: installed and running" || echo "✗ Android: failed — see output above"
[[ $IOS_RUN_OK -eq 0 ]] && echo "✓ iOS:     installed and running" || echo "✗ iOS:     failed — see output above"

[[ $ANDROID_RUN_OK -eq 0 && $IOS_RUN_OK -eq 0 ]]
