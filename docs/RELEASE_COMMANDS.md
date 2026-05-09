# Baahrakhari Release Commands (v1.1.0)

Run all commands from the repository root (this React Native project root) unless noted.

## 1) Preflight checks
```sh
npm ci
npm run verify
```

## 2) Android release

### Required signing variables
Set in `android/gradle.properties` (local) or CI secret env injection:

```properties
MYAPP_UPLOAD_STORE_FILE=baahrakhari-upload.keystore
MYAPP_UPLOAD_STORE_PASSWORD=***
MYAPP_UPLOAD_KEY_ALIAS=baahrakhari
MYAPP_UPLOAD_KEY_PASSWORD=***
APP_APPLICATION_ID=com.baahrakhari.mobile
```

### Build APK (quick install test)
```sh
cd android
./gradlew clean assembleRelease
```

Output:
`android/app/build/outputs/apk/release/app-release.apk`

### Build AAB (Play Store upload)
```sh
cd android
./gradlew clean bundleRelease
```

Output:
`android/app/build/outputs/bundle/release/app-release.aab`

## 3) iOS release

### One-time project setup
- Open `ios/MobileFromScratchApp.xcworkspace` in Xcode.
- Target `Baahrakhari` -> Signing & Capabilities:
  - Team: your Apple Developer team
  - Bundle Identifier: `com.baahrakhari.mobile`
  - Automatic signing enabled (or set manual profiles).

### Archive and export
- Xcode menu: `Product -> Archive`
- Then `Distribute App` -> `App Store Connect` (or `Ad Hoc` for device testing).

## 4) Test before upload
- Open app online, verify feed + refresh.
- Save 3+ articles, force close app, reopen.
- Turn on airplane mode, verify saved articles open/read.
- Verify read-later list and remove flow.
- Verify notification toggle on/off and at least one local alert appears when new article exists.

## 5) Upload flow

### Android (Play Console)
- Upload AAB from:
  - `android/app/build/outputs/bundle/release/app-release.aab`
- Start internal testing track first.

### iOS (App Store Connect)
- Upload from Xcode Archive Organizer.
- Submit to TestFlight internal testers first.

## 6) Suggested git tagging
```sh
git tag v1.1.0
git push origin v1.1.0
```

## 7) Release gate checklist
- [ ] `npm run verify` passes
- [ ] Android AAB generated and uploaded to internal track
- [ ] iOS archive uploaded to TestFlight
- [ ] Offline saved reading verified
- [ ] Notification toggle and permissions verified
- [ ] Release notes prepared
