import type {Article, ParsedArticle, SavedArticle} from '../src/types/article';

/** Deterministic timestamp so meta lines never vary between runs. */
export const FIXED_NOW = Date.UTC(2026, 0, 15, 6, 0, 0);

export function article(id: string, overrides: Partial<Article> = {}): Article {
  return {
    id,
    url: `https://baahrakhari.com/detail/${id}`,
    title: `समाचार ${id}`,
    author: 'बाह्रखरी',
    imageUrl: `https://baahrakhari.com/img/${id}.jpg`,
    bodyText: `${id} को पूरा विवरण यहाँ छ ।`,
    fetchedAt: FIXED_NOW,
    publishedAtMs: FIXED_NOW,
    ...overrides,
  };
}

export function savedArticle(
  id: string,
  overrides: Partial<SavedArticle> = {},
): SavedArticle {
  return {...article(id), savedAt: FIXED_NOW, ...overrides};
}

export function listing(...ids: string[]): ParsedArticle[] {
  return ids.map(id => {
    const full = article(id);
    return {id: full.id, url: full.url, title: full.title};
  });
}

export function articlesById(...ids: string[]): Record<string, Article> {
  return Object.fromEntries(ids.map(id => [id, article(id)]));
}

/** Shape returned by `useArticleFeed`, with sensible loaded-and-empty defaults. */
export function feedState(items: Article[] = []) {
  return {
    items: items.map(({id, url, title}) => ({id, url, title})),
    articleById: Object.fromEntries(items.map(item => [item.id, item])),
    loading: false,
    error: null as string | null,
    hydrateArticle: jest.fn(async () => {}),
    prefetchTarget: 12,
    prefetchConcurrency: 2,
    reload: jest.fn(),
  };
}
