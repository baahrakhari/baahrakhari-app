#!/usr/bin/env bash
#
# capture_store_screenshots.sh — listing shots for App Store + Play Console.
#
# Walks the 1.4.0 UI: home (शीर्ष + ताजा), burger drawer, article, saved,
# dark home. Old header taps (saved / theme in the chrome) are gone.
#
# Outputs:
#   marketing/screenshots/iphone-1284x2778/*.png     App Store 6.7"
#   marketing/screenshots/ipad-2064x2752/*.png       App Store 13" iPad
#   marketing/screenshots/android-phone-1080x1920/*.png   Play phone 9:16
#
# Usage (from repo root):
#   ./scripts/capture_store_screenshots.sh
#   ./scripts/capture_store_screenshots.sh ios
#   ./scripts/capture_store_screenshots.sh android
#
set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly OUT_ROOT="${REPO_ROOT}/marketing/screenshots"
readonly IOS_BUNDLE="com.baahrakhari"
readonly ANDROID_PKG="com.baahrakhari.media"
readonly ANDROID_ACTIVITY="com.baahrakhari.media/com.baahrakhari.mobile.MainActivity"
readonly IOS_UDID_HINT="5C53665C-12A1-45AF-BEBB-9A0F39C3F78F"

TARGET="${1:-all}"

ios_udid() {
  if xcrun simctl list devices | grep -q "${IOS_UDID_HINT}.*Booted"; then
    printf '%s' "$IOS_UDID_HINT"
    return 0
  fi
  if xcrun simctl list devices | grep -q "$IOS_UDID_HINT"; then
    printf '%s' "$IOS_UDID_HINT"
    return 0
  fi
  xcrun simctl list devices available \
    | awk -F '[()]' '/iPhone 17 Pro / && /iOS/ {print $2; exit}'
}

boot_ios() {
  local udid="$1"
  xcrun simctl boot "$udid" >/dev/null 2>&1 || true
  xcrun simctl bootstatus "$udid" -b >/dev/null
  xcrun simctl privacy "$udid" grant notifications "$IOS_BUNDLE" >/dev/null 2>&1 || true
}

ensure_metro() {
  if curl -sf --max-time 2 http://127.0.0.1:8081/status >/dev/null; then
    echo "  • Metro already on :8081"
    return 0
  fi
  echo "  • starting Metro"
  "${REPO_ROOT}/scripts/metro.sh" start
}

resize_png() {
  local src="$1" dst="$2" w="$3" h="$4"
  cp "$src" "$dst"
  sips --resampleHeightWidth "$h" "$w" "$dst" >/dev/null
}

# iPhone 17 Pro logical ~402×874. Taps are in points.
# Burger ≈ (29, 78). First headline ≈ (200, 250). Drawer saved ≈ (90, 290).
# Theme control is right-aligned under the drawer logo ≈ (250, 210).
capture_ios_device() {
  local pretty="$1" udid="$2" out_dir="$3" out_w="$4" out_h="$5"
  local burger_x="${6:-29}" burger_y="${7:-78}"
  local headline_x="${8:-200}" headline_y="${9:-250}"
  local saved_x="${10:-90}" saved_y="${11:-290}"
  local theme_x="${12:-250}" theme_y="${13:-210}"

  mkdir -p "$out_dir"
  echo "▼ iOS ${pretty} → ${out_w}×${out_h}  (${udid})"
  boot_ios "$udid"
  xcrun simctl terminate "$udid" "$IOS_BUNDLE" >/dev/null 2>&1 || true
  if ! xcrun simctl launch "$udid" "$IOS_BUNDLE" >/dev/null; then
    echo "  installing Debug build…"
    (
      cd "$REPO_ROOT"
      xcodebuild -workspace ios/Baahrakhari.xcworkspace -scheme Baahrakhari \
        -configuration Debug \
        -destination "platform=iOS Simulator,id=${udid}" \
        -derivedDataPath "$HOME/Library/Developer/Xcode/DerivedData/Baahrakhari-armsxkegbywkqdbepobuhmtvmzxm" \
        CODE_SIGNING_ALLOWED=NO build
    ) >/tmp/baahrakhari-ios-shot-build.log
    local app
    app="$(find "$HOME/Library/Developer/Xcode/DerivedData/Baahrakhari-armsxkegbywkqdbepobuhmtvmzxm/Build/Products" \
      -path '*/Debug-iphonesimulator/Baahrakhari.app' ! -path '*/Index.noindex/*' | head -1)"
    xcrun simctl install "$udid" "$app"
    xcrun simctl launch "$udid" "$IOS_BUNDLE" >/dev/null
  fi
  # Debug builds wait on Metro; 8s was still on the splash / "Bundling…".
  echo "  • waiting for JS bundle + home feed"
  sleep 22

  local raw="${out_dir}/.raw.png"
  shot() {
    local name="$1"
    xcrun simctl io "$udid" screenshot "$raw" >/dev/null
    resize_png "$raw" "${out_dir}/${name}.png" "$out_w" "$out_h"
    echo "    ✓ ${name}.png"
  }

  shot "01_home"
  xcrun simctl io "$udid" input tap "$headline_x" "$headline_y" >/dev/null 2>&1 || true
  sleep 3
  shot "02_article"
  # Close article (X is usually top-right of the reader chrome).
  xcrun simctl io "$udid" input tap 370 80 >/dev/null 2>&1 || true
  sleep 2
  xcrun simctl io "$udid" input tap "$burger_x" "$burger_y" >/dev/null 2>&1 || true
  sleep 2
  shot "03_drawer"
  xcrun simctl io "$udid" input tap "$saved_x" "$saved_y" >/dev/null 2>&1 || true
  sleep 2
  shot "04_saved"
  xcrun simctl io "$udid" input tap "$burger_x" "$burger_y" >/dev/null 2>&1 || true
  sleep 2
  xcrun simctl io "$udid" input tap "$theme_x" "$theme_y" >/dev/null 2>&1 || true
  sleep 1
  # Close drawer by tapping the dimmed area (right of panel).
  xcrun simctl io "$udid" input tap 360 400 >/dev/null 2>&1 || true
  sleep 2
  shot "05_dark_home"
  rm -f "$raw"
}

capture_ios() {
  ensure_metro
  local udid
  udid="$(ios_udid)"
  [[ -n "$udid" ]] || { echo "✗ no iPhone simulator" >&2; return 1; }
  capture_ios_device "iPhone" "$udid" \
    "${OUT_ROOT}/iphone-1284x2778" 1284 2778 \
    29 78 200 250 90 290 250 210

  local ipad=""
  ipad="$(xcrun simctl list devices available -j | /usr/bin/python3 -c '
import json, sys
data = json.load(sys.stdin)
for _rt, devs in data.get("devices", {}).items():
    for d in devs:
        if "iPad Pro 13-inch" in d.get("name", "") and d.get("isAvailable"):
            print(d["udid"])
            raise SystemExit
')"
  if [[ -n "$ipad" ]]; then
    # iPad points are larger; burger still top-left, headlines further down.
    capture_ios_device "iPad 13" "$ipad" \
      "${OUT_ROOT}/ipad-2064x2752" 2064 2752 \
      40 70 400 320 160 380 420 280
  else
    echo "  ⚠ no 13-inch iPad simulator — skip iPad shots"
  fi
}

android_serial() {
  adb devices | awk '/\tdevice$/{print $1; exit}'
}

boot_android() {
  if [[ -n "$(android_serial)" ]]; then
    echo "  • Android emulator already up"
    return 0
  fi
  echo "  • booting Pixel_10_API_36"
  nohup emulator -avd Pixel_10_API_36 -no-snapshot-load -gpu swiftshader_indirect \
    >/tmp/baahrakhari-emu-shots.log 2>&1 &
  local i=0
  while [[ $i -lt 90 ]]; do
    if [[ -n "$(android_serial)" ]]; then
      adb wait-for-device
      local n=0
      while [[ $n -lt 60 ]]; do
        if [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
          return 0
        fi
        sleep 2
        n=$((n + 1))
      done
    fi
    sleep 2
    i=$((i + 1))
  done
  echo "✗ Android emulator did not boot" >&2
  return 1
}

capture_android() {
  boot_android
  local serial
  serial="$(android_serial)"
  adb -s "$serial" shell pm grant "$ANDROID_PKG" android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
  adb -s "$serial" shell am force-stop "$ANDROID_PKG" >/dev/null 2>&1 || true
  if ! adb -s "$serial" shell pm path "$ANDROID_PKG" >/dev/null 2>&1; then
    echo "  installing release APK"
    adb -s "$serial" install -r \
      "${REPO_ROOT}/android/app/build/outputs/apk/release/app-release.apk"
  fi
  adb -s "$serial" shell am start -n "$ANDROID_ACTIVITY" >/dev/null
  sleep 8

  local out_dir="${OUT_ROOT}/android-phone-1080x1920"
  mkdir -p "$out_dir"
  echo "▼ Android phone → 1080×1920  (${serial})"

  local raw="${out_dir}/.raw.png"
  shot() {
    local name="$1"
    adb -s "$serial" exec-out screencap -p > "$raw"
    resize_png "$raw" "${out_dir}/${name}.png" 1080 1920
    echo "    ✓ ${name}.png"
  }

  # Pixel 10 ~1080×2424. Burger ~80,220. Headline ~540,720. Saved ~200,900. Theme ~700,700.
  shot "01_home"
  adb -s "$serial" shell input tap 540 720
  sleep 3
  shot "02_article"
  adb -s "$serial" shell input tap 1000 180
  sleep 2
  adb -s "$serial" shell input tap 80 220
  sleep 2
  shot "03_drawer"
  adb -s "$serial" shell input tap 220 900
  sleep 2
  shot "04_saved"
  adb -s "$serial" shell input tap 80 220
  sleep 2
  adb -s "$serial" shell input tap 700 700
  sleep 1
  adb -s "$serial" shell input tap 900 800
  sleep 2
  shot "05_dark_home"
  rm -f "$raw"
}

main() {
  mkdir -p "$OUT_ROOT"
  case "$TARGET" in
    ios) capture_ios ;;
    android) capture_android ;;
    all) capture_ios; capture_android ;;
    *) echo "usage: $0 [all|ios|android]" >&2; exit 2 ;;
  esac
  echo ""
  echo "Upload from:"
  echo "  App Store:  ${OUT_ROOT}/iphone-1284x2778/  and  ${OUT_ROOT}/ipad-2064x2752/"
  echo "  Play:       ${OUT_ROOT}/android-phone-1080x1920/"
}

main
