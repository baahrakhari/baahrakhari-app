import {ADVERTISEMENT_API_URL} from '../config/site';

const UA =
  'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 BaahrakhariMobile/1';

/** Home-feed slots we render. Ignore detail / sidebar / header_ad. */
export const HOME_AD_SLOT_KEYS = [
  'below-breaking-two',
  'below-breaking-three',
  'below-artha',
  'below-khel',
  'below-nation',
] as const;

export type HomeAdSlotKey = (typeof HOME_AD_SLOT_KEYS)[number];

export type HomeAdCreative = {
  id: string;
  title: string;
  imageUrl: string;
  tapUrl?: string;
};

export type HomeAdsMap = Record<HomeAdSlotKey, HomeAdCreative | null>;

type RawAd = {
  id?: number | string;
  title?: string;
  url?: string | null;
  mobile_url?: string | null;
  is_script?: number | boolean | string;
  published_to?: string | null;
  image_link?: string | null;
  mobile_image_link?: string | null;
};

export function emptyHomeAds(): HomeAdsMap {
  return {
    'below-breaking-two': null,
    'below-breaking-three': null,
    'below-artha': null,
    'below-khel': null,
    'below-nation': null,
  };
}

function parsePublishedToMs(raw?: string | null): number | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  const ms = Date.parse(raw.replace(' ', 'T'));
  return Number.isFinite(ms) ? ms : undefined;
}

function isScriptAd(raw: RawAd): boolean {
  const flag = raw.is_script;
  return flag === 1 || flag === true || flag === '1';
}

function parseCreative(raw: RawAd, nowMs: number): HomeAdCreative | null {
  if (isScriptAd(raw)) {
    return null;
  }
  const expiresAt = parsePublishedToMs(raw.published_to);
  if (expiresAt != null && expiresAt < nowMs) {
    return null;
  }
  const imageUrl = (raw.mobile_image_link || raw.image_link || '').trim();
  if (!imageUrl) {
    return null;
  }
  const tap = (raw.mobile_url || raw.url || '').trim();
  return {
    id: String(raw.id ?? imageUrl),
    title: (raw.title || 'विज्ञापन').trim(),
    imageUrl,
    tapUrl: tap || undefined,
  };
}

/** Pure parser — home.* static creatives only. Safe to unit-test. */
export function parseHomeAdvertisements(
  payload: unknown,
  nowMs: number = Date.now(),
): HomeAdsMap {
  const result = emptyHomeAds();
  if (!payload || typeof payload !== 'object') {
    return result;
  }
  const home = (payload as {home?: unknown}).home;
  if (!home || typeof home !== 'object') {
    return result;
  }
  const homeMap = home as Record<string, unknown>;
  for (const key of HOME_AD_SLOT_KEYS) {
    const list = homeMap[key];
    if (!Array.isArray(list)) {
      continue;
    }
    for (const item of list) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const creative = parseCreative(item as RawAd, nowMs);
      if (creative) {
        result[key] = creative;
        break;
      }
    }
  }
  return result;
}

export async function fetchHomeAdvertisements(
  nowMs: number = Date.now(),
): Promise<HomeAdsMap> {
  const res = await fetch(ADVERTISEMENT_API_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': UA,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json: unknown = await res.json();
  return parseHomeAdvertisements(json, nowMs);
}
