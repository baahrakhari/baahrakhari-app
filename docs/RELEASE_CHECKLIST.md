# Release checklist — Prateek feedback (next cut)

Living task list for the next iOS + Android release, sourced from
`requirements_prateek.txt`. Update checkboxes and notes as work lands.

| | |
|---|---|
| **Source** | `requirements_prateek.txt` |
| **Platforms** | iOS and Android (shared `App.tsx` unless noted) |
| **Status** | Implemented in JS (Jest); device smoke still pending |
| **Last updated** | 2026-09-02 |
| **Skipped this release** | Item 9 (ads — marked low priority in the source) |

Progress: 10 / 10 in-scope items implemented in shared JS (item 9 skipped;
item 4 is a consequence of 1–3). Device/simulator checkboxes in
**Verification** remain open.

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
- [x] Bookmark asset next to that drawer row

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

| | |
|---|---|
| **Priority** | High |
| **Status** | Done |
| **Notes** | Red category bar (`ताजा समाचार ▾`) left as-is. Below-the-fold
  section headers (राजनीति / … / footers) keep original padding.
  Notification title `ब्रेकिंग समाचार` in `useArticleAlerts` is **out of
  scope** this cut — left unchanged. |

### 6. Top ~1/3: 3–6 headlines, vertical scroll, “थप शीर्ष समाचार…”

- [x] Headlines occupy roughly the top third of the home screen (compact rows)
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] 3–6 items, **vertical** (no horizontal strip)
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] Cap at **6** articles on home
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
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
| **Notes** | New in-app `HeadlinesList` (full `getBannerDatas` list, share
  on rows, tap → existing read modal). Approximate 1/3 — not a locked
  viewport split. |

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

- [x] Politics / economy / sport / opinion previews + footer unchanged
  aside from work in other items
  - [x] iOS (shared JS)
  - [x] Android (shared JS)

| | |
|---|---|
| **Priority** | Constraint |
| **Status** | Guardrail held — those sections still use `homeSectionHeader` |

### 9. Road Block and Content Block ads

- [x] ~~Let's have provisions for Road Block and Content Block ads. (Road
  block ads appear before the home page, the content block, as the name
  suggests, blocks contents with ads. Same is true with other ads.)~~
  (skipped for this release — low priority)

| | |
|---|---|
| **Priority** | Low (source) |
| **Status** | **Skipped this release** |
| **Notes** | No ad SDK, road-block interstitial, or in-article content
  block. Revisit in a later cut. Existing `adSpacer` in the article
  reader is layout chrome, not ads. |

### 10. Share button on headlines (currently missing vs ताजा)

- [x] Share available when reading a headline / former-breaking article
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] Share icon on each home headline row (and headlines-page rows)

| | |
|---|---|
| **Priority** | High |
| **Status** | Done |
| **Notes** | Same `Share.share` path as ताजा (`onShareArticle`). |

### 11. Burger Contact Us: Nepali first, then English (Play-readable)

- [x] Drawer label is Nepali then English (`सम्पर्क गर्नुहोस् / Contact us`)
  - [x] iOS (shared JS)
  - [x] Android (shared JS)
- [x] English **Contact us** remains readable for Google Play News policy
  - [x] Android (required)
  - [x] iOS (same string for consistency)
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
5. **Drawer save icon** — A. Existing bookmark asset next to
   `सुरक्षित लेखहरू`.
6. **Ribbon thickness** — A. ~half vertical padding, slightly smaller type.
   Red category indicator bar **out of scope / left as-is**.
7. **Headlines count** — **6** before “थप…”.
8. **Main headlines page** — A. New in-app full list of banner headlines.
9. **1/3 + 2/3** — A. Approximate (compact headlines, larger ताजा strip).
10. **ताजा cards** — A. Reuse former breaking-card style, ~8–12 items;
    tap still opens the swipe reader.
11. **Share** — Headline reader **and** share icon on each home headline
    row (also on the full headlines page).
12. **Contact** — `सम्पर्क गर्नुहोस् / Contact us` (one line). Android
    home footer stays English-only.

---

## Verification (after implementation)

- [ ] iPhone simulator: header, home 1/3+2/3, drawer, share on headlines, Contact label
- [ ] Android emulator: same + Play-visible “Contact us”
- [ ] iPad / large Android (if used): split still readable
- [x] Tests: `AppNavigation` home/headlines/theme/contact cases updated; `nepaliDate` + `siteHeaderDate` unit tests
- [x] `docs/play-store/NEWS_POLICY_COMPLIANCE.md` drawer Contact copy updated
