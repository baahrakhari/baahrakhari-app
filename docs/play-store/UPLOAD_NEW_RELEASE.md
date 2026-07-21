# Google Play Console — Upload a New Release (Step-by-Step)

Dedicated walkthrough for pushing a new **Baahrakhari** (`com.baahrakhari.media`)
build through Google Play Console. Use this every time you cut a release;
`RELEASE_COMMANDS.md` covers the build commands, `NEWS_POLICY_COMPLIANCE.md`
covers the News & Magazines policy checklist — this doc is the Play Console
click-through itself.

## Current release snapshot

| | |
|---|---|
| **Version** | `1.3.0` / `versionCode 130` |
| **Package (applicationId)** | `com.baahrakhari.media` |
| **AAB** | `android/app/build/outputs/bundle/release/app-release.aab` (~37 MB) |
| **APK** (local test only, not for Play) | `android/app/build/outputs/apk/release/app-release.apk` |
| **Keystore** | `/Users/praak/AndroidStudioProjects/certs/12khari.jks` (alias `abp`) |
| **Signing values** | `android/gradle.properties` (`MYAPP_UPLOAD_*`, local only — never commit) |
| **Release notes copy** | `docs/play-store/RELEASE_NOTES.md` (section matching the version above) |
| **News policy checklist** | `docs/play-store/NEWS_POLICY_COMPLIANCE.md` |
| **Deobfuscation warning context** | `docs/play-store/DEOBFUSCATION_NOTE.md` |

`versionCode` must strictly increase on **every** Play upload — Play rejects
a re-upload of a versionCode it has already seen on that track (even as a
draft). If in doubt whether the last build was actually submitted, bump the
code again rather than reusing it.

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

# Confirms the versionCode/versionName baked into the bundle
unzip -p android/app/build/outputs/bundle/release/app-release.aab \
  base/manifest/AndroidManifest.xml | strings | grep -E "^[0-9]+\.[0-9]+\.[0-9]+|^[0-9]{3}\""
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

Play Console → **Release → Production** (or **Testing → Closed/Open testing**
if you're staging first).

- If there's a rejected/blocked release already in the track, open that
  same release to upload the replacement bundle into it.
- Otherwise: **Create new release**.

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
  (`130` / `1.3.0` for this release).
- Fix any **blocking** errors before continuing (deobfuscation is the only
  expected warning today).

## 9. Save and roll out

- **Save** the release.
- Back on the release track page: **Review release** → check the rollout
  summary → **Start rollout to Production** (or the testing track you're
  using).
- For production, choose the rollout percentage (100% unless you're doing a
  staged rollout).

## 10. Send for review (if prompted)

- If this app/track requires it: **Publishing overview → Send changes for
  review**. Nothing goes live/to reviewers until this step is done.
- If a previous submission was rejected for policy reasons (e.g. the News &
  Magazines Contact Us issue), double-check the in-app changes described in
  `NEWS_POLICY_COMPLIANCE.md` are present in the build you just uploaded
  before sending for review.

## 11. Track status

- **Publishing overview** shows whether changes are *In review*, *Approved*,
  or *Rejected*.
- Review time is typically hours to a couple of days; policy-flagged apps
  (News & Magazines) can take longer.

---

## After a successful rollout

- [ ] Tag the release in git: `git tag v1.3.0 && git push origin v1.3.0`
- [ ] Update `docs/play-store/RELEASE_NOTES.md` header table
      (`Current release` row) to point at the version that's now live.
- [ ] Note in `NEWS_POLICY_COMPLIANCE.md` if this resolved an open appeal
      case.

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
