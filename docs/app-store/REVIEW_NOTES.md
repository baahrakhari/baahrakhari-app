# Apple App Review — Reviewer-facing notes

Paste this into App Store Connect → App Information → **App Review Information →
Notes** field when you submit. It pre-empts the three most common rejection
reasons for a news-aggregator app.

---

## Sign-in credentials

Not required — the App does not have any login or account system.
Reviewer can simply open the App and start reading.

## Demo path the reviewer can follow (30 seconds)

1. Launch the App. The splash shows the 12khari mark over a faded Nepali
   flag, then the feed loads.
2. Swipe up/down — articles in the *पछिल्ला* (Latest) section.
3. Tap any category chip (e.g. *खेल* / Sports) — the feed refilters.
4. Tap an article hero image to open the full article view.
5. Pinch on the article body — the Nepali type resizes.
6. Tap the bookmark icon top-right — the article is saved to the read-later
   list (icon button at top-left, the bookmark icon).
7. Toggle the sun/moon icon top-right — switches light/dark theme.

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
- No advertising SDKs or third-party analytics.

## Contact during review

| Role | Name | E-mail | Phone (with country code) |
|---|---|---|---|
| Primary | *<filled in ASC>* | *<filled in ASC>* | *<+977 …>* |
| Backup | *<filled in ASC>* | *<filled in ASC>* | *<+977 …>* |

If anything is unclear, please reach out at the e-mail above; we'll reply
the same business day (UTC+05:45).
