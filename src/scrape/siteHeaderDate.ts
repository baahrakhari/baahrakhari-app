import {SITE_ORIGIN} from '../config/site';
import {fetchHtml} from './baahrakhari';

/**
 * baahrakhari.com injects the header date with:
 *   document.getElementsByClassName('current-date')... innerHTML = 'बिहीबार, भदौ १८, २०८३'
 * The `.date-time.current-date` div is empty in the static HTML.
 */
const SCRIPT_DATE_RE =
  /getElementsByClassName\(\s*['"]current-date['"]\s*\)[\s\S]{0,240}?innerHTML\s*=\s*['"]([^'"]+)['"]/;

const DIV_DATE_RE =
  /<div[^>]*class="[^"]*current-date[^"]*"[^>]*>\s*([^<]{4,80})\s*<\/div>/i;

/** Pull the live header date string out of the homepage HTML. */
export function parseSiteHeaderDate(html: string): string | null {
  const fromScript = html.match(SCRIPT_DATE_RE)?.[1]?.trim();
  if (fromScript) {
    return fromScript;
  }
  const fromDiv = html.match(DIV_DATE_RE)?.[1]?.trim();
  return fromDiv || null;
}

/** Fetch baahrakhari.com and return the header date, or null on any failure. */
export async function fetchSiteHeaderDate(): Promise<string | null> {
  try {
    const html = await fetchHtml(SITE_ORIGIN);
    return parseSiteHeaderDate(html);
  } catch {
    return null;
  }
}
