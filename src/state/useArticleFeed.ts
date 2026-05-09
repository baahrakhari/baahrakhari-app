import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {categoryUrl} from '../config/site';
import {
  fetchHtml,
  parseDetailArticle,
  parseListingLinks,
} from '../scrape/baahrakhari';
import type {Article, CategoryKey, ParsedArticle} from '../types/article';

const MAX_LISTING_ITEMS = 40;
const FAST_TARGET = 14;
const MEDIUM_TARGET = 10;
const SLOW_TARGET = 6;
const FAST_CONCURRENCY = 3;
const MEDIUM_CONCURRENCY = 2;
const SLOW_CONCURRENCY = 1;

type NetworkProfile = {
  emaMs: number;
  prefetchTarget: number;
  prefetchConcurrency: number;
};

export function useArticleFeed(category: CategoryKey) {
  const [items, setItems] = useState<ParsedArticle[]>([]);
  const [detailsById, setDetailsById] = useState<Record<string, Article>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [profileState, setProfileState] = useState<NetworkProfile>({
    emaMs: 900,
    prefetchTarget: MEDIUM_TARGET,
    prefetchConcurrency: MEDIUM_CONCURRENCY,
  });
  const inflight = useRef<Set<string>>(new Set());
  const hydrated = useRef<Set<string>>(new Set());
  const generationRef = useRef(0);
  const profileRef = useRef<NetworkProfile>(profileState);

  const recalcSpeedProfile = useCallback((sampleMs: number) => {
    const current = profileRef.current;
    const emaMs = current.emaMs * 0.75 + sampleMs * 0.25;
    const prefetchTarget =
      emaMs > 1800 ? SLOW_TARGET : emaMs > 950 ? MEDIUM_TARGET : FAST_TARGET;
    const prefetchConcurrency =
      emaMs > 1800 ? SLOW_CONCURRENCY : emaMs > 950 ? MEDIUM_CONCURRENCY : FAST_CONCURRENCY;
    const next = {emaMs, prefetchTarget, prefetchConcurrency};
    profileRef.current = next;
    setProfileState(next);
  }, []);

  const hydrateArticle = useCallback(async (base: ParsedArticle) => {
    if (inflight.current.has(base.id)) {
      return;
    }
    if (hydrated.current.has(base.id)) {
      return;
    }
    inflight.current.add(base.id);
    const t0 = Date.now();
    try {
      const html = await fetchHtml(base.url);
      const parsed = parseDetailArticle(base, html);
      setDetailsById(prev => ({
        ...prev,
        [base.id]: {
          ...parsed,
          bodyText: parsed.bodyText || base.title,
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
      recalcSpeedProfile(Date.now() - t0);
    }
  }, [recalcSpeedProfile]);

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
    (async () => {
      try {
        const listingStart = Date.now();
        const html = await fetchHtml(categoryUrl(category));
        recalcSpeedProfile(Date.now() - listingStart);
        if (generationRef.current !== thisGen) {
          return;
        }
        const listing = parseListingLinks(html).slice(0, MAX_LISTING_ITEMS);
        setItems(listing);
        const warm = listing.slice(0, profileRef.current.prefetchTarget);
        let idx = 0;
        async function worker() {
          for (;;) {
            const i = idx++;
            if (i >= warm.length || generationRef.current !== thisGen) {
              return;
            }
            const article = warm[i];
            if (article) {
              await hydrateArticle(article);
            }
          }
        }
        const run = Promise.all(
          Array.from(
            {length: Math.min(profileRef.current.prefetchConcurrency, warm.length)},
            () => worker(),
          ),
        );
        run.catch(() => {});
      } catch {
        setError('समाचार लोड गर्न सकिएन ।');
      } finally {
        setLoading(false);
      }
    })();
  }, [category, hydrateArticle, recalcSpeedProfile, refreshTick]);

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
    prefetchTarget: profileState.prefetchTarget,
    prefetchConcurrency: profileState.prefetchConcurrency,
    reload,
  };
}
