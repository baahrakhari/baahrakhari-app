#!/usr/bin/env bash
# Capture the 1.4.0 App Store set from an already-booted iPhone simulator.
# simctl has no tap on this Xcode — clicks go through Simulator.app via JXA.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${REPO}/marketing/screenshots/iphone-1284x2778"
UDID="${1:-5C53665C-12A1-45AF-BEBB-9A0F39C3F78F}"
mkdir -p "$OUT"

click_pt() {
  local px="$1" py="$2"
  osascript -l JavaScript -e "
ObjC.import('Cocoa');
function clickAt(x, y) {
  const pt = {x: x, y: y};
  \$.CGEventPost(\$.kCGHIDEventTap, \$.CGEventCreateMouseEvent(null, \$.kCGEventLeftMouseDown, pt, \$.kCGMouseButtonLeft));
  delay(0.04);
  \$.CGEventPost(\$.kCGHIDEventTap, \$.CGEventCreateMouseEvent(null, \$.kCGEventLeftMouseUp, pt, \$.kCGMouseButtonLeft));
}
function map(px, py) {
  const se = Application('System Events');
  let cur = se.processes.byName('Simulator').windows[0].groups[0];
  for (let i = 0; i < 10; i++) {
    const kids = cur.uiElements();
    if (kids.length === 1) cur = kids[0]; else break;
  }
  const pos = cur.position(), siz = cur.size();
  return [pos[0] + px * (siz[0] / 402), pos[1] + py * (siz[1] / 874)];
}
Application('Simulator').activate();
delay(0.2);
const xy = map($px, $py);
clickAt(xy[0], xy[1]);
"
}

shot() {
  local name="$1"
  xcrun simctl io "$UDID" screenshot "${OUT}/${name}.png"
  sips --resampleHeightWidth 2778 1284 "${OUT}/${name}.png" >/dev/null
  echo "  ✓ ${name}.png"
}

"${REPO}/scripts/metro.sh" start
xcrun simctl privacy "$UDID" grant notifications com.baahrakhari >/dev/null 2>&1 || true
xcrun simctl terminate "$UDID" com.baahrakhari >/dev/null 2>&1 || true
xcrun simctl launch "$UDID" com.baahrakhari >/dev/null
echo "waiting for home feed…"
sleep 18

echo "1 home"
shot 01_home

echo "2 drawer"
click_pt 29 60
sleep 2
shot 03_drawer

echo "3 article (ताजा card)"
click_pt 360 400
sleep 1
click_pt 100 500
sleep 3
shot 02_article

echo "save 3 articles"
# save button on swipe reader — right side of meta row
click_pt 365 210
sleep 1
# swipe next (drag via two clicks is weak; tap right edge then save)
click_pt 380 500
sleep 1
click_pt 365 210
sleep 1
click_pt 380 500
sleep 1
click_pt 365 210
sleep 1

echo "4 saved list"
# close reader (X top-left)
click_pt 30 60
sleep 2
click_pt 29 60
sleep 2
# सुरक्षित लेखहरू under theme
click_pt 80 250
sleep 2
shot 04_saved

echo "5 save button highlighted"
# open first saved row
click_pt 200 160
sleep 3
shot 05_save_highlighted

echo "done → $OUT"
ls -la "$OUT"/01_home.png "$OUT"/02_article.png "$OUT"/03_drawer.png "$OUT"/04_saved.png "$OUT"/05_save_highlighted.png
