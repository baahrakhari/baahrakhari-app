# Breaking-news notifications

How Baahrakhari alerts readers about new ब्रेकिंग / ताजा stories, what the
current implementation can and cannot do, and what would be needed for true
server-driven push.

## Architecture today: local notifications driven by in-app polling

There is **no push server**. The app has no Firebase project
(`google-services.json` is absent), no APNs key, and no `aps-environment`
entitlement, so nothing can wake the app from outside.

What ships instead is a polling loop in
[`src/state/useArticleAlerts.ts`](../src/state/useArticleAlerts.ts):

1. On launch the hook asks the OS for notification permission (once), and
   creates the Android channel `baahrakhari-news-alerts`.
2. Every 3 minutes — and again whenever the app returns to the foreground —
   it fetches `getBannerDatas` (ब्रेकिंग) and `getTajaNews` (ताजा).
3. The first successful fetch is *seeded*: every id is recorded as seen and
   nothing is announced, so installing the app never triggers a burst.
4. Afterwards, the newest id that is not in the seen set produces one local
   notification. Breaking headlines win over plain ताजा ones, and only one
   alert fires per poll no matter how many new stories appeared.
5. Seen ids (capped at 200, newest first) persist in AsyncStorage under
   `baahrakhari_alert_settings_v1`, so a restart never re-announces a story.
6. Tapping the notification carries `userInfo.url` back into JS, which routes
   through the same deep-link path as `https://baahrakhari.com/detail/{id}`.

### The consequence to be honest about

**Alerts only fire while the app process is alive.** If the reader swipes the
app away, or the OS reclaims it, nothing is delivered until they open the app
again. That is a property of the "no push server" design, not a bug.

## Why users were getting nothing at all (fixed)

Three independent defects, each sufficient on its own to silence every alert:

1. **Permission was checked but never requested.** `useArticleAlerts` called
   `PermissionsAndroid.check(POST_NOTIFICATIONS)` / `checkPermissions()` and
   configured `react-native-push-notification` with
   `requestPermissions: false`. Nothing anywhere in the app ever *asked*. The
   OS default is "denied" on iOS and on Android 13+ (the Pixel 10 / API 36
   test device included), so `notificationsAllowed` was permanently `false`,
   the polling effect never started, and `checkAndNotify` returned at its
   first guard. Fixed by requesting the permission explicitly on first launch
   (`requestOsPermission`), with the answer persisted so we do not re-prompt.

2. **iOS had no notification-center delegate.** `AppDelegate.swift` never set
   `UNUserNotificationCenter.current().delegate`, so iOS suppressed every
   notification the app scheduled while it was in the foreground — which is
   the only state in which this app polls. Taps also never reached JS, so
   deep-linking from a notification could not work. Fixed by implementing
   `UNUserNotificationCenterDelegate` and forwarding to
   `RNCPushNotificationIOS` through a new bridging header
   (`ios/Baahrakhari/Baahrakhari-Bridging-Header.h`), since that pod ships no
   Swift module map.

3. **Only ताजा was polled, never the breaking banner feed.** `getBannerDatas`
   — the feed that actually defines "breaking" for this site — was not part
   of the alert check at all. It is now, and breaking items are titled
   `ब्रेकिंग समाचार` instead of `नयाँ समाचार`.

A fourth, subtler bug was fixed at the same time: the seen-id cap trimmed by
insertion order, which evicted the *newest* ids first and could re-announce
stories once the feed grew past 200 entries.

## Regression coverage

[`__tests__/useArticleAlerts.test.tsx`](../__tests__/useArticleAlerts.test.tsx)
locks all of the above in: the permission request on both platforms, the
Android 13 boundary, silent seeding, breaking-over-ताजा priority, one alert
per poll, no repeats across restarts, offline behaviour, and tap routing.

## Verifying on a simulator / emulator

```sh
npm run dev:android    # Pixel_10_API_36
npm run dev:ios        # iPhone 17 Pro
```

- **Android** shows the POST_NOTIFICATIONS prompt on first launch. Grant it,
  then confirm the channel exists:
  `adb shell dumpsys notification_manager | grep baahrakhari-news-alerts`.
  Live alerts depend on the site publishing something new while the app is
  open; to force one, clear the seen set with
  `adb shell pm clear com.baahrakhari.mobile` and relaunch twice.
- **iOS Simulator cannot receive remote APNs pushes**, but local
  notifications work. Grant the prompt, then background the app to see a
  delivered banner, or use
  `xcrun simctl push <udid> com.baahrakhari <payload.apns>` to exercise the
  presentation path.

## If real push is wanted later

The polling loop cannot notify a closed app. Delivering that needs server
infrastructure:

1. Create a Firebase project, add `google-services.json` + the
   `com.google.gms.google-services` plugin, and declare
   `RNPushNotificationListenerService` in `AndroidManifest.xml`
   (`react-native-push-notification` ships an empty manifest and expects the
   app to declare its components).
2. Add the Push Notifications capability and an `aps-environment`
   entitlement on iOS, plus an APNs key in the Apple developer portal.
3. Upload device tokens (`onRegister`) to a backend, and have the CMS fan out
   a push whenever an article is tagged breaking.

Until that exists, the polling path above is the honest maximum.
