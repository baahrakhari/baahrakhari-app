import {
  BANNER_DATAS_API_URL,
  categoryListApiUrl,
  newsDetailApiUrl,
  SITE_ORIGIN,
  TAJA_NEWS_API_URL,
} from '../config/site';
import type {Article, ParsedArticle} from '../types/article';
import {htmlToPlainText} from './baahrakhari';

const UA =
  'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 BaahrakhariMobile/1';

export {TAJA_NEWS_API_URL};

type TajaApiCategory = {
  name?: string;
  slug?: string;
};

export type TajaApiItem = {
  id: number;
  title: string;
  detail_url?: string;
  permalink?: string | null;
  published_on?: string;
  nepali_date_time?: string;
  nepali_date?: string;
  time?: string;
  content?: string;
  image_link?: string;
  thumb150X150?: string;
  image?: string;
  first_author_name?: string;
  author_name?: string;
  first_category_slug?: string;
  categories?: string;
  cats?: TajaApiCategory[];
  first_category?: TajaApiCategory;
};

type TajaApiResponse = {
  taja?: TajaApiItem[];
};

function parsePublishedOnMs(raw?: string): number | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  const ms = Date.parse(raw.replace(' ', 'T'));
  return Number.isFinite(ms) ? ms : undefined;
}

function articleUrl(item: TajaApiItem): string {
  if (item.detail_url?.startsWith('http')) {
    return item.detail_url;
  }
  return `${SITE_ORIGIN}/detail/${item.id}`;
}

function categoryLabel(item: TajaApiItem): string | undefined {
  if (item.first_category?.name) {
    return item.first_category.name;
  }
  const fromCats = item.cats?.[0]?.name;
  if (fromCats) {
    return fromCats;
  }
  const legacy = item.categories?.trim();
  return legacy || undefined;
}

function imageUrl(item: TajaApiItem): string | undefined {
  return item.image_link || item.image || item.thumb150X150 || undefined;
}

function publishedNepaliLine(item: TajaApiItem): string | undefined {
  const parts: string[] = [];
  const nepali = item.nepali_date_time
    ? htmlToPlainText(item.nepali_date_time)
    : item.nepali_date?.trim();
  if (nepali) {
    parts.push(nepali);
  }
  if (item.time?.trim()) {
    parts.push(item.time.trim());
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function mapTajaApiItem(item: TajaApiItem): Article {
  const id = String(item.id);
  const title = htmlToPlainText(item.title || '').trim() || 'बाह्रखरी';
  const bodyText = htmlToPlainText(item.content || '');
  return {
    id,
    url: articleUrl(item),
    title,
    categoryLabel: categoryLabel(item),
    author: item.first_author_name?.trim() || item.author_name?.trim() || undefined,
    publishedNepali: publishedNepaliLine(item),
    publishedAtMs: parsePublishedOnMs(item.published_on),
    imageUrl: imageUrl(item),
    bodyText,
    fetchedAt: Date.now(),
  };
}

export function mapTajaListing(items: TajaApiItem[]): ParsedArticle[] {
  return items.map(item => {
    const mapped = mapTajaApiItem(item);
    return {id: mapped.id, title: mapped.title, url: mapped.url};
  });
}

export async function fetchTajaNews(): Promise<{
  listing: ParsedArticle[];
  articlesById: Record<string, Article>;
}> {
  const res = await fetch(TAJA_NEWS_API_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': UA,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = (await res.json()) as TajaApiResponse;
  const rows = json.taja ?? [];
  const listing = mapTajaListing(rows);
  const articlesById: Record<string, Article> = {};
  for (const row of rows) {
    const article = mapTajaApiItem(row);
    articlesById[article.id] = article;
  }
  return {listing, articlesById};
}

export function isTajaFeedCategory(category: string): boolean {
  return category === 'home' || category === 'latest-news';
}

async function fetchJsonApi<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': UA,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

type CategoryListResponse = {
  post?: {data?: TajaApiItem[]};
};

/**
 * Category News Listing (`getCategoryList/{slug}`). Each post already
 * includes its full `content`, so — like `fetchTajaNews` — no separate
 * per-article detail fetch is needed to render the swipe reader.
 */
export async function fetchCategoryList(slug: string): Promise<{
  listing: ParsedArticle[];
  articlesById: Record<string, Article>;
}> {
  const json = await fetchJsonApi<CategoryListResponse>(categoryListApiUrl(slug));
  const rows = json.post?.data ?? [];
  const listing = mapTajaListing(rows);
  const articlesById: Record<string, Article> = {};
  for (const row of rows) {
    const article = mapTajaApiItem(row);
    articlesById[article.id] = article;
  }
  return {listing, articlesById};
}

type NewsDetailResponse = {
  post?: TajaApiItem;
};

/** News Detail (`getNewsDetailData/{id}`) — used for deep links and offline saves. */
export async function fetchNewsDetail(id: string | number): Promise<Article> {
  const json = await fetchJsonApi<NewsDetailResponse>(newsDetailApiUrl(id));
  if (!json.post) {
    throw new Error('Article not found');
  }
  return mapTajaApiItem(json.post);
}

type BannerGroup = {
  slug?: string;
  display_order?: number;
  banner_news?: TajaApiItem[];
};
type BannerDatasResponse = {banners?: BannerGroup[]};

/**
 * Homepage banner data (`getBannerDatas`) — the "breaking news" headline
 * strip shown above the front page's own title list on baahrakhari.com.
 */
export async function fetchBreakingHeadlines(limit = 8): Promise<Article[]> {
  const json = await fetchJsonApi<BannerDatasResponse>(BANNER_DATAS_API_URL);
  const groups = (json.banners ?? [])
    .filter(group => group.slug?.startsWith('breaking'))
    .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99));
  const seen = new Set<string>();
  const out: Article[] = [];
  for (const group of groups) {
    for (const item of group.banner_news ?? []) {
      const article = mapTajaApiItem(item);
      if (seen.has(article.id)) {
        continue;
      }
      seen.add(article.id);
      out.push(article);
      if (out.length >= limit) {
        return out;
      }
    }
  }
  return out;
}
