# Apple App Review — Reviewer-facing notes

Paste this into App Store Connect → App Information → **App Review Information →
Notes** field when you submit. It pre-empts the three most common rejection
reasons for a news-aggregator app.

---

## Sign-in credentials

Not required — the App does not have any login or account system.
Reviewer can simply open the App and start reading.

## Demo path the reviewer can follow (30 seconds)

1. Launch the App. After the splash, Home shows the Baahrakhari logo, the
   Nepali date, **शीर्ष समाचार** (larger two-line type), optional static
   house banners, a **ताजा समाचार** horizontal strip, then the same
   category sections as the burger menu (राजनीति, अर्थ, खेल, विचार, देश,
   साहित्य, सम्पादकीय, विदेश).
2. Long-press a Top News headline to save it. Share lives on the article
   reader, not on the Home row.
3. Tap the logo — returns to Home. Open the burger (top-left); tap the
   dimmed overlay to close. Theme control is at the **bottom** of the
   drawer. **सुरक्षित लेखहरू** and **सम्पर्क गर्नुहोस्** / **Contact us**
   are in the drawer with the categories.
4. Open **हाम्रो टिम**. Each section starts collapsed with the **first two
   members** visible; the dropdown reveals the rest (hierarchy order
   preserved).
5. Tap a **शीर्ष समाचार** row or a **ताजा** card to open the article.
6. Pinch on the article body — the Nepali type resizes. Bookmark and share
   are on the reader.
7. Open Saved from the drawer.

Home may show a few **first-party static banners** scraped from
baahrakhari.com (images only; GIFs show the first frame). They sit in the
Home list, never cover the article, and are **not** AdMob / not a
third-party ad SDK. Tapping a banner may open the advertiser URL in the
system browser.

## Content-rights statement (relevant to Guideline 5.2.3)

Baahrakhari Pvt. Ltd. is the publisher both of **baahrakhari.com** and of
this App. The App displays articles from baahrakhari.com because the
publisher is the same legal entity; no third-party content is aggregated
without permission.

Supporting evidence available on request:

- Domain WHOIS for baahrakhari.com listing the same registrant.
- Trademark / business registration in Nepal (English translation
  available — Certificate of Translation Accuracy issued by
  *<Tier-A/B translation provider>* on *<date>*).

## Encryption — non-exempt encryption answer

The App uses **only** standard HTTPS (TLS) for network requests, which falls
under Apple's encryption exemption (`exempt` for HTTPS-only apps). The flag
`ITSAppUsesNonExemptEncryption` is set to `false` in Info.plist, so no
year-end CCATS filing is required.

## Notifications

The App schedules **local-only** notifications via the iOS UserNotifications
framework (no APNs / remote push). The notification permission prompt is
shown only when the user opts in to the once-per-hour reminder. Notification
content is composed on-device from already-downloaded article titles; no
content is sent to or received from a server for the notification itself.

## What's intentionally not in the App (to avoid scope confusion)

- No user accounts, no social login, no in-app purchases.
- No location services (the empty `NSLocationWhenInUseUsageDescription`
  string in earlier builds was removed in 1.1.0).
- No camera, microphone, contacts, photos, calendar, or motion data access.
- No AdMob, no IDFA, no third-party advertising or analytics SDKs.
  Home-only static house banners from baahrakhari.com are first-party
  images, not an ad network.

## Contact during review

| Role | Name | E-mail | Phone (with country code) |
|---|---|---|---|
| Primary | *<filled in ASC>* | *<filled in ASC>* | *<+977 …>* |
| Backup | *<filled in ASC>* | *<filled in ASC>* | *<+977 …>* |

If anything is unclear, please reach out at the e-mail above; we'll reply
the same business day (UTC+05:45).
