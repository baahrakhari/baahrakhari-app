import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState, PermissionsAndroid, Platform} from 'react-native';
import PushNotification from 'react-native-push-notification';
import {SITE_HEADER_LOGO_URL} from '../config/site';
import {fetchBreakingHeadlines, fetchTajaNews} from '../scrape/tajaNewsApi';
import type {ParsedArticle} from '../types/article';

const SETTINGS_KEY = 'baahrakhari_alert_settings_v1';
const CHANNEL_ID = 'baahrakhari-news-alerts';
/** Poll for new ब्रेकिंग / ताजा articles while the app process is alive. */
const CHECK_INTERVAL_MS = 3 * 60 * 1000;
const MAX_SEEN_IDS = 200;
const BREAKING_LIMIT = 8;
/** Android 13 (Tiramisu) is where POST_NOTIFICATIONS became a runtime grant. */
const ANDROID_RUNTIME_NOTIFICATION_API = 33;

type PersistedAlerts = {
  seenIds: string[];
  seeded: boolean;
  /**
   * Whether we've already shown the OS permission prompt once. Both
   * platforms only ever surface it on the first ask, so re-requesting on
   * every launch is pointless — but we still re-check the live OS answer.
   */
  permissionAsked: boolean;
};

const DEFAULT_SETTINGS: PersistedAlerts = {
  seenIds: [],
  seeded: false,
  permissionAsked: false,
};

type Options = {
  onOpenArticle?: (url: string) => void;
};

export type ArticleAlerts = {
  loadingAlerts: boolean;
  notificationsAllowed: boolean;
  /** Shows the OS prompt (first call) and returns the resulting grant. */
  requestPermission: () => Promise<boolean>;
  /** Polls both feeds immediately; exposed for pull-to-refresh and tests. */
  checkNow: () => Promise<void>;
};

function androidApiLevel(): number {
  return typeof Platform.Version === 'number'
    ? Platform.Version
    : parseInt(String(Platform.Version), 10) || 0;
}

async function notificationsAuthorizedByOs(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return new Promise(resolve => {
      PushNotification.checkPermissions((perms: {alert?: boolean}) => {
        resolve(!!perms?.alert);
      });
    });
  }
  if (Platform.OS === 'android') {
    if (androidApiLevel() >= ANDROID_RUNTIME_NOTIFICATION_API) {
      try {
        return await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      } catch {
        return false;
      }
    }
    return true;
  }
  return false;
}

/**
 * Actually asks the OS. `notificationsAuthorizedByOs` only reports the
 * current answer — without this the app can never move off the default
 * "denied" state on iOS or Android 13+, and no alert ever fires.
 */
async function requestOsPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    try {
      /** Asks for alert + badge + sound; the library has no narrower option. */
      const perms = (await PushNotification.requestPermissions()) as
        | {alert?: boolean}
        | undefined;
      if (perms && typeof perms.alert === 'boolean') {
        return perms.alert;
      }
    } catch {
      /* fall through to a fresh check below */
    }
    return notificationsAuthorizedByOs();
  }
  if (Platform.OS === 'android') {
    if (androidApiLevel() < ANDROID_RUNTIME_NOTIFICATION_API) {
      return true;
    }
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }
  return false;
}

export function useArticleAlerts(options: Options = {}): ArticleAlerts {
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const enabledRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);
  const permissionAskedRef = useRef(false);
  const initializedRef = useRef(false);
  const checkInFlightRef = useRef(false);
  const onOpenArticleRef = useRef(options.onOpenArticle);
  onOpenArticleRef.current = options.onOpenArticle;

  const persistState = useCallback(async () => {
    const payload: PersistedAlerts = {
      seenIds: Array.from(seenRef.current).slice(0, MAX_SEEN_IDS),
      seeded: seededRef.current,
      permissionAsked: permissionAskedRef.current,
    };
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
    } catch {
      /* storage full / unavailable — alerts still work for this session */
    }
  }, []);

  const applyPermission = useCallback((ok: boolean) => {
    enabledRef.current = ok;
    setNotificationsAllowed(ok);
  }, []);

  const refreshOsPermission = useCallback(async () => {
    applyPermission(await notificationsAuthorizedByOs());
  }, [applyPermission]);

  const configurePush = useCallback(() => {
    if (initializedRef.current) {
      return;
    }
    PushNotification.configure({
      onNotification: notification => {
        const data = (notification as {data?: {url?: string}}).data;
        const url =
          data?.url ||
          (notification as {userInfo?: {url?: string}}).userInfo?.url;
        const tapped =
          notification.userInteraction === true ||
          (notification as {action?: string}).action === 'Press';
        if (tapped && url) {
          onOpenArticleRef.current?.(url);
        }
        /** iOS requires the fetch handler to be closed out. */
        (notification as {finish?: (result: string) => void}).finish?.(
          'UIBackgroundFetchResultNoData',
        );
      },
      popInitialNotification: true,
      /** Asked explicitly in `requestPermission` so we control the timing. */
      requestPermissions: false,
    });
    PushNotification.createChannel(
      {
        channelId: CHANNEL_ID,
        channelName: 'Baahrakhari Latest News',
        channelDescription: 'Alerts when a new Baahrakhari article is published',
        importance: 4,
        vibrate: true,
      },
      () => {},
    );
    initializedRef.current = true;
  }, []);

  /**
   * Rebuilds the seen set newest-first so everything currently in the feed
   * survives the cap. Trimming by insertion order used to evict the newest
   * ids first, which made long feeds re-notify articles already shown.
   */
  const markSeen = useCallback((listings: ParsedArticle[][]) => {
    const next = new Set<string>();
    for (const listing of listings) {
      for (const row of listing) {
        next.add(row.id);
      }
    }
    for (const id of seenRef.current) {
      if (next.size >= MAX_SEEN_IDS) {
        break;
      }
      next.add(id);
    }
    seenRef.current = next;
  }, []);

  const notifyNewArticle = useCallback(
    (article: ParsedArticle, isBreaking: boolean) => {
      PushNotification.localNotification({
        channelId: CHANNEL_ID,
        title: isBreaking ? 'ब्रेकिंग समाचार' : 'नयाँ समाचार',
        message: article.title,
        largeIconUrl: SITE_HEADER_LOGO_URL,
        smallIcon: 'ic_launcher',
        playSound: true,
        soundName: 'default',
        userInfo: {url: article.url},
      });
    },
    [],
  );

  const checkAndNotify = useCallback(async () => {
    if (!enabledRef.current || checkInFlightRef.current) {
      return;
    }
    checkInFlightRef.current = true;
    try {
      const [taja, breaking] = await Promise.all([
        fetchTajaNews()
          .then(res => res.listing)
          .catch(() => null),
        fetchBreakingHeadlines(BREAKING_LIMIT).catch(() => null),
      ]);

      /**
       * Both feeds failed (offline / API down). Bail without seeding —
       * seeding on an empty result would make the next successful poll
       * treat the whole feed as new and fire a burst of alerts.
       */
      if (taja == null && breaking == null) {
        return;
      }

      const tajaRows = taja ?? [];
      const breakingRows = breaking ?? [];

      if (!seededRef.current) {
        markSeen([breakingRows, tajaRows]);
        seededRef.current = true;
        await persistState();
        return;
      }

      const freshBreaking = breakingRows.filter(
        row => !seenRef.current.has(row.id),
      );
      const freshTaja = tajaRows.filter(row => !seenRef.current.has(row.id));
      /** Breaking wins; both feeds are newest-first from the API. */
      const newest = freshBreaking[0] ?? freshTaja[0];

      markSeen([breakingRows, tajaRows]);

      if (!newest) {
        return;
      }
      /** One alert per poll — never a burst, even after a long offline gap. */
      notifyNewArticle(newest, freshBreaking.length > 0);
      await persistState();
    } finally {
      checkInFlightRef.current = false;
    }
  }, [markSeen, notifyNewArticle, persistState]);

  const requestPermission = useCallback(async () => {
    const ok = await requestOsPermission();
    permissionAskedRef.current = true;
    applyPermission(ok);
    await persistState();
    return ok;
  }, [applyPermission, persistState]);

  useEffect(() => {
    configurePush();
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        const parsed = raw
          ? (JSON.parse(raw) as Partial<PersistedAlerts>)
          : DEFAULT_SETTINGS;
        seenRef.current = new Set((parsed.seenIds || []).slice(0, MAX_SEEN_IDS));
        seededRef.current = parsed.seeded ?? false;
        permissionAskedRef.current = parsed.permissionAsked ?? false;
      } catch {
        seenRef.current = new Set();
        seededRef.current = false;
        permissionAskedRef.current = false;
      } finally {
        setLoadingAlerts(false);
      }
    })();
  }, [configurePush]);

  /**
   * First launch asks for the permission outright. Without this the hook
   * only ever *checked* a grant that nothing had requested, so the OS
   * default ("denied" on iOS, "denied" on Android 13+) was permanent and
   * no breaking-news alert could ever fire.
   */
  useEffect(() => {
    if (loadingAlerts) {
      return;
    }
    (async () => {
      const granted = await notificationsAuthorizedByOs();
      if (granted || permissionAskedRef.current) {
        applyPermission(granted);
        return;
      }
      await requestPermission();
    })().catch(() => {});
  }, [applyPermission, loadingAlerts, requestPermission]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        return;
      }
      (async () => {
        await refreshOsPermission();
        if (enabledRef.current) {
          await checkAndNotify();
        }
      })().catch(() => {});
    });
    return () => sub.remove();
  }, [checkAndNotify, refreshOsPermission]);

  useEffect(() => {
    if (!notificationsAllowed || loadingAlerts) {
      return;
    }
    checkAndNotify().catch(() => {});
    const id = setInterval(() => {
      checkAndNotify().catch(() => {});
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [notificationsAllowed, loadingAlerts, checkAndNotify]);

  return useMemo(
    () => ({
      loadingAlerts,
      notificationsAllowed,
      requestPermission,
      checkNow: checkAndNotify,
    }),
    [checkAndNotify, loadingAlerts, notificationsAllowed, requestPermission],
  );
}
