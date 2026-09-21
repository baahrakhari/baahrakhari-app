# Release checklist — 1.5.0 (home ads, tablet, drawer)

Living task list. **1.5.0** sits on top of the 1.4.0 Prateek home/drawer cut.

| | |
|---|---|
| **Source** | `requirements_defects/new_requirements_09_2026.md` + 1.4.0 carry-forward |
| **Platforms** | iOS and Android (shared `App.tsx` unless noted) |
| **Version** | `1.5.0` (iOS build 5; Android `versionCode` 132, local `gradle.properties` only) |
| **Status** | In progress 2026-09-20 |
| **Last updated** | 2026-09-20 |
| **Ads this cut** | Home-only first-party static banners from `getAdvertisementData`. No AdMob, no road-block, no in-article ads. |

---

# Release checklist — Prateek feedback (1.4.0)

Living task list for the iOS + Android **1.4.0** cut, sourced from
`requirements_prateek.txt`. Kept below as history; current store cut is **1.5.0**.

| | |
|---|---|
| **Source** | `requirements_prateek.txt` |
| **Platforms** | iOS and Android (shared `App.tsx` unless noted) |
| **Version** | `1.4.0` (iOS build 4; Android `versionCode` 131, local `gradle.properties` only) |
| **Status** | Shipped in JS; Jest + `tsc` verified 2026-09-03; iOS sim 2026-09-02; Android Pixel_10_API_36 smoke 2026-09-03 |
| **Last updated** | 2026-09-03 |
| **Skipped this release** | Item 9 (ads — marked low priority in the source) |

Progress: 10 / 10 in-scope items implemented in shared JS (item 9 skipped;
item 4 is a consequence of 1–3). Verification below: iOS simulator, Android
Pixel_10 smoke, and Jest.

---

## How to use

- `- [ ]` not started · `- [x]` done · skipped items stay struck through
- Touch both simulators/devices before calling the cut *shipped*
- Keep `docs/play-store/NEWS_POLICY_COMPLIANCE.md` in sync if Contact Us
  copy or placement changes (Play News policy)

---

## Tasks

### 1. Logo as Home; drop extra Home button; Nepali date; drawer logo = Home

- [x] Header logo is the Home control (replaces the circular Home icon)
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] Extra Home button removed from the header
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] Nepali date shown below the logo (as on baahrakhari.com)
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] Burger-menu logo is also a Home control
  - [x] iOS (shared JS)
  - [x] Android (shared JS)

| | |
|---|---|
| **Priority** | High |
| **Status** | Done (shared RN) |
| **Code** | Header in `App.tsx`: burger + tappable logo + BS date. Drawer
  brand is tappable Home. Date from `useSiteHeaderDate` → scrape of
  `.current-date` / `innerHTML` on baahrakhari.com (`बिहीबार, भदौ १८, २०८३`
  format). Fallback: Nepal Time → BS via `src/format/nepaliDate.ts`. |
| **Notes** | Extra `ताजा समाचार` Home row removed from the drawer. |

### 2. Move dark / light toggle into the burger menu

- [x] Remove theme button from the header
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] Theme toggle lives in the burger menu (under the drawer logo)
  - [x] iOS (shared JS)
  - [x] Android (shared JS)

| | |
|---|---|
| **Priority** | High |
| **Status** | Done |
| **Notes** | Same sun/moon assets; persist via existing `isDark` state. |

### 3. Remove Save from the home header; keep it in the burger (optional icon)

- [x] Remove the Read-later / Save list button from the home header
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] Saved-articles entry remains in the burger menu (`सुरक्षित लेखहरू`)
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] Bookmark asset on the right of that drawer row (same save icon as
  article cards); saved sits directly under the theme toggle

| | |
|---|---|
| **Priority** | High |
| **Status** | Done |
| **Notes** | Per-article save/share on the ताजा swipe reader is unchanged. |

### 4. Header looks clean after 1–3

- [x] ~~Separate UI work~~ — outcome of items 1–3, not a distinct ship

| | |
|---|---|
| **Priority** | — |
| **Status** | Header is burger + logo + date only |
| **Notes** | Confirm on device in Verification. |

### 5. Thinner ribbons; rename ब्रेकिंग → शीर्ष समाचार

- [x] Slim the ताजा समाचार / headlines section ribbons (~half padding,
  slightly smaller type)
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] Label **शीर्ष समाचार** instead of **ब्रेकिंग**
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
  - [x] Home shows a slim **शीर्ष समाचार** ribbon under logo + date (same
    style as ताजा); the full headlines page uses that title too

| | |
|---|---|
| **Priority** | High |
| **Status** | Done |
| **Notes** | Red category bar (`ताजा समाचार ▾`) stays off home. The slim
  **शीर्ष समाचार** ribbon is the section header under logo + date.
  Category switching stays in the burger and below-the-fold section
  links. Below-the-fold section headers (राजनीति / … / footers) keep
  original padding. Notification title `ब्रेकिंग समाचार` in
  `useArticleAlerts` is **out of scope** this cut — left unchanged. |

### 6. Top ~1/3: headlines as the title pane, vertical scroll, “थप शीर्ष समाचार…”

- [x] Headlines occupy roughly the top third of the home screen (compact rows)
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] Up to **12** items, **vertical**, internally scrollable (no horizontal strip)
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] Cap at **12** articles on home
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] Home **शीर्ष समाचार** ribbon under logo + date; no category bar
  (`ताजा समाचार ▾`). The ribbon labels the scrollable headlines pane
- [x] Trailing **थप शीर्ष समाचार...** in small type, 50% gray
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] That control opens a main headlines page
  - [x] iOS (shared JS)
  - [x] Android (shared JS)

| | |
|---|---|
| **Priority** | High |
| **Status** | Done |
| **Notes** | Slim ribbon, then compact pane (~28% window height) that
  scrolls internally through up to 12 rows so ताजा keeps ~2/3.
  `HeadlinesList` uses the same **शीर्ष समाचार** ribbon. Approximate
  1/3 — not a locked viewport split. |

### 7. Bottom ~2/3: ताजा समाचार ribbon + horizontal article scroll

- [x] ताजा block sits below the compact headlines (larger horizontal strip)
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] Articles in that block scroll **horizontally** (~8–12, same card style
  as the old breaking strip); tap opens the existing swipe reader
  - [x] iOS (shared JS)
  - [x] Android (shared JS)

| | |
|---|---|
| **Priority** | High |
| **Status** | Done |

### 8. Rest of the home page stays as-is

- [x] Politics / economy / sport / opinion previews keep the same
  layout; section ribbons now match slim `शीर्ष` / `ताजा` (`homeRibbon`),
  with `सबै हेर्नुहोस्` on the same row
  - [x] iOS (shared JS)
  - [x] Android (shared JS)

| | |
|---|---|
| **Priority** | Constraint |
| **Status** | Slim ribbons applied — below-the-fold headers reuse `homeRibbon` |

### 9. Road Block and Content Block ads

- [x] ~~Let's have provisions for Road Block and Content Block ads. (Road
  block ads appear before the home page, the content block, as the name
  suggests, blocks contents with ads. Same is true with other ads.)~~
  (road-block / in-article content-block still **out of scope**)
- [x] **1.5.0:** Home-only static house banners from
  `GET https://baahrakhari.com/api/getAdvertisementData` (`home.*` slots).
  No scripts, no AdMob, no article/sidebar/sticky/header ads.
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] Declare **Ads** in Play/App Store Data safety as first-party house
      banners (no advertising ID / no ad SDK)

| | |
|---|---|
| **Priority** | Product (1.5.0) |
| **Status** | Home static banners implemented; road-block still skipped |
| **Notes** | Slots: below-breaking-two/three, below-artha, below-khel,
  below-nation. `adSpacer` in the article reader remains layout chrome. |

### 10. Share button on headlines (currently missing vs ताजा)

- [x] Share available when reading a headline / former-breaking article
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] **1.5.0:** Share icons removed from home Top News rows and the
      HeadlinesList page. Long-press a headline to save instead.

| | |
|---|---|
| **Priority** | High |
| **Status** | Reader share kept; home-row share removed in 1.5.0 |
| **Notes** | `Share.share` stays on the article reader. |

### 11. Burger Contact Us: Nepali first, then English (Play-readable)

- [x] Drawer label is Nepali then English on **two lines**
      (`सम्पर्क गर्नुहोस्` / `Contact us`)
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] English **Contact us** remains readable for Google Play News policy
  - [x] Android (required)
  - [x] iOS (same two-line row for consistency)
- [x] Update `docs/play-store/NEWS_POLICY_COMPLIANCE.md` if copy/placement
  changes

| | |
|---|---|
| **Priority** | High (Play policy) |
| **Status** | Done |
| **Notes** | Android home footer stays **English-only** (`Contact Us`). |

### 12. Further improvements later

- [ ] Out of scope this cut — no extra items unless the user adds them

| | |
|---|---|
| **Priority** | — |
| **Status** | Parking lot |
| **Notes** | “We can talk further and improve further.” |

---

## Locked decisions

1. **Nepali date** — A. Match baahrakhari.com header (Bikram Sambat) via
   scrape of the homepage `current-date` script. Fallback: convert Nepal
   Time to BS in the same format (`src/format/nepaliDate.ts`).
2. **Drawer logo** — A. Tappable logo only (extra `ताजा समाचार` Home row
   removed).
3. **Theme in drawer** — A. Under the drawer logo.
4. **Per-article save** — A. Keep on the ताजा swipe reader; only the
   header Saved-list button was removed.
5. **Drawer save icon** — A. Same article-card bookmark asset, **right**
   of `सुरक्षित लेखहरू` (label left). Saved sits directly under the
   theme row.
6. **Ribbon thickness** — A. ~half vertical padding, slightly smaller type.
   Home header category bar (`ताजा समाचार ▾`) **removed**. Slim
   **शीर्ष समाचार** ribbon sits under logo + date as the headlines
   section header. Below-the-fold section headers reuse the same slim
   `homeRibbon` (see-all on the same row). Category switching remains in
   the burger and below-the-fold section links.
7. **Headlines count** — **12** before “थप…”. Home **शीर्ष समाचार**
   ribbon is the section header for that scrollable pane; the full
   headlines page uses the same title.
8. **Main headlines page** — A. New in-app full list of banner headlines.
9. **1/3 + 2/3** — A. Approximate (compact headlines, larger ताजा strip).
10. **ताजा cards** — A. Reuse former breaking-card style, ~8–12 items;
    tap still opens the swipe reader.
11. **Share** — Headline reader **and** share icon on each home headline
    row (also on the full headlines page).
12. **Contact** — Drawer: two lines, Nepali then English (`सम्पर्क गर्नुहोस्`
    / `Contact us`). Android home footer stays English-only. Burger rows
    use a hairline separator; drawer is slightly narrower / slimmer.

---

## Verification (after implementation)

- [x] iPhone simulator: header, home 1/3+2/3, share icons on headlines (2026-09-02)
  - **Pass** — iPhone 17 Pro, iOS 26.5, UDID `5C53665C-12A1-45AF-BEBB-9A0F39C3F78F`, scheme `Baahrakhari`
  - Launch: no crash. Home shows burger + logo (`१२ खरी DIGITAL NEWS`) + Nepali date (`बिहीबार, भदौ १८, २०८३`), slim `शीर्ष समाचार` ribbon (no `ताजा समाचार ▾` category bar under the header), then up to 12 internally scrolling headline rows with share icons + `थप शीर्ष समाचार...`, then `ताजा समाचार` horizontal cards
  - Screenshot: `/tmp/baahrakhari-ios-home.png` (notification permission alert overlays center; UI visible behind it)
  - Drawer / Contact label / theme row: **not tapped** (no simctl accessibility driver). Share sheet not opened.
- [x] Android emulator: Pixel_10_API_36 smoke (2026-09-03) + Play-visible “Contact us”
  - **Pass** — AVD `Pixel_10_API_36` (device `pixel_10`; no Pixel 10 Pro image installed)
  - Home + drawer match the iOS layout; theme sun/moon control on the right; drawer Contact is two lines (`सम्पर्क गर्नुहोस्` / `Contact us`)
  - Screenshots: `/tmp/baahrakhari-android-home.png`, `/tmp/baahrakhari-android-drawer.png`
- [ ] iPad / large Android (if used): split still readable
- [x] Tests: Jest 10 suites / 93 tests passed 2026-09-03; `tsc --noEmit` clean. `AppNavigation` home/headlines/theme/contact/drawer-order cases; `nepaliDate` + `siteHeaderDate` unit tests
- [x] `docs/play-store/NEWS_POLICY_COMPLIANCE.md` drawer Contact copy updated
