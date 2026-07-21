import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState, PermissionsAndroid, Platform} from 'react-native';
import PushNotification from 'react-native-push-notification';
import {SITE_HEADER_LOGO_URL} from '../config/site';
import {fetchTajaNews} from '../scrape/tajaNewsApi';
import type {ParsedArticle} from '../types/article';

const SETTINGS_KEY = 'baahrakhari_alert_settings_v1';
const CHANNEL_ID = 'baahrakhari-news-alerts';
/** Poll for new ताजा articles while the app process is alive. */
const CHECK_INTERVAL_MS = 3 * 60 * 1000;
const MAX_SEEN_IDS = 200;

type PersistedAlerts = {
  seenIds: string[];
  seeded: boolean;
};

const DEFAULT_SETTINGS: PersistedAlerts = {
  seenIds: [],
  seeded: false,
};

type Options = {
  onOpenArticle?: (url: string) => void;
};

async function notificationsAuthorizedByOs(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return new Promise(resolve => {
      PushNotification.checkPermissions((perms: {alert?: boolean}) => {
        resolve(!!perms.alert);
      });
    });
  }
  if (Platform.OS === 'android') {
    const api =
      typeof Platform.Version === 'number'
        ? Platform.Version
        : parseInt(String(Platform.Version), 10);
    if (api >= 33) {
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

export function useArticleAlerts(options: Options = {}) {
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const enabledRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);
  const initializedRef = useRef(false);
  const onOpenArticleRef = useRef(options.onOpenArticle);
  onOpenArticleRef.current = options.onOpenArticle;

  const persistState = useCallback(async () => {
    const payload: PersistedAlerts = {
      seenIds: Array.from(seenRef.current).slice(0, MAX_SEEN_IDS),
      seeded: seededRef.current,
    };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
  }, []);

  const refreshOsPermission = useCallback(async () => {
    const ok = await notificationsAuthorizedByOs();
    enabledRef.current = ok;
    setNotificationsAllowed(ok);
  }, []);

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
      },
      popInitialNotification: true,
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

  const markSeen = useCallback((listing: ParsedArticle[]) => {
    for (const row of listing) {
      seenRef.current.add(row.id);
    }
    if (seenRef.current.size > MAX_SEEN_IDS) {
      const trimmed = Array.from(seenRef.current).slice(-MAX_SEEN_IDS);
      seenRef.current = new Set(trimmed);
    }
  }, []);

  const notifyNewArticle = useCallback((article: ParsedArticle) => {
    PushNotification.localNotification({
      channelId: CHANNEL_ID,
      title: 'नयाँ समाचार',
      message: article.title,
      largeIconUrl: SITE_HEADER_LOGO_URL,
      smallIcon: 'ic_launcher',
      playSound: true,
      soundName: 'default',
      userInfo: {url: article.url},
    });
  }, []);

  const checkAndNotify = useCallback(async () => {
    if (!enabledRef.current) {
      return;
    }

    const {listing} = await fetchTajaNews();

    if (!seededRef.current) {
      markSeen(listing);
      seededRef.current = true;
      await persistState();
      return;
    }

    const fresh = listing.filter(row => !seenRef.current.has(row.id));
    if (fresh.length === 0) {
      return;
    }

    /** Newest unseen article (listing is newest-first from the API). */
    const newest = fresh[0];
    markSeen(listing);
    notifyNewArticle(newest);
    await persistState();
  }, [markSeen, notifyNewArticle, persistState]);

  useEffect(() => {
    configurePush();
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        const parsed = raw
          ? (JSON.parse(raw) as PersistedAlerts & {enabled?: boolean; lastNotifiedAt?: number})
          : DEFAULT_SETTINGS;
        seenRef.current = new Set((parsed.seenIds || []).slice(0, MAX_SEEN_IDS));
        seededRef.current = parsed.seeded ?? false;
      } catch {
        seenRef.current = new Set();
        seededRef.current = false;
      } finally {
        setLoadingAlerts(false);
      }
    })();
  }, [configurePush]);

  useEffect(() => {
    if (!loadingAlerts) {
      refreshOsPermission().catch(() => {});
    }
  }, [loadingAlerts, refreshOsPermission]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshOsPermission().catch(() => {});
        if (enabledRef.current) {
          checkAndNotify().catch(() => {});
        }
      }
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

  return useMemo(() => ({loadingAlerts}), [loadingAlerts]);
}
