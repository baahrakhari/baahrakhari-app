#!/usr/bin/env bash
#
# play_upload_wizard.sh — interactive Play Console upload wizard.
#
# Walks docs/play-store/UPLOAD_NEW_RELEASE.md as a prompt-driven checklist:
#   AAB path → expected versionName / versionCode → artifact verify →
#   track choice → Console steps + paste-ready notes.
#
# This script NEVER uploads to Google Play (API / Fastlane are not configured).
# It NEVER prints MYAPP_UPLOAD_* passwords from android/gradle.properties.
#
# Usage (from repo root):
#   ./scripts/play_upload_wizard.sh
#   npm run play:wizard
#
# Non-interactive (agents / CI after the human answered the wizard questions):
#   ./scripts/play_upload_wizard.sh --aab PATH --version-name 1.4.0 \
#       --version-code 131 --track internal --no-rebuild
#
#   --questions        print the question list and exit (for agents)
#   --accept-defaults  skip prompts; use gradle.properties + default AAB + internal
#   --verify-only      verify the AAB/APK against expected version, then exit
#   --rebuild          run ./gradlew bundleRelease before verify
#   --no-rebuild       skip the rebuild prompt (default in non-interactive)
#   --help
#
set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly DEFAULT_AAB="${REPO_ROOT}/android/app/build/outputs/bundle/release/app-release.aab"
readonly DEFAULT_APK="${REPO_ROOT}/android/app/build/outputs/apk/release/app-release.apk"
readonly GRADLE_PROPS="${REPO_ROOT}/android/gradle.properties"
readonly NOTES_MD="${REPO_ROOT}/docs/play-store/RELEASE_NOTES.md"
readonly UPLOAD_MD="${REPO_ROOT}/docs/play-store/UPLOAD_NEW_RELEASE.md"
readonly ACCOUNT_MD="${REPO_ROOT}/docs/play-store/PLAY_CONSOLE_ACCOUNT.md"
readonly PACKAGE_ID="com.baahrakhari.media"

AAB_PATH=""
APK_PATH=""
EXPECTED_NAME=""
EXPECTED_CODE=""
TRACK=""
REBUILD=""
VERIFY_ONLY=0
QUESTIONS_ONLY=0
NONINTERACTIVE=0
ACCEPT_DEFAULTS=0

usage() {
  sed -n '2,28p' "$0" | sed 's/^# \?//'
}

gradle_prop() {
  local key="$1"
  [[ -f "$GRADLE_PROPS" ]] || return 0
  grep -E "^${key}=" "$GRADLE_PROPS" | tail -1 | cut -d= -f2- | tr -d '\r'
}

ask() {
  local prompt="$1"
  local default="${2:-}"
  local reply=""
  if [[ -n "$default" ]]; then
    read -r -p "${prompt} [${default}]: " reply || true
  else
    read -r -p "${prompt}: " reply || true
  fi
  if [[ -z "$reply" ]]; then
    printf '%s' "$default"
  else
    printf '%s' "$reply"
  fi
}

confirm() {
  local prompt="$1"
  local default="${2:-n}"
  local reply
  reply="$(ask "$prompt" "$default")"
  case "$(printf '%s' "$reply" | tr '[:upper:]' '[:lower:]')" in
    y|yes) return 0 ;;
    *) return 1 ;;
  esac
}

find_aapt() {
  local sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
  if [[ -z "$sdk" && -d "${HOME}/Library/Android/sdk" ]]; then
    sdk="${HOME}/Library/Android/sdk"
  fi
  if [[ -z "$sdk" || ! -d "${sdk}/build-tools" ]]; then
    return 1
  fi
  ls -1d "${sdk}/build-tools"/*/aapt 2>/dev/null | sort | tail -1
}

sibling_apk() {
  local aab="$1"
  local guess="${aab/\/bundle\/release\/app-release.aab//apk/release/app-release.apk}"
  if [[ -f "$guess" ]]; then
    printf '%s' "$guess"
    return 0
  fi
  if [[ -f "$DEFAULT_APK" ]]; then
    printf '%s' "$DEFAULT_APK"
    return 0
  fi
  return 1
}

print_questions() {
  cat <<'EOF'
Play upload wizard — questions (docs/play-store/UPLOAD_NEW_RELEASE.md)

Ask these, then re-run with flags (or run the script interactively in a terminal):

1. AAB file path
   Default: android/app/build/outputs/bundle/release/app-release.aab
   Flag: --aab PATH

2. Rebuild signed AAB with ./gradlew bundleRelease first? (y/n)
   Default: n
   Flag: --rebuild | --no-rebuild

3. Expected versionName (must match the AAB and Play "new" cut)
   Default: APP_VERSION_NAME from android/gradle.properties
   Flag: --version-name X.Y.Z

4. Expected versionCode (must be strictly greater than any code Play has seen)
   Default: APP_VERSION_CODE from android/gradle.properties
   Flag: --version-code N

5. Release track
   internal  — Internal testing (recommended first upload; save draft)
   production — Production (only after internal verify; prefer Promote)
   Flag: --track internal|production

The wizard verifies the file, signature, package (com.baahrakhari.media),
and version. It does not upload. It never prints signing passwords.
EOF
}

parse_badging() {
  local apk="$1"
  local aapt
  aapt="$(find_aapt)" || {
    echo "WARN: aapt not found (set ANDROID_HOME). Skipping package/version dump." >&2
    return 1
  }
  "$aapt" dump badging "$apk"
}

extract_badging_field() {
  # $1 = dump text, $2 = key: versionCode | versionName | name | targetSdkVersion
  local dump="$1"
  local key="$2"
  case "$key" in
    name)
      printf '%s' "$dump" | sed -n "s/^package: name='\([^']*\)'.*/\1/p" | head -1
      ;;
    versionCode)
      printf '%s' "$dump" | sed -n "s/.*versionCode='\([^']*\)'.*/\1/p" | head -1
      ;;
    versionName)
      printf '%s' "$dump" | sed -n "s/.*versionName='\([^']*\)'.*/\1/p" | head -1
      ;;
    targetSdkVersion)
      printf '%s' "$dump" | sed -n "s/^targetSdkVersion:'\([^']*\)'.*/\1/p" | head -1
      ;;
  esac
}

verify_artifact() {
  local aab="$1"
  local expected_name="$2"
  local expected_code="$3"
  local ok=1

  echo ""
  echo "▼ Verify artifact"
  if [[ ! -f "$aab" ]]; then
    echo "FAIL: AAB not found: $aab"
    return 1
  fi
  echo "  AAB: $aab"
  echo "  size: $(wc -c < "$aab" | tr -d ' ') bytes"

  if ! command -v jarsigner >/dev/null 2>&1; then
    echo "FAIL: jarsigner not on PATH (install a JDK)."
    return 1
  fi
  if jarsigner -verify "$aab" >/dev/null 2>&1; then
    echo "  jarsigner: jar verified"
  else
    echo "FAIL: jarsigner -verify failed (unsigned or wrong signer)."
    echo "      Confirm MYAPP_UPLOAD_* in android/gradle.properties (do not commit)."
    return 1
  fi

  local apk=""
  if apk="$(sibling_apk "$aab")"; then
    APK_PATH="$apk"
    echo "  sibling APK: $apk"
    local dump=""
    if dump="$(parse_badging "$apk")"; then
      local got_pkg got_code got_name got_sdk
      got_pkg="$(extract_badging_field "$dump" name)"
      got_code="$(extract_badging_field "$dump" versionCode)"
      got_name="$(extract_badging_field "$dump" versionName)"
      got_sdk="$(extract_badging_field "$dump" targetSdkVersion)"
      echo "  package:     ${got_pkg:-?}"
      echo "  versionName: ${got_name:-?}"
      echo "  versionCode: ${got_code:-?}"
      echo "  targetSdk:   ${got_sdk:-?}"
      if [[ "$got_pkg" != "$PACKAGE_ID" ]]; then
        echo "FAIL: package is '$got_pkg', expected $PACKAGE_ID"
        ok=0
      fi
      if [[ "$got_name" != "$expected_name" ]]; then
        echo "FAIL: versionName is '$got_name', expected '$expected_name'"
        ok=0
      fi
      if [[ "$got_code" != "$expected_code" ]]; then
        echo "FAIL: versionCode is '$got_code', expected '$expected_code'"
        ok=0
      fi
    else
      echo "WARN: could not dump APK badging. Confirm version in Play after upload."
    fi
  else
    echo "WARN: no sibling APK — cannot dump versionCode from aapt."
    echo "      Build one with: cd android && ./gradlew assembleRelease"
    echo "      Or confirm Play Console shows ${expected_name} / ${expected_code} after upload."
  fi

  [[ "$ok" -eq 1 ]]
}

print_notes_for_version() {
  local ver="$1"
  if [[ ! -f "$NOTES_MD" ]]; then
    echo "(no $NOTES_MD)"
    return 0
  fi
  echo ""
  echo "▼ What's new to paste (from RELEASE_NOTES.md, section ${ver})"
  echo "  Full file: $NOTES_MD"
  # Print from the first heading that contains the version through the next ##
  awk -v ver="$ver" '
    BEGIN { show=0 }
    /^## / {
      if (index($0, ver)) { show=1; print; next }
      if (show) { exit }
    }
    show { print }
  ' "$NOTES_MD"
}

print_console_steps() {
  local track="$1"
  local aab="$2"
  local name="$3"
  local code="$4"

  echo ""
  echo "▼ Play Console steps (this script does not upload)"
  echo "  Click-through: $UPLOAD_MD"
  echo ""
  echo "  1. Sign in → play.google.com/console → Baahrakhari ($PACKAGE_ID)"
  echo "  2. Store settings — only if contact info changed (website https://baahrakhari.com)"
  echo "  3. App content → News and magazine apps — contact URL https://baahrakhari.com/contact"
  echo "     Re-confirm if Contact Us placement changed. Privacy policy URL must be live HTTPS"
  echo "     (use https://baahrakhari.com/page/privacy-policy — /privacy 404s)."
  echo "  4. Data safety: do NOT declare ads (item 9 skipped). No AD_ID permission."
  if [[ "$track" == "production" ]]; then
    echo "  5. Track: Production — prefer Promote from Internal testing so you reuse versionCode ${code}."
    echo "     Do not upload a second AAB with the same versionCode."
  else
    echo "  5. Track: Release → Testing → Internal testing → Create new release (or open existing draft)."
  fi
  echo "  6. Upload AAB:"
  echo "       $aab"
  echo "     Expected warning (ignore): no deobfuscation file (R8 off)."
  echo "  7. Paste What's new (en-US + ne-NP) from the block printed above."
  echo "  8. Confirm Play shows versionName ${name} and versionCode ${code}."
  echo "  9. Save the draft."
  if [[ "$track" == "production" ]]; then
    echo " 10. Only if you intend to go live: Start rollout to Production, then"
    echo "     Publishing overview → Send for review if prompted."
  else
    echo " 10. STOP. Do not Start rollout to Production."
    echo "     Optional: start rollout to internal testers only."
  fi
  echo " 11. Track status under Publishing overview."
  echo ""
  echo "  Never commit android/gradle.properties (signing secrets)."
}

rebuild_aab() {
  echo ""
  echo "▼ Building signed AAB (./gradlew bundleRelease)"
  echo "  Fails if MYAPP_UPLOAD_* is missing — will not fall back to debug signing."
  (cd "${REPO_ROOT}/android" && ./gradlew bundleRelease)
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) usage; exit 0 ;;
    --questions) QUESTIONS_ONLY=1; shift ;;
    --accept-defaults) ACCEPT_DEFAULTS=1; NONINTERACTIVE=1; shift ;;
    --verify-only) VERIFY_ONLY=1; shift ;;
    --aab) AAB_PATH="${2:-}"; NONINTERACTIVE=1; shift 2 ;;
    --apk) APK_PATH="${2:-}"; shift 2 ;;
    --version-name) EXPECTED_NAME="${2:-}"; NONINTERACTIVE=1; shift 2 ;;
    --version-code) EXPECTED_CODE="${2:-}"; NONINTERACTIVE=1; shift 2 ;;
    --track) TRACK="${2:-}"; NONINTERACTIVE=1; shift 2 ;;
    --rebuild) REBUILD=yes; shift ;;
    --no-rebuild) REBUILD=no; shift ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ "$QUESTIONS_ONLY" -eq 1 ]]; then
  print_questions
  exit 0
fi

cd "$REPO_ROOT"

gradle_name="$(gradle_prop APP_VERSION_NAME || true)"
gradle_code="$(gradle_prop APP_VERSION_CODE || true)"
gradle_pkg="$(gradle_prop APP_APPLICATION_ID || true)"

echo "Baahrakhari Play upload wizard"
echo "Source of truth: docs/play-store/UPLOAD_NEW_RELEASE.md"
echo "Package: $PACKAGE_ID"
if [[ -n "$gradle_name" || -n "$gradle_code" ]]; then
  echo "gradle.properties (local): ${gradle_name:-?} / versionCode ${gradle_code:-?}"
fi
if [[ -n "$gradle_pkg" && "$gradle_pkg" != "$PACKAGE_ID" ]]; then
  echo "WARN: APP_APPLICATION_ID=$gradle_pkg (expected $PACKAGE_ID)"
fi
echo ""

if [[ "$NONINTERACTIVE" -eq 0 ]]; then
  AAB_PATH="$(ask "AAB file path" "${AAB_PATH:-$DEFAULT_AAB}")"
  if [[ -z "$REBUILD" ]]; then
    if confirm "Rebuild signed AAB with ./gradlew bundleRelease first?" "n"; then
      REBUILD=yes
    else
      REBUILD=no
    fi
  fi
  EXPECTED_NAME="$(ask "Expected versionName" "${EXPECTED_NAME:-${gradle_name:-1.4.0}}")"
  EXPECTED_CODE="$(ask "Expected versionCode (must be new to Play)" "${EXPECTED_CODE:-${gradle_code:-131}}")"
  echo ""
  echo "Release track:"
  echo "  1) internal   — Internal testing (recommended first upload)"
  echo "  2) production — Production (after internal verify; prefer Promote)"
  track_choice="$(ask "Choose 1 or 2" "1")"
  case "$track_choice" in
    2|production|prod) TRACK=production ;;
    *) TRACK=internal ;;
  esac
else
  AAB_PATH="${AAB_PATH:-$DEFAULT_AAB}"
  EXPECTED_NAME="${EXPECTED_NAME:-${gradle_name:-}}"
  EXPECTED_CODE="${EXPECTED_CODE:-${gradle_code:-}}"
  TRACK="${TRACK:-internal}"
  REBUILD="${REBUILD:-no}"
  if [[ -z "$EXPECTED_NAME" || -z "$EXPECTED_CODE" ]]; then
    echo "FAIL: --version-name and --version-code are required in non-interactive mode" \
      "(or set APP_VERSION_* in android/gradle.properties)." >&2
    exit 2
  fi
fi

case "$TRACK" in
  internal|production) ;;
  *) echo "FAIL: --track must be internal or production (got '$TRACK')" >&2; exit 2 ;;
esac

if [[ "$REBUILD" == "yes" ]]; then
  rebuild_aab
fi

if [[ -n "$APK_PATH" && ! -f "$APK_PATH" ]]; then
  echo "WARN: --apk not found: $APK_PATH"
  APK_PATH=""
fi

if ! verify_artifact "$AAB_PATH" "$EXPECTED_NAME" "$EXPECTED_CODE"; then
  echo ""
  echo "Verification failed. Fix the AAB / version and re-run."
  echo "If Play already consumed this versionCode (even as a draft), bump"
  echo "APP_VERSION_CODE in android/gradle.properties and rebuild."
  exit 1
fi

if [[ "$VERIFY_ONLY" -eq 1 ]]; then
  echo ""
  echo "OK: artifact matches ${EXPECTED_NAME} / ${EXPECTED_CODE} ($PACKAGE_ID)."
  exit 0
fi

print_notes_for_version "$EXPECTED_NAME"
print_console_steps "$TRACK" "$AAB_PATH" "$EXPECTED_NAME" "$EXPECTED_CODE"

echo ""
echo "▼ Play account documentation (already-connected listing)"
echo "  Paste packet: $ACCOUNT_MD"
echo "  This script cannot sign in to Play Console. Open the connected"
echo "  Baahrakhari app and apply Store settings / News / Data safety / notes"
echo "  from that file, then upload the AAB above."

echo "▼ Summary"
echo "  aab:     $AAB_PATH"
echo "  version: ${EXPECTED_NAME} (${EXPECTED_CODE})"
echo "  track:   $TRACK"
echo "  upload:  not performed (Console only)"
echo ""
echo "Wizard finished. Complete the Console steps above, then stop at Save"
if [[ "$TRACK" == "internal" ]]; then
  echo "unless you are only rolling out to internal testers."
else
  echo "unless you are intentionally starting a production rollout."
fi
