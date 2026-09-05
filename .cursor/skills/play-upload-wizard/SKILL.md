---
name: play-upload-wizard
description: Walks the Google Play new-release upload as a short wizard — asks for AAB path, expected versionName/versionCode, rebuild yes/no, and track (internal vs production), then verifies the signed bundle and prints Console steps. Use when the user mentions Play upload, Play Console, UPLOAD_NEW_RELEASE, a new Android store release, AAB path, or versionCode verification.
---

# Play upload wizard

Follow `docs/play-store/UPLOAD_NEW_RELEASE.md` as a **wizard**. Do not skip
the questions. Do not upload to Play (no API). Do not print or commit
signing passwords from `android/gradle.properties`.

## Ask first (required)

Ask these before building or claiming the AAB is ready. Offer the defaults
in brackets.

1. **AAB path** `[android/app/build/outputs/bundle/release/app-release.aab]`
2. **Rebuild signed AAB first?** `[n]`
3. **Expected versionName** `[APP_VERSION_NAME from local gradle.properties]`
4. **Expected versionCode** `[APP_VERSION_CODE]` — must be unused on Play
   (even as a draft)
5. **Track** `[internal]` — `internal` (save draft / testers) or `production`
   (only after internal verify; prefer Promote, do not re-upload the same code)

To print the same list:

```sh
./scripts/play_upload_wizard.sh --questions
```

## Then run the script

Interactive (human in a terminal):

```sh
npm run play:wizard
```

After answers, verify non-interactively:

```sh
./scripts/play_upload_wizard.sh \
  --aab <path> \
  --version-name <X.Y.Z> \
  --version-code <N> \
  --track internal \
  --no-rebuild
```

Add `--rebuild` if they said yes. Use `--verify-only` when they only want
the file/version check.

If verification fails, stop. Bump `APP_VERSION_CODE` and rebuild if Play
already saw that code.

## After a pass

Show the script's Console checklist, `docs/play-store/PLAY_CONSOLE_ACCOUNT.md`
(values for the already-connected listing), and the What's new block from
`docs/play-store/RELEASE_NOTES.md`. Remind:

- Upload the **verified AAB path** in Play Console
- Internal testing first; **Save**; no production rollout unless they chose
  production and said they intend to go live
- Privacy policy URL must be live HTTPS
- Data safety: no ads (item 9 skipped)
- Contact: `https://baahrakhari.com/contact`

Docs: `docs/play-store/PLAY_UPLOAD_WIZARD.md`.
