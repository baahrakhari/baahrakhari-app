import {useEffect, useRef, useState} from 'react';
import {fetchBreakingHeadlines, fetchCategoryList} from '../scrape/tajaNewsApi';
import type {Article, CategorySlug} from '../types/article';

export type HomeCategorySection = {
  slug: CategorySlug;
  label: string;
  items: Article[];
};

/**
 * Homepage extras: banner “शीर्ष समाचार” (`getBannerDatas`) plus the handful
 * of magazine-style sections baahrakhari.com stacks below ताजा समाचार
 * (राजनीति, अर्थ व्यवसाय, खेल, विचार …). Kept to a small curated set so
 * the home screen stays light on data.
 */
const PREVIEW_CATEGORIES: Array<{slug: CategorySlug; label: string}> = [
  {slug: 'politics', label: 'राजनीति'},
  {slug: 'economy', label: 'अर्थ व्यवसाय'},
  {slug: 'sport', label: 'खेल'},
  {slug: 'opinion', label: 'विचार'},
];
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
          ...PREVIEW_CATEGORIES.map(cat =>
            fetchCategoryList(cat.slug).catch(() => ({
              listing: [],
              articlesById: {} as Record<string, Article>,
            })),
          ),
        ]);
        setBreaking(headlines);
        setSections(
          PREVIEW_CATEGORIES.map((cat, i) => {
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
