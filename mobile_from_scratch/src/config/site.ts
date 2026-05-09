import type {CategorySlug} from '../types/article';

export const SITE_ORIGIN = 'https://baahrakhari.com';
export const SITE_HEADER_LOGO_URL =
  'https://baahrakhari.com/themes/baahrakhari/images/logo.png';

export const NEWS_CATEGORIES: Array<{slug: CategorySlug; label: string}> = [
  {slug: 'latest-news', label: 'पछिल्ला'},
  {slug: 'politics', label: 'राजनीति'},
  {slug: 'economy', label: 'अर्थ'},
  {slug: 'sport', label: 'खेल'},
  {slug: 'opinion', label: 'विचार'},
  {slug: 'nation', label: 'देश'},
  {slug: 'literature', label: 'साहित्य'},
  {slug: 'editorial', label: 'सम्पादकीय'},
  {slug: 'international', label: 'विदेश'},
];

export function categoryUrl(key: 'home' | CategorySlug): string {
  if (key === 'home') {
    return `${SITE_ORIGIN}/latest-news`;
  }
  return `${SITE_ORIGIN}/${key}`;
}
