# Baahrakhari Mobile Release Readiness

## Current release target

| Platform | Identifier | Version |
|---|---|---|
| Android (Play) | `com.baahrakhari.media` | **1.2.6** (`versionCode 126`) |
| iOS (App Store) | `com.baahrakhari` | 1.1.0+ (see `docs/app-store/`) |

Display name: **Baahrakhari**

---

## Google Play — active submission

Policy resubmission after appeal case **3-4690000040664** (News & Magazines).

| Doc | Purpose |
|---|---|
| `docs/play-store/NEWS_POLICY_COMPLIANCE.md` | Full upload checklist + Play Console fields |
| `docs/play-store/RELEASE_NOTES.md` | Copy-paste release notes (en + ne) |
| `docs/play-store/DEOBFUSCATION_NOTE.md` | R8 / mapping file warning (informational) |
| `docs/RELEASE_COMMANDS.md` | Build commands |

**Contact URL for declaration:** `https://baahrakhari.com/contact`

**AAB output:** `android/app/build/outputs/bundle/release/app-release.aab`

---

## Features in this Android release (1.2.6)

- Full Baahrakhari feed with adaptive prefetch and pull-to-refresh
- Pinch-to-zoom article text with remembered size
- Saved articles for offline reading
- Optional local new-story alerts (off by default)
- Light / dark mode
- **Contact Us** page (policy compliance) with English contact copy
- Home feed footer **Contact Us** link (Android only, front page, Google Play requirement); burger-menu **Contact Us** entry on Android and iOS
- Publisher attribution on articles (author or Baahrakhari)
- Share icon rendering fix on Android

---

## Required pre-release actions

### Android signing

Local `android/gradle.properties` (do not commit secrets):

- `MYAPP_UPLOAD_STORE_FILE` → `12khari.jks`
- `MYAPP_UPLOAD_KEY_ALIAS` → `abp`
- `MYAPP_UPLOAD_STORE_PASSWORD` / `MYAPP_UPLOAD_KEY_PASSWORD`
- `APP_VERSION_CODE=126`, `APP_VERSION_NAME=1.2.6`

### Play Console (before Send for review)

- Store settings: website, email, phone
- App content → News and magazine apps → contact URL
- Upload AAB + release notes

### iOS signing

- Xcode team + provisioning for `com.baahrakhari`

---

## Verify before upload

```sh
npm run typecheck
cd android && ./gradlew bundleRelease
```

Device test checklist in `docs/RELEASE_COMMANDS.md` section 3.

---

## Build commands

```sh
# Android AAB (Play)
cd android && ./gradlew bundleRelease

# Android APK (quick test)
cd android && ./gradlew assembleRelease

# iOS — Xcode Product → Archive
```

---

## Suggested release process

1. Bump `APP_VERSION_CODE` / `APP_VERSION_NAME` in `android/gradle.properties`
2. Update `docs/play-store/RELEASE_NOTES.md`
3. Build AAB and install APK on a real device
4. Run smoke tests (feed, Contact, share icon, offline save)
5. Update Play Console listing + News declaration
6. Upload AAB, paste release notes, **Send for review**
7. Tag: `git tag v1.2.6`
