# Baahrakhari — iOS / iPadOS App Store Pre-Launch Checklist

End-to-end path from "no Apple Developer account" to "live on the App Store".
Each item is independently verifiable; mark as you go.

---

## 0. Identity & legal (longest lead-time — start first)

- [ ] **D-U-N-S Number** for the publishing org
      - Apply free at <https://developer.apple.com/enroll/duns-lookup/>
      - Lead time: 1–5 business days (Nepal). D&B will phone the registered org number.
- [ ] **Apple Developer Program enrollment** as **Organization** ($99/yr)
      - <https://developer.apple.com/programs/enroll/>
      - Have ready: D-U-N-S number, legal entity name (must match D&B exactly),
        country of incorporation, registered phone (D&B must be able to call it),
        an authorised-signer name + title.
- [ ] **PAN (व्यक्तिगत/स्थायी लेखा नम्बर) translated to English** — verifiable.
      - Preferred: notarised translation from a Nepal-licensed sworn translator.
      - Acceptable alternative: ISO-17100 certified agency
        (Stepes, Gengo + notary, TheWordPoint) — keep their Certificate of Accuracy.
      - Keep the **original Devanagari PDF** + **English translation PDF** + the
        **translation certificate** together in `private/legal/` (gitignored).
- [ ] **W-8BEN-E** (US tax form for non-US org) — fill out in App Store Connect
      under *Agreements, Tax, and Banking*. Without a US tax treaty Nepal pays
      30% backup withholding on US-store revenue; non-US territories unaffected.
- [ ] **Bank account in legal-entity name** — required even for free apps
      (Apple still gates publishing on completed banking section in some flows).

---

## 1. Technical configuration (this repo)

- [x] Bundle ID `com.baahrakhari` set in Xcode build settings (matches live App Store app)
- [x] Display name "Baahrakhari" set in `Info.plist`
- [x] Marketing version `1.1.0`, build `1` in `project.pbxproj`
- [x] App icons (1024 + mipmap set) generated in `Images.xcassets/AppIcon.appiconset`
- [x] Launch screen `LaunchScreen.storyboard` configured
- [x] `PrivacyInfo.xcprivacy` present (declares data categories)
- [x] Empty `NSLocationWhenInUseUsageDescription` purpose-string **removed**
      (was a guaranteed binary-scan rejection)
- [x] **Automatic signing** configured for team **Baahrakhari Media**
      (`DEVELOPMENT_TEAM=WGWJBSHXG5`, `CODE_SIGN_STYLE=Automatic` in
      `project.pbxproj`)
- [x] `ITSAppUsesNonExemptEncryption=false` in `Info.plist` (skips export-compliance
      prompt on every upload)
- [ ] **Push notification entitlement** added in Xcode → Signing & Capabilities
      (the app uses local notifications via `react-native-push-notification`,
      but if you also enable remote push you'll need the entitlement + APNs key).
- [ ] **New Architecture** (`RCTNewArchEnabled=true` in Info.plist) confirmed
      working on a real device (some 3rd-party libs misbehave on first install
      even after sim works — test before archiving).

### Version-bump procedure
```sh
# Bump marketing version (user-visible) and build number (must be unique per upload):
xcrun agvtool new-marketing-version 1.2.0   # in ios/
xcrun agvtool next-version -all              # increments CFBundleVersion
```

---

## 2. App Store Connect record

**This is a version update**, not a new listing. The live app already exists:

| Field | Value |
|---|---|
| App name | Baahrakhari |
| Bundle ID | `com.baahrakhari` |
| ASC App ID | `1461739733` |
| Live version | 1.0 |

Verify with:
```sh
export ASC_KEY_ID=4T2A93HW9T
export ASC_ISSUER_ID=9c500f8b-2618-4f29-9688-de355b0b4df7
python3 scripts/asc_api.py
```

After uploading a build, in ASC → **Baahrakhari** → **+ Version** → **1.1.0** → attach the build.

- [x] **App record exists** — do not create a new app or use `com.baahrakhari.mobile`
- [ ] **What's New in 1.1.0** — see `METADATA.md`
- [ ] **Subtitle**: see `METADATA.md`
- [ ] **Primary category**: News
- [ ] **Secondary category** (optional): Magazines & Newspapers
- [ ] **Age rating**: complete questionnaire (expected: 12+ for news content)
- [ ] **Content rights**: declare whether you display third-party content
      → answer **Yes** (you aggregate Baahrakhari articles) and confirm you
      have permission from baahrakhari.com / their copyright owner.
- [ ] **App privacy** section (per Apple's nutrition-label requirement):
      see `PRIVACY.md` for the per-field answers you'll paste in.
- [ ] **Description** (4000 char max), **promo text** (170 char), **keywords**
      (100 char comma-separated): see `METADATA.md` for EN + NP copy.
- [ ] **Support URL** and **Marketing URL** — live, publicly reachable.
- [ ] **Privacy Policy URL** — live HTTPS URL (host `PRIVACY.md` via GitHub
      Pages, Vercel, or your own site).

---

## 3. Screenshots & marketing assets

Apple's accepted iPhone screenshot sizes (use **one** set — portrait is fine for this app):

| Size | Portrait | Landscape |
|---|---|---|
| 6.7" | **1284×2778** | 2778×1284 |
| 6.5" | **1242×2688** | 2688×1242 |

iPad 13" (required because app supports iPad): **2064×2752** portrait.

Generate them with the helper script (resizes simulator captures to exact ASC pixels):
```sh
./scripts/capture_app_store_screenshots.sh              # 1284×2778 + iPad
./scripts/capture_app_store_screenshots.sh iphone --size 6.5   # 1242×2688 instead
```

Output paths:
- `marketing/screenshots/iphone-1284x2778/*.png`
- `marketing/screenshots/iphone-1242x2688/*.png` (with `--size 6.5`)
- `marketing/screenshots/ipad-2064x2752/*.png`

It walks the app through ~5 hero screens (feed, article, saved list, dark mode).

- [ ] At least 2, ideally 5, screenshots per device size
- [ ] Optional: **App Preview video** (15–30 sec) — same dimensions as
      screenshots, H.264 MP4

---

## 4. Build, archive, upload

- [ ] **App-specific password** OR **App Store Connect API key** generated:
      <https://appstoreconnect.apple.com/access/api>
      - Issuer ID, Key ID, and `.p8` private-key file
      - Store as `~/.appstoreconnect/private_keys/AuthKey_<KeyID>.p8`
- [ ] Run the archive + upload script:
      ```sh
      export ASC_KEY_ID=ABC1234567
      export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      ./scripts/ios_archive_upload.sh
      ```
      Output: signed `.ipa` in `build/ios/Baahrakhari.ipa`, then uploaded to
      App Store Connect via `xcrun altool`.
- [ ] Wait for the **"Processing"** badge in App Store Connect → TestFlight
      → Builds (usually 10–30 min). When it flips to **"Ready to Submit"**
      you'll get an email.

---

## 5. TestFlight (highly recommended before public submit)

- [ ] Add **internal testers** (members of your team)
- [ ] Add **export-compliance** answer (the app uses HTTPS → standard answer:
      "Yes, uses encryption → only with exempt categories → no annual report").
      Set `ITSAppUsesNonExemptEncryption=false` in `Info.plist` to skip every
      upload prompt — already safe for this app since HTTPS-only.
- [ ] Run the app on **at least one real iPhone and one real iPad** via the
      TestFlight build.
- [ ] Add an **external testing group** (optional) — requires a separate
      "beta app review" pass that's faster than full review.

---

## 6. Submit for App Store review

- [ ] In ASC → App Store → Prepare for Submission, select the TestFlight
      build that passed your testing.
- [ ] Fill in **App Review Information**:
      - Sign-in credentials (none — the app doesn't require login → say "Not Required")
      - Notes: see `REVIEW_NOTES.md`
      - Attachment (optional): demo video, screenshots of the source feed
- [ ] **Version Release** — pick "Automatically release after approval" or
      "Manually release this version".
- [ ] Click **Submit for Review**.

Typical review time: 24–48 hours. Most common rejection reasons for this kind
of app:

1. Empty/placeholder purpose strings → already fixed above.
2. Aggregator without proven content rights → see `REVIEW_NOTES.md` template.
3. Missing privacy-policy URL → ensure `PRIVACY.md` is publicly hosted.
4. New Architecture crash on first launch on a clean device → install fresh
   on a real device before submitting.

---

## 7. Post-launch

- [ ] Tag the release: `git tag ios-1.1.0-build1 && git push origin --tags`
- [ ] Save the archive (`*.xcarchive`) for symbolication of any crash reports
- [ ] Enable **crash reporting** in App Store Connect (no SDK change needed —
      Apple automatic crash collection works for the New Architecture).
- [ ] Watch the **App Analytics** dashboard for the first 72 h.
