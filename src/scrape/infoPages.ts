import {SITE_ORIGIN} from '../config/site';
import type {
  AboutContent,
  TeamCategory,
  TeamContent,
  TeamMember,
} from '../types/infoPages';

export const ABOUT_URL = `${SITE_ORIGIN}/page/about-us`;
export const TEAM_URL = `${SITE_ORIGIN}/hamro-team`;

const UA =
  'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 BaahrakhariMobile/1';

const FETCH_TIMEOUT_MS = 15000;

export async function fetchInfoHtml(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': UA,
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** `String.fromCodePoint` throws on surrogates and values above 0x10ffff. */
export function codePointToChar(n: number): string {
  if (
    !Number.isFinite(n) ||
    n < 0 ||
    n > 0x10ffff ||
    (n >= 0xd800 && n <= 0xdfff)
  ) {
    return ' ';
  }
  return String.fromCodePoint(n);
}

function decodeEntities(raw: string): string {
  let s = typeof raw === 'string' ? raw : '';
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
      .replace(/&#(\d+);/g, (_, n: string) => codePointToChar(Number(n) || 32))
      .replace(/&#x([0-9a-f]+);/gi, (_, h: string) =>
        codePointToChar(parseInt(h, 16) || 32),
      );
    if (s === prev) {
      break;
    }
  }
  return s.normalize('NFC');
}

/** Pull a contiguous slice between matching opening/closing `<div class="X">` tags. */
function extractDivByClass(html: string, className: string): string | undefined {
  const open = new RegExp(
    `<div[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`,
    'i',
  );
  const start = open.exec(html);
  if (!start || start.index == null) {
    return undefined;
  }
  let pos = start.index + start[0].length;
  let depth = 1;
  let steps = 0;
  const MAX_STEPS = 20000;
  while (depth > 0 && pos < html.length && steps < MAX_STEPS) {
    steps += 1;
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
  if (depth !== 0) {
    return undefined;
  }
  return html.slice(start.index + start[0].length, pos - 6);
}

export function parseAboutPage(html: string): AboutContent {
  const editor = extractDivByClass(html, 'editor-box') ?? '';
  const headingMatch = html.match(
    /<h1[^>]*class="[^"]*\b(?:page-title|main-title)\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
  );
  const heading =
    headingMatch?.[1] && stripTags(headingMatch[1]).length > 0
      ? decodeEntities(stripTags(headingMatch[1]))
      : 'हाम्रो बारेमा';
  const paragraphs: string[] = [];
  /**
   * The site authors paragraphs in two styles: real `<p>` tags AND a single
   * `<p>` containing many `<br><br>` separators. Treat both consistently by
   * first normalizing any `<br>` runs into newlines, then collapsing tag
   * markup inside each `<p>` block.
   */
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  const BR_TOKEN = '__BAAHRA_BR__';
  while ((m = pRe.exec(editor)) !== null) {
    /** `stripTags` collapses whitespace, so use a sentinel that survives it. */
    const withBreaks = m[1].replace(/(<br\s*\/?>\s*){1,}/gi, ` ${BR_TOKEN} `);
    const text = decodeEntities(stripTags(withBreaks));
    for (const chunk of text.split(new RegExp(`(?:\\s*${BR_TOKEN}\\s*)+`))) {
      const trimmed = chunk.trim();
      if (trimmed.length >= 4) {
        paragraphs.push(trimmed);
      }
    }
  }
  /** Fallback: editor has neither `<p>` nor `<br>` — show all body text. */
  if (paragraphs.length === 0 && editor.length > 0) {
    const fallback = decodeEntities(stripTags(editor));
    for (const chunk of fallback.split(/\s*\n\s*\n+\s*/)) {
      const trimmed = chunk.trim();
      if (trimmed.length >= 4) {
        paragraphs.push(trimmed);
      }
    }
  }
  return {
    url: ABOUT_URL,
    heading,
    paragraphs,
    fetchedAt: Date.now(),
  };
}

function parseTeamItem(html: string): TeamMember | undefined {
  const nameMatch = html.match(
    /<span[^>]*class="[^"]*\bmain-title\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  );
  const roleMatch = html.match(
    /<span[^>]*class="[^"]*\bdesignation\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  );
  /** Real image is in `data-src` (lazy-load); fall back to `src` if absent. */
  const imgMatch =
    html.match(/<img[^>]+data-src="([^"]+)"/i) ||
    html.match(/<img[^>]+src="([^"]+)"/i);
  const name = nameMatch?.[1]
    ? decodeEntities(stripTags(nameMatch[1])).trim()
    : '';
  const role = roleMatch?.[1]
    ? decodeEntities(stripTags(roleMatch[1])).trim()
    : '';
  if (name.length === 0) {
    return undefined;
  }
  /** Skip the page-wide lazyload placeholder PNG. */
  const rawImg = imgMatch?.[1];
  const imageUrl =
    rawImg && rawImg.includes('uploads/members/') ? rawImg : undefined;
  return {name, role, imageUrl};
}

function splitTeamItems(boxHtml: string): string[] {
  /**
   * `team-item` blocks aren't easily extracted via balanced-div parsing
   * because the upstream markup leaves them as fragments inside their
   * grid `items` columns. Splitting on the opening marker is robust
   * and trims the trailing `</div>` chains during item parsing.
   */
  const parts = boxHtml.split(/<div[^>]*class="[^"]*\bteam-item\b[^"]*"[^>]*>/i);
  /** First piece precedes any team-item; discard it. */
  return parts.slice(1);
}

export function parseTeamPage(html: string): TeamContent {
  const headingMatch = html.match(
    /<h1[^>]*class="[^"]*\b(?:page-title|main-title)\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
  );
  const heading =
    headingMatch?.[1] && stripTags(headingMatch[1]).length > 0
      ? decodeEntities(stripTags(headingMatch[1]))
      : 'हाम्रो टिम';
  const categories: TeamCategory[] = [];
  /** Walk each `team-box` (one per category) in document order. */
  const boxRe =
    /<div[^>]*class="[^"]*\bteam-box\b[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*\bteam-box\b[^"]*"[^>]*>|<footer\b|<\/main\b)/gi;
  let bm: RegExpExecArray | null;
  while ((bm = boxRe.exec(html)) !== null) {
    const box = bm[1] ?? '';
    const catMatch = box.match(
      /<span[^>]*class="[^"]*\bteam-cat-name\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
    );
    const title = catMatch?.[1]
      ? decodeEntities(stripTags(catMatch[1])).trim()
      : '';
    if (title.length === 0) {
      continue;
    }
    const members: TeamMember[] = [];
    for (const itemChunk of splitTeamItems(box)) {
      const member = parseTeamItem(itemChunk);
      if (member) {
        members.push(member);
      }
    }
    if (members.length > 0) {
      categories.push({title, members});
    }
  }
  return {
    url: TEAM_URL,
    heading,
    categories,
    fetchedAt: Date.now(),
  };
}
