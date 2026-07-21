# Local Testing (Android + iOS)

Pre-configured, idempotent scripts so a fresh session can boot both
simulators/emulators and get the app running in minutes. All commands run
from the repo root.

## One-command paths

```sh
npm run dev:android   # boot Pixel emulator + Metro + install/launch on Android
npm run dev:ios        # boot iPhone simulator + Metro + install/launch on iOS
npm run dev:mobile     # both platforms, in parallel where possible
```

Each is safe to re-run: it skips creating/booting anything that's already up
and just gets you to a running app.

## Devices used

| Platform | Preferred device | AVD/Simulator name |
| --- | --- | --- |
| Android | Pixel 10, API 36 (Google Play image, arm64) | `Pixel_10_API_36` |
| iOS | iPhone 17 Pro (newest installed runtime) | resolved by name via `simctl` |

If the Pixel 10 device definition or its system image isn't installed yet,
`android_emulator.sh` automatically falls back through
`pixel_10_pro → pixel_9_pro → pixel_8_pro → pixel_7_pro → pixel_6_pro → pixel`
(prints a `↯` warning when it does) and creates the AVD with whatever
Android SDK image is already installed (or downloads one if none is).
Same idea for iOS: falls back through `iPhone 17 → iPhone 17 Pro Max →
iPhone 17e → iPhone Air → iPhone 16 Pro` if iPhone 17 Pro isn't installed.

## Building blocks

These are the individual pieces `dev:android` / `dev:ios` / `dev:mobile` are
built from — use them directly when you just need one step:

```sh
npm run emulator:android          # create (if missing) + boot Pixel AVD, wait for full boot
npm run emulator:android:status   # check AVD exists / running / booted, no side effects
npm run emulator:android:list     # list installed AVDs + available Pixel device profiles

npm run simulator:ios             # boot iPhone simulator, wait until stable
npm run simulator:ios:status      # check which device would be used + its current state
npm run simulator:ios:list        # list all installed iOS simulators/runtimes

npm run metro:start                # start Metro in the background if it isn't already up
npm run metro:status               # check if Metro is responding on :8081
npm run metro:stop                 # stop the background Metro instance this started
```

Override the target device without editing scripts:

```sh
AVD_NAME=Pixel_6_Pro_API_UpsideDownCake npm run emulator:android
SIMULATOR_NAME="iPhone 17" npm run simulator:ios
scripts/dev_ios.sh "iPhone 17 Pro Max"
```

## What each script does

- `scripts/android_emulator.sh` — resolves the Android SDK (`$ANDROID_HOME`,
  default `~/Library/Android/sdk`), creates the AVD via `avdmanager` if
  missing (picking a Pixel device profile + newest installed system image,
  downloading the image only if none is installed), boots it in the
  background (logs to `build/logs/android_emulator.log`), and polls
  `adb shell getprop sys.boot_completed` until it's `1`. Detects an
  already-running instance of the same AVD (even mid-boot) and just waits
  instead of launching a second copy.
- `scripts/ios_simulator.sh` — resolves the best installed iPhone 17 (Pro)
  simulator + newest iOS runtime via `xcrun simctl list devices -j`, opens
  Simulator.app, runs `simctl boot`, and polls `simctl list devices` until
  the target shows `Booted`.
- `scripts/metro.sh` — checks `http://localhost:8081/status`; if Metro isn't
  up it starts `react-native start` in the background (logs to
  `build/logs/metro.log`, pid tracked in `build/logs/metro.pid`) and waits
  for it to respond.
- `scripts/dev_android.sh` / `scripts/dev_ios.sh` — chain the emulator/
  simulator boot + Metro start, then run
  `react-native run-android|run-ios --no-packager` against the booted
  device.
- `scripts/dev_mobile.sh` — boots Android + iOS in parallel, starts Metro
  once, then installs on both. Keeps going if one platform fails so you
  still get the other.

## Troubleshooting

- **`emulator`/`adb` not found** — install Android Studio, or set
  `ANDROID_HOME` to your SDK path.
- **`avdmanager`/`sdkmanager` crash with `NoClassDefFoundError`** — you're
  hitting the legacy `tools/bin` binaries on a modern JDK; the scripts here
  prefer `cmdline-tools/latest/bin` automatically, but if you invoke the SDK
  tools directly make sure `cmdline-tools/latest/bin` is first on `PATH`.
- **System image download needed** — first-time setup on a new machine
  needs network access; `android_emulator.sh` will `sdkmanager --install`
  the missing image automatically (accepts the license non-interactively).
- **Emulator boot times out** — check
  `build/logs/android_emulator.log`. Common causes: first cold boot is
  slow, low disk space, or hardware acceleration (HVF on Apple Silicon)
  disabled.
- **`xcrun`/Xcode not found** — install Xcode + run
  `xcode-select --install`; open Xcode once to accept the license and let
  it install additional components.
- **No matching iOS runtime installed** — Xcode → Settings → Platforms →
  install an iOS Simulator runtime.
- **Metro port already used by something else** — `npm run metro:status`
  to check, or `lsof -i :8081` to see what's bound to it.
- **Emulator window closed but qemu keeps running / restarts itself** — this
  means some previous session registered a `launchctl` job (e.g.
  `com.baahrakhari.emulator2`) with `KeepAlive`, outside of these scripts.
  None of the scripts here ever use `launchd`/`launchctl` —
  `android_emulator.sh` always boots the emulator as a plain background
  process (`nohup ... &`), so closing the emulator window or running
  `adb emu kill` is normally enough. If qemu still comes back:
  1. `pgrep -lf qemu` / `launchctl list | grep -i baahrakhari` to spot the
     job (label usually starts with `com.baahrakhari.`).
  2. `launchctl bootout gui/$(id -u)/<label>` to remove the job — plain
     `kill`/`adb emu kill` alone will *not* stop it, `KeepAlive` just
     relaunches qemu immediately.
  3. Re-check `pgrep -lf qemu` is empty. This is not an Android/emulator
     bug — it's leftover local `launchctl` state from a prior debugging
     session, not anything these scripts set up.

## Release builds

For release APK/AAB/IPA builds and Play/App Store upload steps, see
`docs/RELEASE_COMMANDS.md` — this doc is only about fast local
emulator/simulator iteration.
