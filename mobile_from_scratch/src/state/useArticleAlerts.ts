import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState, PermissionsAndroid, Platform} from 'react-native';
import PushNotification from 'react-native-push-notification';
import {categoryUrl} from '../config/site';
import {fetchHtml, parseDetailArticle, parseListingLinks} from '../scrape/baahrakhari';

const SETTINGS_KEY = 'baahrakhari_alert_settings_v1';
const CHANNEL_ID = 'baahrakhari-news-alerts';
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const MIN_NOTIFY_GAP_MS = 60 * 60 * 1000;
const MAX_SEEN_IDS = 200;

type PersistedAlerts = {
  lastNotifiedAt: number;
  seenIds: string[];
};

const DEFAULT_SETTINGS: PersistedAlerts = {
  lastNotifiedAt: 0,
  seenIds: [],
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

export function useArticleAlerts() {
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const enabledRef = useRef(false);
  const lastNotifiedAtRef = useRef(0);
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const persistState = useCallback(async () => {
    const payload: PersistedAlerts = {
      lastNotifiedAt: lastNotifiedAtRef.current,
      seenIds: Array.from(seenRef.current).slice(0, MAX_SEEN_IDS),
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
      onNotification: () => {},
      popInitialNotification: true,
      requestPermissions: false,
    });
    PushNotification.createChannel(
      {
        channelId: CHANNEL_ID,
        channelName: 'Baahrakhari Alerts',
        channelDescription: 'Hourly alerts for newly published articles',
        importance: 4,
        vibrate: true,
      },
      () => {},
    );
    initializedRef.current = true;
  }, []);

  const checkAndNotify = useCallback(async () => {
    if (!enabledRef.current) {
      return;
    }

    const now = Date.now();
    const sinceLast = now - lastNotifiedAtRef.current;
    if (sinceLast < MIN_NOTIFY_GAP_MS) {
      return;
    }

    const html = await fetchHtml(categoryUrl('home'));
    const listing = parseListingLinks(html).slice(0, 25);
    const newest = listing.find(item => !seenRef.current.has(item.id));
    if (!newest) {
      return;
    }

    seenRef.current.add(newest.id);
    if (seenRef.current.size > MAX_SEEN_IDS) {
      const trimmed = Array.from(seenRef.current).slice(-MAX_SEEN_IDS);
      seenRef.current = new Set(trimmed);
    }

    let imageUrl: string | undefined;
    try {
      const detailHtml = await fetchHtml(newest.url);
      const detailed = parseDetailArticle(newest, detailHtml);
      imageUrl = detailed.imageUrl;
    } catch {
      imageUrl = undefined;
    }

    PushNotification.localNotification({
      channelId: CHANNEL_ID,
      title: 'नयाँ समाचार',
      message: newest.title,
      bigPictureUrl: imageUrl,
      largeIconUrl: imageUrl,
      playSound: true,
      soundName: 'default',
      userInfo: {url: newest.url},
    });

    lastNotifiedAtRef.current = now;
    await persistState();
  }, [persistState]);

  useEffect(() => {
    configurePush();
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        const parsed = raw
          ? (JSON.parse(raw) as PersistedAlerts & {enabled?: boolean})
          : DEFAULT_SETTINGS;
        lastNotifiedAtRef.current = parsed.lastNotifiedAt || 0;
        seenRef.current = new Set((parsed.seenIds || []).slice(0, MAX_SEEN_IDS));
      } catch {
        lastNotifiedAtRef.current = 0;
        seenRef.current = new Set();
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
      }
    });
    return () => sub.remove();
  }, [refreshOsPermission]);

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
