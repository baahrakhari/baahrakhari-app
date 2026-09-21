# Baahrakhari — Privacy Policy

*Last updated: 11 May 2026*

> **Hosting**: this file must be publicly reachable over HTTPS before you
> submit to the App Store. Easiest options:
>
> - **GitHub Pages**: enable Pages on this repo → the URL becomes
>   `https://<org>.github.io/<repo>/docs/app-store/PRIVACY.html`
>   (convert with `pandoc PRIVACY.md -o PRIVACY.html`).
> - **Vercel/Netlify**: deploy a tiny static site that serves this Markdown
>   rendered to HTML.
> - **Your own site**: the live page is `https://baahrakhari.com/page/privacy-policy`.
>
> Whichever path you pick, paste that exact HTTPS URL in App Store Connect →
> App Privacy → Privacy Policy URL.

---

## Overview

The Baahrakhari mobile app ("the App") is published by **Baahrakhari Pvt. Ltd.**
("we", "us"). The App is a reader for news content published at
[baahrakhari.com](https://baahrakhari.com). This policy explains what the App
does — and just as importantly, what it does **not** do — with your data.

The App is designed to work without an account, without tracking SDKs, and
without sending any personal information off your device.

---

## What the App collects from you

| Category | Collected? | Where it lives | Why |
|---|---|---|---|
| Name / e-mail / phone | **No** | — | The App has no sign-up or login. |
| Account / user ID | **No** | — | Same reason. |
| Precise or coarse location | **No** | — | Not used. |
| Contacts, calendar, photos | **No** | — | Not requested by the App. |
| Camera, microphone | **No** | — | Not requested by the App. |
| Health, finance, browsing history | **No** | — | Not relevant to a news reader. |
| Device IDs (IDFA / IDFV) | **No** | — | We don't run an ad SDK. |
| Crash logs | Yes — via Apple, anonymised | Apple's App Analytics, opt-in | Helps us fix crashes; you choose whether to share. |
| Saved articles + reading-size preference | Yes | Your device only (`AsyncStorage`) | Restoring your reading list and font size when you reopen the App. |
| Notification permission state | Yes | Your device only | Lets the optional once-per-hour new-story reminder work. |

In Apple's "App Privacy" nutrition-label questionnaire, the correct answers
for this build (1.5.0) are:

- **Data Linked to You**: *None*
- **Data Not Linked to You**: *Crash Data* — *App Functionality* — *No, not used for tracking*
- **Data Used to Track You**: *None*
- **Advertising data / tracking / IDFA**: *None*. The App does **not**
  collect data for advertising. Home may display a few **first-party
  static house banners** (images from baahrakhari.com). There is **no
  AdMob**, no third-party ad SDK, and no Advertising Identifier.

---

## What the App fetches from the internet

The App makes HTTPS requests to **baahrakhari.com** (and CDN subdomains it
uses for images) to download the article feed. These requests include only
information the server requires to serve a page:

- The article slug or feed URL you've navigated to.
- Your device's IP address (visible to any web server by the nature of HTTP).
- A standard User-Agent string identifying the App build.

These requests do **not** include any account identifier or any reference
that could let baahrakhari.com tie individual readers together over time.
Baahrakhari's own [website privacy policy](https://baahrakhari.com/page/privacy-policy)
governs how baahrakhari.com handles the IP address it sees.

---

## Third-party SDKs and trackers

The App ships with **no third-party analytics or advertising SDKs** (no
AdMob). Home-only house banners are static images fetched from
baahrakhari.com, not an ad network. The runtime dependency list (as of
v1.5.0) is:

- `@react-native-async-storage/async-storage` — local key-value storage on your device
- `@react-native-community/push-notification-ios` — local notifications only
- `react-native-gesture-handler` — touch handling
- `react-native-push-notification` — local notifications only
- `react-native-safe-area-context` — layout helper
- `react`, `react-native` — the framework itself

None of the above sends data off your device.

---

## Notifications

If you enable the optional reminder, the App schedules a **local** iOS
notification at most once per hour when new top stories are detected. Because
the notification is local, the message text and timing never leave your
device. The App does not register for remote (APNs) push.

You can disable the reminder at any time from inside the App or from
iOS Settings → Notifications → Baahrakhari.

---

## Children's privacy

The App is not directed at children under 13, and we don't knowingly collect
personal information from anyone under 13. If you believe a child has used
the App and you'd like the saved data wiped on their device, deleting the
App removes everything it stored.

---

## Your control over data

Because everything the App stores lives on your device, you control it
directly:

- **Saved articles + reading size**: clear from inside the App
  (Saved list → swipe to remove) or by uninstalling the App.
- **Notification permission**: iOS Settings → Notifications → Baahrakhari.
- **App Analytics opt-in**: iOS Settings → Privacy & Security → Analytics &
  Improvements → Share With App Developers.

There is no server-side account, so there is nothing for us to delete on
your behalf.

---

## Changes to this policy

If we ever start collecting any new category of data, we'll update this page
and bump the *Last updated* date. Material changes will also be called out
in the App's "What's New" notes for the version that introduces them.

---

## Contact

Privacy questions:
**Baahrakhari Pvt. Ltd.** — `privacy@baahrakhari.com`
*(replace with the correct contact address before publishing)*
