import {Linking, Platform} from 'react-native';
import type {ArticleVideo} from '../scrape/articleVideos';

/**
 * Opening article videos outside the app.
 *
 * We never play video in-app: a YouTube embed goes to the YouTube app when
 * it is installed, and everything else (including YouTube on a phone
 * without the app) goes to the default browser.
 */

export type OpenVideoOutcome = 'youtube-app' | 'browser' | 'failed';

/**
 * Scheme the installed YouTube app answers to. Android registers
 * `vnd.youtube:<id>`; iOS registers `youtube://`.
 *
 * `canOpenURL` only reports these truthfully when the scheme is declared —
 * `<queries>` in `AndroidManifest.xml`, `LSApplicationQueriesSchemes` in
 * `Info.plist`. Without the declaration we simply fall back to the browser.
 */
export function youTubeAppUrl(videoId: string, os: string = Platform.OS): string {
  return os === 'android'
    ? `vnd.youtube:${videoId}`
    : `youtube://watch?v=${videoId}`;
}

/**
 * Hand `video` off to the YouTube app when possible, else the browser.
 * Resolves to what actually happened so callers can surface a failure.
 */
export async function openArticleVideo(
  video: ArticleVideo,
): Promise<OpenVideoOutcome> {
  if (video.youtubeId) {
    const appUrl = youTubeAppUrl(video.youtubeId);
    try {
      if (await Linking.canOpenURL(appUrl)) {
        await Linking.openURL(appUrl);
        return 'youtube-app';
      }
    } catch {
      /* YouTube app missing, or the scheme isn't queryable — use the web. */
    }
  }
  try {
    await Linking.openURL(video.webUrl);
    return 'browser';
  } catch {
    return 'failed';
  }
}
