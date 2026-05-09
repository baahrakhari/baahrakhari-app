# Baahrakhari Mobile Release Readiness

## Release metadata set
- App name: `Baahrakhari` (Android + iOS display name)
- Android package/namespace: `com.baahrakhari.mobile`
- iOS bundle identifier: `com.baahrakhari.mobile`
- App version: `1.1.0`

## Implemented release features
- Dynamic article refresh with adaptive prefetch based on observed network speed
- Manual refresh triggers:
  - Pull-to-refresh on feed
  - Home button refresh
  - App startup fetch
- Saved articles persisted in local storage for reopen/offline reading
- Optional local article alerts (hourly checks, max once/hour)

## Required pre-release actions (must-do)
- Android signing
  - Add these to `android/gradle.properties` (or CI secrets):
    - `MYAPP_UPLOAD_STORE_FILE=...`
    - `MYAPP_UPLOAD_STORE_PASSWORD=...`
    - `MYAPP_UPLOAD_KEY_ALIAS=...`
    - `MYAPP_UPLOAD_KEY_PASSWORD=...`
- iOS signing
  - Configure team/provisioning in Xcode for `com.baahrakhari.mobile`
- Notification permissions testing
  - Android 13+ runtime permission flow
  - iOS prompt acceptance/denial flow

## Verify before tagging
```sh
npm run verify
```

## Build commands
```sh
# Android release APK/AAB path from Gradle output
npm run android:release

# iOS release archive (run in Xcode)
# Product -> Archive
```

## Suggested release process
1. Run `npm run verify`
2. Build release binaries on clean machine/CI
3. Install on real Android+iOS devices
4. Verify:
   - Feed loading + swipe UX
   - Saved/offline read flow
   - Notification toggle + alert timing behavior
5. Tag and publish store submissions
