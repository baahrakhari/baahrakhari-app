import {useEffect, useRef, useState} from 'react';
import {HOME_PREVIEW_CATEGORIES} from '../config/site';
import {fetchBreakingHeadlines, fetchCategoryList} from '../scrape/tajaNewsApi';
import type {Article, CategorySlug} from '../types/article';

export type HomeCategorySection = {
  slug: CategorySlug;
  label: string;
  items: Article[];
};

const PREVIEW_ITEMS_PER_CATEGORY = 4;
/** Fetch enough banner items for the full in-app headlines page. */
const HEADLINES_FETCH_LIMIT = 40;

/** Homepage-only sections built from `getBannerDatas` + `getCategoryList`. */
export function useHomeSections() {
  const [breaking, setBreaking] = useState<Article[]>([]);
  const [sections, setSections] = useState<HomeCategorySection[]>([]);
  const [loading, setLoading] = useState(true);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    (async () => {
      try {
        const [headlines, ...categoryResults] = await Promise.all([
          fetchBreakingHeadlines(HEADLINES_FETCH_LIMIT).catch(() => []),
          ...HOME_PREVIEW_CATEGORIES.map(cat =>
            fetchCategoryList(cat.slug).catch(() => ({
              listing: [],
              articlesById: {} as Record<string, Article>,
            })),
          ),
        ]);
        setBreaking(headlines);
        setSections(
          HOME_PREVIEW_CATEGORIES.map((cat, i) => {
            const result = categoryResults[i];
            const items = result.listing
              .slice(0, PREVIEW_ITEMS_PER_CATEGORY)
              .map(row => result.articlesById[row.id])
              .filter((article): article is Article => !!article);
            return {slug: cat.slug, label: cat.label, items};
          }),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return {breaking, sections, loading};
}
