# iOS production release checklist — 1.5.0

Cut **1.5.0** for the existing App Store app. **Listing binary is
TestFlight 1.5.0 (7)** (`CFBundleVersion` 7), not 5. This is a version
update, not a new listing. Follow this file when archiving, uploading,
and submitting. Enrollment / first-launch items live in
[`PRELAUNCH.md`](PRELAUNCH.md).

Paste packet: [`METADATA.md`](METADATA.md), [`PRIVACY.md`](PRIVACY.md),
[`REVIEW_NOTES.md`](REVIEW_NOTES.md).

**Apple App Store only.** Do not run the Play wizard for this cut unless
someone asks.

---

## Snapshot (2026-09-21)

| | |
|---|---|
| **App name** | Baahrakhari |
| **Bundle ID** | `com.baahrakhari` |
| **ASC App ID** | `1461739733` |
| **SKU** | `12365478` |
| **Team** | Baahrakhari Media (`WGWJBSHXG5`) |
| **Signing** | Automatic (`CODE_SIGN_STYLE=Automatic`) |
| **This cut / listing binary** | marketing **1.5.0**, `CFBundleVersion` **7** (TestFlight **1.5.0 (7)**). Not 5. |
| **Live on the store** | **1.4.0 READY_FOR_SALE** (untouched) |
| **App Store 1.5.0** | **WAITING_FOR_REVIEW**, releaseType **MANUAL**, build **7**. Review submission `111c51a9-…` submitted 2026-09-21 19:03Z. |
| **Last known TestFlight** | Build **7** VALID, not expired (`41432b93-…`). Builds 5–6 are prior; 5 expired. |
| **Workspace** | `ios/Baahrakhari.xcworkspace` (scheme `Baahrakhari`) |
| **Deployment target** | iOS 15.1; iPhone + iPad (`TARGETED_DEVICE_FAMILY=1,2`) |
| **New Architecture** | `RCTNewArchEnabled=true` |
| **Encryption** | `ITSAppUsesNonExemptEncryption=false` (HTTPS only) |
| **Archive / IPA** | `build/ios/Baahrakhari.xcarchive` → `build/ios/export/Baahrakhari.ipa` |
| **Existing IPA (stale)** | Older disk IPAs (1.5.0/5, etc.) are not the listing binary. **Do not re-archive/re-upload** unless TestFlight **7** is missing/invalid. |
| **Ads this cut** | Home-only first-party static house banners from baahrakhari.com. **No AdMob**, no IDFA, no third-party ad SDK, no road-block / in-article ads. |

Do **not** create a new app or use `com.baahrakhari.mobile` /
`com.baahrakhari.media` (those are not this listing).

Verify the ASC record (needs `ASC_KEY_ID` + `ASC_ISSUER_ID` in the
environment; never echo the `.p8` or passwords):

```sh
python3 scripts/asc_api.py
# Listing prep (1.5.0 / build 7, no submit): python3 scripts/asc_prepare_150.py
```

---

## Blockers before **Submit for Review**

Upload to TestFlight can proceed without these. **Do not click Submit for
Review** until they are fixed.

- [x] **Privacy Policy URL is live HTTPS.**
      `https://baahrakhari.com/page/privacy-policy`
- [x] **Support URL is live HTTPS.** `https://baahrakhari.com/contact`
- [x] **Rebuild IPA after Hamro Team JS** — listing uses TestFlight **7**
      (Hamro Team + Megan overlay/toast/center-title fixes). Do not attach 5.
- [x] **iPad screenshots** — recaptured 1.5.0 UI on iPad Pro 13-inch (M5)
      (`C7BD7050-…`, 2064×2752). Uploaded listing-ready **01_home,
      03_drawer, 04_saved** to `APP_IPAD_PRO_3GEN_129` (flattened 2048×2732).
      Did **not** upload `02_article` (real reader, but Fast Refresh debug
      banner) or `05_dark_home` (never a real dark Home). Local copies stay
      in `marketing/screenshots/ipad-2064x2752/` for picking.
- [ ] **Real-device smoke** of **1.5.0 (7)** (iPhone, and iPad if you ship
      iPad). Simulator-only is not enough for New Architecture.
- [ ] **App Privacy nutrition label** — API still cannot read the
      questionnaire (`appDataUsages` 404). Did not block submit: PRIVACY.md
      already matches (no AdMob / no advertising data; house banners are
      display) and 1.4.0 shipped. Confirm in ASC UI when convenient.

---

## 1. Preflight (repo)

- [x] Bundle ID `com.baahrakhari` in Xcode
- [x] Display name **Baahrakhari**
- [x] Marketing version **1.5.0**, build **5** in `project.pbxproj`
- [x] `package.json` version **1.5.0**
- [x] `ITSAppUsesNonExemptEncryption=false`
- [x] `PrivacyInfo.xcprivacy` present (no tracking)
- [x] Associated domains: `applinks:baahrakhari.com` + `www`
- [ ] Fresh archive **after** Hamro Team first-two-members JS

---

## 2. Rebuild the production IPA (required)

The IPA already on disk is **stale**. Hamro Team collapsed sections now
keep the **first two members** visible; that JS is not in the 18:11
bundle. Archive again.

From the repo root:

```sh
SKIP_UPLOAD=1 ./scripts/ios_archive_upload.sh
```

Same thing: `npm run ios:archive`.

Or Xcode: open `ios/Baahrakhari.xcworkspace` → **Any iOS Device (arm64)**
→ **Product → Archive**.

Expected output:

- Archive: `build/ios/Baahrakhari.xcarchive`
- IPA: `build/ios/export/Baahrakhari.ipa`

Verify before upload:

```sh
IPA=build/ios/export/Baahrakhari.ipa
unzip -l "$IPA" | head
TMP=$(mktemp -d)
unzip -qo "$IPA" -d "$TMP"
plutil -p "$TMP/Payload/Baahrakhari.app/Info.plist" | grep -E 'CFBundle(Identifier|ShortVersionString|Version)|CFBundleDisplayName'
ls -lh "$TMP/Payload/Baahrakhari.app/main.jsbundle"
rm -rf "$TMP"
```

Expect:

| Key | Value |
|---|---|
| `CFBundleIdentifier` | `com.baahrakhari` |
| `CFBundleShortVersionString` | `1.5.0` |
| `CFBundleVersion` | `5` |
| `CFBundleDisplayName` | `Baahrakhari` |
| `main.jsbundle` | present (IPA mtime **after** the Hamro Team JS) |

- [ ] New IPA exists and dumps the table above
- [ ] Archive kept on disk for later crash symbolication (`build/ios/Baahrakhari.xcarchive`)

If signing fails (no Apple Distribution identity in the keychain): open
the workspace in Xcode, confirm team **Baahrakhari Media**, then
**Product → Archive**. Automatic signing with
`-allowProvisioningUpdates` should refresh the **iOS Team Store**
profile `com.baahrakhari`.

---

## 3. Upload to App Store Connect

Needs App Store Connect API env vars on this machine (already used for
1.4.0). **Never print, log, or paste** the `.p8` private key, app-specific
passwords, or signing passwords.

```sh
# Set from App Store Connect → Users and Access → Integrations → Keys.
# Do not echo these values.
export ASC_KEY_ID
export ASC_ISSUER_ID
# Optional signing team (Xcode team is fine if unset):
# export ASC_TEAM_ID=WGWJBSHXG5

# Private key must exist at:
#   ~/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8
```

Then either:

**A. Archive again + upload** (script always archives first):

```sh
npm run ios:upload
```

**B. Same as A, explicit:**

```sh
./scripts/ios_archive_upload.sh
```

`npm run ios:upload` **re-archives**. That is what you want after the
Hamro Team JS. Running `SKIP_UPLOAD=1` first is only so you can inspect
the IPA; the upload command will archive a second time.

Equivalent `altool` (only after a fresh IPA exists; still needs env vars):

```sh
xcrun altool --upload-app --type ios \
  --file build/ios/export/Baahrakhari.ipa \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID"
```

- [x] Upload accepted (`altool` UPLOAD SUCCEEDED) — TestFlight **7**
- [x] TestFlight → Builds: build **7** is **VALID** and attached to **1.5.0**

Xcode alternative: Organizer → the new archive → **Distribute App →
App Store Connect → Upload**.

---

## 4. App Store Connect click-through — version 1.5.0

1. Open [App Store Connect](https://appstoreconnect.apple.com) → **My Apps**
   → **Baahrakhari** (`1461739733`).
2. **+ Version** or **Add iOS Version** → **1.5.0**. Do **not** edit the
   live Ready-for-Sale record.
3. Wait until build **7** finishes processing (yellow → **Valid**).
4. **Build** → Select this build → **1.5.0 (7)**.
5. **Screenshots** — see §5. Upload iPhone 01–04. Do **not** upload iPad
   Safari / blank files. Do **not** upload `.raw.png`.
6. Paste **What's New** (en-US; ne-NP if that localisation exists) from
   [`METADATA.md`](METADATA.md) § “What's New in This Version — 1.5.0”.
7. Confirm subtitle, description, keywords still match
   [`METADATA.md`](METADATA.md) **Version 1.5.0**.
8. Paste App Review notes from [`REVIEW_NOTES.md`](REVIEW_NOTES.md).
9. **Submit for Review** — done 2026-09-21 (`WAITING_FOR_REVIEW`, MANUAL).

### What's New (en-US) — copy

```text
Home now matches baahrakhari.com more closely.

• Larger Top News type (two lines); long-press a headline to save — share stays in the reader
• Below the fold: राजनीति, अर्थ व्यवसाय, खेल, विचार, देश, साहित्य, सम्पादकीय, विदेश
• Burger: overlay tap to close, theme at the bottom, swipe from the left edge on lists
• Hamro team sections start collapsed with the first two members visible; home-only static house banners (no AdMob)
```

### What's New (ne-NP) — copy

```text
गृहपृष्ठ अब baahrakhari.com सँग अझ मिल्दोजुल्दो छ।

• शीर्ष समाचारको अक्षर ठूलो (दुई हरफ); लामो थिचेर सेभ — सेयर पठन पृष्ठमा रहन्छ
• मुनि: राजनीति, अर्थ व्यवसाय, खेल, विचार, देश, साहित्य, सम्पादकीय, विदेश
• बर्गर: ओभरले थिचेर बन्द, थिम तल, सूचीमा बायाँ किनाराबाट स्वाइप
• हाम्रो टिम सुरुमा संक्षिप्त; पहिलो दुई सदस्य देखिन्छन्; गृहपृष्ठमा मात्र स्थिर ब्यानर (AdMob होइन)
```

- [x] Create iOS version **1.5.0** (do not edit the live record)
      `8f81e4a5-…` **WAITING_FOR_REVIEW** (was PREPARE_FOR_SUBMISSION)
- [x] Select build **7** once processing finishes
- [x] Paste What's New (en-US). **ne-NP / ne not a valid ASC locale** (409)
- [x] Subtitle, description, keywords still match `METADATA.md` 1.5.0
- [x] Primary category **News**; secondary **Magazines & Newspapers**
- [x] Age rating still 12+ (News)
- [x] Content rights: ASC `DOES_NOT_USE_THIRD_PARTY_CONTENT` (same publisher
      as baahrakhari.com). Left app-level field unchanged so live 1.4.0 is
      not rewritten.
- [ ] App Privacy nutrition label: see [`PRIVACY.md`](PRIVACY.md)
      (no data linked to you; crash data via Apple only; no tracking;
      **no AdMob / no advertising data**. Home still shows first-party
      static banners — that is display, not a collected data type.)
      API still cannot read the questionnaire; did not block submit.
- [x] Support URL live (`https://baahrakhari.com/contact`)
- [x] Privacy Policy URL live HTTPS (`https://baahrakhari.com/page/privacy-policy`)
- [x] Marketing URL `https://baahrakhari.com`

---

## 5. Screenshots (1.5.0 UI)

Required because the binary supports iPhone **and** iPad. Portrait is
enough. **Never upload** `.raw.png`, Safari chrome, or blank white frames.

### iPhone 6.7" — 1284×2778 — listing-ready-ish

Folder: `marketing/screenshots/iphone-1284x2778/`

| File | Screen | Upload? |
|---|---|---|
| `01_home.png` | Home — logo + Nepali date, शीर्ष समाचार, house banners, ताजा | **Yes** |
| `02_article.png` | Article reader | **Yes** |
| `03_drawer.png` | Burger (categories, Contact us, theme at bottom) | **Yes** |
| `04_saved.png` | Saved articles | **Yes** |
| `05_dark_home.png` | Filename lies — this is a **light Saved duplicate**, not dark Home | **No** |

### iPad 13" — 2064×2752 — listing-ready 01 / 03 / 04 uploaded

Folder: `marketing/screenshots/ipad-2064x2752/`

Recaptured on **iPad Pro 13-inch (M5)** iOS 26.5. Do not tap house banners
(HomeAdSlot opens Safari). Grant notifications after install; do not tap
Don’t Allow (that hit ads). iOS 26 dropped `simctl io input tap` — used
Simulator **Send Pointer to Device** + `cliclick`. Avoid double-clicks
(iPadOS 26 windowed apps / Stage Manager).

| File | What it actually is | Upload? |
|---|---|---|
| `01_home.png` | Home — logo + Nepali date, शीर्ष समाचार, house banners, ताजा | **Yes** |
| `02_article.png` | Real article reader, but **Fast Refresh debug banner** at top | **No** (local pick) |
| `03_drawer.png` | Burger (categories, Contact us, theme at bottom) | **Yes** |
| `04_saved.png` | Saved articles | **Yes** |
| `05_dark_home.png` | Not captured (would have been a Saved/debug duplicate) | **No** |

ASC `APP_IPAD_PRO_3GEN_129` wants 2048×2732; uploaded flattened 01/03/04
from the 2064×2752 sources. Replaced the cloned 1.4.0 iPad set.

- [x] At least 2 (ideally 4) 6.7" iPhone screenshots uploaded (`01`–`04`)
      Apple rejects 1284×2778 on `APP_IPHONE_67`; uploaded flattened
      **1290×2796** there, plus native **1284×2778** on `APP_IPHONE_65`.
      Skipped `05_dark_home` (Saved duplicate) and `.raw.png`.
- [x] iPad 13": uploaded 1.5.0 **01_home / 03_drawer / 04_saved** (not
      Safari/blank; skipped 02 Fast Refresh banner and 05)
- [x] 6.5" (1284×2778) — 01–04 uploaded (Apple’s class for that pixel size)
- [x] No `.raw.png`

---

## 6. TestFlight (before public submit)

- [ ] Internal testers installed **1.5.0 (7)**
- [ ] Export compliance: already skipped via Info.plist (`false`)
- [ ] Smoke on a **real iPhone**:
  - [ ] Launch, no crash (New Architecture)
  - [ ] Home: burger + logo + Nepali date; larger **शीर्ष समाचार**; **ताजा** strip; **category sections** below
  - [ ] Home-only static house banners (images; tap opens advertiser URL in browser — optional)
  - [ ] Long-press a Top News row to save; share is in the article reader
  - [ ] Burger: overlay tap to close; theme at the **bottom**; **सुरक्षित लेखहरू**; **सम्पर्क गर्नुहोस्** / **Contact us**
  - [ ] **हाम्रो टिम**: first two members visible per section; dropdown reveals the rest
  - [ ] Open article; pinch-to-zoom; save; share
  - [ ] Saved list survives force-quit
- [ ] Smoke on a **real iPad** (binary supports iPad)
- [ ] External group optional (extra beta review)

---

## 7. Submit for App Store review

In ASC → 1.5.0 → **Prepare for Submission**:

- [x] Build **7** selected
- [x] App Review notes pasted from [`REVIEW_NOTES.md`](REVIEW_NOTES.md)
      (demo path is the 1.5.0 home/drawer/team UI; house banners are
      first-party, not AdMob; save toast; centered Top News)
- [x] Sign-in: **Not required**
- [x] Review contact name / email / `+977…` filled in ASC
- [x] Version release: **MANUAL** (phased-release resource **INACTIVE** —
      METADATA’s 7-day phased option can be turned on at submit time)
- [x] Privacy + Support URLs return 200
- [x] **Submit for Review** — 2026-09-21 reviewSubmission
      `111c51a9-…` **WAITING_FOR_REVIEW** (submitted 19:03Z). Version
      `8f81e4a5-…` **WAITING_FOR_REVIEW**, releaseType **MANUAL**. Live
      1.4.0 still READY_FOR_SALE. Helper: `scripts/asc_submit_150.py`.

Typical review: 24–48 hours. Watch for: missing privacy URL, content
rights (use the notes), New Architecture crash on a clean device,
misleading screenshots (Safari / blank).

---

## 8. After approval

- [ ] Confirm 1.5.0 is **Ready for Sale** (or release if you chose manual)
- [ ] Tag: `git tag ios-1.5.0-build5 && git push origin --tags`
      (only after you intend to publish git)
- [ ] Keep `build/ios/Baahrakhari.xcarchive` for symbolication
- [ ] App Analytics / crash reports for the first 72 h

---

## Commands (copy)

```sh
# Typecheck
npm run typecheck

# Archive + export IPA only (required rebuild — existing IPA is stale)
SKIP_UPLOAD=1 ./scripts/ios_archive_upload.sh
# same: npm run ios:archive

# Archive + upload (needs ASC_KEY_ID, ASC_ISSUER_ID, and
# ~/.appstoreconnect/private_keys/AuthKey_<id>.p8 — never echo secrets)
npm run ios:upload
# same: ./scripts/ios_archive_upload.sh

# Confirm ASC app + live versions
python3 scripts/asc_api.py
```
