# Google Play — Release & News Policy Compliance

Upload guide for **Baahrakhari** (`com.baahrakhari.media`).

| | |
|---|---|
| **Current AAB** | `1.5.0` / `versionCode 132` — home categories, drawer, static house banners (local `gradle.properties`) |
| **AAB file** | `android/app/build/outputs/bundle/release/app-release.aab` (~37 MB) |
| **Absolute AAB path** | `/Users/praak/cursor_12KHARI/baahrakhari-app/android/app/build/outputs/bundle/release/app-release.aab` |
| **Built / verified** | 2026-09-03 (`aapt` / `jarsigner` / `apksigner` — see `RELEASE_NOTES.md`) |
| **targetSdk** | `36` |
| **Ads this cut** | **Yes — first-party house banners on Home only.** Static images from baahrakhari.com `getAdvertisementData`. No ad SDK, no `AD_ID`, no road-block, no in-article ads. Declare Ads in Data safety. |
| **Upload steps** | see `docs/play-store/UPLOAD_NEW_RELEASE.md` (internal testing first) |
| **Appeal case** | `[3-4690000040664]` (Google Play reply, 2 Jun 2026) |
| **Policy** | [News and Magazines](https://support.google.com/googleplay/android-developer/answer/9935326) |
| **Release notes** | `docs/play-store/RELEASE_NOTES.md` |
| **Deobfuscation note** | `docs/play-store/DEOBFUSCATION_NOTE.md` |

---

## Quick upload checklist

- [ ] `android/gradle.properties` → `APP_VERSION_CODE=132`, `APP_VERSION_NAME=1.5.0` (bump both if a higher versionCode was already uploaded)
- [x] Build AAB (see **Build** below) — wizard verified 2026-09-04
- [x] Device smoke test: Pixel_10_API_36 release APK (home + drawer); re-check Contact on Console testers
- [ ] Play Console → **Store settings** → website, email, phone (see `PLAY_CONSOLE_ACCOUNT.md`)
- [ ] Play Console → **App content → News and magazine apps** → contact URL
- [ ] Play Console → **App content → Data safety**: **Ads = yes**
      (first-party house banners on Home; no advertising ID / no ad SDK)
- [ ] Play Console → upload AAB to **Internal testing** (or an existing
      draft) first — not a production 100% rollout
- [ ] Paste release notes from `RELEASE_NOTES.md` section **1.5.0**
- [ ] **Save** the release. Stop before **Start rollout to Production**
- [ ] After internal verify: promote / Production rollout → **Publishing
      overview → Send for review** if prompted

Paste packet for the connected listing: `docs/play-store/PLAY_CONSOLE_ACCOUNT.md`.

---

## What Google flagged

Primary issue: no dedicated, easy-to-find **Contact Us** page with valid phone/email.

Also required for News apps:

- Publisher / author attribution on articles
- Live content (not static-only)
- Matching contact info on **website**, **declaration**, and **in-app**
- Accurate **News and Magazines declaration**

---

## Canonical contact values (use everywhere)

Must match [https://baahrakhari.com/contact](https://baahrakhari.com/contact) and the in-app Contact page:

| Field | Value |
|---|---|
| **Website** | `https://baahrakhari.com` |
| **Contact URL** | `https://baahrakhari.com/contact` |
| **Phone (office)** | `01-5911651`, `01-5911656` |
| **Email (general)** | `baahrakhari@gmail.com` |
| **Phone (advertising)** | `9801849631` |
| **Email (advertising)** | `baahrakhari.marketing@gmail.com` |
| **Address** | KMC Ward 11, House 138, Thapathali, Kathmandu, Nepal |
| **Publisher** | Baahrakhari Media Pvt. Ltd. / Baahrakhari |

---

## App changes in 1.2.7 (verify on release build)

- [ ] **Contact Us** entry in the burger/side-drawer menu (two lines:
  **सम्पर्क गर्नुहोस्** then **Contact us** — Nepali first, English kept
  visible so Play reviewers can still find “Contact us”); shown on
  **Android and iOS**
- [ ] **Home feed footer** — dedicated **Contact Us** section (phone + email
  preview, **English-only** copy), shown on the front page on **Android only**
  (Google Play requirement); not shown on iOS front page — About links separate
- [ ] **Contact Us page** — publisher name, phone/email at top, website link, full Nepali + English sections
- [ ] **Article bylines** — author or **Baahrakhari** as publisher fallback
- [ ] **Live feed** from baahrakhari.com

> The app UI has since moved from a top category bar / header button to a
> burger side-drawer for category navigation (see `App.tsx`, `DrawerItem` /
> `NEWS_CATEGORIES`). There is no separate "Contact Us" header button
> anymore — the drawer entry and the Android-only home-feed footer link
> below are the current surfaces. Keep this section in sync with `App.tsx`
> whenever Contact Us placement changes.

### Where reviewers find Contact Us

1. **Android:** Home feed (front page) → scroll to footer → **Contact Us** (shows phone + email), **or**
2. **Android & iOS:** Tap the burger menu (☰) → **सम्पर्क गर्नुहोस्** /
   **Contact us** (two lines; English “Contact us” is visible on the second line)

iOS intentionally does not show the front-page footer Contact Us section —
per product decision, iOS keeps Contact Us in the burger menu only. This
split is implemented with `Platform.OS === 'android'` around the home feed
footer's Contact Us block in `App.tsx` (`HomeFeedList`).

---

## Build

Set signing in `android/gradle.properties` (local only — do not commit passwords):

```properties
APP_APPLICATION_ID=com.baahrakhari.media
APP_VERSION_CODE=132
APP_VERSION_NAME=1.5.0
MYAPP_UPLOAD_STORE_FILE=/path/to/12khari.jks
MYAPP_UPLOAD_KEY_ALIAS=abp
MYAPP_UPLOAD_STORE_PASSWORD=***
MYAPP_UPLOAD_KEY_PASSWORD=***
```

```sh
# From repo root — prefer bundleRelease without clean if clean fails on native cache
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

If `./gradlew clean` fails with CMake/fbjni errors, delete stale caches then rebuild:

```sh
rm -rf android/app/.cxx android/app/build android/build
cd android && ./gradlew bundleRelease
```

---

## Play Console — Store settings

**Path:** Grow users → Store presence → **Store settings**

| Field | Value |
|---|---|
| Website | `https://baahrakhari.com` |
| Email | `baahrakhari@gmail.com` |
| Phone | `+977-1-5911651` or `01-5911651` |

---

## Play Console — News and Magazines declaration

**Path:** Monitor and improve → Policy and programs → **App content** → **News and magazine apps**

| Question | Answer |
|---|---|
| Is this a news app? | **Yes** |
| App type | **Original publisher** |
| Contact URL | `https://baahrakhari.com/contact` |
| Contact email | `baahrakhari@gmail.com` |
| Contact phone | `01-5911651` |

---

## Play Console — Data safety (declare first-party home ads)

There is **no** committed Data safety questionnaire in this repo. Confirm
the existing Play Console form before review. For **1.5.0**:

| Topic | This build |
|---|---|
| Ads | **Yes — first-party house banners** on the Home feed only (`home.*` slots from baahrakhari.com). Static images; tap opens the advertiser URL. **No** AdMob / third-party ad SDK, **no** advertising ID, **no** road-block interstitial, **no** in-article / sidebar / sticky / header ads. `adSpacer` in the article reader is layout chrome, not an ad. |
| Advertising ID (`AD_ID`) | **Not declared** in the merged APK manifest |
| Notifications | Optional local new-story reminders; `POST_NOTIFICATIONS` + `VIBRATE` |
| Third-party ad SDKs | None |

A missing or ads-mismatched Data safety form **can block review**. Re-open
**App content → Data safety** and save if Play says it is outdated. Declare
Ads to match the home banners; do **not** claim an advertising ID.

## Play Console — Upload release

**Path (first pass):** Release → **Testing → Internal testing** (or an
existing unpublished draft).

**Path (production, after verify):** Release → Production, preferably
**Promote** the internal release so `versionCode 132` is reused.

1. Create release with
   `/Users/praak/cursor_12KHARI/baahrakhari-app/android/app/build/outputs/bundle/release/app-release.aab`
2. Add release notes from `RELEASE_NOTES.md` section **1.5.0**
3. **Save**. Do **not** set production rollout to 100% on the first pass
4. After internal verify: Production rollout % of your choice →
   **Publishing overview → Send for review** if prompted

Play API / Fastlane `supply` is **not** set up in this repo. Console only.
See `UPLOAD_NEW_RELEASE.md` and the command example in `RELEASE_NOTES.md`.

Docs: [Prepare updates](https://support.google.com/googleplay/android-developer/answer/9859350),
[Create a release](https://support.google.com/googleplay/android-developer/answer/7159011)

---

## Appeal reply template (optional)

```text
We have addressed the News and Magazines policy feedback:

1. Dedicated in-app **Contact Us** page, reachable from the home feed
   footer (front page, Android) and the burger menu (Android + iOS),
   with phone numbers and emails matching https://baahrakhari.com/contact
2. Updated Play Console store contact details and News declaration
3. Article views show author or publisher (Baahrakhari) attribution
4. Submitted app version 1.2.7 (versionCode 127)

Thank you for your review.
```

---

## Related docs

- `docs/play-store/PLAY_CONSOLE_ACCOUNT.md`
- `docs/play-store/PLAY_UPLOAD_WIZARD.md`
- `docs/play-store/RELEASE_NOTES.md`
- `docs/play-store/DEOBFUSCATION_NOTE.md`
- `docs/RELEASE_COMMANDS.md`
- `docs/RELEASE_READINESS.md`
