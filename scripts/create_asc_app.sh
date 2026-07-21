#!/usr/bin/env bash
#
# create_asc_app.sh — verify the live Baahrakhari App Store Connect record.
#
# This repo ships a version update to the existing app (bundle com.baahrakhari,
# ASC app 1461739733). Do NOT run fastlane produce — that would register a
# duplicate bundle ID.
#
#   export ASC_KEY_ID=4T2A93HW9T
#   export ASC_ISSUER_ID=9c500f8b-2618-4f29-9688-de355b0b4df7
#   python3 scripts/asc_api.py

set -euo pipefail

exec python3 "$(dirname "$0")/asc_api.py"
