# Play Console Note — Deobfuscation / R8

Google Play may show this warning during upload:

> There is no deobfuscation file associated with this App Bundle. If you use
> obfuscated code (R8/proguard), uploading a deobfuscation file will make
> crashes and ANRs easier to analyze and debug.

## Current project status

- In `android/app/build.gradle`, release minification is currently disabled:
  - `def enableProguardInReleaseBuilds = false`
- Therefore this warning is informational for now (no mapping file is produced).

## Decision for current release

- **Leave as-is** for now to reduce release risk/complexity.
- Re-evaluate before future releases.

## Benefits of enabling R8/Proguard (+ mapping upload)

- Smaller app size (download and install footprint).
- Additional code optimization/shrinking.
- More difficult reverse engineering of app code.
- With uploaded `mapping.txt`, obfuscated crash/ANR traces become readable.

## Tradeoffs / risks

- More release process steps and operational overhead.
- Need to upload/store mapping file for every release.
- Potential runtime issues if keep rules are incomplete.
- Longer release build times.

## Re-evaluation checklist (for each release)

1. Decide if this release should enable minification.
2. If yes, set:
   - `enableProguardInReleaseBuilds = true`
3. Build and run smoke tests on a release build:
   - app startup
   - feed loading
   - saved/offline reading
   - notifications
4. Upload AAB to Play Console.
5. Upload mapping file:
   - `android/app/build/outputs/mapping/release/mapping.txt`
6. Record decision in release notes/checklist.

## Recommendation trigger

Strongly consider enabling this when either condition is true:

- App size becomes a user-facing concern, or
- Crash analysis quality in Play Console becomes important for production support.

