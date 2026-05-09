import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useMemo, useState} from 'react';
import type {Article, SavedArticle} from '../types/article';

const KEY = 'baahrakhari_read_later_v1';
const MAX_SAVED = 20;

export function useReadLater() {
  const [saved, setSaved] = useState<SavedArticle[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const parsed = raw ? (JSON.parse(raw) as SavedArticle[]) : [];
        setSaved(Array.isArray(parsed) ? parsed : []);
      } catch {
        setSaved([]);
      } finally {
        setLoadingSaved(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: SavedArticle[]) => {
    setSaved(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const isSaved = useCallback(
    (id: string) => saved.some(item => item.id === id),
    [saved],
  );

  const toggleSaved = useCallback(
    async (article: Article) => {
      const exists = saved.some(item => item.id === article.id);
      if (exists) {
        const next = saved.filter(item => item.id !== article.id);
        await persist(next);
        return false;
      }
      const nextItem: SavedArticle = {...article, savedAt: Date.now()};
      const next = [nextItem, ...saved.filter(item => item.id !== article.id)].slice(
        0,
        MAX_SAVED,
      );
      await persist(next);
      return true;
    },
    [persist, saved],
  );

  const unsave = useCallback(
    async (id: string) => {
      const next = saved.filter(item => item.id !== id);
      await persist(next);
    },
    [persist, saved],
  );

  return useMemo(
    () => ({
      saved,
      loadingSaved,
      isSaved,
      toggleSaved,
      unsave,
      maxSaved: MAX_SAVED,
    }),
    [saved, loadingSaved, isSaved, toggleSaved, unsave],
  );
}
