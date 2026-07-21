import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  fetchCategoryList,
  fetchNewsDetail,
  fetchTajaNews,
  isTajaFeedCategory,
} from '../scrape/tajaNewsApi';
import type {Article, CategoryKey, ParsedArticle} from '../types/article';

/** Matches each category API page (`getCategoryList`) closely enough to avoid unbounded lists. */
const MAX_LISTING_ITEMS = 40;

export function useArticleFeed(category: CategoryKey) {
  const [items, setItems] = useState<ParsedArticle[]>([]);
  const [detailsById, setDetailsById] = useState<Record<string, Article>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const inflight = useRef<Set<string>>(new Set());
  const hydrated = useRef<Set<string>>(new Set());
  const generationRef = useRef(0);

  /**
   * Both the "ताजा" feed (`getTajaNews`) and per-category listings
   * (`getCategoryList/{slug}`) already embed each post's full body, so
   * listings render immediately with no extra network round trip. This is
   * only a fallback — used for items that show up without a body (e.g. a
   * deep link resolved before its category has loaded).
   */
  const hydrateArticle = useCallback(async (base: ParsedArticle) => {
    if (inflight.current.has(base.id) || hydrated.current.has(base.id)) {
      return;
    }
    inflight.current.add(base.id);
    try {
      const article = await fetchNewsDetail(base.id);
      setDetailsById(prev => ({
        ...prev,
        [base.id]: {
          ...article,
          bodyText: article.bodyText || base.title,
          fetchedAt: Date.now(),
        },
      }));
      hydrated.current.add(base.id);
    } catch {
      setDetailsById(prev => ({
        ...prev,
        [base.id]: {
          ...base,
          bodyText: base.title,
          fetchedAt: Date.now(),
        },
      }));
      hydrated.current.add(base.id);
    } finally {
      inflight.current.delete(base.id);
    }
  }, []);

  const reload = useCallback(() => {
    setRefreshTick(v => v + 1);
  }, []);

  useEffect(() => {
    const thisGen = ++generationRef.current;
    setLoading(true);
    setError(null);
    setItems([]);
    setDetailsById({});
    hydrated.current.clear();
    if (category === 'contact-us') {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const {listing, articlesById} = isTajaFeedCategory(category)
          ? await fetchTajaNews()
          : await fetchCategoryList(category);
        if (generationRef.current !== thisGen) {
          return;
        }
        const trimmed = listing.slice(0, MAX_LISTING_ITEMS);
        setItems(trimmed);
        setDetailsById(articlesById);
        for (const row of trimmed) {
          if (articlesById[row.id]?.bodyText?.trim()) {
            hydrated.current.add(row.id);
          }
        }
      } catch {
        if (generationRef.current === thisGen) {
          setError('समाचार लोड गर्न सकिएन ।');
        }
      } finally {
        if (generationRef.current === thisGen) {
          setLoading(false);
        }
      }
    })();
  }, [category, refreshTick]);

  const articleById = useMemo(
    () =>
      items.reduce<Record<string, Article>>((acc, base) => {
        acc[base.id] = detailsById[base.id] ?? {
          ...base,
          bodyText: '',
          fetchedAt: 0,
        };
        return acc;
      }, {}),
    [items, detailsById],
  );

  return {
    items,
    articleById,
    loading,
    error,
    hydrateArticle,
    reload,
  };
}
