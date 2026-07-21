#!/usr/bin/env bash
#
# capture_app_store_screenshots.sh — produce App Store listing screenshots.
#
# App Store Connect accepts iPhone screenshots at ANY of these exact sizes:
#   • 1284 × 2778 px  (6.7" portrait)  ← default output
#   • 2778 × 1284 px  (6.7" landscape)
#   • 1242 × 2688 px  (6.5" portrait)  ← use --size 6.5
#   • 2688 × 1242 px  (6.5" landscape)
#
# iPad (if app supports iPad): 2064 × 2752 px (13" portrait).
#
# Output:
#   marketing/screenshots/iphone-1284x2778/*.png   (or iphone-1242x2688)
#   marketing/screenshots/ipad-2064x2752/*.png
#
# Requirements:
#   • Metro running (`npm run start`)
#   • App installed on simulator (`npm run ios -- --simulator="iPhone 17 Pro Max"`)
#
# Usage:
#   ./scripts/capture_app_store_screenshots.sh              # iPhone + iPad
#   ./scripts/capture_app_store_screenshots.sh iphone       # iPhone only
#   ./scripts/capture_app_store_screenshots.sh ipad         # iPad only
#   ./scripts/capture_app_store_screenshots.sh iphone --size 6.5

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly OUT_ROOT="${REPO_ROOT}/marketing/screenshots"
readonly BUNDLE_ID="com.baahrakhari"

# Simulators to try (newest first); screenshots are resized to ASC dimensions.
readonly DEVICES_IPHONE=(
  "iPhone 17 Pro Max"
  "iPhone 17 Pro"
  "iPhone 16 Pro Max"
  "iPhone 15 Pro Max"
  "iPhone 14 Plus"
  "iPhone 11 Pro Max"
)
readonly DEVICES_IPAD=(
  "iPad Pro 13-inch (M5)"
  "iPad Pro 13-inch (M4)"
)

readonly SHOTS=(
  "01_feed|6|none"
  "02_article_open|3|tap:200:480"
  "03_pinch_zoomed|3|none"
  "04_saved_list|2|tap:34:84"
  "05_dark_mode|3|tap:380:84"
)

IPHONE_W=1284
IPHONE_H=2778
IPHONE_OUT_DIR="iphone-1284x2778"

parse_args() {
  local target="${1:-all}"
  shift || true
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --size)
        if [[ "${2:-}" == "6.5" ]]; then
          IPHONE_W=1242
          IPHONE_H=2688
          IPHONE_OUT_DIR="iphone-1242x2688"
        else
          echo "usage: --size 6.5  (only alternate iPhone size supported)" >&2
          exit 2
        fi
        shift 2
        ;;
      *)
        echo "unknown option: $1" >&2
        exit 2
        ;;
    esac
  done
  MAIN_TARGET="$target"
}

device_udid_for_name() {
  local name="$1"
  xcrun simctl list devices available -j \
    | /usr/bin/python3 -c '
import json, sys
name = sys.argv[1]
data = json.load(sys.stdin)
for runtime, devs in data["devices"].items():
    for d in devs:
        if d["name"] == name and d.get("isAvailable", True):
            print(d["udid"])
            sys.exit(0)
sys.exit(1)
' "$name" 2>/dev/null || true
}

boot_and_wait() {
  local udid="$1"
  local state
  state="$(xcrun simctl list devices | grep "$udid" | sed -E 's/.*\(([A-Za-z]+)\).*/\1/' | head -n1 || true)"
  if [[ "$state" != "Booted" ]]; then
    echo "  • booting $udid …"
    xcrun simctl boot "$udid" >/dev/null
  fi
  xcrun simctl bootstatus "$udid" -b >/dev/null
}

resize_to_exact() {
  local src="$1"
  local dst="$2"
  local w="$3"
  local h="$4"
  cp "$src" "$dst"
  # Scale to exact ASC dimensions (simulator native size varies by Xcode).
  sips --resampleHeightWidth "$h" "$w" "$dst" >/dev/null
}

verify_png_size() {
  local file="$1"
  local expect_w="$2"
  local expect_h="$3"
  local w h
  w="$(sips -g pixelWidth "$file" 2>/dev/null | awk '/pixelWidth/ {print $2}')"
  h="$(sips -g pixelHeight "$file" 2>/dev/null | awk '/pixelHeight/ {print $2}')"
  if [[ "$w" != "$expect_w" || "$h" != "$expect_h" ]]; then
    echo "    ✗ ${file}: got ${w}×${h}, expected ${expect_w}×${expect_h}" >&2
    return 1
  fi
}

capture_one_device() {
  local pretty_name="$1"
  local udid="$2"
  local out_dir="$3"
  local out_w="$4"
  local out_h="$5"

  mkdir -p "$out_dir"
  echo "▼ ${pretty_name}  → ${out_w}×${out_h}px  (${udid})"
  boot_and_wait "$udid"

  echo "  • launching ${BUNDLE_ID} …"
  xcrun simctl terminate "$udid" "${BUNDLE_ID}" >/dev/null 2>&1 || true
  if ! xcrun simctl launch "$udid" "${BUNDLE_ID}" >/dev/null 2>&1; then
    echo "  ✗ could not launch ${BUNDLE_ID} — install first:" >&2
    echo "      npm run start" >&2
    echo "      npm run ios -- --simulator=\"${pretty_name}\"" >&2
    return 1
  fi
  sleep 5

  local tmp="${out_dir}/.raw.png"
  for entry in "${SHOTS[@]}"; do
    IFS='|' read -r stem wait_s action <<<"$entry"
    if [[ "$action" == tap:* ]]; then
      IFS=':' read -r _ x y <<<"$action"
      xcrun simctl io "$udid" input tap "${x}" "${y}" 2>/dev/null || \
        echo "    ↯ tap skipped on this simulator runtime"
    fi
    sleep "$wait_s"
    xcrun simctl io "$udid" screenshot "$tmp" >/dev/null
    local out="${out_dir}/${stem}.png"
    resize_to_exact "$tmp" "$out" "$out_w" "$out_h"
    verify_png_size "$out" "$out_w" "$out_h"
    echo "    ✓ ${out}  (${out_w}×${out_h})"
  done
  rm -f "$tmp"
}

resolve_first_udid() {
  local name udid=""
  for name in "$@"; do
    udid="$(device_udid_for_name "$name" || true)"
    if [[ -n "$udid" ]]; then
      echo "$name|$udid"
      return 0
    fi
  done
  return 1
}

run_iphone() {
  local pair
  pair="$(resolve_first_udid "${DEVICES_IPHONE[@]}" || true)"
  if [[ -z "$pair" ]]; then
    echo "✗ no iPhone simulator found (tried: ${DEVICES_IPHONE[*]})" >&2
    return 1
  fi
  IFS='|' read -r name udid <<<"$pair"
  capture_one_device "$name" "$udid" "${OUT_ROOT}/${IPHONE_OUT_DIR}" "$IPHONE_W" "$IPHONE_H"
}

run_ipad() {
  local pair
  pair="$(resolve_first_udid "${DEVICES_IPAD[@]}" || true)"
  if [[ -z "$pair" ]]; then
    echo "✗ no iPad simulator found (tried: ${DEVICES_IPAD[*]})" >&2
    return 1
  fi
  IFS='|' read -r name udid <<<"$pair"
  capture_one_device "$name" "$udid" "${OUT_ROOT}/ipad-2064x2752" 2064 2752
}

main() {
  local MAIN_TARGET="all"
  parse_args "$@"
  mkdir -p "$OUT_ROOT"
  case "$MAIN_TARGET" in
    iphone) run_iphone ;;
    ipad)   run_ipad ;;
    all)    run_iphone; run_ipad ;;
    *) echo "usage: $0 [iphone|ipad|all] [--size 6.5]" >&2; exit 2 ;;
  esac
  echo ""
  echo "Done. Upload from:"
  echo "  ${OUT_ROOT}/${IPHONE_OUT_DIR}/"
  echo "  ${OUT_ROOT}/ipad-2064x2752/  (if captured)"
  echo ""
  echo "Accepted iPhone sizes on App Store Connect:"
  echo "  1284×2778  2778×1284  1242×2688  2688×1242"
  echo "This script outputs portrait ${IPHONE_W}×${IPHONE_H} by default."
}

main "$@"
