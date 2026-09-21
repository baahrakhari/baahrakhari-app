import type {CategoryKey, CategorySlug} from '../types/article';

export const SITE_ORIGIN = 'https://baahrakhari.com';
/** Latest-news JSON feed used by home + notification polling. */
export const TAJA_NEWS_API_URL = `${SITE_ORIGIN}/api/getTajaNews`;
/** Homepage breaking-news banner groups (see Baahrakhari API Documentation.csv). */
export const BANNER_DATAS_API_URL = `${SITE_ORIGIN}/api/getBannerDatas`;
/** Dedicated contact page on the news website. Use in Play Console declarations. */
export const SITE_CONTACT_URL = `${SITE_ORIGIN}/contact`;
/** First-party house banners for the home feed only (no ad SDK). */
export const ADVERTISEMENT_API_URL = `${SITE_ORIGIN}/api/getAdvertisementData`;
export const SITE_HEADER_LOGO_URL =
  'https://baahrakhari.com/themes/baahrakhari/images/logo.png';

/** Category listing JSON feed — full posts (incl. body) for a category slug. */
export function categoryListApiUrl(slug: string): string {
  return `${SITE_ORIGIN}/api/getCategoryList/${slug}`;
}

/** Single-article JSON feed by numeric post id. */
export function newsDetailApiUrl(id: string | number): string {
  return `${SITE_ORIGIN}/api/getNewsDetailData/${id}`;
}

/** Publisher shown on the Contact Us page (matches Play Console developer). */
export const APP_PUBLISHER = {
  legalName: 'Baahrakhari Media Pvt. Ltd.',
  legalNameNepali: 'बाह्रखरी मिडिया प्रा. लि.',
} as const;

export const NEWS_CATEGORIES: Array<{
  slug: CategoryKey;
  label: string;
  /** English second line in the drawer (Play-visible “Contact us”). */
  labelEn?: string;
}> = [
  {slug: 'latest-news', label: 'पछिल्ला'},
  {slug: 'politics', label: 'राजनीति'},
  {slug: 'economy', label: 'अर्थ'},
  {slug: 'sport', label: 'खेल'},
  {slug: 'opinion', label: 'विचार'},
  {slug: 'nation', label: 'देश'},
  {slug: 'literature', label: 'साहित्य'},
  {slug: 'editorial', label: 'सम्पादकीय'},
  {slug: 'international', label: 'विदेश'},
  /**
   * Dedicated Contact Us page (not a scrape feed). Drawer renders Nepali
   * then English on two lines so Play News reviewers can still find
   * "Contact us". Android home-footer copy stays English-only (`Contact Us`).
   */
  {slug: 'contact-us', label: 'सम्पर्क गर्नुहोस्', labelEn: 'Contact us'},
];

/** Category rows in the burger menu — Contact is rendered separately (two lines). */
export const DRAWER_FEED_CATEGORIES = NEWS_CATEGORIES.filter(
  cat => cat.slug !== 'contact-us',
);

/**
 * Below-the-fold home previews: every burger feed except `latest-news`
 * (पछिल्ला stays in the drawer; ताजा समाचार is that feed on home).
 * Economy keeps the website magazine label.
 */
export const HOME_PREVIEW_CATEGORIES: Array<{
  slug: CategorySlug;
  label: string;
}> = DRAWER_FEED_CATEGORIES.filter(cat => cat.slug !== 'latest-news').map(
  cat => ({
    slug: cat.slug as CategorySlug,
    label: cat.slug === 'economy' ? 'अर्थ व्यवसाय' : cat.label,
  }),
);

/** External pages linked from the site's header/footer. */
export const INFO_LINKS: Array<{key: 'about' | 'team'; label: string; url: string}> = [
  {key: 'about', label: 'हाम्रो बारेमा', url: `${SITE_ORIGIN}/page/about-us`},
  {key: 'team', label: 'हाम्रो टिम', url: `${SITE_ORIGIN}/hamro-team`},
];

/**
 * Mirror of the live site contact page at {@link SITE_CONTACT_URL}.
 * Sourced from `https://baahrakhari.com/contact` on 2026-06-06 (emails match
 * the decoded Cloudflare `data-cfemail` payload on the page).
 */
export const FOOTER_INFO = {
  address: {
    title: 'सम्पर्क ठेगाना',
    lines: ['कामनपा, वडा नं ११,', 'घर नम्बर १३८', 'थापाथली, काठमाडौं, नेपाल'],
  },
  contact: {
    title: 'फोन / इमेल',
    phones: ['०१-५९११६५१', '०१-५९११६५६'],
    emails: ['baahrakhari@gmail.com'],
  },
  marketing: {
    title: 'विज्ञापनको लागि',
    phones: ['९८०१८४९६३१'],
    emails: ['baahrakhari.marketing@gmail.com'],
  },
  editor: {
    title: 'प्रधान सम्पादक',
    name: 'प्रतीक प्रधान',
  },
  director: {
    title: 'प्रबन्ध निर्देशक',
    name: 'ज्ञानेश्वर आचार्य',
  },
  social: {
    title: 'हामीसंग जोडिनुहोस्',
    links: [
      {label: 'Facebook', url: 'https://www.facebook.com/baahrakhari'},
      {
        label: 'YouTube',
        url: 'https://www.youtube.com/channel/UCswjHGDAfchSHs7gcxwdZNw',
      },
    ],
  },
} as const;

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

/** Convert Nepali (Devanagari) digits to ASCII for tel: links and English display. */
export function nepaliDigitsToAscii(text: string): string {
  return text.replace(/[०१२३४५६७८९]/g, d =>
    String(DEVANAGARI_DIGITS.indexOf(d)),
  );
}

/** English mirror of {@link FOOTER_INFO} for the Contact Us page footer. */
export const CONTACT_INFO_EN = {
  pageTitle: 'Contact Us',
  publisher: APP_PUBLISHER.legalName,
  intro:
    'Contact Baahrakhari Media by phone, email, or visit our office in Thapathali, Kathmandu.',
  websiteLabel: 'Website contact page',
  address: {
    title: 'Contact Address',
    lines: [
      'Kathmandu Metropolitan City, Ward No. 11',
      'House No. 138',
      'Thapathali, Kathmandu, Nepal',
    ],
  },
  contact: {
    title: 'Phone / Email',
    phones: FOOTER_INFO.contact.phones.map(nepaliDigitsToAscii),
    emails: [...FOOTER_INFO.contact.emails],
  },
  marketing: {
    title: 'For Advertising',
    phones: FOOTER_INFO.marketing.phones.map(nepaliDigitsToAscii),
    emails: [...FOOTER_INFO.marketing.emails],
  },
  editor: {
    title: 'Editor-in-Chief',
    name: 'Prateek Pradhan',
  },
  director: {
    title: 'Managing Director',
    name: 'Gyaneshwar Aacharya',
  },
  social: {
    title: 'Connect With Us',
    links: [...FOOTER_INFO.social.links],
  },
} as const;

export type ContactInfoBlock = typeof FOOTER_INFO;

/** Shared shape for Nepali + English contact sections on the Contact Us page. */
export type ContactBlocksContent = {
  address: {title: string; lines: readonly string[]};
  contact: {title: string; phones: readonly string[]; emails: readonly string[]};
  marketing: {title: string; phones: readonly string[]; emails: readonly string[]};
  editor: {title: string; name: string};
  director: {title: string; name: string};
  social: {
    title: string;
    links: ReadonlyArray<{label: string; url: string}>;
  };
};

export function categoryUrl(key: 'home' | CategorySlug): string {
  if (key === 'home') {
    return `${SITE_ORIGIN}/latest-news`;
  }
  return `${SITE_ORIGIN}/${key}`;
}
