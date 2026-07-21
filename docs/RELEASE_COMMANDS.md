# Baahrakhari Release Commands

Run all commands from the repository root unless noted.

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
APP_VERSION_CODE=126
APP_VERSION_NAME=1.2.6
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

1. Update **Store settings** and **News and magazine apps** declaration
   (contact URL: `https://baahrakhari.com/contact`)
2. Upload AAB to the track where the update was blocked
3. Paste release notes from `docs/play-store/RELEASE_NOTES.md` (section **1.2.6**)
4. **Publishing overview → Send for review**

See `docs/play-store/NEWS_POLICY_COMPLIANCE.md` for full checklist.

---

## 5) iOS release

### One-time setup

- Open `ios/Baahrakhari.xcworkspace` in Xcode
- Target `Baahrakhari` → Signing: team + bundle ID `com.baahrakhari`

### Archive

- Xcode: **Product → Archive**
- **Distribute App → App Store Connect**

See `docs/app-store/` for App Store metadata and review notes.

---

## 6) Suggested git tag

```sh
git tag v1.2.6
git push origin v1.2.6
```

---

## 7) Release gate checklist

- [ ] `APP_VERSION_CODE` incremented
- [ ] Android AAB built and smoke-tested on device
- [ ] Play Console contact details + News declaration updated
- [ ] Release notes pasted (`docs/play-store/RELEASE_NOTES.md`)
- [ ] **Send for review** clicked after upload
- [ ] iOS archive uploaded (if shipping iOS same cycle)
