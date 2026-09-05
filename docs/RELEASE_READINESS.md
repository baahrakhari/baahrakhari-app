# Baahrakhari Mobile Release Readiness

## Current release target

| Platform | Identifier | Version |
|---|---|---|
| Android (Play) | `com.baahrakhari.media` | **1.4.0** (`versionCode 131`) |
| iOS (App Store) | `com.baahrakhari` | **1.4.0** (build **4**). Live store version is **1.2.0**. See `docs/app-store/IOS_RELEASE_CHECKLIST.md` |

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

## Features in this Android release (1.4.0)

Prateek home/drawer cut — see `docs/RELEASE_CHECKLIST.md` and
`docs/play-store/RELEASE_NOTES.md`. Highlights:

- Home: up to 12 vertical **शीर्ष समाचार** rows + **ताजा समाचार** horizontal strip
- Slim ribbons; header is logo + Nepali date
- Theme and Saved in the burger; bilingual **Contact us** drawer row
- Android home footer **Contact Us** (Play News policy)
- **No ads** this cut (item 9 skipped) — do not claim ads in Play Data safety

---

## Required pre-release actions

### Android signing

Local `android/gradle.properties` (do not commit secrets):

- `MYAPP_UPLOAD_STORE_FILE` → `12khari.jks`
- `MYAPP_UPLOAD_KEY_ALIAS` → `abp`
- `MYAPP_UPLOAD_STORE_PASSWORD` / `MYAPP_UPLOAD_KEY_PASSWORD`
- `APP_VERSION_CODE=131`, `APP_VERSION_NAME=1.4.0`

### Play Console (before Send for review)

- Store settings: website, email, phone
- App content → News and magazine apps → contact URL
- Upload AAB + release notes

### iOS signing

- Xcode team **Baahrakhari Media** (`WGWJBSHXG5`) + automatic signing for `com.baahrakhari`
- Production cut: `docs/app-store/IOS_RELEASE_CHECKLIST.md`

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

# iOS — App Store archive (see docs/app-store/IOS_RELEASE_CHECKLIST.md)
SKIP_UPLOAD=1 ./scripts/ios_archive_upload.sh
```

---

## Suggested release process

1. Bump `APP_VERSION_CODE` / `APP_VERSION_NAME` in `android/gradle.properties`
2. Update `docs/play-store/RELEASE_NOTES.md`
3. Build AAB and install APK on a real device
4. Run smoke tests (feed, Contact, share icon, offline save)
5. Update Play Console listing + News declaration; confirm Data safety has no ads
6. Upload AAB to **Internal testing** (or draft), paste **1.4.0** notes, **Save**
7. After verify: Production rollout + **Send for review** if prompted
8. Push git when ready: local tag `v1.4.0` already exists (`git push origin v1.4.0`)
