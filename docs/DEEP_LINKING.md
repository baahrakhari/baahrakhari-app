# Deep linking — Baahrakhari app

The app opens article links in-app when users tap `https://baahrakhari.com/detail/{id}` URLs
(from social media, messaging, etc.).

## Client configuration (done in the app)

| Platform | Mechanism |
|----------|-----------|
| **Android** | App Links intent-filter on `https://baahrakhari.com/detail/*` and `www` |
| **Android** | Custom scheme fallback: `baahrakhari://detail/{id}` |
| **iOS** | Universal Links (`applinks:baahrakhari.com`) + URL scheme `baahrakhari://` |

## Server files required (website team)

For **verified** App Links / Universal Links (tap link → open app directly, not a browser chooser),
host these on `baahrakhari.com`:

### Android — `/.well-known/assetlinks.json`

Package: `com.baahrakhari.media`  
Get SHA-256 signing cert fingerprint from Play Console → App signing, or:

```sh
keytool -list -v -keystore /path/to/12khari.jks -alias abp
```

Example structure:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.baahrakhari.media",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:..."
      ]
    }
  }
]
```

Serve at: `https://baahrakhari.com/.well-known/assetlinks.json`  
(content-type `application/json`, no redirect)

### iOS — `/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "WGWJBSHXG5.com.baahrakhari",
        "paths": ["/detail/*"]
      }
    ]
  }
}
```

Serve at: `https://baahrakhari.com/.well-known/apple-app-site-association`  
(no `.json` extension, no redirect)

Team ID `WGWJBSHXG5` = Baahrakhari Media (from Xcode signing).

## Supported URL patterns

- `https://baahrakhari.com/detail/491816`
- `https://www.baahrakhari.com/detail/491816`
- `baahrakhari://detail/491816`

## Notifications

Latest-news alerts poll `GET /api/getTajaNews` every **3 minutes** while the app process
is running and notification permission is granted. Tapping a notification opens the article
in-app.

**Note:** True background push (when the app is fully killed) requires a server-side push
service; this release uses local notifications driven by API polling.
