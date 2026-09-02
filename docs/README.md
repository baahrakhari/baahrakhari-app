# Baahrakhari App — Docs Index

Start here. This is a map of every doc in `docs/`, grouped by when you'd
need it. If a process or file path below changes, update this index (and
the one-line pointer in the repo-root `context.md`) in the same change.

## Local development

- [`LOCAL_TESTING.md`](LOCAL_TESTING.md) — boot Android/iOS emulators and
  run the app locally (`npm run dev:android` / `dev:ios` / `dev:mobile`).
  Day-to-day iteration; not release builds.
- [`DEEP_LINKING.md`](DEEP_LINKING.md) — how `https://baahrakhari.com/detail/{id}`
  links open in-app (Android App Links / iOS Universal Links), plus the
  server-side `.well-known` files the website team must host.
- [`VIDEO_EMBEDS.md`](VIDEO_EMBEDS.md) — how videos embedded in article
  bodies are detected and opened in the YouTube app or the default browser
  (never in-app). Read this before touching `src/scrape/articleVideos.ts`,
  `src/linking/videoLinks.ts`, or the `<queries>` /
  `LSApplicationQueriesSchemes` entries the hand-off depends on.
- [`NOTIFICATIONS.md`](NOTIFICATIONS.md) — how breaking-news alerts work
  (foreground polling + local notifications, no push server), the
  permission/AppDelegate wiring they depend on, and what real remote push
  would require. Read this before touching `src/state/useArticleAlerts.ts`,
  `ios/Baahrakhari/AppDelegate.swift`, or the notification entries in
  `AndroidManifest.xml`.

## Releasing

- [`RELEASE_COMMANDS.md`](RELEASE_COMMANDS.md) — step-by-step build/upload
  commands for both platforms; the doc to follow when cutting a release.
- [`RELEASE_READINESS.md`](RELEASE_READINESS.md) — current version target,
  feature checklist, and pre-release verification steps.
- [`BAAHRKHARI_MOBILE_PLAN.md`](BAAHRKHARI_MOBILE_PLAN.md) — original
  build-plan / phase tracker for the app (historical context on scope).

## Google Play (Android)

- [`play-store/UPLOAD_NEW_RELEASE.md`](play-store/UPLOAD_NEW_RELEASE.md) —
  step-by-step Play Console click-through for uploading a new release
  (build AAB, open the release track, upload, release notes, rollout,
  send for review). Start here when actually publishing a build.
- [`play-store/NEWS_POLICY_COMPLIANCE.md`](play-store/NEWS_POLICY_COMPLIANCE.md) —
  Play Console upload checklist for the News & Magazines policy
  resubmission, including **where Contact Us lives in the app** (this is
  the source of truth for Contact Us placement — keep it in sync with
  `App.tsx` whenever that changes).
- [`play-store/RELEASE_NOTES.md`](play-store/RELEASE_NOTES.md) — copy-paste
  "what's new" text (en + ne) per version, for the Play Console listing.
- [`play-store/DEOBFUSCATION_NOTE.md`](play-store/DEOBFUSCATION_NOTE.md) —
  R8/mapping-file warning context (informational only).

## Apple App Store (iOS)

- [`app-store/METADATA.md`](app-store/METADATA.md) — App Store Connect
  listing metadata.
- [`app-store/PRIVACY.md`](app-store/PRIVACY.md) — privacy/data-use
  declarations.
- [`app-store/PRELAUNCH.md`](app-store/PRELAUNCH.md) — pre-submission
  checklist.
- [`app-store/REVIEW_NOTES.md`](app-store/REVIEW_NOTES.md) — notes for App
  Review.

## Keeping docs current

- Update `context.md` and this index whenever a documented path, script,
  or workflow moves or changes.
- Update `docs/play-store/NEWS_POLICY_COMPLIANCE.md` whenever Contact Us
  placement (front page, drawer, Android vs. iOS) changes in `App.tsx` —
  it's what reviewers and future agents use to verify policy compliance.
