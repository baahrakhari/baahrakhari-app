# Baahrakhari - 12khari

## Api points

Use the api points listed in the 'Baahrakhari API Documentation.csv'

## Docs (start here for workflow/process details)

Full index: `docs/README.md`. Highlights:

- Local dev (boot emulators/simulators, run the app): `docs/LOCAL_TESTING.md`
- Cutting a release (build/upload commands): `docs/RELEASE_COMMANDS.md`,
  `docs/RELEASE_READINESS.md`
- Google Play policy + Contact Us placement (source of truth for where
  Contact Us lives per platform): `docs/play-store/NEWS_POLICY_COMPLIANCE.md`
- Uploading a new Play Store release (step-by-step Play Console flow):
  `docs/play-store/UPLOAD_NEW_RELEASE.md`
- App Store metadata/review: `docs/app-store/`
- Deep linking: `docs/DEEP_LINKING.md`
- Embedded article videos (open in YouTube app / browser, never in-app):
  `docs/VIDEO_EMBEDS.md`
- Breaking-news alerts (how they fire, and why they can't reach a closed
  app): `docs/NOTIFICATIONS.md`

**When a process, script, or documented path changes, update the relevant
doc above (and this file / `docs/README.md` if the pointer itself moves) in
the same change** — this file is the entrypoint future agents read first,
so keep it short and accurate rather than duplicating doc content here.

## Goals

1. The 12khari.com website is the main source of this application. It is replicating the website in an application form.
2. The API mentioned here are the ones the website is using and should therefore match the use cases.
3. The main page is the most important one to match. Use the APIs to make sure it matches as well as possible.
4. Scraping the website is a valid method of execution for this application - but if the API endpoints give the same information it is better used via API calls as that way the content stays- and continues to stay fresh
5. The ability to read when/while offline is important. Make sure to save the first 5 articles in the front page in local storage + the ones that the users can decide.

## Misc

1. The editor-in-chief name is "Prateek Pradhan" (fixed in `src/config/site.ts`, `CONTACT_INFO_EN.editor.name`).
2. Contact Us placement is intentionally platform-specific (Google Play requires it, iOS doesn't need it repeated up front):
   - **Android:** front-page (home feed) footer **Contact Us** link (English-only) + burger-menu entry.
   - **iOS:** burger-menu entry only (no front-page footer link).
   - Drawer label on both platforms: **सम्पर्क गर्नुहोस् / Contact us** (Nepali first, English on the same line).
   - Implemented via `Platform.OS === 'android'` in `App.tsx` (`HomeFeedList`). Details/checklist: `docs/play-store/NEWS_POLICY_COMPLIANCE.md`.
