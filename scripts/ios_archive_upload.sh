#!/usr/bin/env bash
#
# ios_archive_upload.sh — build an App-Store-ready .ipa for Baahrakhari and
# upload it to App Store Connect.
#
# This script does the four "boring" mechanical steps that humans get wrong
# when archiving by hand:
#
#   1. `pod install` (idempotent — only re-installs if needed).
#   2. `xcodebuild archive` against the shared scheme, signing automatically
#      with the team you've configured in Xcode.
#   3. `xcodebuild -exportArchive` with `-exportOptionsPlist` set to
#      `method=app-store-connect`, producing a notarised, App-Store-shaped
#      .ipa.
#   4. `xcrun altool --upload-app` to push the .ipa into App Store Connect
#      using an API key (Issuer ID + Key ID + AuthKey_*.p8), which is the
#      modern replacement for app-specific passwords and works in CI.
#
# Required environment variables:
#   ASC_KEY_ID      — App Store Connect API Key ID (e.g. ABC1234567)
#   ASC_ISSUER_ID   — App Store Connect Issuer ID (UUID format)
#   ASC_TEAM_ID     — Apple Developer Team ID for signing (e.g. 1A2B3C4D5E)
#                     If unset, `xcodebuild` uses the team chosen in Xcode.
#
# Optional environment variables:
#   BUILD_DIR       — defaults to ./build/ios
#   SKIP_UPLOAD=1   — archive + export but stop short of altool upload
#   VERBOSE=1       — show every xcodebuild line; otherwise only the summary
#
# Usage:
#   export ASC_KEY_ID=ABC1234567
#   export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
#   ./scripts/ios_archive_upload.sh

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly IOS_DIR="${REPO_ROOT}/ios"
readonly WORKSPACE="${IOS_DIR}/Baahrakhari.xcworkspace"
readonly SCHEME="Baahrakhari"
readonly CONFIGURATION="Release"
readonly BUNDLE_ID="com.baahrakhari"
readonly BUILD_DIR="${BUILD_DIR:-${REPO_ROOT}/build/ios}"
readonly ARCHIVE_PATH="${BUILD_DIR}/Baahrakhari.xcarchive"
readonly EXPORT_DIR="${BUILD_DIR}/export"
IPA_PATH="${EXPORT_DIR}/${SCHEME}.ipa"

# ---------- preflight ----------------------------------------------------
[[ -d "$WORKSPACE" ]] || {
  echo "✗ workspace not found at $WORKSPACE — run \`bundle exec pod install\` once." >&2
  exit 1
}
command -v xcodebuild >/dev/null || {
  echo "✗ xcodebuild not on PATH; install Xcode command-line tools." >&2; exit 1
}
command -v xcrun >/dev/null || { echo "✗ xcrun missing." >&2; exit 1; }

if [[ -z "${SKIP_UPLOAD:-}" ]]; then
  : "${ASC_KEY_ID:?must set ASC_KEY_ID — see App Store Connect → Users & Access → Keys}"
  : "${ASC_ISSUER_ID:?must set ASC_ISSUER_ID — see App Store Connect → Users & Access → Keys}"
fi

mkdir -p "$BUILD_DIR" "$EXPORT_DIR"

# ---------- 1. pods (idempotent) ----------------------------------------
echo "▼ 1/4  CocoaPods install (if needed)"
if [[ ! -f "${IOS_DIR}/Podfile.lock" ]] \
   || [[ "${IOS_DIR}/Podfile" -nt "${IOS_DIR}/Podfile.lock" ]]; then
  (cd "$IOS_DIR" && bundle exec pod install)
else
  echo "  • Podfile.lock up to date, skipping."
fi

# ---------- 2. archive --------------------------------------------------
echo "▼ 2/4  xcodebuild archive  → ${ARCHIVE_PATH}"
rm -rf "$ARCHIVE_PATH"
ARCHIVE_ARGS=(
  -workspace "$WORKSPACE"
  -scheme "$SCHEME"
  -configuration "$CONFIGURATION"
  -destination 'generic/platform=iOS'
  -archivePath "$ARCHIVE_PATH"
  -allowProvisioningUpdates
  archive
  CODE_SIGN_STYLE=Automatic
)
[[ -n "${ASC_TEAM_ID:-}" ]] && ARCHIVE_ARGS+=(DEVELOPMENT_TEAM="$ASC_TEAM_ID")

if [[ -n "${VERBOSE:-}" ]]; then
  xcodebuild "${ARCHIVE_ARGS[@]}"
else
  xcodebuild "${ARCHIVE_ARGS[@]}" | xcbeautify 2>/dev/null || xcodebuild "${ARCHIVE_ARGS[@]}" >/dev/null
fi

# ---------- 3. export ---------------------------------------------------
echo "▼ 3/4  xcodebuild -exportArchive  → ${IPA_PATH}"
EXPORT_PLIST="${BUILD_DIR}/ExportOptions.plist"
cat >"$EXPORT_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>            <string>app-store-connect</string>
  <key>destination</key>       <string>export</string>
  <key>signingStyle</key>      <string>automatic</string>
  <key>uploadBitcode</key>     <false/>
  <key>uploadSymbols</key>     <true/>
  <key>compileBitcode</key>    <false/>
  <key>stripSwiftSymbols</key> <true/>
</dict>
</plist>
PLIST

xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_PLIST" \
  -allowProvisioningUpdates \
  >/dev/null

[[ -f "$IPA_PATH" ]] || {
  # exportArchive names the ipa after the product (Baahrakhari.ipa), not the scheme.
  IPA_PATH="$(find "$EXPORT_DIR" -maxdepth 1 -name '*.ipa' | head -n1)"
}
echo "  • ipa: ${IPA_PATH}"

# ---------- 4. upload ---------------------------------------------------
if [[ -n "${SKIP_UPLOAD:-}" ]]; then
  echo "▼ 4/4  upload skipped (SKIP_UPLOAD=1)"
  echo ""
  echo "Done. Inspect the .ipa with:"
  echo "  unzip -l \"$IPA_PATH\""
  exit 0
fi

# Locate the .p8 key in any of the standard locations
KEY_BASENAME="AuthKey_${ASC_KEY_ID}.p8"
KEY_CANDIDATES=(
  "$HOME/.appstoreconnect/private_keys/$KEY_BASENAME"
  "$HOME/.private_keys/$KEY_BASENAME"
  "$HOME/private_keys/$KEY_BASENAME"
  "./private_keys/$KEY_BASENAME"
)
KEY_PATH=""
for cand in "${KEY_CANDIDATES[@]}"; do
  if [[ -f "$cand" ]]; then KEY_PATH="$cand"; break; fi
done
if [[ -z "$KEY_PATH" ]]; then
  echo "✗ couldn't find $KEY_BASENAME in any of:" >&2
  printf '  %s\n' "${KEY_CANDIDATES[@]}" >&2
  echo "  Download the .p8 from App Store Connect → Users & Access → Keys and place it in one of those paths." >&2
  exit 1
fi

# altool reads the key directory by convention — we set it explicitly to avoid surprises.
KEY_DIR="$(dirname "$KEY_PATH")"

echo "▼ 4/4  xcrun altool --upload-app  → App Store Connect"
xcrun altool --upload-app \
  --type ios \
  --file "$IPA_PATH" \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID" \
  --apiKeyPath "$KEY_DIR"

echo ""
echo "✓ Upload submitted. Watch processing at:"
echo "    https://appstoreconnect.apple.com/apps/<your-app-id>/testflight/ios"
