import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ABOUT_URL,
  TEAM_URL,
  fetchInfoHtml,
  parseAboutPage,
  parseTeamPage,
} from '../scrape/infoPages';
import type {AboutContent, TeamContent} from '../types/infoPages';

const KEY_ABOUT = 'baahrakhari_info_about_v1';
const KEY_TEAM = 'baahrakhari_info_team_v1';

/** Treat cache as fresh enough to skip a background refresh under this age. */
const STALE_MS = 6 * 60 * 60 * 1000;

type InfoState = {
  about?: AboutContent;
  team?: TeamContent;
  /** True only while no cached data is available *and* we're still trying. */
  loading: boolean;
  /** Set when both cache miss *and* network refresh failed. */
  error: string | null;
  /** True if the last refresh succeeded from network. */
  online: boolean;
  /** Force a network refresh regardless of cache age. */
  refresh: () => Promise<void>;
};

function asAbout(value: unknown): AboutContent | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const v = value as Partial<AboutContent>;
  if (typeof v.heading !== 'string' || !Array.isArray(v.paragraphs)) {
    return undefined;
  }
  return {
    url: typeof v.url === 'string' ? v.url : ABOUT_URL,
    heading: v.heading,
    paragraphs: v.paragraphs.filter((p): p is string => typeof p === 'string'),
    fetchedAt: typeof v.fetchedAt === 'number' ? v.fetchedAt : 0,
  };
}

function asTeam(value: unknown): TeamContent | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const v = value as Partial<TeamContent>;
  if (typeof v.heading !== 'string' || !Array.isArray(v.categories)) {
    return undefined;
  }
  const categories = v.categories
    .map(cat => {
      if (!cat || typeof cat !== 'object' || typeof cat.title !== 'string') {
        return undefined;
      }
      const members = Array.isArray(cat.members)
        ? cat.members.filter(
            member =>
              member &&
              typeof member === 'object' &&
              typeof member.name === 'string',
          )
        : [];
      return {title: cat.title, members};
    })
    .filter((cat): cat is NonNullable<typeof cat> => cat != null);
  return {
    url: typeof v.url === 'string' ? v.url : TEAM_URL,
    heading: v.heading,
    categories,
    fetchedAt: typeof v.fetchedAt === 'number' ? v.fetchedAt : 0,
  };
}

async function readCache<T>(
  key: string,
  coerce: (value: unknown) => T | undefined,
): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return undefined;
    }
    return coerce(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* AsyncStorage failure is non-fatal: in-memory state still works. */
  }
}

/**
 * Owns the cached About / Team content. Behavior:
 *  - On mount, hydrate from AsyncStorage immediately so the in-app modal can
 *    open offline.
 *  - In parallel, fetch fresh HTML and re-parse; on success, overwrite cache.
 *  - If a refresh fails *but* cache exists, leave the cache visible.
 *  - If a refresh fails *and* no cache exists, expose `error`.
 */
export function useInfoPages(): InfoState {
  const [about, setAbout] = useState<AboutContent | undefined>(undefined);
  const [team, setTeam] = useState<TeamContent | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  /** Avoid duplicate concurrent refreshes when the user taps quickly. */
  const refreshing = useRef(false);
  const haveCacheRef = useRef(false);

  const doRefresh = useCallback(async (force: boolean) => {
    if (refreshing.current) {
      return;
    }
    refreshing.current = true;
    try {
      const skipAbout =
        !force &&
        about &&
        Date.now() - about.fetchedAt < STALE_MS;
      const skipTeam =
        !force && team && Date.now() - team.fetchedAt < STALE_MS;

      const aboutPromise = skipAbout
        ? Promise.resolve(undefined)
        : fetchInfoHtml(ABOUT_URL).then(html => asAbout(parseAboutPage(html)));
      const teamPromise = skipTeam
        ? Promise.resolve(undefined)
        : fetchInfoHtml(TEAM_URL).then(html => asTeam(parseTeamPage(html)));

      const [aboutRes, teamRes] = await Promise.allSettled([
        aboutPromise,
        teamPromise,
      ]);
      let touched = false;
      if (aboutRes.status === 'fulfilled' && aboutRes.value) {
        const next = aboutRes.value;
        setAbout(next);
        haveCacheRef.current = true;
        await writeCache(KEY_ABOUT, next);
        touched = true;
      }
      if (teamRes.status === 'fulfilled' && teamRes.value) {
        const next = teamRes.value;
        setTeam(next);
        haveCacheRef.current = true;
        await writeCache(KEY_TEAM, next);
        touched = true;
      }
      const networkOk =
        aboutRes.status === 'fulfilled' && teamRes.status === 'fulfilled';
      setOnline(networkOk);
      if (touched) {
        setError(null);
      } else if (!networkOk && !haveCacheRef.current) {
        setError('इन्टरनेट उपलब्ध छैन ।');
      }
    } finally {
      refreshing.current = false;
    }
  }, [about, team]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cachedAbout, cachedTeam] = await Promise.all([
        readCache(KEY_ABOUT, asAbout),
        readCache(KEY_TEAM, asTeam),
      ]);
      if (cancelled) {
        return;
      }
      if (cachedAbout) {
        setAbout(cachedAbout);
        haveCacheRef.current = true;
      }
      if (cachedTeam) {
        setTeam(cachedTeam);
        haveCacheRef.current = true;
      }
      setLoading(false);
      /** Refresh in the background; UI is already usable from cache. */
      doRefresh(false).catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
    /** Intentional: only run once on mount; `doRefresh` reads latest state. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    await doRefresh(true);
  }, [doRefresh]);

  return useMemo(
    () => ({about, team, loading, error, online, refresh}),
    [about, team, loading, error, online, refresh],
  );
}
