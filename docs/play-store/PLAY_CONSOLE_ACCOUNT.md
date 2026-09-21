# Play Console account — documentation packet (1.4.0)

Copy these values into the **already-connected** Baahrakhari listing
(`com.baahrakhari.media`). This app has been uploaded before (last live cut
`1.3.0` / `130`). Do not create a new Play app.

Local wizard (`npm run play:wizard`) **cannot sign in to Play**. After it
verifies the AAB, a human (or a signed-in Console session) pastes the fields
below and uploads the bundle.

**Wizard verified (2026-09-04):** AAB
`/Users/praak/cursor_12KHARI/baahrakhari-app/android/app/build/outputs/bundle/release/app-release.aab`
— `com.baahrakhari.media` **1.4.0** / **131**, jarsigner OK, targetSdk 36.

---

## 1. Store settings (Grow → Store presence → Store settings)

Only change if a value drifted. Canonical:

| Field | Value |
|---|---|
| Website | `https://baahrakhari.com` |
| Support email | `baahrakhari@gmail.com` |
| Phone | `01-5911651` (office; also `01-5911656`) |
| Address | KMC Ward 11, House 138, Thapathali, Kathmandu, Nepal |

## 2. News and magazine apps (App content)

| Field | Value |
|---|---|
| Is this a news app? | Yes |
| App type | Original publisher |
| Contact URL | `https://baahrakhari.com/contact` |
| Contact email | `baahrakhari@gmail.com` |
| Contact phone | `01-5911651` |

Re-confirm this form: Contact Us **placement changed** in 1.4.0 (header
button gone; drawer is two lines **सम्पर्क गर्नुहोस्** / **Contact us**;
Android home footer still **Contact Us**).

Appeal case if asked: `3-4690000040664`.

## 3. Data safety (App content)

Declare **Ads = yes** for first-party Home banners. Do **not** claim an
advertising ID or a third-party ad SDK. Road-block / in-article ads are
not in this build.

| Topic | Declare |
|---|---|
| Ads | **Yes** — first-party static house banners on Home only |
| Advertising ID | **No** — no ad SDK, no `AD_ID` |
| Notifications | Optional local story alerts (`POST_NOTIFICATIONS`) |
| Firebase / FCM | Keep whatever the **previous** form said (transitive via `react-native-push-notification`). Do not newly claim “no SDKs” if Firebase was already listed. |

Save the form if Play says it is outdated for targetSdk 36.

## 4. Privacy policy URL (Store listing / App content)

Must be a **live HTTPS** page. Use
`https://baahrakhari.com/page/privacy-policy` (verified 2026-09-04).
`https://baahrakhari.com/privacy` 404s — do not paste that path.

## 5. Create release (Internal testing first)

Play Console → **Baahrakhari** → **Release → Testing → Internal testing**
→ existing draft or **Create new release**.

1. **Upload** the AAB path in the wizard summary (absolute path above).
2. Ignore deobfuscation warning (R8 off).
3. Paste What's new (next section).
4. Confirm Play shows **1.4.0** / **131**.
5. **Save**. Do **not** Start rollout to Production.

After testers confirm: **Promote** to Production (reuse 131) → Send for
review if prompted.

## 6. What's new (paste)

**en-US**

```text
Home screen now matches baahrakhari.com more closely.

• Headlines occupy the top of Home (up to 12 rows) with a slim शीर्ष समाचार ribbon
• ताजा समाचार stays as a larger horizontal strip underneath
• Header is logo + Nepali date; theme and Saved live in the burger menu
• Share from headline rows; Contact us in the drawer (Nepali then English)
```

**ne-NP**

```text
गृहपृष्ठ अब baahrakhari.com सँग अझ मिल्दोजुल्दो छ।

• शीर्ष समाचार गृहपृष्ठको माथिल्लो भागमा (१२ सम्म) पातलो रिबनसहित
• ताजा समाचार त्यस मुनि ठूलो तेर्सो स्ट्रिप
• हेडरमा लोगो र नेपाली मिति; थिम र सुरक्षित लेखहरू बर्गर मेनुमा
• शीर्ष समाचारमा सेयर; Contact us ड्रअरमा (नेपाली, त्यसपछि अंग्रेजी)
```

## 7. Phone screenshots (Play listing)

Upload the 9:16 phone set (1080×1920 PNG):

`marketing/screenshots/android-phone-1080x1920/`

| File | Screen |
|---|---|
| `01_home.png` | Home — logo + date, शीर्ष समाचार, ताजा strip |
| `02_article.png` | Headline / article reader |
| `03_drawer.png` | Burger menu (theme, saved, Contact us) |
| `04_saved.png` | Saved articles |
| `05_dark_home.png` | Home in dark theme |

Regenerate: `npm run screenshots:store` (or `./scripts/capture_store_screenshots.sh android`).

**2026-09-04 capture:** iPhone App Store set is in
`marketing/screenshots/iphone-1284x2778/` (`01_home`, `02_article`, `03_drawer`).
Pixel_10_API_36 hit a **System UI isn’t responding** ANR, so Play phone
PNGs in `android-phone-1080x1920/` are **not** listing-ready. Recapture
Android after a clean emulator boot (or tap **Wait**, then relaunch the
app) before uploading to Play.

## 8. After you Save in Console

Update this file’s date and tick the Console boxes in
`NEWS_POLICY_COMPLIANCE.md`. Git tag `v1.4.0` / `main` are already on origin.
Never commit `android/gradle.properties`.
