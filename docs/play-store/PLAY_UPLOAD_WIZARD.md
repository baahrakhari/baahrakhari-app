# Play upload wizard

Interactive checklist that walks
[`UPLOAD_NEW_RELEASE.md`](UPLOAD_NEW_RELEASE.md) without uploading anything.

Play API / Fastlane is **not** configured. The wizard verifies the signed AAB
and prints the Console steps + What's new copy. A human still clicks Upload
in Play Console.

## Run it

From the repo root (a real terminal — it asks questions):

```sh
npm run play:wizard
# or accept all defaults (1.4.0 / 131 / default AAB / internal):
npm run play:wizard:defaults
# or
./scripts/play_upload_wizard.sh
```

After verify it prints Console steps and points at
[`PLAY_CONSOLE_ACCOUNT.md`](PLAY_CONSOLE_ACCOUNT.md) — the values to paste
into the **already-connected** Baahrakhari Play listing. The wizard does
not sign in to Play.

### What it asks

1. **AAB file path** — default
   `android/app/build/outputs/bundle/release/app-release.aab`
2. **Rebuild?** — `./gradlew bundleRelease` first (`n` by default)
3. **Expected versionName** — default `APP_VERSION_NAME` in local
   `android/gradle.properties`
4. **Expected versionCode** — default `APP_VERSION_CODE` (must be new to Play)
5. **Track** — `internal` (recommended) or `production` (after internal verify)

It never prints `MYAPP_UPLOAD_*` passwords. Never commit
`android/gradle.properties`.

### What it verifies

- AAB exists
- `jarsigner -verify` (jar verified)
- Sibling APK `aapt dump badging` when present:
  package `com.baahrakhari.media`, versionName, versionCode
- Mismatch → exit 1 (do not upload that file)

### After it succeeds

Follow the printed Console steps (same order as `UPLOAD_NEW_RELEASE.md`):
sign in → News declaration / Data safety → open the track → **Upload** the
printed AAB path → paste What's new → confirm version → **Save**.

Default track is Internal testing. Do **not** start a production rollout on
the first pass.

## Agent / non-interactive

Agents should **ask the same five questions**, then run:

```sh
./scripts/play_upload_wizard.sh --questions   # print the question list

./scripts/play_upload_wizard.sh \
  --aab /absolute/path/to/app-release.aab \
  --version-name 1.4.0 \
  --version-code 131 \
  --track internal \
  --no-rebuild
```

`--verify-only` stops after the artifact check.

Project skill: `.cursor/skills/play-upload-wizard/SKILL.md`.

## Related

- [`UPLOAD_NEW_RELEASE.md`](UPLOAD_NEW_RELEASE.md) — Console click-through
- [`RELEASE_NOTES.md`](RELEASE_NOTES.md) — What's new copy
- [`NEWS_POLICY_COMPLIANCE.md`](NEWS_POLICY_COMPLIANCE.md) — Contact Us / News
