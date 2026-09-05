# Baahrakhari Release Commands

Run all commands from the repository root unless noted.

**iOS App Store 1.4.0:** `docs/app-store/IOS_RELEASE_CHECKLIST.md`.

**Google Play upload:** see `docs/play-store/NEWS_POLICY_COMPLIANCE.md` and
`docs/play-store/RELEASE_NOTES.md`.

**Local emulator/simulator testing** (day-to-day dev, not release builds):
see `docs/LOCAL_TESTING.md` — `npm run dev:android` / `npm run dev:ios`.

---

## 1) Preflight checks

```sh
npm ci
npm run typecheck
```

`npm run verify` (lint + tests) is recommended; known issues may exist in lint/tests
without blocking native release builds.

---

## 2) Android release (Google Play)

### Version (current target)

Set in `android/gradle.properties`:

```properties
APP_APPLICATION_ID=com.baahrakhari.media
APP_VERSION_CODE=131
APP_VERSION_NAME=1.4.0
MYAPP_UPLOAD_STORE_FILE=/path/to/12khari.jks
MYAPP_UPLOAD_KEY_ALIAS=abp
MYAPP_UPLOAD_STORE_PASSWORD=***
MYAPP_UPLOAD_KEY_PASSWORD=***
```

`APP_VERSION_CODE` must increase for **every** Play upload.

Legacy Play listing package: `com.baahrakhari.media`  
Keystore: legacy `12khari.jks` (alias `abp`).

### Build AAB (Play Store upload)

```sh
cd android && ./gradlew bundleRelease
```

Output:

`android/app/build/outputs/bundle/release/app-release.aab`

If `clean` or native rebuild fails (CMake/fbjni cache):

```sh
rm -rf android/app/.cxx android/app/build android/build
cd android && ./gradlew bundleRelease
```

### Build APK (quick device test)

```sh
cd android && ./gradlew assembleRelease
```

Output:

`android/app/build/outputs/apk/release/app-release.apk`

---

## 3) Android smoke test before upload

- [ ] Feed loads and refreshes (pull-to-refresh, home button)
- [ ] Swipe between articles; **share icon** stays clean (no hero image bleed)
- [ ] Burger menu **Contact Us** entry and home feed footer **Contact Us** link work (footer link is Android-only by design; iOS uses the burger menu only)
- [ ] Contact page shows phones/emails; English block at bottom
- [ ] Article shows author or **Baahrakhari** publisher line
- [ ] Save 3+ articles → force quit → reopen → offline read works
- [ ] Notification toggle on/off

---

## 4) Google Play Console upload

Play API / Fastlane is **not** configured. Console-only. Prefer **Internal
testing** (or an existing draft) first — do not start a production rollout
until that build is verified.

Preferred: `npm run play:wizard` (asks AAB path + version, verifies, prints
steps). Click-through: `docs/play-store/UPLOAD_NEW_RELEASE.md`.

1. Update **Store settings** and **News and magazine apps** declaration
   (contact URL: `https://baahrakhari.com/contact`)
2. Confirm **Data safety** does **not** claim ads (item 9 skipped this cut)
3. Upload AAB to **Internal testing** (or existing draft)
4. Paste release notes from `docs/play-store/RELEASE_NOTES.md` (section **1.4.0**)
5. **Save**. Stop before **Start rollout to Production**
6. After verify: promote / Production → **Publishing overview → Send for review**

See `docs/play-store/NEWS_POLICY_COMPLIANCE.md` for full checklist.

---

## 5) iOS release (App Store)

Production cut: **1.4.0** (build **4**). Live listing is **1.2.0**. Full
checklist: `docs/app-store/IOS_RELEASE_CHECKLIST.md`.

### Version (current target)

Set in `ios/Baahrakhari.xcodeproj/project.pbxproj`:

- `MARKETING_VERSION = 1.4.0`
- `CURRENT_PROJECT_VERSION = 4` (`CFBundleVersion` — must be unique per upload;
  last TestFlight build was **3**)
- Bundle ID `com.baahrakhari`, team `WGWJBSHXG5`

Bump only if Apple already accepted this build number:

```sh
cd ios
xcrun agvtool new-marketing-version 1.4.0
xcrun agvtool next-version -all
```

### Archive (signed IPA, no upload)

```sh
SKIP_UPLOAD=1 ./scripts/ios_archive_upload.sh
```

Output: `build/ios/export/Baahrakhari.ipa` (archive at
`build/ios/Baahrakhari.xcarchive`).

Xcode alternative: open `ios/Baahrakhari.xcworkspace` → target
`Baahrakhari` → Signing: team + `com.baahrakhari` → **Product → Archive**.

### Upload to App Store Connect

```sh
./scripts/ios_archive_upload.sh
```

API key: `~/.appstoreconnect/private_keys/AuthKey_4T2A93HW9T.p8`.
Then ASC → **+ Version → 1.4.0** → attach build 4. Metadata:
`docs/app-store/METADATA.md`. Review notes: `docs/app-store/REVIEW_NOTES.md`.

### iOS smoke before submit

- [ ] Feed loads; Home is logo + Nepali date, **शीर्ष समाचार**, **ताजा** strip
- [ ] Burger: theme, Saved, **सम्पर्क गर्नुहोस्** / **Contact us**
- [ ] Article open, pinch-to-zoom, save, share
- [ ] Saved list survives force-quit
- [ ] Real iPhone (and iPad) TestFlight install — not simulator-only

---

## 6) Suggested git tag

```sh
# Local annotated tag v1.4.0 already exists on fbd08aa (not pushed).
git push -u origin main
git push origin v1.4.0
```

Do this **after** you intend to publish git — not required for the Play
upload. Never commit `android/gradle.properties`.

---

## 7) Release gate checklist

- [ ] `APP_VERSION_CODE` incremented
- [ ] Android AAB built and smoke-tested on device
- [ ] Play Console contact details + News declaration updated
- [ ] Release notes pasted (`docs/play-store/RELEASE_NOTES.md` section **1.4.0**)
- [ ] Internal testing (or draft) saved; production rollout only after verify
- [ ] **Send for review** clicked after a production upload (if prompted)
- [ ] iOS archive uploaded and 1.4.0 submitted (see `docs/app-store/IOS_RELEASE_CHECKLIST.md`)
