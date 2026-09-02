/**
 * Video embeds inside article bodies.
 *
 * Article bodies are rendered as plain text (`htmlToPlainText`), so an
 * `<iframe>` player would otherwise disappear entirely. We pull the embeds
 * out while we still have the HTML and surface them as tappable cards that
 * hand off to the YouTube app or the system browser
 * (`src/linking/videoLinks.ts`).
 */

export type ArticleVideoProvider = 'youtube' | 'other';

export type ArticleVideo = {
  /** Stable list key: `yt:<id>` for YouTube, otherwise the canonical URL. */
  key: string;
  provider: ArticleVideoProvider;
  /** Canonical https URL — always safe to hand to a browser. */
  webUrl: string;
  /** Set when {@link provider} is `'youtube'`; drives the app hand-off. */
  youtubeId?: string;
  /** Poster frame, when derivable without a network call. */
  thumbnailUrl?: string;
  title?: string;
};

/** More than this in one body is almost certainly a parsing accident. */
const MAX_VIDEOS = 6;

/**
 * YouTube ids are 11 chars today, but the loose bound keeps us working if
 * that ever changes; the surrounding path already pins these to YouTube.
 */
const YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com|youtube-nocookie\.com)\/(?:embed|v|shorts|live)\/([A-Za-z0-9_-]{6,})/i,
  /youtube\.com\/watch\?(?:[^"'\s]*&)?v=([A-Za-z0-9_-]{6,})/i,
  /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
];

/** Non-YouTube embeds we still consider "a video the reader can watch". */
const OTHER_VIDEO_URL_RE =
  /(?:(?:player\.)?vimeo\.com\/(?:video\/)?\d+|dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/|facebook\.com\/plugins\/video|fb\.watch\/|tiktok\.com\/@[^/]+\/video\/|\.(?:mp4|m3u8|webm|mov)(?:[?#]|$))/i;

const ABSOLUTE_URL_RE = /https?:\/\/[^\s"'<>\\]+/gi;

function unescapeUrl(raw: string): string {
  return raw
    .replace(/&amp;/gi, '&')
    .replace(/&#0*38;/g, '&')
    .replace(/&quot;/gi, '"')
    .trim();
}

function attr(tag: string, name: string): string | undefined {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
  const m = tag.match(re);
  const value = m?.[2] ?? m?.[3];
  return value?.trim() ? unescapeUrl(value) : undefined;
}

function toAbsolute(url: string): string {
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  return url.replace(/^http:\/\//i, 'https://');
}

function cleanTitle(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  const text = unescapeUrl(raw.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length < 2) {
    return undefined;
  }
  return (text.length > 140 ? `${text.slice(0, 139)}…` : text).normalize('NFC');
}

/** Video id when `rawUrl` points at a YouTube watch/embed/short/live page. */
export function parseYouTubeId(rawUrl: string | null | undefined): string | undefined {
  if (!rawUrl?.trim()) {
    return undefined;
  }
  const url = unescapeUrl(rawUrl);
  for (const re of YOUTUBE_URL_PATTERNS) {
    const m = url.match(re);
    if (m?.[1]) {
      return m[1];
    }
  }
  return undefined;
}

export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Poster frame served by YouTube for every public video. */
export function youTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/** True for links a reader would expect to play as video. */
export function isVideoUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl?.trim()) {
    return false;
  }
  if (parseYouTubeId(rawUrl)) {
    return true;
  }
  return OTHER_VIDEO_URL_RE.test(unescapeUrl(rawUrl));
}

/** Build an {@link ArticleVideo} from a URL, or `undefined` if it isn't one. */
export function toArticleVideo(
  rawUrl: string | null | undefined,
  title?: string,
): ArticleVideo | undefined {
  if (!rawUrl?.trim()) {
    return undefined;
  }
  const url = toAbsolute(unescapeUrl(rawUrl));
  const youtubeId = parseYouTubeId(url);
  if (youtubeId) {
    return {
      key: `yt:${youtubeId}`,
      provider: 'youtube',
      webUrl: youTubeWatchUrl(youtubeId),
      youtubeId,
      thumbnailUrl: youTubeThumbnailUrl(youtubeId),
      title: cleanTitle(title),
    };
  }
  if (!OTHER_VIDEO_URL_RE.test(url) || !/^https:\/\//i.test(url)) {
    return undefined;
  }
  return {
    key: url,
    provider: 'other',
    webUrl: url,
    title: cleanTitle(title),
  };
}

type Candidate = {index: number; url: string; title?: string};

function collectFromTags(
  html: string,
  tagRe: RegExp,
  urlOf: (tag: string) => string | undefined,
  titleOf: (tag: string) => string | undefined,
  out: Candidate[],
): void {
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    const url = urlOf(m[0]);
    if (url) {
      out.push({index: m.index, url, title: titleOf(m[0])});
    }
  }
}

/**
 * Every video embed in an article body fragment, in document order.
 *
 * Covers `<iframe>` players (how baahrakhari.com embeds YouTube), `<video>`
 * / `<source>` tags, anchors pointing at a video, and bare video URLs left
 * in the copy.
 */
export function extractArticleVideos(html: string | null | undefined): ArticleVideo[] {
  if (!html?.trim()) {
    return [];
  }
  const candidates: Candidate[] = [];

  collectFromTags(
    html,
    /<iframe\b[^>]*>/gi,
    tag => attr(tag, 'src') ?? attr(tag, 'data-src'),
    tag => attr(tag, 'title'),
    candidates,
  );
  collectFromTags(
    html,
    /<video\b[^>]*>/gi,
    tag => attr(tag, 'src'),
    tag => attr(tag, 'title'),
    candidates,
  );
  collectFromTags(
    html,
    /<video\b[\s\S]*?<\/video>/gi,
    block => attr(block.match(/<source\b[^>]*>/i)?.[0] ?? '', 'src'),
    block => attr(block.match(/<video\b[^>]*>/i)?.[0] ?? '', 'title'),
    candidates,
  );

  const anchorRe = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let anchor: RegExpExecArray | null;
  while ((anchor = anchorRe.exec(html)) !== null) {
    const href = attr(anchor[0], 'href');
    if (href && isVideoUrl(href)) {
      candidates.push({index: anchor.index, url: href, title: anchor[1]});
    }
  }

  /** Plain-text links the CMS never turned into an embed. */
  let bare: RegExpExecArray | null;
  ABSOLUTE_URL_RE.lastIndex = 0;
  while ((bare = ABSOLUTE_URL_RE.exec(html)) !== null) {
    const url = bare[0].replace(/[.,;:)]+$/, '');
    if (isVideoUrl(url)) {
      candidates.push({index: bare.index, url});
    }
  }

  candidates.sort((a, b) => a.index - b.index);

  const seen = new Set<string>();
  const videos: ArticleVideo[] = [];
  for (const candidate of candidates) {
    const video = toArticleVideo(candidate.url, candidate.title);
    if (!video || seen.has(video.key)) {
      continue;
    }
    seen.add(video.key);
    videos.push(video);
    if (videos.length >= MAX_VIDEOS) {
      break;
    }
  }
  return videos;
}
