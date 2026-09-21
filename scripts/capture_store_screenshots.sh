#!/usr/bin/env bash
#
# capture_store_screenshots.sh — listing shots for App Store + Play Console.
#
# Walks the 1.5.0 UI: home (शीर्ष + ताजा), article, burger (theme at floor),
# saved, dark home. Install iOS by UDID / simctl install booted (avoids the
# two "iPhone 17 Pro" name clash: iOS 26.4 vs 26.5).
#
# Outputs:
#   marketing/screenshots/iphone-1284x2778/*.png     App Store 6.7"
#   marketing/screenshots/ipad-2064x2752/*.png       App Store 13" iPad
#   marketing/screenshots/android-phone-1080x1920/*.png   Play phone 9:16
#   marketing/screenshots/android-tablet-1600x2560/*.png  Play tablet
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
# Prefer the iOS 26.5 twin (last session). 26.4 is DDEC5A14-…
readonly IOS_UDID_HINT="5C53665C-12A1-45AF-BEBB-9A0F39C3F78F"
readonly DERIVED_DATA="${HOME}/Library/Developer/Xcode/DerivedData/Baahrakhari-armsxkegbywkqdbepobuhmtvmzxm"

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
  xcrun simctl list devices available -j | /usr/bin/python3 -c '
import json, sys
data = json.load(sys.stdin)
prefer = []
other = []
for _rt, devs in data.get("devices", {}).items():
    for d in devs:
        if not d.get("isAvailable"):
            continue
        name = d.get("name", "")
        if "iPhone 17 Pro" in name:
            prefer.append(d["udid"])
        elif "iPhone" in name and not other:
            other.append(d["udid"])
print((prefer or other or [""])[0])
'
}

boot_ios() {
  local udid="$1"
  open -a Simulator >/dev/null 2>&1 || true
  xcrun simctl boot "$udid" >/dev/null 2>&1 || true
  xcrun simctl bootstatus "$udid" -b >/dev/null
  # Grant so the first-launch permission sheet does not cover listing shots.
  xcrun simctl privacy "$udid" grant notifications "$IOS_BUNDLE" >/dev/null 2>&1 || true
}

# iOS 26+ dropped `simctl io input tap`. Click through Simulator.app (JXA)
# using device points mapped onto the live window. WINDOW_HINT matches the
# Simulator window title ("iPhone" / "iPad").
click_sim_pt() {
  local px="$1" py="$2" logic_w="$3" logic_h="$4" window_hint="${5:-iPhone}"
  osascript -l JavaScript -e "
ObjC.import('Cocoa');
function clickAt(x, y) {
  const pt = {x: x, y: y};
  \$.CGEventPost(\$.kCGHIDEventTap, \$.CGEventCreateMouseEvent(null, \$.kCGEventLeftMouseDown, pt, \$.kCGMouseButtonLeft));
  delay(0.05);
  \$.CGEventPost(\$.kCGHIDEventTap, \$.CGEventCreateMouseEvent(null, \$.kCGEventLeftMouseUp, pt, \$.kCGMouseButtonLeft));
}
function map(px, py, lw, lh, hint) {
  const se = Application('System Events');
  const proc = se.processes.byName('Simulator');
  const wins = proc.windows();
  let win = wins[0];
  for (let i = 0; i < wins.length; i++) {
    try {
      if (hint && String(wins[i].name()).indexOf(hint) >= 0) { win = wins[i]; break; }
    } catch (e) {}
  }
  let cur = win.groups[0];
  for (let i = 0; i < 12; i++) {
    const kids = cur.uiElements();
    if (kids.length === 1) cur = kids[0]; else break;
  }
  const pos = cur.position(), siz = cur.size();
  return [pos[0] + px * (siz[0] / lw), pos[1] + py * (siz[1] / lh)];
}
Application('Simulator').activate();
delay(0.25);
const xy = map(${px}, ${py}, ${logic_w}, ${logic_h}, '${window_hint}');
clickAt(xy[0], xy[1]);
"
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

find_ios_app() {
  find "$DERIVED_DATA/Build/Products" \
    -path '*/Debug-iphonesimulator/Baahrakhari.app' ! -path '*/Index.noindex/*' \
    2>/dev/null | head -1
}

install_ios_udid() {
  local udid="$1"
  local app
  app="$(find_ios_app)"
  if [[ -z "$app" || ! -d "$app" ]]; then
    echo "  building Debug for ${udid}…"
    (
      cd "$REPO_ROOT"
      xcodebuild -workspace ios/Baahrakhari.xcworkspace -scheme Baahrakhari \
        -configuration Debug \
        -destination "platform=iOS Simulator,id=${udid}" \
        -derivedDataPath "$DERIVED_DATA" \
        CODE_SIGNING_ALLOWED=NO build
    ) >/tmp/baahrakhari-ios-shot-build.log
    app="$(find_ios_app)"
  fi
  [[ -n "$app" && -d "$app" ]] || { echo "✗ Baahrakhari.app not found" >&2; return 1; }
  echo "  simctl install ${udid}"
  xcrun simctl install "$udid" "$app"
  # Grant after install so the permission sheet does not cover listing shots.
  xcrun simctl privacy "$udid" grant notifications "$IOS_BUNDLE" >/dev/null 2>&1 || true
}

# iPhone 17 Pro logical ~402×874. Taps are in points.
# Burger ≈ (29, 78). First headline ≈ (200, 250).
# Saved is under the drawer logo (theme moved to the floor) ≈ (90, 200).
# Theme is pinned to the drawer floor ≈ (200, 820).
capture_ios_device() {
  local pretty="$1" udid="$2" out_dir="$3" out_w="$4" out_h="$5"
  local burger_x="${6:-29}" burger_y="${7:-62}"
  local headline_x="${8:-200}" headline_y="${9:-250}"
  local saved_x="${10:-90}" saved_y="${11:-200}"
  local theme_x="${12:-200}" theme_y="${13:-820}"
  local overlay_x="${14:-360}" overlay_y="${15:-400}"
  local logic_w="${16:-402}" logic_h="${17:-874}"
  local window_hint="${18:-iPhone}"
  local close_x="${19:-32}" close_y="${20:-78}"

  mkdir -p "$out_dir"
  echo "▼ iOS ${pretty} → ${out_w}×${out_h}  (${udid})"
  boot_ios "$udid"
  xcrun simctl terminate "$udid" "$IOS_BUNDLE" >/dev/null 2>&1 || true
  install_ios_udid "$udid"
  xcrun simctl terminate "$udid" com.apple.mobilesafari >/dev/null 2>&1 || true
  xcrun simctl launch "$udid" "$IOS_BUNDLE" >/dev/null
  echo "  • waiting for JS bundle + home feed"
  tap() { click_sim_pt "$1" "$2" "$logic_w" "$logic_h" "$window_hint" || true; }
  sleep 18
  if [[ "$window_hint" == "iPad" ]]; then
    # Don't Allow on the notifications sheet (center-left of the alert).
    tap 430 660
    sleep 1
  fi

  local raw="${out_dir}/.raw.png"
  shot() {
    local name="$1"
    xcrun simctl io "$udid" screenshot "$raw" >/dev/null
    resize_png "$raw" "${out_dir}/${name}.png" "$out_w" "$out_h"
    echo "    ✓ ${name}.png"
  }

  shot "01_home"
  # Open the drawer from home (do not open an article first — the modal X is
  # easy to miss and leaves 03–05 stuck on the reader).
  tap "$burger_x" "$burger_y"
  sleep 2
  shot "03_drawer"
  tap "$saved_x" "$saved_y"
  sleep 2
  shot "04_saved"
  tap "$burger_x" "$burger_y"
  sleep 2
  tap "$theme_x" "$theme_y"
  sleep 1
  tap "$overlay_x" "$overlay_y"
  sleep 2
  shot "05_dark_home"
  tap "$headline_x" "$headline_y"
  sleep 3
  shot "02_article"
  rm -f "$raw"
}

capture_ios() {
  ensure_metro
  local udid
  udid="$(ios_udid)"
  [[ -n "$udid" ]] || { echo "✗ no iPhone simulator" >&2; return 1; }
  capture_ios_device "iPhone" "$udid" \
    "${OUT_ROOT}/iphone-1284x2778" 1284 2778 \
    36 105 200 250 110 168 200 830 360 400 \
    402 874 iPhone 32 78
  rm -f "${OUT_ROOT}/iphone-1284x2778/03_category.png" \
        "${OUT_ROOT}/iphone-1284x2778/.raw.png"
  xcrun simctl shutdown "$udid" >/dev/null 2>&1 || true

  local ipad=""
  ipad="$(xcrun simctl list devices available -j | /usr/bin/python3 -c '
import json, sys
data = json.load(sys.stdin)
best = None
for rt, devs in data.get("devices", {}).items():
    for d in devs:
        if "iPad Pro 13-inch" in d.get("name", "") and d.get("isAvailable"):
            if best is None or rt > best[0]:
                best = (rt, d["udid"])
if best:
    print(best[1])
')"
  if [[ -n "$ipad" ]]; then
    # iPad Pro 13" ~1032×1376 pt. Burger top-left; theme at drawer floor.
    capture_ios_device "iPad 13" "$ipad" \
      "${OUT_ROOT}/ipad-2064x2752" 2064 2752 \
      48 62 400 320 160 240 280 1280 900 700 \
      1032 1376 iPad 48 62
    rm -f "${OUT_ROOT}/ipad-2064x2752/01_feed.png" \
          "${OUT_ROOT}/ipad-2064x2752/03_category.png" \
          "${OUT_ROOT}/ipad-2064x2752/05_dark_mode.png" \
          "${OUT_ROOT}/ipad-2064x2752/.raw.png"
  else
    echo "  ⚠ no 13-inch iPad simulator — skip iPad shots"
  fi
}

android_serial() {
  adb devices | awk '/\tdevice$/{print $1; exit}'
}

pick_android_avd() {
  local avds
  avds="$(emulator -list-avds 2>/dev/null || true)"
  # Prefer a tablet for the tablet pass; phone pass prefers a stable phone.
  local want="${1:-phone}"
  if [[ "$want" == "tablet" ]]; then
    printf '%s\n' "$avds" | grep -Ei 'Tablet|Pixel_C|Pixel_Tablet' | head -1
    return 0
  fi
  # Pixel_10_API_36 ANR'd last session — try a calmer phone first.
  local name
  for name in Pixel_9_API_36 Pixel_8_API_36 Pixel_7_API_34 Medium_Phone_API_36 \
              Pixel_6_API_34 Pixel_10_API_36; do
    if printf '%s\n' "$avds" | grep -qx "$name"; then
      printf '%s' "$name"
      return 0
    fi
  done
  printf '%s\n' "$avds" | grep -Ei 'Pixel|Phone' | grep -vi Tablet | head -1
}

boot_android_avd() {
  local avd="$1"
  shift || true
  if [[ -n "$(android_serial)" ]]; then
    echo "  • Android emulator already up"
    return 0
  fi
  [[ -n "$avd" ]] || { echo "✗ no AVD" >&2; return 1; }
  echo "  • booting ${avd} $*"
  nohup emulator -avd "$avd" -no-snapshot-load -no-boot-anim -gpu swiftshader_indirect \
    "$@" >/tmp/baahrakhari-emu-shots.log 2>&1 &
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

install_android() {
  local serial="$1"
  adb -s "$serial" shell pm grant "$ANDROID_PKG" android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
  adb -s "$serial" shell am force-stop "$ANDROID_PKG" >/dev/null 2>&1 || true
  local apk="${REPO_ROOT}/android/app/build/outputs/apk/release/app-release.apk"
  local debug_apk="${REPO_ROOT}/android/app/build/outputs/apk/debug/app-debug.apk"
  if [[ -f "$apk" ]]; then
    echo "  installing release APK"
    adb -s "$serial" install -r "$apk"
  elif [[ -f "$debug_apk" ]]; then
    echo "  installing debug APK"
    adb -s "$serial" install -r "$debug_apk"
  else
    echo "  no APK on disk — launching if already installed"
  fi
}

capture_android_device() {
  local pretty="$1" out_dir="$2" out_w="$3" out_h="$4"
  local burger_x="${5:-80}" burger_y="${6:-220}"
  local headline_x="${7:-540}" headline_y="${8:-720}"
  local saved_x="${9:-220}" saved_y="${10:-700}"
  local theme_x="${11:-400}" theme_y="${12:-2200}"
  local overlay_x="${13:-900}" overlay_y="${14:-800}"
  local article_x="${15:-1000}" article_y="${16:-180}"

  local serial
  serial="$(android_serial)"
  [[ -n "$serial" ]] || { echo "✗ no Android device" >&2; return 1; }
  install_android "$serial"
  adb -s "$serial" shell settings put global window_animation_scale 0 >/dev/null 2>&1 || true
  adb -s "$serial" shell settings put global transition_animation_scale 0 >/dev/null 2>&1 || true
  adb -s "$serial" shell settings put global animator_duration_scale 0 >/dev/null 2>&1 || true
  adb -s "$serial" shell am start -n "$ANDROID_ACTIVITY" >/dev/null
  sleep 24
  # Pixel_10 often ANRs System UI — "Wait" is the lower option on the dialog.
  local i
  for i in 1 2 3 4 5; do
    adb -s "$serial" shell input tap 540 1450 2>/dev/null || true
    adb -s "$serial" shell input tap 700 1480 2>/dev/null || true
    sleep 2
  done
  sleep 2

  mkdir -p "$out_dir"
  echo "▼ Android ${pretty} → ${out_w}×${out_h}  (${serial})"

  local raw="${out_dir}/.raw.png"
  shot() {
    local name="$1"
    adb -s "$serial" exec-out screencap -p > "$raw"
    resize_png "$raw" "${out_dir}/${name}.png" "$out_w" "$out_h"
    echo "    ✓ ${name}.png"
  }

  shot "01_home"
  adb -s "$serial" shell input tap "$headline_x" "$headline_y"
  sleep 3
  shot "02_article"
  adb -s "$serial" shell input tap "$article_x" "$article_y"
  sleep 2
  adb -s "$serial" shell input tap "$burger_x" "$burger_y"
  sleep 2
  shot "03_drawer"
  adb -s "$serial" shell input tap "$saved_x" "$saved_y"
  sleep 2
  shot "04_saved"
  adb -s "$serial" shell input tap "$burger_x" "$burger_y"
  sleep 2
  adb -s "$serial" shell input tap "$theme_x" "$theme_y"
  sleep 1
  adb -s "$serial" shell input tap "$overlay_x" "$overlay_y"
  sleep 2
  shot "05_dark_home"
  rm -f "$raw"
}

capture_android() {
  local phone_avd tablet_avd
  phone_avd="$(pick_android_avd phone || true)"
  boot_android_avd "$phone_avd" || true
  if [[ -n "$(android_serial)" ]]; then
    # Pixel-class ~1080×2340+. Theme at drawer floor; saved under logo.
    capture_android_device "phone" \
      "${OUT_ROOT}/android-phone-1080x1920" 1080 1920 \
      80 220 540 720 220 700 400 2200 900 800 1000 180
  else
    echo "  ⚠ no Android phone emulator — skip phone shots"
  fi

  tablet_avd="$(pick_android_avd tablet || true)"
  adb emu kill >/dev/null 2>&1 || true
  local wait_kill=0
  while [[ $wait_kill -lt 20 && -n "$(android_serial)" ]]; do
    sleep 2
    wait_kill=$((wait_kill + 1))
  done
  if [[ -n "$tablet_avd" ]]; then
    boot_android_avd "$tablet_avd" || true
  elif [[ -n "$phone_avd" ]]; then
    echo "  • no tablet AVD — booting ${phone_avd} with 1600×2560 skin"
    boot_android_avd "$phone_avd" -skin 1600x2560 || true
  fi
  if [[ -n "$(android_serial)" ]]; then
    capture_android_device "tablet" \
      "${OUT_ROOT}/android-tablet-1600x2560" 1600 2560 \
      80 180 800 900 280 560 500 2300 1400 900 1500 160
  else
    echo "  ⚠ Android tablet session did not boot — skip tablet shots"
  fi
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
  echo "  Play:       ${OUT_ROOT}/android-phone-1080x1920/  and  ${OUT_ROOT}/android-tablet-1600x2560/"
  echo "Do not upload .raw.png files."
}

main
