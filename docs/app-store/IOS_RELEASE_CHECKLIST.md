# iOS production release checklist — 1.4.0

Cut **1.4.0** (build **4**) for the existing App Store app. This is a
version update, not a new listing. Follow this file when archiving,
uploading, and submitting. Enrollment / first-launch items live in
[`PRELAUNCH.md`](PRELAUNCH.md).

Paste packet: [`METADATA.md`](METADATA.md), [`PRIVACY.md`](PRIVACY.md),
[`REVIEW_NOTES.md`](REVIEW_NOTES.md).

---

## Snapshot (2026-09-04)

| | |
|---|---|
| **App name** | Baahrakhari |
| **Bundle ID** | `com.baahrakhari` |
| **ASC App ID** | `1461739733` |
| **SKU** | `12365478` |
| **Team** | Baahrakhari Media (`WGWJBSHXG5`) |
| **Signing** | Automatic (`CODE_SIGN_STYLE=Automatic`) |
| **This cut** | marketing **1.4.0**, `CFBundleVersion` **4** |
| **Live on the store** | **1.2.0** (`READY_FOR_SALE`). Also 1.1.0 and 1.0. |
| **Last TestFlight build** | `CFBundleVersion` **3** (VALID, uploaded 2026-07-17). Build **4** is unused. |
| **Workspace** | `ios/Baahrakhari.xcworkspace` (scheme `Baahrakhari`) |
| **Deployment target** | iOS 15.1; iPhone + iPad (`TARGETED_DEVICE_FAMILY=1,2`) |
| **New Architecture** | `RCTNewArchEnabled=true` |
| **Encryption** | `ITSAppUsesNonExemptEncryption=false` (HTTPS only) |
| **Archive / IPA** | `build/ios/Baahrakhari.xcarchive` → `build/ios/export/Baahrakhari.ipa` |
| **IPA verified** | 2026-09-04 — `com.baahrakhari` **1.4.0** / **4**, `main.jsbundle` present, signed **Apple Distribution: Baahrakhari Media (WGWJBSHXG5)**. Not uploaded yet. |
| **Upload** | `./scripts/ios_archive_upload.sh` (API key `4T2A93HW9T`) |

Do **not** create a new app or use `com.baahrakhari.mobile` /
`com.baahrakhari.media` (those are not this listing).

Verify the ASC record:

```sh
python3 scripts/asc_api.py
```

---

## Blockers before **Submit for Review**

Upload to TestFlight can proceed without these. **Do not click Submit for
Review** until they are fixed.

- [x] **Privacy Policy URL is live HTTPS.**
      `https://baahrakhari.com/page/privacy-policy` (verified 2026-09-04).
- [x] **Support URL is live HTTPS.** `https://baahrakhari.com/contact`
- [ ] **Real-device smoke** of this 1.4.0 archive (iPhone, and iPad if you
      ship iPad). Simulator-only is not enough for New Architecture.

---

## 1. Preflight (repo)

- [x] Bundle ID `com.baahrakhari` in Xcode
- [x] Display name **Baahrakhari**
- [x] Marketing version **1.4.0**, build **4** in `project.pbxproj`
- [x] `ITSAppUsesNonExemptEncryption=false`
- [x] Empty location purpose-string removed
- [x] `PrivacyInfo.xcprivacy` present (no tracking)
- [x] Associated domains: `applinks:baahrakhari.com` + `www`
- [x] `tsc --noEmit` clean (2026-09-04)
- [x] Build **4** unused in TestFlight (last uploaded was **3**, 2026-07-17)

---

## 2. Archive the production IPA

From the repo root. `SKIP_UPLOAD=1` builds the signed `.ipa` and stops
short of App Store Connect:

```sh
SKIP_UPLOAD=1 ./scripts/ios_archive_upload.sh
```

Or Xcode: open `ios/Baahrakhari.xcworkspace` → **Any iOS Device (arm64)**
→ **Product → Archive**.

Expected output:

- Archive: `build/ios/Baahrakhari.xcarchive`
- IPA: `build/ios/export/Baahrakhari.ipa`

Verify before upload:

```sh
IPA=build/ios/export/Baahrakhari.ipa
unzip -l "$IPA" | head
# Info.plist inside the payload:
TMP=$(mktemp -d)
unzip -qo "$IPA" -d "$TMP"
plutil -p "$TMP/Payload/Baahrakhari.app/Info.plist" | grep -E 'CFBundle(Identifier|ShortVersionString|Version)|CFBundleDisplayName'
```

Expect:

| Key | Value |
|---|---|
| `CFBundleIdentifier` | `com.baahrakhari` |
| `CFBundleShortVersionString` | `1.4.0` |
| `CFBundleVersion` | `4` |
| `CFBundleDisplayName` | `Baahrakhari` |

- [x] IPA exists and dumps the table above (2026-09-04)
- [x] Archive kept on disk for later crash symbolication (`build/ios/Baahrakhari.xcarchive`)

If signing fails (no Apple Distribution identity in the keychain): open
the workspace in Xcode, confirm team **Baahrakhari Media**, then
**Product → Archive**. Automatic signing with
`-allowProvisioningUpdates` should refresh the **iOS Team Store**
profile `com.baahrakhari` (already present locally).

---

## 3. Upload to App Store Connect

API key is already on this machine:
`~/.appstoreconnect/private_keys/AuthKey_4T2A93HW9T.p8`.

```sh
export ASC_KEY_ID=4T2A93HW9T
export ASC_ISSUER_ID=9c500f8b-2618-4f29-9688-de355b0b4df7
export ASC_TEAM_ID=WGWJBSHXG5
./scripts/ios_archive_upload.sh
```

If the IPA from step 2 is still good and you only want to upload it,
re-run without `SKIP_UPLOAD` (the script archives again) **or** upload
the existing IPA:

```sh
xcrun altool --upload-app --type ios \
  --file build/ios/export/Baahrakhari.ipa \
  --apiKey 4T2A93HW9T \
  --apiIssuer 9c500f8b-2618-4f29-9688-de355b0b4df7
```

- [x] Upload accepted (`altool` UPLOAD SUCCEEDED, 2026-09-04)
- [x] TestFlight → Builds: build **4** is **VALID** and attached to 1.4.0
      (2026-09-04, id `73c93b70-420b-4b2c-ac7d-6be65db21990`)

Xcode alternative: Organizer → the new archive → **Distribute App →
App Store Connect → Upload**.

---

## 4. App Store Connect version 1.4.0

ASC → **Baahrakhari** (`1461739733`) → **+ Version** → **1.4.0** (iOS).
Attach the build that finished processing.

### What's New (en-US)

```text
Home screen now matches baahrakhari.com more closely.

• Headlines occupy the top of Home (up to 12 rows) with a slim शीर्ष समाचार ribbon
• ताजा समाचार stays as a larger horizontal strip underneath
• Header is logo + Nepali date; theme and Saved live in the burger menu
• Share from headline rows; Contact us in the drawer (Nepali then English)
```

### What's New (ne-NP)

```text
गृहपृष्ठ अब baahrakhari.com सँग अझ मिल्दोजुल्दो छ।

• शीर्ष समाचार गृहपृष्ठको माथिल्लो भागमा (१२ सम्म) पातलो रिबनसहित
• ताजा समाचार त्यस मुनि ठूलो तेर्सो स्ट्रिप
• हेडरमा लोगो र नेपाली मिति; थिम र सुरक्षित लेखहरू बर्गर मेनुमा
• शीर्ष समाचारमा सेयर; Contact us ड्रअरमा (नेपाली, त्यसपछि अंग्रेजी)
```

Full listing copy (subtitle, description, keywords, copyright):
[`METADATA.md`](METADATA.md).

- [x] Create iOS version **1.4.0** (do not edit the live 1.2.0 record)
      ASC version id `b782a5c5-17f1-42bf-97c4-2a3546885c49`
- [x] Select build **4** once processing finishes
      (ASC build `73c93b70-420b-4b2c-ac7d-6be65db21990`, attached 2026-09-04)
- [x] Paste What's New (en-US; ne-NP if that localisation exists)
- [x] Subtitle, description, keywords still match `METADATA.md`
- [ ] Primary category **News**; secondary **Magazines & Newspapers**
- [ ] Age rating still 12+ (News)
- [ ] Content rights: **Yes**, same publisher as baahrakhari.com
- [ ] App Privacy nutrition label: see [`PRIVACY.md`](PRIVACY.md)
      (no data linked to you; crash data via Apple only; no tracking; **no ads**)
- [x] Support URL live (`https://baahrakhari.com/contact`)
- [x] Privacy Policy URL live HTTPS (`https://baahrakhari.com/page/privacy-policy`)
- [x] Marketing URL `https://baahrakhari.com`

---

## 5. Screenshots (1.4.0 UI)

Required because the binary supports iPhone **and** iPad. Portrait is
enough. Do **not** upload `.raw.png`.

### iPhone 6.7" — 1284×2778

Folder: `marketing/screenshots/iphone-1284x2778/`

| File | Screen |
|---|---|
| `01_home.png` | Home — logo + Nepali date, शीर्ष समाचार, ताजा strip |
| `02_article.png` | Article / headline reader |
| `03_drawer.png` | Burger (theme, saved, Contact us) |
| `04_saved.png` | Saved articles |
| `05_dark_home.png` | Home in dark theme |

### iPad 13" — 2064×2752

Folder: `marketing/screenshots/ipad-2064x2752/`

| File | Screen |
|---|---|
| `01_feed.png` | Home / feed |
| `02_article.png` | Article |
| `03_category.png` | Category / section |
| `04_saved.png` | Saved |
| `05_dark_mode.png` | Dark theme |

Regenerate: `npm run screenshots:store` (or
`./scripts/capture_store_screenshots.sh ios`).

- [ ] At least 2 (ideally 5) 6.7" iPhone screenshots uploaded
- [ ] At least 2 (ideally 5) 13" iPad screenshots uploaded
- [ ] Optional 6.5" (1242×2688) — only if you want that size class

---

## 6. TestFlight (before public submit)

- [ ] Internal testers installed **1.4.0 (4)**
- [ ] Export compliance: already skipped via Info.plist (`false`)
- [ ] Smoke on a **real iPhone**:
  - [ ] Launch, no crash (New Architecture)
  - [ ] Home: burger + logo + Nepali date; slim **शीर्ष समाचार**; **ताजा** strip
  - [ ] Logo / drawer logo → Home
  - [ ] Burger: theme, **सुरक्षित लेखहरू**, **सम्पर्क गर्नुहोस्** / **Contact us**
  - [ ] Open article; pinch-to-zoom; save; share
  - [ ] Saved list survives force-quit
  - [ ] Optional notification toggle (local only — no APNs)
- [ ] Smoke on a **real iPad** (binary supports iPad)
- [ ] External group optional (extra beta review)

---

## 7. Submit for App Store review

In ASC → 1.4.0 → **Prepare for Submission**:

- [ ] Build **4** selected
- [ ] App Review notes pasted from [`REVIEW_NOTES.md`](REVIEW_NOTES.md)
      (demo path is the 1.4.0 home/drawer UI — theme/save are **not** in
      the header)
- [ ] Sign-in: **Not required**
- [ ] Review contact name / email / `+977…` filled in ASC
- [ ] Version release: automatic, phased, or manual — pick one
- [ ] Privacy + Support URLs return 200
- [ ] **Submit for Review**

Typical review: 24–48 hours. Watch for: missing privacy URL, content
rights (use the notes), New Architecture crash on a clean device.

---

## 8. After approval

- [ ] Confirm 1.4.0 is **Ready for Sale** (or release if you chose manual)
- [ ] Tag: `git tag ios-1.4.0-build4 && git push origin --tags`
      (only after you intend to publish git)
- [ ] Keep `build/ios/Baahrakhari.xcarchive` for symbolication
- [ ] App Analytics / crash reports for the first 72 h

---

## Commands (copy)

```sh
# Typecheck
npm run typecheck

# Archive + export IPA only
SKIP_UPLOAD=1 ./scripts/ios_archive_upload.sh

# Archive + upload (needs API key on disk — already present)
./scripts/ios_archive_upload.sh

# Confirm ASC app + live versions
python3 scripts/asc_api.py
```
