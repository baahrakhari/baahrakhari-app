import {SITE_ORIGIN} from '../config/site';

const DETAIL_RE =
  /^https?:\/\/(?:www\.)?baahrakhari\.com\/detail\/(\d+)\/?(?:\?.*)?$/i;

const CUSTOM_SCHEME_RE = /^baahrakhari:\/\/detail\/(\d+)\/?(?:\?.*)?$/i;

export type ParsedBaahrakhariArticleLink = {
  id: string;
  url: string;
};

/** Returns article id + canonical detail URL when `raw` is a Baahrakhari article link. */
export function parseBaahrakhariArticleUrl(
  raw: string | null | undefined,
): ParsedBaahrakhariArticleLink | null {
  if (!raw?.trim()) {
    return null;
  }
  const url = raw.trim();
  const web = url.match(DETAIL_RE);
  if (web?.[1]) {
    const id = web[1];
    return {id, url: `${SITE_ORIGIN}/detail/${id}`};
  }
  const custom = url.match(CUSTOM_SCHEME_RE);
  if (custom?.[1]) {
    const id = custom[1];
    return {id, url: `${SITE_ORIGIN}/detail/${id}`};
  }
  return null;
}

export function isBaahrakhariWebUrl(url: string): boolean {
  return /^https?:\/\/(?:www\.)?baahrakhari\.com(\/|$)/i.test(url.trim());
}
