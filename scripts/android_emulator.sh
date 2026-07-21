#!/usr/bin/env bash
#
# android_emulator.sh — create (if missing) and boot the local Android
# emulator used for Baahrakhari day-to-day testing.
#
# Preferred device: Pixel 10 (falls back to the closest available Pixel
# profile if the Pixel 10 definition isn't installed yet — see
# DEVICE_PROFILE_CANDIDATES below). Preferred system image: the newest
# installed android-* google_apis(_playstore) image for this Mac's arch.
#
# Safe to re-run: skips creation if the AVD already exists, skips boot if
# it's already running.
#
# Usage:
#   ./scripts/android_emulator.sh boot [avd-name]     # create+boot, wait for full boot (default)
#   ./scripts/android_emulator.sh create [avd-name]   # create only, don't boot
#   ./scripts/android_emulator.sh status [avd-name]   # report state, no side effects
#   ./scripts/android_emulator.sh list                # list AVDs + available Pixel profiles
#
# Env vars:
#   AVD_NAME       AVD to use (default: Pixel_10_API_36)
#   BOOT_TIMEOUT   Seconds to wait for full boot (default: 180)
#   ANDROID_HOME   SDK root (default: ~/Library/Android/sdk)

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly LOG_DIR="${REPO_ROOT}/build/logs"

# ---------- SDK discovery -------------------------------------------------
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
# cmdline-tools/latest/bin takes priority: the legacy tools/bin avdmanager/sdkmanager
# throw NoClassDefFoundError on modern JDKs (removed javax.xml.bind).
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools/bin"

EMULATOR_BIN="$(command -v emulator || true)"
ADB_BIN="$(command -v adb || true)"
AVDMANAGER_BIN="${ANDROID_HOME}/cmdline-tools/latest/bin/avdmanager"
[[ -x "$AVDMANAGER_BIN" ]] || AVDMANAGER_BIN="$(command -v avdmanager || true)"
SDKMANAGER_BIN="${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager"
[[ -x "$SDKMANAGER_BIN" ]] || SDKMANAGER_BIN="$(command -v sdkmanager || true)"

if [[ -z "$EMULATOR_BIN" || -z "$ADB_BIN" ]]; then
  echo "✗ Android SDK tools not found (emulator/adb)." >&2
  echo "  Install Android Studio, or set ANDROID_HOME to your SDK path." >&2
  echo "  Tried: ${ANDROID_HOME}" >&2
  exit 1
fi

readonly AVD_NAME_DEFAULT="Pixel_10_API_36"
readonly BOOT_TIMEOUT="${BOOT_TIMEOUT:-180}"

readonly DEVICE_PROFILE_CANDIDATES=(pixel_10 pixel_10_pro pixel_9_pro pixel_8_pro pixel_7_pro pixel_6_pro pixel_5 pixel)
readonly SYSTEM_IMAGE_CANDIDATES=(
  "system-images;android-36;google_apis_playstore;arm64-v8a"
  "system-images;android-36;google_apis;arm64-v8a"
  "system-images;android-35;google_apis;arm64-v8a"
  "system-images;android-34;google_apis;arm64-v8a"
  "system-images;android-36;google_apis_playstore;x86_64"
  "system-images;android-35;google_apis;x86_64"
  "system-images;android-34;google_apis;x86_64"
)

usage() {
  sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
}

# ---------- helpers --------------------------------------------------------

avd_exists() {
  "$EMULATOR_BIN" -list-avds 2>/dev/null | grep -qx "$1"
}

pick_device_profile() {
  local listing
  listing="$("$AVDMANAGER_BIN" list device 2>/dev/null || true)"
  local candidate
  for candidate in "${DEVICE_PROFILE_CANDIDATES[@]}"; do
    if grep -q "\"${candidate}\"" <<<"$listing"; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

pick_system_image() {
  local installed
  installed="$("$SDKMANAGER_BIN" --list_installed 2>/dev/null || true)"
  local candidate
  # Prefer an already-installed image (fast path — no download).
  for candidate in "${SYSTEM_IMAGE_CANDIDATES[@]}"; do
    if grep -q "^  ${candidate} " <<<"$installed" || grep -q "${candidate}" <<<"$installed"; then
      echo "$candidate"
      return 0
    fi
  done
  # Nothing installed yet — fall back to the first candidate (will be downloaded).
  echo "${SYSTEM_IMAGE_CANDIDATES[0]}"
}

create_avd_if_missing() {
  local name="$1"
  if avd_exists "$name"; then
    echo "✓ AVD '${name}' already exists — skipping create."
    return 0
  fi
  if [[ -z "$AVDMANAGER_BIN" ]]; then
    echo "✗ avdmanager not found; cannot create AVD '${name}'." >&2
    echo "  Install Android SDK cmdline-tools (Android Studio → SDK Manager → SDK Tools)." >&2
    return 1
  fi

  local device_id image
  device_id="$(pick_device_profile)" || {
    echo "✗ No Pixel device profile found via avdmanager; falling back to 'pixel'." >&2
    device_id="pixel"
  }
  image="$(pick_system_image)"

  echo "▼ Creating AVD '${name}'  (device: ${device_id}, image: ${image})"
  if [[ "$device_id" != pixel_10* ]]; then
    echo "  ↯ Pixel 10 profile unavailable — using closest fallback '${device_id}'." >&2
    echo "    Update the SDK (Android Studio → SDK Manager) to get newer Pixel profiles." >&2
  fi

  if ! grep -q "$image" <<<"$("$SDKMANAGER_BIN" --list_installed 2>/dev/null || true)"; then
    echo "  • system image not installed yet — downloading ${image} (one-time, needs network)…"
    yes | "$SDKMANAGER_BIN" --install "$image" >/dev/null
  fi

  echo "no" | "$AVDMANAGER_BIN" create avd -n "$name" -k "$image" -d "$device_id" --force >/dev/null
  echo "✓ AVD '${name}' created."
}

# Serial of a running emulator instance for a given AVD name, if any (booted or still booting).
running_serial_for_avd() {
  local name="$1" serial state avd
  while read -r serial state; do
    [[ "$serial" == emulator-* ]] || continue
    avd="$("$ADB_BIN" -s "$serial" emu avd name 2>/dev/null | head -n1 | tr -d '\r')"
    if [[ "$avd" == "$name" ]]; then
      echo "$serial"
      return 0
    fi
  done < <("$ADB_BIN" devices 2>/dev/null | tail -n +2 | awk '{print $1, $2}')
  return 1
}

wait_for_boot_completed() {
  local serial="$1" waited=0
  echo "  • waiting for boot_completed on ${serial} (timeout ${BOOT_TIMEOUT}s)…"
  while (( waited < BOOT_TIMEOUT )); do
    if [[ "$("$ADB_BIN" -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r\n')" == "1" ]]; then
      echo "✓ ${serial} fully booted."
      return 0
    fi
    sleep 3
    (( waited += 3 ))
  done
  echo "✗ Timed out waiting for ${serial} to finish booting (>${BOOT_TIMEOUT}s)." >&2
  echo "  Check the log: ${LOG_DIR}/android_emulator.log" >&2
  echo "  Common causes: cold boot on first run can be slow, low disk space," >&2
  echo "  HAXM/HVF acceleration disabled, or system image mismatch (arm64 vs x86_64)." >&2
  return 1
}

boot_avd() {
  local name="$1"
  local existing_serial
  if existing_serial="$(running_serial_for_avd "$name")"; then
    echo "✓ AVD '${name}' already running as ${existing_serial}."
    wait_for_boot_completed "$existing_serial"
    return $?
  fi

  mkdir -p "$LOG_DIR"
  local log_file="${LOG_DIR}/android_emulator.log"
  echo "▼ Booting AVD '${name}' (log: ${log_file})"
  nohup "$EMULATOR_BIN" -avd "$name" -netdelay none -netspeed full -no-snapshot-save \
    >"$log_file" 2>&1 &
  disown $! 2>/dev/null || true

  local waited=0 serial=""
  while (( waited < BOOT_TIMEOUT )); do
    if serial="$(running_serial_for_avd "$name")"; then
      break
    fi
    sleep 2
    (( waited += 2 ))
  done
  if [[ -z "$serial" ]]; then
    echo "✗ Emulator process for '${name}' never showed up in 'adb devices'." >&2
    echo "  Check the log: ${log_file}" >&2
    return 1
  fi
  wait_for_boot_completed "$serial"
}

cmd_status() {
  local name="$1"
  if avd_exists "$name"; then
    echo "AVD:    ${name}  (exists)"
  else
    echo "AVD:    ${name}  (not created yet)"
    return 0
  fi
  local serial
  if serial="$(running_serial_for_avd "$name")"; then
    local boot
    boot="$("$ADB_BIN" -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r\n')"
    if [[ "$boot" == "1" ]]; then
      echo "State:  running (${serial}) — fully booted"
    else
      echo "State:  running (${serial}) — still booting"
    fi
  else
    echo "State:  not running"
  fi
}

cmd_list() {
  echo "Installed AVDs:"
  "$EMULATOR_BIN" -list-avds 2>/dev/null | sed 's/^/  - /'
  echo ""
  echo "Available Pixel device profiles (avdmanager):"
  if [[ -n "$AVDMANAGER_BIN" ]]; then
    "$AVDMANAGER_BIN" list device 2>/dev/null | grep -B1 '^ *OEM *: Google' | grep 'Name:' | sed 's/^ */  - /'
  else
    echo "  (avdmanager not found)"
  fi
}

# ---------- main ------------------------------------------------------------

COMMAND="${1:-boot}"
NAME="${2:-${AVD_NAME:-$AVD_NAME_DEFAULT}}"

case "$COMMAND" in
  boot)
    create_avd_if_missing "$NAME"
    boot_avd "$NAME"
    ;;
  create)
    create_avd_if_missing "$NAME"
    ;;
  status)
    cmd_status "$NAME"
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
