import {SITE_ORIGIN} from '../config/site';
import type {Article, ParsedArticle} from '../types/article';

const UA =
  'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 BaahrakhariMobile/1';

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': UA,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text();
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Plain text from an HTML fragment (API `content`, bylines, etc.). */
export function htmlToPlainText(html: string): string {
  if (!html?.trim()) {
    return '';
  }
  return decodeEntities(stripTags(html)).trim();
}

function decodeEntities(raw: string): string {
  let s = raw;
  /** Some blocks are double-encoded; decode passes stabilize quickly (<=3). */
  for (let pass = 0; pass < 3; pass += 1) {
    const prev = s;
    s = s
      .replace(/&amp;#(\d+);/g, '&#$1;')
      .replace(/&amp;#x([0-9a-f]+);/gi, '&#x$1;')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&rsquo;|&lsquo;/g, "'")
      .replace(/&rdquo;|&ldquo;/g, '"')
      .replace(/&mdash;|&ndash;/g, '—')
      .replace(/&hellip;/g, '…')
      .replace(/&#(\d+);/g, (_, n: string) =>
        String.fromCodePoint(Number(n) || 32),
      )
      .replace(/&#x([0-9a-f]+);/gi, (_, h: string) =>
        String.fromCodePoint(parseInt(h, 16) || 32),
      );
    if (s === prev) {
      break;
    }
  }
  return s.normalize('NFC');
}

function uniqById(items: ParsedArticle[]): ParsedArticle[] {
  const seen = new Set<string>();
  const out: ParsedArticle[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export function parseListingLinks(html: string): ParsedArticle[] {
  const out: ParsedArticle[] = [];
  const re =
    /<a[^>]+href="https?:\/\/baahrakhari\.com\/detail\/(\d+)\/?"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    const title = decodeEntities(stripTags(m[2]));
    if (!id || title.length < 3) {
      continue;
    }
    out.push({id, title, url: `${SITE_ORIGIN}/detail/${id}`});
  }
  return uniqById(out);
}

function extractEditorInnerHtml(html: string): string | undefined {
  const openRe = /<div[^>]*class="[^"]*\beditor-box\b[^"]*"[^>]*>/i;
  const start = openRe.exec(html);
  if (!start || start.index == null) {
    return undefined;
  }
  let pos = start.index + start[0].length;
  let depth = 1;
  while (depth > 0 && pos < html.length) {
    const rest = html.slice(pos);
    const nextOpen = rest.search(/<div\b/i);
    const nextClose = rest.search(/<\/div>/i);
    const o = nextOpen === -1 ? Infinity : nextOpen;
    const c = nextClose === -1 ? Infinity : nextClose;
    if (c === Infinity) {
      return undefined;
    }
    if (o < c) {
      depth += 1;
      pos += o + 4;
    } else {
      depth -= 1;
      pos += c + 6;
    }
  }
  return html.slice(start.index + start[0].length, pos - 6);
}

function authorLooksInvalid(author: string): boolean {
  if (author.length > 140) {
    return true;
  }
  if (author.includes('::')) {
    return true;
  }
  if (author.includes('बाह्रखरी') && author.length > 35) {
    return true;
  }
  return false;
}

function parseAuthor(html: string): string | undefined {
  const newsAuthor = html.match(
    /<span[^>]*class="[^"]*\bnews-author\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  );
  if (newsAuthor?.[1]) {
    const author = decodeEntities(stripTags(newsAuthor[1])).trim();
    if (author.length > 1 && !authorLooksInvalid(author)) {
      return author;
    }
  }
  const byline = html.match(
    /<span[^>]*class="[^"]*(author|news-author)[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  );
  if (byline?.[2]) {
    const author = decodeEntities(stripTags(byline[2])).trim();
    if (author.length > 1 && !authorLooksInvalid(author)) {
      return author;
    }
  }
  const meta = html.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i);
  if (meta?.[1]) {
    const author = decodeEntities(meta[1]).trim();
    if (author.length > 2 && author.length < 90 && !authorLooksInvalid(author)) {
      return author;
    }
  }
  return undefined;
}

function parsePublishedNepali(html: string): string | undefined {
  const pub = html.match(
    /<div[^>]*class="[^"]*published-date[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  );
  if (pub?.[1]) {
    let text = decodeEntities(stripTags(pub[1]));
    text = text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length > 4) {
      return text.normalize('NFC');
    }
  }
  const dateLine = html.match(
    /<span[^>]*class="[^"]*date-line[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  );
  if (dateLine?.[1]) {
    const text = decodeEntities(stripTags(dateLine[1]))
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length > 4) {
      return text.normalize('NFC');
    }
  }
  return undefined;
}

function parsePublishedAtMs(html: string): number | undefined {
  const ogPub = html.match(
    /<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"/i,
  );
  if (ogPub?.[1]) {
    const t = Date.parse(ogPub[1]);
    if (!Number.isNaN(t)) {
      return t;
    }
  }
  const timeEl = html.match(/<time[^>]+datetime="([^"]+)"/i);
  if (timeEl?.[1]) {
    const t = Date.parse(timeEl[1]);
    if (!Number.isNaN(t)) {
      return t;
    }
  }
  const ogMod = html.match(
    /<meta[^>]+property="article:modified_time"[^>]+content="([^"]+)"/i,
  );
  if (ogMod?.[1]) {
    const t = Date.parse(ogMod[1]);
    if (!Number.isNaN(t)) {
      return t;
    }
  }
  return undefined;
}

function parseImage(html: string): string | undefined {
  const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
  if (og?.[1]?.startsWith('http')) {
    return og[1];
  }
  const fig = html.match(
    /<figure[^>]*class="[^"]*article-img[^"]*"[\s\S]*?<img[^>]+src="([^"]+)"/i,
  );
  if (fig?.[1]?.startsWith('http')) {
    return fig[1];
  }
  return undefined;
}

function parseBodyText(html: string): string {
  const editor = extractEditorInnerHtml(html);
  if (!editor) {
    return '';
  }
  const chunks: string[] = [];
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(editor)) !== null) {
    const text = decodeEntities(stripTags(m[1]));
    if (text.length >= 12) {
      chunks.push(text);
    }
    if (chunks.join('\n\n').length >= 55_000) {
      break;
    }
  }
  return chunks.join('\n\n').trim().normalize('NFC');
}

export function parseDetailArticle(
  base: ParsedArticle,
  html: string,
): Omit<Article, 'fetchedAt'> {
  const cat = html.match(
    /<span[^>]*class="[^"]*cat-title[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  );
  const bodyText = parseBodyText(html);
  return {
    ...base,
    categoryLabel: cat?.[1] ? decodeEntities(stripTags(cat[1])).trim() : undefined,
    author: parseAuthor(html),
    publishedNepali: parsePublishedNepali(html),
    publishedAtMs: parsePublishedAtMs(html),
    imageUrl: parseImage(html),
    bodyText,
  };
}
