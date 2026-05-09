export type CategorySlug =
  | 'latest-news'
  | 'politics'
  | 'economy'
  | 'sport'
  | 'opinion'
  | 'nation'
  | 'literature'
  | 'editorial'
  | 'international';

export type CategoryKey = 'home' | CategorySlug;

export type ParsedArticle = {
  id: string;
  url: string;
  title: string;
};

export type Article = ParsedArticle & {
  categoryLabel?: string;
  author?: string;
  /** Full published-date line from the site (often Nepali calendar text). */
  publishedNepali?: string;
  /** Parsed publish time when available (ISO from meta / `<time datetime>`). */
  publishedAtMs?: number;
  imageUrl?: string;
  bodyText: string;
  fetchedAt: number;
};

export type SavedArticle = Article & {
  savedAt: number;
};
