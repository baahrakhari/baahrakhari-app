# Embedded videos — Baahrakhari app

Article bodies are rendered as **plain text**: `htmlToPlainText` strips all
markup, so a CMS `<iframe>` player used to vanish without a trace. Videos are
now pulled out of the HTML while we still have it and rendered as tappable
cards under the body copy. Nothing plays in-app — a tap always hands off to
the YouTube app or the default browser.

## Pieces

| File | Role |
|------|------|
| `src/scrape/articleVideos.ts` | Finds embeds in body HTML; normalises them to `ArticleVideo` |
| `src/linking/videoLinks.ts` | Decides YouTube app vs. browser and opens the URL |
| `src/components/ArticleVideoEmbeds.tsx` | Poster + play badge card that reader taps |

`Article.videos` is populated by both article sources — `mapTajaApiItem`
(the JSON APIs, which is what ships today) and `parseDetailArticle` (the
HTML scrape fallback). It is left `undefined` when an article has no embeds,
so saved/offline articles stay byte-identical to before for text-only news.

## What counts as a video

- `<iframe src|data-src>` pointing at a known video host — this is how
  baahrakhari.com embeds YouTube (`https://www.youtube.com/embed/{id}`).
- `<video src>` and `<video><source src></video>`.
- `<a href>` and bare URLs in the copy that point at a video.

YouTube is recognised across `watch?v=`, `youtu.be/`, `/embed/`, `/v/`,
`/shorts/`, `/live/`, and `youtube-nocookie.com`. Other accepted hosts:
Vimeo, Dailymotion, `fb.watch` / Facebook video plugin, TikTok, and direct
`.mp4` / `.m3u8` / `.webm` / `.mov` files.

Anything else (ad iframes, the site's own YouTube **channel** link, related
article links) is ignored on purpose. A scan of 182 live articles across
every category feed produced exactly one hit — the one article that really
has an embed.

## Open behaviour

| | YouTube installed | YouTube missing |
|---|---|---|
| **Android** | `vnd.youtube:{id}` → YouTube app | `https://www.youtube.com/watch?v={id}` → default browser |
| **iOS** | `youtube://watch?v={id}` → YouTube app | `https://www.youtube.com/watch?v={id}` → Safari |

Non-YouTube videos skip the app probe entirely and go straight to the
default browser.

### Native declarations these depend on

`Linking.canOpenURL` lies about custom schemes unless the platform is told
which ones we intend to query. Both are already in the repo — **don't drop
them**, or every video will silently fall back to the browser:

- `android/app/src/main/AndroidManifest.xml` — `<queries>` block with an
  `android.intent.action.VIEW` intent for the `vnd.youtube` scheme
  (Android 11+ package visibility).
- `ios/Baahrakhari/Info.plist` — `LSApplicationQueriesSchemes` containing
  `youtube` and `vnd.youtube`.

## Verifying

- `npx jest articleVideos videoLinks ArticleVideoEmbeds` covers URL
  detection, the YouTube-vs-browser routing (both platforms, `Linking`
  mocked), and the card's tap wiring.
- On a device/emulator: open an article that has an embed (as of writing,
  post `497711`, "‘रोड टु एभरेस्ट’को ट्रेलर…"), scroll past the body, and tap
  the poster. Uninstall/disable YouTube to exercise the browser fallback.
