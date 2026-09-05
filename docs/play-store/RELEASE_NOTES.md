# Google Play Release Notes — Baahrakhari

Copy-paste source for Android release notes in Play Console.

| Field | Value |
|---|---|
| Package | `com.baahrakhari.media` |
| Contact URL (News declaration) | `https://baahrakhari.com/contact` |
| **Current release** | `1.4.0` (`versionCode 131`) — Prateek home/drawer cut |

Full upload checklist: `docs/play-store/NEWS_POLICY_COMPLIANCE.md`

---

## 1.4.0 — current release (upload this)

Home-feed redesign from Prateek’s feedback: website-style headlines pane,
slim ribbons, drawer Home/theme/save, Nepali date, and Play-visible
Contact us. Dual iOS + Android cut. **Ads (item 9) were not added** —
do not claim ads in Play listing, Data safety, or News declarations.

| | |
|---|---|
| **versionName** | `1.4.0` |
| **versionCode** | `131` (must be **> 130**; last production cut was `1.3.0` / `130`) |
| **applicationId** | `com.baahrakhari.media` |
| **targetSdk** | `36` (compileSdk 36, minSdk 24) |
| **AAB to upload** | `android/app/build/outputs/bundle/release/app-release.aab` |
| **Absolute AAB path** | `/Users/praak/cursor_12KHARI/baahrakhari-app/android/app/build/outputs/bundle/release/app-release.aab` |
| **Verified** | 2026-09-03 — APK `aapt dump badging`: package `com.baahrakhari.media`, `versionCode=131`, `versionName=1.4.0`, `targetSdkVersion=36`. AAB `jarsigner -verify`: **jar verified.** APK `apksigner verify`: **Verifies** (v2). Signer `CN=12 Khari`, `O=Baahrakhari`. |
| **Git** | local `main` `fbd08aa`, annotated tag `v1.4.0` (not pushed; `main` has no upstream) |
| **Play API upload** | **Not configured** — no Fastlane `supply`, no service-account JSON, no `google-play` script. Console-only. |

Wizard: `npm run play:wizard` (`docs/play-store/PLAY_UPLOAD_WIZARD.md`).
Click-through: `docs/play-store/UPLOAD_NEW_RELEASE.md`. Policy: `docs/play-store/NEWS_POLICY_COMPLIANCE.md`.

### What's new (en-US)

```text
Home screen now matches baahrakhari.com more closely.

• Headlines occupy the top of Home (up to 12 rows) with a slim शीर्ष समाचार ribbon
• ताजा समाचार stays as a larger horizontal strip underneath
• Header is logo + Nepali date; theme and Saved live in the burger menu
• Share from headline rows; Contact us in the drawer (Nepali then English)
```

### What's new (ne-NP)

```text
गृहपृष्ठ अब baahrakhari.com सँग अझ मिल्दोजुल्दो छ।

• शीर्ष समाचार गृहपृष्ठको माथिल्लो भागमा (१२ सम्म) पातलो रिबनसहित
• ताजा समाचार त्यस मुनि ठूलो तेर्सो स्ट्रिप
• हेडरमा लोगो र नेपाली मिति; थिम र सुरक्षित लेखहरू बर्गर मेनुमा
• शीर्ष समाचारमा सेयर; Contact us ड्रअरमा (नेपाली, त्यसपछि अंग्रेजी)
```

### Short (en-US)

```text
Home redesigned to match the website headlines layout; Contact us still in the menu.
```

### Short (ne-NP)

```text
गृहपृष्ठ वेबसाइटको शीर्ष समाचार लेआउटअनुसार; Contact us मेनुमै रहन्छ।
```

### Pre-upload checklist (1.4.0)

- [ ] Signing: local `android/gradle.properties` has `MYAPP_UPLOAD_*` and
      `APP_APPLICATION_ID=com.baahrakhari.media` (**never commit** this file)
- [ ] `APP_VERSION_CODE=131` and `APP_VERSION_NAME=1.4.0` (bump if Play already
      saw `131` on any track, including draft)
- [ ] AAB path above exists and still dumps as `1.4.0` / `131` / `com.baahrakhari.media`
- [ ] `targetSdk` 36 (meets Play’s current target-API requirement)
- [ ] **Contact us** visible: Android home footer **Contact Us** (English) **and**
      burger row **सम्पर्क गर्नुहोस्** / **Contact us** (two lines)
- [ ] Play Console **News and magazine apps** contact URL still
      `https://baahrakhari.com/contact`
- [ ] Play Console **Data safety**: do **not** declare ads or advertising ID
      (no ad SDK this cut; no `AD_ID` permission). Item 9 (road-block /
      content-block ads) was **skipped**. Confirm the existing form still
      matches: no ads, optional notifications, Firebase/FCM present only via
      the local-notification library
- [ ] Listing / Data safety / News declaration do **not** claim ads
- [ ] Privacy policy URL still live (`https://baahrakhari.com/page/privacy-policy`)
- [ ] Expected non-blocking Play warning: missing deobfuscation file
      (R8 off — see `DEOBFUSCATION_NOTE.md`)

### Play Console — recommended first upload (internal testing)

Do **not** roll out to production on the first pass. Default track:
**Testing → Internal testing** (or an existing unpublished draft).

1. [play.google.com/console](https://play.google.com/console) → **Baahrakhari**
   (`com.baahrakhari.media`)
2. Confirm Store settings + News declaration (only if contact info changed) —
   see `NEWS_POLICY_COMPLIANCE.md`
3. **Release → Testing → Internal testing** → **Create new release**
   (or open an existing draft on that track)
4. **Upload** the AAB at the path in the table above
5. Paste **What's new** (en-US + ne-NP) from this section
6. **Save** the release
7. **Stop here** until you have sideloaded/internal testers confirm Home,
   Contact us, and no ads. Do **not** click **Start rollout to Production**.
8. After internal verify: either **Promote** this release to Production, or
   create a Production release with the **same** AAB (do not bump
   `versionCode` if you are promoting; Play already has `131`)
9. Production: review summary → choose staged % or 100% → **Start rollout**
   only when you intend to go live → **Publishing overview → Send for review**
   if prompted

### Production upgrade (after internal verify)

Same AAB. Play Console → **Release → Production** → Create release (or
**Promote** from Internal testing) → notes → review → rollout. Stop before
**Start rollout to Production** if you only wanted a draft sitting in the
Production track.

### Play API (not available in this repo)

No service account, Fastlane `supply`, or `google-play` upload script is
checked in. Do **not** invent credentials. If you later add a Play Console
service-account JSON, a **draft / internal** upload would look like:

```sh
# Example only — not wired. Never use track production / completed on first cut.
# fastlane supply \
#   --aab android/app/build/outputs/bundle/release/app-release.aab \
#   --package_name com.baahrakhari.media \
#   --track internal \
#   --release_status draft \
#   --skip_upload_metadata \
#   --skip_upload_images \
#   --skip_upload_screenshots \
#   --json_key /path/to/play-service-account.json
```

Until that JSON exists, use the Console click-through only.

---

## 1.3.0 — superseded (do not upload)

Production version bump for Google Play (versionCode 130). Same feature set
as 1.2.9 (editor attribution fix, Contact Us / News policy compliance) —
this build exists solely to move the release from open testing into
Production with a fresh, unused versionCode.

### What's new (en-US)

```text
Version bump for the production release. No new features since 1.2.9.

• Continued Contact Us / News policy compliance on Android
• Corrected Editor-in-Chief name (Prateek Pradhan) shown on the Contact Us page
• General reading and stability improvements
```

### What's new (ne-NP)

```text
प्रोडक्शन रिलिजका लागि भर्सन अपडेट। 1.2.9 पछि नयाँ सुविधा थपिएको छैन।

• Android मा Contact Us / News नीति अनुपालन निरन्तरता
• Contact Us पृष्ठमा प्रधान सम्पादकको नाम (Prateek Pradhan) सुधार
• सामान्य पठन र स्थिरता सुधार
```

### Short (en-US)

```text
Production release version bump; same improvements as 1.2.9.
```

### Short (ne-NP)

```text
प्रोडक्शन रिलिज भर्सन अपडेट; 1.2.9 सरहका सुधारहरू।
```

---

## 1.2.9 — superseded (do not upload)

Editor attribution fix plus continued Contact Us / News policy compliance
follow-through on Android.

### What's new (en-US)

```text
Attribution fix and continued reading improvements.

• Corrected Editor-in-Chief name (Prateek Pradhan) shown on the Contact Us page
• Home feed footer Contact Us section (Android) reconfirmed and polished
• General reading and stability improvements
```

### What's new (ne-NP)

```text
Attribution सुधार र पठन अनुभवमा निरन्तर सुधार।

• Contact Us पृष्ठमा प्रधान सम्पादकको नाम (Prateek Pradhan) सुधार
• गृहपृष्ठ footer मा Contact Us खण्ड (Android) पुनःपुष्टि र सुधार
• सामान्य पठन र स्थिरता सुधार
```

### Short (en-US)

```text
Editor attribution fix and general reading/stability improvements.
```

### Short (ne-NP)

```text
Editor attribution सुधार र सामान्य पठन/स्थिरता अपडेट।
```

---

## 1.2.7 — superseded (do not upload)

Addresses Google Play News policy feedback: dedicated, clearly labeled **Contact Us** section.

### What's new (en-US)

```text
Contact Us improvements for Google Play News policy compliance.

• Dedicated Contact Us page with publisher name, phone, email, and office address
• Contact Us button in the app header and category bar
• Home feed footer with a clearly labeled Contact Us section (phone and email shown)
• About links separated from contact information
• General reading and stability improvements
```

### What's new (ne-NP)

```text
Google Play News नीति अनुपालनका लागि Contact Us सुधार।

• प्रकाशक नाम, फोन, इमेल र कार्यालय ठेगानासहित समर्पित Contact Us पृष्ठ
• हेडर र category bar मा Contact Us बटन
• गृहपृष्ठ footer मा Contact Us खण्ड (फोन र इमेल देखाइएको)
• सम्पर्क जानकारीबाट About लिङ्क अलग
• सामान्य पठन र स्थिरता सुधार
```

### Short (en-US)

```text
Dedicated Contact Us page and header button; phone, email, and address clearly shown.
```

### Short (ne-NP)

```text
समर्पित Contact Us पृष्ठ र हेडर बटन; फोन, इमेल र ठेगाना स्पष्ट।
```

---

## 1.2.6 — superseded (do not upload)

Includes News policy compliance (Contact Us) plus share-icon rendering fix on Android.

Was: `1.2.6` (`versionCode 126`)

### What's new (en-US)

```text
Contact, reading, and UI improvements.

• Contact Us page with phone, email, and office address (English copy included)
• Contact link at the bottom of the home feed
• Article bylines show author or Baahrakhari as publisher
• Fixed share icon rendering while swiping between articles
• General reading and stability improvements
```

### What's new (ne-NP)

```text
सम्पर्क, पठन र UI सुधार।

• फोन, इमेल र कार्यालय ठेगानासहित Contact Us पृष्ठ (अङ्ग्रेजी प्रतिलिपि समेत)
• गृहपृष्ठको तल Contact Us लिङ्क
• लेखक वा प्रकाशक (बाह्रखरी) attribution
• लेखहरू बीच swipe गर्दा share icon rendering सुधार
• सामान्य पठन र स्थिरता सुधार
```

### Short (en-US)

```text
Contact Us page, publisher attribution, share icon fix, and stability improvements.
```

### Short (ne-NP)

```text
Contact Us पृष्ठ, प्रकाशक attribution, share icon सुधार, र स्थिरता अपडेट।
```

---

## 1.2.5 — superseded (do not upload)

Built for initial policy resubmission; superseded by **1.2.7**.

- Was: `1.2.5` (`versionCode 125`)

---

## 1.2.4 — previous major update

- Was: `1.2.4` (`versionCode 124`)

### What's new (en-US)

```text
Major update for Baahrakhari on Android.

• Refreshed reading experience with cleaner Nepali typography
• Full Baahrakhari feed across key sections
• Faster feed refresh and smoother scrolling
• Pinch-to-zoom article text with remembered size
• Save articles for offline reading
• Improved light and dark mode experience
• Optional new-story reminders (off by default)
• Stability and performance improvements
```

### What's new (ne-NP)

```text
Android मा बाह्रखरीको ठूलो अपडेट।

• सफा देवनागरी टाइपोग्राफीसहित नयाँ पठन अनुभव
• मुख्य शीर्षकहरूमा बाह्रखरीको पूरै समाचार फिड
• अझ छिटो र स्मूथ फिड रिफ्रेस र स्क्रोलिङ
• पिञ्च-टु-जुम — मनपर्ने अक्षर साइज याद रहने
• अफलाइनमा पनि खुल्ने सेभ गरिएका समाचार
• उज्यालो र अध्यारो मोडमा सुधारिएको अनुभव
• चाहिए मात्र नयाँ समाचारको सूचना (पूर्वनिर्धारित रूपमा बन्द)
• स्थिरता र कार्यसम्पादनमा सुधार
```
