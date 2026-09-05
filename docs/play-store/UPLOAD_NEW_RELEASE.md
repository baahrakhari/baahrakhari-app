# Google Play Console — Upload a New Release (Step-by-Step)

Dedicated walkthrough for pushing a new **Baahrakhari** (`com.baahrakhari.media`)
build through Google Play Console. Use this every time you cut a release;
`RELEASE_COMMANDS.md` covers the build commands, `NEWS_POLICY_COMPLIANCE.md`
covers the News & Magazines policy checklist — this doc is the Play Console
click-through itself.

**Wizard (preferred):** run `npm run play:wizard` (or
`./scripts/play_upload_wizard.sh`). It asks for the AAB path, expected
versionName / versionCode, optional rebuild, and track, then verifies the
signed bundle before you click Upload. It does **not** upload. Full notes:
`docs/play-store/PLAY_UPLOAD_WIZARD.md`. After verify, paste the connected
listing fields from `docs/play-store/PLAY_CONSOLE_ACCOUNT.md`.

## Current release snapshot

| | |
|---|---|
| **Version** | `1.4.0` / `versionCode 131` |
| **Package (applicationId)** | `com.baahrakhari.media` |
| **AAB** | `android/app/build/outputs/bundle/release/app-release.aab` (~37 MB) |
| **Absolute AAB path** | `/Users/praak/cursor_12KHARI/baahrakhari-app/android/app/build/outputs/bundle/release/app-release.aab` |
| **APK** (local test only, not for Play) | `android/app/build/outputs/apk/release/app-release.apk` |
| **targetSdk** | `36` |
| **Keystore** | `/Users/praak/AndroidStudioProjects/certs/12khari.jks` (alias `abp`) |
| **Signing values** | `android/gradle.properties` (`MYAPP_UPLOAD_*`, local only — never commit) |
| **Release notes copy** | `docs/play-store/RELEASE_NOTES.md` (section **1.4.0**) |
| **News policy checklist** | `docs/play-store/NEWS_POLICY_COMPLIANCE.md` |
| **Deobfuscation warning context** | `docs/play-store/DEOBFUSCATION_NOTE.md` |
| **Play API / Fastlane** | **Not configured** — Console upload only |
| **Default first track** | **Internal testing** (save draft). Production materials are ready; do **not** start a production rollout until internal verify. |

`versionCode` must strictly increase on **every** Play upload — Play rejects
a re-upload of a versionCode it has already seen on that track (even as a
draft). If in doubt whether the last build was actually submitted, bump the
code again rather than reusing it. Last live Android cut was `1.3.0` /
`versionCode 130`; this AAB is `131`.

---

## 1. Build the signed AAB

From the repo root:

```sh
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

This fails loudly (`GradleException`) if the `MYAPP_UPLOAD_*` signing
properties are missing from `android/gradle.properties` — it will never
silently fall back to debug signing for a release/bundle task.

Sanity-check the artifact before uploading:

```sh
# Confirms the jar signature is valid (expect "jar verified.")
jarsigner -verify android/app/build/outputs/bundle/release/app-release.aab

# Confirms package / versionCode / versionName / targetSdk on the sibling APK
$ANDROID_HOME/build-tools/36.0.0/aapt dump badging \
  android/app/build/outputs/apk/release/app-release.apk | grep -E 'package:|sdkVersion|targetSdkVersion'
```

## 2. Sign in to Play Console

- [play.google.com/console](https://play.google.com/console) → select the
  **Baahrakhari** app (package `com.baahrakhari.media`).

## 3. Update Store settings (only if contact info changed)

Play Console → **Grow → Store presence → Store settings** (or **App content**
depending on console version):

- Website: `https://baahrakhari.com`
- Support email / phone: see canonical values in
  `docs/play-store/NEWS_POLICY_COMPLIANCE.md`

## 4. Confirm the News & Magazines declaration (only if placement changed)

Play Console → **App content → News and magazine apps**:

- Contact URL must be `https://baahrakhari.com/contact`
- Re-confirm only if Contact Us placement in the app changed since the last
  approved submission (see `NEWS_POLICY_COMPLIANCE.md` for what to verify
  in-app first).

## 5. Open the release track

**Recommended first upload:** Play Console → **Release → Testing → Internal
testing**. Use an existing unpublished draft on that track if one is already
open.

**Production upgrade (after internal verify):** Play Console → **Release →
Production**. Prefer **Promote release** from Internal testing so you reuse
`versionCode 131` instead of uploading a second bundle.

- If there's a rejected/blocked release already in the track, open that
  same release to upload the replacement bundle into it.
- Otherwise: **Create new release**.
- Do **not** guess which production track/status is live — if unsure, stay
  on Internal testing and save a draft.

## 6. Upload the AAB

- **App bundles** → **Upload** → select
  `android/app/build/outputs/bundle/release/app-release.aab`.
- Wait for Play to finish processing (green checkmark, no blocking errors).
- **Expected, non-blocking warning:** *"There is no deobfuscation file
  associated with this App Bundle."* — expected because R8/minify is
  currently disabled (`enableProguardInReleaseBuilds = false` in
  `android/app/build.gradle`). Safe to ignore; see
  `docs/play-store/DEOBFUSCATION_NOTE.md` for the full rationale and the
  checklist to follow if minification is ever turned on.

## 7. Add release notes

- **Release details → Release notes** (per-language).
- Copy the **en-US** and **ne-NP** "What's new" text for this version from
  `docs/play-store/RELEASE_NOTES.md`.
- If the version you're shipping doesn't have a section yet, add one to
  `RELEASE_NOTES.md` first (copy the format of the most recent entry) so the
  copy-paste source stays authoritative.

## 8. Review the release summary

- Play Console shows version code/name, target API level, and any
  warnings — confirm `versionCode`/`versionName` match what you expect
  (`131` / `1.4.0` for this release).
- Fix any **blocking** errors before continuing (deobfuscation is the only
  expected warning today).
- Confirm Play did **not** flag ads / Advertising ID. This cut has **no ad
  SDK** (item 9 skipped). Do not declare ads in Data safety.

## 9. Save — stop before production rollout

- **Save** the release (creates/updates a **draft**).
- **Internal testing (default):** Review release → start rollout to
  **internal testers only** if you want them to install from Play; or leave
  it as a saved draft. This is not a production publish.
- **Do not** click **Start rollout to Production** on this first pass unless
  you have already verified the build on Internal testing (or a device APK)
  and you intend to go live.
- When you are ready for production: **Promote** the internal release, or
  open Production → review summary → choose staged % or 100% → **Start
  rollout to Production**.

## 10. Send for review (if prompted)

- If this app/track requires it: **Publishing overview → Send changes for
  review**. Nothing goes live/to reviewers until this step is done.
- Internal-testing uploads to testers you already listed often skip a full
  production review; Production still needs review for a News app.
- If a previous submission was rejected for policy reasons (e.g. the News &
  Magazines Contact Us issue), double-check the in-app changes described in
  `NEWS_POLICY_COMPLIANCE.md` are present in the build you just uploaded
  before sending for review. Confirm **Contact us** is still visible
  (Android footer + bilingual drawer).

## 11. Track status

- **Publishing overview** shows whether changes are *In review*, *Approved*,
  or *Rejected*.
- Review time is typically hours to a couple of days; policy-flagged apps
  (News & Magazines) can take longer.

---

## After a successful production rollout

Annotated tag `v1.4.0` points at `fbd08aa` and is on **origin** (with `main`).
After Play accepts the production release:

- [ ] Git tag/branch already pushed for 1.4.0 — only push again if you cut a
      newer commit/tag
- [ ] Do **not** commit `android/gradle.properties` (signing secrets)
- [ ] `RELEASE_NOTES.md` header already lists `1.4.0` / `131`
- [ ] Note in `NEWS_POLICY_COMPLIANCE.md` if this resolved an open appeal
      case (`3-4690000040664`)

## Rollback

If a bad version is live:

- Play Console → release track → **Halt rollout** (if still rolling out), or
- Create a new release with a higher `versionCode` reverting the offending
  change, and go through this same flow again. Play Console does not
  support re-publishing an old APK/AAB as-is once superseded.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| "You need to use a different version code" | `versionCode` in `android/gradle.properties` was already used on this track (even as a draft/rejected release). Bump `APP_VERSION_CODE` and rebuild. |
| "Version code N has already been used. Try another version code." when moving open/closed testing to Production | You **re-uploaded/created a new release** with a versionCode Play has already seen — instead of using **Promote release** on the existing tested release. Promoting a testing-track release to Production reuses its versionCode with no new upload; only bump `APP_VERSION_CODE` and rebuild when you're uploading a *new* bundle. |
| Upload rejected: "APK/Bundle not signed" or wrong signer | Confirm `MYAPP_UPLOAD_STORE_FILE` points at `/Users/praak/AndroidStudioProjects/certs/12khari.jks`, alias `abp`, and rerun `jarsigner -verify` on the built AAB — signer CN should be `12 Khari` / `O=Baahrakhari`. |
| Deobfuscation file warning blocks upload | It shouldn't — this warning is informational only while minification stays off. If it becomes blocking, see `DEOBFUSCATION_NOTE.md`. |
| App content / News declaration flagged again | Re-check Contact Us is reachable per-platform per `NEWS_POLICY_COMPLIANCE.md` (Android: burger menu **and** home feed footer; iOS: burger menu only) and that phone/email match the website exactly. |
