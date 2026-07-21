# App Store Connect Metadata — Baahrakhari

Copy-paste source for the **App Information** and **Version** sections in
App Store Connect. Provided in two locales:

- `en-US` — primary listing
- `ne-NP` — Nepali localisation (recommended; ASC supports Nepali UI strings
  even though it isn't a "primary" locale option for the storefront — you can
  still add it as an additional localisation)

Hard limits in parentheses are Apple's character caps.

---

## App Information (fixed across versions)

| Field | Value |
|---|---|
| Bundle ID | `com.baahrakhari` |
| ASC App ID | `1461739733` (existing live app — version update, not new listing) |
| SKU | `12365478` (unchanged since first release) |
| Primary language | English (U.S.) |
| Primary category | News |
| Secondary category | Magazines & Newspapers |
| Content rights | Contains third-party content → **Yes** (see REVIEW_NOTES.md) |
| Age rating | 12+ (News & Information frequent/intense) |

---

## Version 1.1.0 — Listing copy

### English (en-US)

**App name** (30): `Baahrakhari`

**Subtitle** (30): `बाह्रखरी समाचार · Nepal news`

**Promotional text** (170, editable without resubmit):
> Stay current with Baahrakhari — the latest news from Nepal across politics,
> economy, sports, and opinion, in clean Nepali typography on iPhone and iPad.

**Description** (4000):
```
Baahrakhari brings the live news feed of baahrakhari.com to your iPhone and
iPad, redesigned for fast, distraction-free reading in clean Devanagari
typography.

WHAT YOU CAN DO
• Swipe through the latest headlines across every Baahrakhari section
  (पछिल्ला, राजनीति, अर्थ, खेल, विचार, देश, साहित्य, सम्पादकीय, विदेश).
• Tap any article to read the full story in a calm, single-column layout.
• Pinch to zoom the Nepali body type to whatever size is comfortable — your
  preference is remembered.
• Save articles for later with one tap; saved stories open instantly even
  when you're offline.
• Light and dark modes follow your system theme or can be locked manually.
• Optional gentle reminders when fresh top stories arrive (at most once
  per hour, fully off by default).

WHY YOU'LL LIKE IT
• Built around how Nepali readers actually read — no autoplay video, no
  cluttered ads, no pop-ups.
• iPad-optimised: bigger type, full-width category bar, and a glass-style
  next-article button for long reading sessions.
• Respects your data: all preferences stay on your device. No account, no
  login, no tracking SDKs.

ABOUT
Baahrakhari (बाह्रखरी) is one of Nepal's established online news outlets.
This app is the official mobile companion of baahrakhari.com.
```

**Keywords** (100 chars total, comma-separated, no spaces after commas):
```
news,nepal,nepali,kathmandu,समाचार,बाह्रखरी,politics,sports,opinion
```

**Support URL** (required, must be live HTTPS):
`https://baahrakhari.com/support`  *(create this page or point at a Notion / GitHub-Pages support page)*

**Marketing URL** (optional):
`https://baahrakhari.com`

**Privacy Policy URL** (required):
`https://baahrakhari.com/privacy`  *(host `PRIVACY.md` here — see PRIVACY.md)*

**Copyright** (50):
`© 2026 Baahrakhari Pvt. Ltd.`

---

### Nepali (ne-NP)

**App name**: `बाह्रखरी`

**Subtitle**: `नेपालका समाचार र विचार`

**Promotional text**:
> राजनीति, अर्थ, खेल, विचारसहितका बाह्रखरीका ताजा समाचार अब iPhone र iPad मा —
> सफा देवनागरी अक्षरमा, सरल पठनशैलीमा।

**Description**:
```
बाह्रखरी एप्लिकेसनले baahrakhari.com का ताजा समाचार तपाईंको iPhone वा iPad मा
सजिलो, सफा देवनागरी टाइपोग्राफीमा पुर्‍याउँछ।

मुख्य सुविधाहरू
• पछिल्ला, राजनीति, अर्थ, खेल, विचार, देश, साहित्य, सम्पादकीय र विदेश —
  सबै शीर्षकहरू एकै ठाउँमा।
• कुनै पनि समाचारलाई ट्याप गरेर एकल कलममा शान्त पठनशैलीमा पढ्नुहोस्।
• नेपाली अक्षरको आकार पिञ्च गरेर मनपर्ने साइजमा सेट गर्नुहोस् — एप्ले याद राख्छ।
• मनपरेका समाचार सेभ गर्नुहोस्; इन्टरनेट नहुँदा पनि तुरुन्तै खोल्नुहोस्।
• प्रणालीसँगै बदलिने वा आफै लक गर्न सकिने अध्यारो/उज्यालो मोड।
• चाहिए मात्र: हरेक घण्टामा बढीमा एकपटक आउने नयाँ समाचारको शान्त सूचना।

तपाईंको गोपनीयता
सबै सेटिङ तपाईंको यन्त्रमै रहन्छ। कुनै खाता चाहिँदैन, कुनै ट्र्याकर छैन।

बाह्रखरीबारे
बाह्रखरी नेपालको पुरानो र विश्वसनीय अनलाइन समाचार पोर्टल हो।
यो एप त्यसैको आधिकारिक मोबाइल साथी हो।
```

**Keywords**:
```
समाचार,बाह्रखरी,नेपाल,काठमाडौं,राजनीति,खेलकुद,अर्थ,विचार,देश
```

---

## What's New in This Version — 1.1.0

Editable per-version field. Use this on first submit:

### en-US
```
First public release of Baahrakhari for iPhone and iPad.

• Full Baahrakhari news feed across nine sections
• Adaptive reading layout for iPhone and iPad
• Pinch-to-zoom Nepali body type, your size is remembered
• Offline-ready saved articles
• Light and dark mode
• Optional once-per-hour new-story reminder
```

### ne-NP
```
iPhone र iPad का लागि बाह्रखरीको पहिलो सार्वजनिक संस्करण।

• नौ वटै शीर्षकको पूरै बाह्रखरी फिड
• iPhone र iPad दुवैका लागि छुट्टै अनुकूलित ले-आउट
• पिञ्च-टु-जुम — मनपर्ने अक्षर साइज याद रहन्छ
• अफलाइनमा पनि खुल्ने सेभ गरिएका समाचार
• उज्यालो र अध्यारो मोड
• चाहिए मात्र — एक घण्टामा बढीमा एक पटक मात्र आउने सूचना
```

---

## Phased release plan (recommended)

| Phase | Audience | Build | Notes |
|---|---|---|---|
| 0 | Internal TestFlight | 1.1.0 (1) | Just the team |
| 1 | External TestFlight | 1.1.0 (1) | 50–100 invitees; collect feedback for ~1 week |
| 2 | Phased App Store release | 1.1.0 (1) | 1% → 100% over 7 days (Apple default) |
| 3 | Full availability | 1.1.0 (2)+ | Fixes from phase 1/2 reports |

In ASC → Version Release pick **"Automatically release this version using
phased release for automatic updates"** for Phase 2.
