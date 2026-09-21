import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  type ImageStyle,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  Vibration,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {CONTACT_INFO_EN, DRAWER_FEED_CATEGORIES, FOOTER_INFO, INFO_LINKS, NEWS_CATEGORIES, SITE_CONTACT_URL, APP_PUBLISHER, nepaliDigitsToAscii, type ContactBlocksContent} from './src/config/site';
import {parseBaahrakhariArticleUrl} from './src/linking/baahrakhariUrls';
import type {HomeAdsMap} from './src/scrape/advertisements';
import {fetchNewsDetail} from './src/scrape/tajaNewsApi';
import {useArticleAlerts} from './src/state/useArticleAlerts';
import {useArticleFeed} from './src/state/useArticleFeed';
import {useHomeAds} from './src/state/useHomeAds';
import {useHomeSections, type HomeCategorySection} from './src/state/useHomeSections';
import {useInfoPages} from './src/state/useInfoPages';
import {useReadLater} from './src/state/useReadLater';
import {useSiteHeaderDate} from './src/state/useSiteHeaderDate';
import type {InfoPageKey} from './src/types/infoPages';
import {ScrollView as GHScrollView} from 'react-native-gesture-handler';
import {
  PinchZoomArticleBody,
  ARTICLE_FONT_MAX,
  ARTICLE_FONT_MIN,
} from './src/components/PinchZoomArticleBody';
import {HomeAdSlot} from './src/components/HomeAdSlot';
import {Colors} from './src/theme/colors';
import {
  READING_DEFAULT_BODY,
  isIPad,
  isTablet,
  scaleFont,
} from './src/theme/device';
import type {Article, CategoryKey, SavedArticle} from './src/types/article';
import {ArticleVideoEmbeds} from './src/components/ArticleVideoEmbeds';
import {DentArticleAction} from './src/components/DentArticleAction';
import {AppSplash} from './src/components/AppSplash';
import {formatArticleMetaLine} from './src/format/articleMeta';

const BURGER_ICON = '☰';
const MORE_HEADLINES_LABEL = 'थप शीर्ष समाचार...';
/** Home title-pane headlines before “थप शीर्ष समाचार...”. */
const HOME_HEADLINE_PREVIEW = 12;
/** Compact internally scrolling title pane (~top third of the window). */
const HOME_HEADLINES_PANE_RATIO = 0.28;
/** Horizontal ताजा strip on home (~8–12). */
const TAJA_HORIZONTAL_LIMIT = 12;
/** Outer home list is header+footer only; headlines scroll in their own pane. */
const HOME_FEED_LIST_DATA: Array<{id: string}> = [];
const ICON_SAVE_ARTICLE = require('./assets/icons/save_article.png');
const ICON_SAVE_ARTICLE_DARK = require('./assets/icons/save_article_dark.png');
const ICON_SHARE = require('./assets/icons/share_icon.png');
const ICON_SHARE_DARK = require('./assets/icons/share_icon_dark.png');
/** Wide mark for iPad header (next to home); source 201×88 px */
const ICON_BRAND_LONG = require('./assets/icons/12kharilogo_longer.png');
const ICON_REMOVE_BOOKMARK = require('./assets/icons/remove_bookmark.png');
const ICON_REMOVE_BOOKMARK_DARK = require('./assets/icons/remove_bookmark_dark.png');
const ICON_THEME_MOON = require('./assets/icons/nepali_flag_moon.png');
const ICON_THEME_SUN = require('./assets/icons/nepali_flag_sun.png');
/** White interior blob — tinted with accent when article is saved */
const ICON_SAVE_INNER_TEMPLATE = require('./assets/icons/save_article_inner_template.png');
/** Hit box matches meta row icon button */
const ARTICLE_SAVE_ICON_BOX = 36;
/** Share glyph ~70% of action button — fixed px avoids Android compositing glitches */
const ARTICLE_SHARE_ICON_SIZE = 25;
/** Pixels: treat body as scrollable only if content is taller than the viewport by at least this much. */
const SCROLL_CHROME_EPS = 3;
const SAVE_TOAST_MS = 2200;
const SAVE_TOAST_SAVED = 'सुरक्षित भयो';
const SAVE_TOAST_ALREADY = 'पहिले नै सुरक्षित छ';

function httpUri(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
}

/**
 * Pure hero-height math shared by the reactive `resolveHeroHeight` (used in
 * render) and the ref-driven copy inside `onViewableItemsChanged` (which
 * FlatList freezes on mount and can't be swapped for a fresh closure).
 */
function computeHeroHeightPx(
  hasImage: boolean,
  aspect: number | undefined,
  screenWidth: number,
  bounds: {min: number; max: number; fallback: number; noImage: number},
): number {
  if (!hasImage) {
    return bounds.noImage;
  }
  if (!aspect) {
    return bounds.fallback;
  }
  return Math.max(bounds.min, Math.min(bounds.max, Math.round(screenWidth * aspect)));
}

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppBody />
    </SafeAreaProvider>
  );
}

function AppBody(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [isDark, setIsDark] = useState(false);
  const [mode, setMode] = useState<'feed' | 'read'>('feed');
  const [category, setCategory] = useState<CategoryKey>('home');
  const siteDateLabel = useSiteHeaderDate();
  /** In-app full list of शीर्ष समाचार (opened from “थप शीर्ष समाचार...”). */
  const [headlinesListOpen, setHeadlinesListOpen] = useState(false);
  /**
   * Home opens as a website-style title list (headline rows + ताजा strip +
   * हाम्रो footer). Tapping a ताजा card drills into the existing swipe reader
   * at that index; the header logo resets us back to the list.
   */
  const [homeDrilled, setHomeDrilled] = useState(false);
  const [homeStartIndex, setHomeStartIndex] = useState(0);
  const [bodyFontSize, setBodyFontSize] = useState(READING_DEFAULT_BODY);
  const [, setFocusedIndex] = useState(0);
  const bodyFontSizeRef = useRef(bodyFontSize);
  bodyFontSizeRef.current = bodyFontSize;
  const [isHeroCollapsed, setIsHeroCollapsed] = useState(false);
  const [swipeHintDir, setSwipeHintDir] = useState<'next' | 'prev' | null>(null);
  const [readModalArticle, setReadModalArticle] = useState<SavedArticle | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Side burger menu — replaces the old collapsing category bar. */
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  /** Saved-article / deep-link modal hero — sized on load to avoid cropping, no collapse needed. */
  const [readHeroHeight, setReadHeroHeight] = useState(220);
  const width = Dimensions.get('window').width;
  const height = Dimensions.get('window').height;
  const pagerRef = useRef<FlatList<Article>>(null);
  const transitionAnim = useRef(new Animated.Value(1)).current;
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const swipeHintOpacity = useRef(new Animated.Value(0)).current;
  const horizontalOffsetRef = useRef(0);
  const lastHintAtRef = useRef(0);
  /**
   * Hero image sizing: the box height tracks each article's own image
   * aspect ratio (measured on load) so the full picture is visible on
   * open — never just a cropped sliver — while still collapsing to a
   * thin title strip once the reader scrolls into the body.
   */
  const HERO_MIN_HEIGHT = 200;
  const HERO_MAX_HEIGHT = Math.round(height * 0.62);
  const HERO_DEFAULT_HEIGHT = Math.max(220, Math.round(height * 0.42));
  const HERO_NO_IMAGE_HEIGHT = Math.max(160, Math.round(height * 0.22));
  const [heroExpanded, setHeroExpanded] = useState(HERO_DEFAULT_HEIGHT);
  const heroAspectRef = useRef<Record<string, number>>({});
  /** Scroll-collapse: title strip only (image hidden); taller than old partial collapse */
  const heroCollapsedReading = Math.max(52, Math.min(72, Math.floor(height * 0.072)));
  const heroHeightAnim = useRef(new Animated.Value(HERO_DEFAULT_HEIGHT)).current;
  const heroCollapsedRef = useRef(false);
  /** Which feed article owns scroll-driven chrome (ignore off-screen rows). */
  const focusedArticleIdRef = useRef<string | null>(null);
  const {
    items,
    articleById,
    loading,
    error,
    hydrateArticle,
    reload,
  } =
    useArticleFeed(category);
  const {saved, isSaved, toggleSaved, unsave, loadingSaved, maxSaved} = useReadLater();
  const homeSections = useHomeSections();
  const homeAds = useHomeAds();
  const heroBounds = useMemo(
    () => ({
      min: HERO_MIN_HEIGHT,
      max: HERO_MAX_HEIGHT,
      fallback: HERO_DEFAULT_HEIGHT,
      noImage: HERO_NO_IMAGE_HEIGHT,
    }),
    [HERO_DEFAULT_HEIGHT, HERO_MAX_HEIGHT, HERO_MIN_HEIGHT, HERO_NO_IMAGE_HEIGHT],
  );
  /**
   * `onViewableItemsChanged` is frozen by FlatList at mount (RN forbids
   * swapping that prop), so it reads live data through this ref rather
   * than through `articleById` directly.
   */
  const articleByIdRef = useRef(articleById);
  articleByIdRef.current = articleById;
  /**
   * FlatList freezes `onViewableItemsChanged` at mount, so listing rows and
   * hydrate must be read through refs — otherwise category switches keep the
   * first (empty) `items` closure and focus/hydration silently break.
   */
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const hydrateArticleRef = useRef(hydrateArticle);
  hydrateArticleRef.current = hydrateArticle;
  /** After the first chrome paint, never replace the whole shell with splash. */
  const hasPresentedChromeRef = useRef(false);

  /** Height (px) that shows `articleId`'s hero image with no cropping, clamped to sane bounds. */
  const resolveHeroHeight = useCallback(
    (articleId: string | null | undefined): number =>
      computeHeroHeightPx(
        !!(articleId && articleById[articleId]?.imageUrl),
        articleId ? heroAspectRef.current[articleId] : undefined,
        width,
        heroBounds,
      ),
    [articleById, heroBounds, width],
  );

  /** Snap the hero box to the right height for `articleId` (or the generic default) without animating. */
  const focusHero = useCallback(
    (articleId: string | null | undefined) => {
      const target = resolveHeroHeight(articleId);
      setHeroExpanded(target);
      heroHeightAnim.setValue(target);
    },
    [heroHeightAnim, resolveHeroHeight],
  );

  /** Record a loaded hero image's real aspect ratio and resize the box to fit it (if it's the visible one). */
  const onHeroImageLoad = useCallback(
    (articleId: string, w: number, h: number) => {
      if (!w || !h) {
        return;
      }
      heroAspectRef.current[articleId] = h / w;
      if (focusedArticleIdRef.current !== articleId || heroCollapsedRef.current) {
        return;
      }
      const target = resolveHeroHeight(articleId);
      setHeroExpanded(target);
      Animated.timing(heroHeightAnim, {
        toValue: target,
        duration: 200,
        useNativeDriver: false,
      }).start();
    },
    [heroHeightAnim, resolveHeroHeight],
  );
  /**
   * Owns offline-friendly About / Team content. The hook pre-fetches on app
   * launch and persists via AsyncStorage, so the in-app overlay opens
   * instantly — even without internet.
   */
  const infoPages = useInfoPages();
  const [infoOverlay, setInfoOverlay] = useState<InfoPageKey | null>(null);
  const pendingInfoOverlayRef = useRef<InfoPageKey | null>(null);
  const infoOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastViewableIdRef = useRef<string | null>(null);
  const pendingDeepLinkIdRef = useRef<string | null>(null);

  const openArticleFromUrl = useCallback(
    (rawUrl: string) => {
      const parsed = parseBaahrakhariArticleUrl(rawUrl);
      if (!parsed) {
        return;
      }
      setMode('feed');
      setCategory('home');
      setHomeDrilled(false);
      setHomeStartIndex(0);
      setHeadlinesListOpen(false);
      pendingDeepLinkIdRef.current = parsed.id;
      reload();
    },
    [reload],
  );

  useArticleAlerts({onOpenArticle: openArticleFromUrl});

  const palette = useMemo(
    () =>
      isDark
        ? {
            background: '#040707',
            backgroundSubtle: '#111315',
            card: '#1A1D20',
            border: '#30353A',
            text: '#F2F3F4',
            textSecondary: '#C5C7C8',
            accent: Colors.accent,
            onAccent: '#FFFFFF',
            overlay: 'rgba(0,0,0,0.45)',
            chipOff: 'rgba(255,255,255,0.16)',
            chipOn: '#111315',
            mutedBtn: '#202428',
            /** Toolbar / row icon glyph tint (save, read later, share) */
            actionIcon: '#E8ECEE',
            actionIconSurface: '#2C3238',
            actionIconBorder: 'rgba(255,255,255,0.14)',
          }
        : {
            background: Colors.background,
            backgroundSubtle: Colors.backgroundSubtle,
            card: Colors.card,
            border: Colors.border,
            text: Colors.text,
            textSecondary: Colors.textSecondary,
            accent: Colors.accent,
            onAccent: Colors.onAccent,
            overlay: 'rgba(0,0,0,0.33)',
            chipOff: 'rgba(255,255,255,0.2)',
            chipOn: Colors.background,
            mutedBtn: Colors.backgroundSubtle,
            actionIcon: '#0D1912',
            actionIconSurface: '#DEE8E2',
            actionIconBorder: 'rgba(4,7,7,0.12)',
          },
    [isDark],
  );

  const data = useMemo(
    () => items.map(item => articleById[item.id]).filter(Boolean),
    [items, articleById],
  );

  const onViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: ViewToken[]}) => {
      const i = viewableItems[0]?.index;
      if (i == null || i < 0) {
        return;
      }
      const list = itemsRef.current;
      const cur = list[i];
      const next = list[i + 1];
      /**
       * Same-article retriggers (hero height animation shifting the
       * viewability threshold) must not reset chrome or start another
       * timing loop — that froze the reader after a couple of stories.
       */
      if (cur && lastViewableIdRef.current === cur.id) {
        if (next) {
          hydrateArticleRef.current(next).catch(() => {});
        }
        return;
      }
      setFocusedIndex(i);
      if (cur) {
        lastViewableIdRef.current = cur.id;
        focusedArticleIdRef.current = cur.id;
        hydrateArticleRef.current(cur).catch(() => {});
      }
      if (next) {
        hydrateArticleRef.current(next).catch(() => {});
      }
      /** New article is active: restore hero to full height, sized for its own image. */
      heroCollapsedRef.current = false;
      setIsHeroCollapsed(false);
      const nextHeroHeight = computeHeroHeightPx(
        !!(cur && articleByIdRef.current[cur.id]?.imageUrl),
        cur ? heroAspectRef.current[cur.id] : undefined,
        width,
        heroBounds,
      );
      setHeroExpanded(nextHeroHeight);
      heroHeightAnim.setValue(nextHeroHeight);
      transitionAnim.setValue(0.985);
      Animated.timing(transitionAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    },
  ).current;

  const showSaveToast = useCallback((message: string) => {
    setSaveToast(message);
    if (saveToastTimerRef.current != null) {
      clearTimeout(saveToastTimerRef.current);
    }
    saveToastTimerRef.current = setTimeout(() => {
      setSaveToast(null);
      saveToastTimerRef.current = null;
    }, SAVE_TOAST_MS);
  }, []);

  const onToggleSaved = async (article: Article) => {
    if (article.bodyText.trim().length > 0) {
      await toggleSaved(article);
      return;
    }
    try {
      const detailed = await fetchNewsDetail(article.id);
      await toggleSaved({
        ...article,
        ...detailed,
        bodyText: detailed.bodyText || article.title,
        fetchedAt: Date.now(),
      });
    } catch {
      await toggleSaved({
        ...article,
        bodyText: article.title,
        fetchedAt: Date.now(),
      });
    }
  };

  const onLongPressSave = (article: Article) => {
    Vibration.vibrate(20);
    if (isSaved(article.id)) {
      showSaveToast(SAVE_TOAST_ALREADY);
      return;
    }
    onToggleSaved(article)
      .then(() => showSaveToast(SAVE_TOAST_SAVED))
      .catch(() => {});
  };

  const stopArticleAnims = useCallback(() => {
    heroHeightAnim.stopAnimation();
    transitionAnim.stopAnimation();
    swipeHintOpacity.stopAnimation();
  }, [heroHeightAnim, swipeHintOpacity, transitionAnim]);

  const goHomeFeed = useCallback(() => {
    /** Already on the website-style home list — pull fresh titles. */
    const shouldRefreshNow =
      mode === 'feed' &&
      category === 'home' &&
      !homeDrilled &&
      !headlinesListOpen;
    setMode('feed');
    setCategory('home');
    setHomeDrilled(false);
    setHomeStartIndex(0);
    setHeadlinesListOpen(false);
    focusedArticleIdRef.current = null;
    lastViewableIdRef.current = null;
    horizontalOffsetRef.current = 0;
    heroCollapsedRef.current = false;
    setIsHeroCollapsed(false);
    stopArticleAnims();
    focusHero(null);
    if (shouldRefreshNow) {
      reload();
    }
  }, [
    category,
    focusHero,
    headlinesListOpen,
    homeDrilled,
    mode,
    reload,
    stopArticleAnims,
  ]);

  /** Drill from the home title list into the swipe reader at `index`. */
  const openArticleAtIndex = useCallback(
    (index: number) => {
      const row = items[index];
      if (row) {
        /**
         * `onArticleScroll` ignores events until this matches the visible
         * row's `item.id`. `onViewableItemsChanged` usually sets it, but that
         * can lag one frame after the pager mounts — without this, hero
         * collapse feels "dead" right after tapping a title.
         */
        focusedArticleIdRef.current = row.id;
      }
      setHomeStartIndex(Math.max(0, index));
      setHomeDrilled(true);
      setFocusedIndex(Math.max(0, index));
      heroCollapsedRef.current = false;
      setIsHeroCollapsed(false);
      focusHero(row?.id ?? null);
    },
    [focusHero, items],
  );

  /**
   * Single place that resets feed/hero state on a category switch — shared
   * by the burger drawer, the home page's "सबै हेर्नुहोस्" section links,
   * and Contact Us. `articleId` (when given) drills straight to that post
   * once its category finishes loading (see the pending-deep-link effect).
   */
  const selectCategory = useCallback(
    (slug: CategoryKey, articleId?: string) => {
      setMode('feed');
      setCategory(slug);
      setHomeDrilled(false);
      setHomeStartIndex(0);
      setHeadlinesListOpen(false);
      focusedArticleIdRef.current = null;
      lastViewableIdRef.current = null;
      horizontalOffsetRef.current = 0;
      heroCollapsedRef.current = false;
      setIsHeroCollapsed(false);
      focusHero(null);
      if (articleId) {
        pendingDeepLinkIdRef.current = articleId;
      }
    },
    [focusHero],
  );

  useEffect(() => {
    const handleIncomingUrl = (url: string | null) => {
      if (url) {
        openArticleFromUrl(url);
      }
    };
    Linking.getInitialURL().then(handleIncomingUrl).catch(() => {});
    const sub = Linking.addEventListener('url', event => {
      handleIncomingUrl(event.url);
    });
    return () => sub.remove();
  }, [openArticleFromUrl]);

  useEffect(() => {
    const targetId = pendingDeepLinkIdRef.current;
    if (!targetId || loading) {
      return;
    }
    const idx = items.findIndex(row => row.id === targetId);
    if (idx >= 0) {
      pendingDeepLinkIdRef.current = null;
      openArticleAtIndex(idx);
      requestAnimationFrame(() => {
        pagerRef.current?.scrollToIndex({index: idx, animated: false});
      });
      return;
    }
    if (items.length === 0) {
      return;
    }
    pendingDeepLinkIdRef.current = null;
    (async () => {
      try {
        const detailed = await fetchNewsDetail(targetId);
        setReadModalArticle({
          ...detailed,
          bodyText: detailed.bodyText || detailed.title,
          fetchedAt: Date.now(),
          savedAt: 0,
        });
      } catch {
        /* link target unavailable offline */
      }
    })();
  }, [items, loading, openArticleAtIndex]);

  /** Open About/Team after the drawer Modal has dismissed — iOS will not
   *  present a second UIViewController while the burger sheet is still up. */
  const presentPendingInfoOverlay = useCallback(() => {
    const key = pendingInfoOverlayRef.current;
    if (!key) {
      return;
    }
    pendingInfoOverlayRef.current = null;
    if (infoOverlayTimerRef.current != null) {
      clearTimeout(infoOverlayTimerRef.current);
      infoOverlayTimerRef.current = null;
    }
    setDrawerOpen(false);
    setDrawerVisible(false);
    setTimeout(() => {
      setInfoOverlay(key);
    }, 32);
  }, []);

  const openInfoOverlay = useCallback(
    (key: InfoPageKey) => {
      if (drawerVisible || drawerOpen) {
        pendingInfoOverlayRef.current = key;
        setDrawerOpen(false);
        if (infoOverlayTimerRef.current != null) {
          clearTimeout(infoOverlayTimerRef.current);
        }
        infoOverlayTimerRef.current = setTimeout(() => {
          presentPendingInfoOverlay();
        }, 280);
        return;
      }
      setInfoOverlay(key);
    },
    [drawerOpen, drawerVisible, presentPendingInfoOverlay],
  );
  const closeInfoOverlay = useCallback(() => setInfoOverlay(null), []);

  useEffect(() => {
    return () => {
      if (infoOverlayTimerRef.current != null) {
        clearTimeout(infoOverlayTimerRef.current);
      }
      if (saveToastTimerRef.current != null) {
        clearTimeout(saveToastTimerRef.current);
      }
    };
  }, []);

  /** After drilling in, ensure the pager lands on `homeStartIndex`. */
  useEffect(() => {
    if (!homeDrilled) {
      return;
    }
    if (homeStartIndex <= 0) {
      return;
    }
    if (data.length <= homeStartIndex) {
      return;
    }
    const target = homeStartIndex;
    /** Two ticks: FlatList needs a frame to layout after mount. */
    const t = setTimeout(() => {
      pagerRef.current?.scrollToIndex({index: target, animated: false});
    }, 32);
    return () => clearTimeout(t);
  }, [homeDrilled, homeStartIndex, data.length]);

  /** Reset the saved-article modal's hero to a safe default each time it opens a new article. */
  useEffect(() => {
    setReadHeroHeight(220);
  }, [readModalArticle?.id]);

  const openSavedList = () => {
    setMode('read');
  };

  const openContactUs = useCallback(
    () => selectCategory('contact-us'),
    [selectCategory],
  );

  /** Opens a homepage "breaking" headline in the read overlay without marking it saved. */
  const setReadModalArticleFromArticle = useCallback((article: Article) => {
    setReadModalArticle({...article, savedAt: 0});
  }, []);

  /** Opens the side burger menu. */
  const openDrawer = useCallback(() => {
    setDrawerVisible(true);
    setDrawerOpen(true);
  }, []);

  /** Closes the side burger menu (animates out, then unmounts). */
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  useEffect(() => {
    Animated.timing(drawerAnim, {
      toValue: drawerOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished && !drawerOpen) {
        setDrawerVisible(false);
        if (pendingInfoOverlayRef.current) {
          presentPendingInfoOverlay();
        }
      }
    });
  }, [drawerAnim, drawerOpen, presentPendingInfoOverlay]);

  const articlePagerVisible =
    mode === 'feed' &&
    category !== 'contact-us' &&
    !loading &&
    !error &&
    !(category === 'home' && headlinesListOpen) &&
    !(category === 'home' && !homeDrilled);

  const drawerEdgePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        gesture.dx > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dx > 36 || gesture.vx > 0.35) {
          openDrawer();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (drawerOpen) {
        closeDrawer();
        return true;
      }
      if (readModalArticle) {
        setReadModalArticle(null);
        return true;
      }
      if (infoOverlay) {
        closeInfoOverlay();
        return true;
      }
      if (headlinesListOpen) {
        setHeadlinesListOpen(false);
        return true;
      }
      if (homeDrilled) {
        setHomeDrilled(false);
        setHomeStartIndex(0);
        focusedArticleIdRef.current = null;
        lastViewableIdRef.current = null;
        horizontalOffsetRef.current = 0;
        heroCollapsedRef.current = false;
        setIsHeroCollapsed(false);
        stopArticleAnims();
        focusHero(null);
        return true;
      }
      if (mode === 'read') {
        setMode('feed');
        return true;
      }
      if (category !== 'home') {
        goHomeFeed();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [
    category,
    closeDrawer,
    closeInfoOverlay,
    drawerOpen,
    focusHero,
    goHomeFeed,
    headlinesListOpen,
    homeDrilled,
    infoOverlay,
    mode,
    readModalArticle,
    stopArticleAnims,
  ]);

  const goToNextArticle = (fromIndex: number) => {
    const target = fromIndex + 1;
    if (target < 0 || target >= data.length) {
      return;
    }
    pagerRef.current?.scrollToIndex({index: target, animated: true});
  };

  const onShareArticle = async (article: Article) => {
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n${article.url}`,
        url: article.url,
      });
    } catch {
      /* user cancellation / share not available */
    }
  };

  const showSwipeHint = (dir: 'next' | 'prev') => {
    const now = Date.now();
    if (now - lastHintAtRef.current < 120) {
      return;
    }
    lastHintAtRef.current = now;
    setSwipeHintDir(dir);
    swipeHintOpacity.stopAnimation();
    swipeHintOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(swipeHintOpacity, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(swipeHintOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({finished}) => {
      if (finished) {
        setSwipeHintDir(null);
      }
    });
  };

  const onArticleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const {contentOffset, contentSize, layoutMeasurement} = e.nativeEvent;
    const offsetY = contentOffset.y;
    const layoutH = layoutMeasurement.height;
    const contentH = contentSize.height;
    const canScrollVertically =
      layoutH > SCROLL_CHROME_EPS && contentH > layoutH + SCROLL_CHROME_EPS;

    if (!canScrollVertically) {
      /**
       * Expanding from here races the collapse animation: shrinking the
       * hero grows the viewport, content suddenly "fits", we expand, the
       * viewport shrinks, content overflows again. Leave short articles
       * expanded and never auto-expand from a content-size flip.
       */
      return;
    }

    const shouldCollapse = offsetY > 20;
    if (shouldCollapse === heroCollapsedRef.current) {
      return;
    }
    heroCollapsedRef.current = shouldCollapse;
    setIsHeroCollapsed(shouldCollapse);
    const target = shouldCollapse
      ? heroCollapsedReading
      : resolveHeroHeight(focusedArticleIdRef.current);
    if (!shouldCollapse) {
      setHeroExpanded(target);
    }
    Animated.timing(heroHeightAnim, {
      toValue: target,
      duration: 170,
      useNativeDriver: false,
    }).start();
  };

  const heroVisualOpacity = useMemo(
    () =>
      heroHeightAnim.interpolate({
        inputRange: [heroCollapsedReading, heroExpanded],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    [heroCollapsedReading, heroExpanded, heroHeightAnim],
  );

  const heroCollapsedTitleOpacity = useMemo(
    () =>
      heroHeightAnim.interpolate({
        inputRange: [heroCollapsedReading, heroExpanded],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    [heroCollapsedReading, heroExpanded, heroHeightAnim],
  );

  const readModalMetaLine = readModalArticle
    ? formatArticleMetaLine(readModalArticle)
    : '';

  const currentCategoryLabel =
    NEWS_CATEGORIES.find(cat => cat.slug === category)?.label ?? '';

  /**
   * First-launch takeover only. Category switches clear `data` while loading,
   * so treating that as a full-shell splash was remounting chrome mid-nav and
   * looking like a glitch — keep the header and show the inline splash instead.
   */
  if (!loading || data.length > 0 || error != null || category === 'contact-us') {
    hasPresentedChromeRef.current = true;
  }
  const showInitialSplash =
    mode === 'feed' &&
    loading &&
    data.length === 0 &&
    !error &&
    !hasPresentedChromeRef.current;

  const shellPadding = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  if (showInitialSplash) {
    return (
      <>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={palette.background}
          translucent={false}
        />
        <View style={[styles.root, shellPadding, {backgroundColor: palette.background}]}>
          <AppSplash
            background={palette.background}
            accent={palette.accent}
            secondary={palette.textSecondary}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={palette.background}
        translucent={false}
      />
      <View style={[styles.root, shellPadding, {backgroundColor: palette.backgroundSubtle}]}>
        <View
          style={[
            styles.header,
            {backgroundColor: palette.background, borderBottomColor: palette.border},
          ]}>
          <View style={styles.headerLeft}>
            <Pressable
              testID="header-burger"
              onPress={openDrawer}
              accessibilityRole="button"
              accessibilityLabel="मेनु खोल्नुहोस्"
              hitSlop={8}
              style={styles.burgerBtn}>
              <Text style={[styles.burgerIcon, {color: palette.text}]}>{BURGER_ICON}</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={goHomeFeed}
            accessibilityRole="button"
            accessibilityLabel="गृहपृष्ठ"
            style={styles.headerBrand}>
            {/* The long brand mark is the single visual identifier across
                idioms — no "बाह्रखरी" wordmark anywhere in the chrome. One
                base size (40) is used everywhere; `scaleFont` applies the
                iOS / iPad multipliers so the iPad mark naturally renders
                larger without an explicit per-idiom switch. */}
            <Image
              source={ICON_BRAND_LONG}
              resizeMode="contain"
              style={{
                height: scaleFont(36),
                width: Math.round(scaleFont(36) * (201 / 88)),
              }}
            />
            {siteDateLabel ? (
              <Text
                numberOfLines={1}
                style={[styles.headerDate, {color: palette.textSecondary}]}>
                {siteDateLabel}
              </Text>
            ) : null}
          </Pressable>
          <View style={styles.headerRightSpacer} />
        </View>
        {mode === 'feed' ? (
          <>
            {/**
             * Home has no category picker under the logo + date — the
             * शीर्ष समाचार ribbon is the section header for headlines.
             * Off-home feeds keep a slim label that reopens the burger;
             * Politics / Economy / etc. still switch from the drawer
             * and the below-the-fold section links.
             */}
            {category !== 'home' ? (
              <Pressable
                onPress={openDrawer}
                accessibilityRole="button"
                accessibilityLabel="श्रेणी परिवर्तन गर्नुहोस्"
                style={[styles.categoryIndicatorBar, {backgroundColor: palette.accent}]}>
                <Text
                  numberOfLines={1}
                  style={[styles.categoryIndicatorText, {color: palette.onAccent}]}>
                  {currentCategoryLabel}
                </Text>
                <Text style={[styles.categoryIndicatorChevron, {color: palette.onAccent}]}>
                  ▾
                </Text>
              </Pressable>
            ) : null}

            {category === 'contact-us' ? (
              <ContactUsView palette={palette} />
            ) : loading ? (
              <AppSplash
                background={palette.background}
                accent={palette.accent}
                secondary={palette.textSecondary}
              />
            ) : error ? (
              <View style={styles.center}>
                <Text style={[styles.error, {color: palette.accent}]}>{error}</Text>
              </View>
            ) : category === 'home' && headlinesListOpen ? (
              <HeadlinesList
                items={homeSections.breaking}
                palette={palette}
                onOpen={setReadModalArticleFromArticle}
                onToggleSaved={onLongPressSave}
              />
            ) : category === 'home' && !homeDrilled ? (
              <HomeFeedList
                items={data}
                palette={palette}
                onSelect={openArticleAtIndex}
                onOpenLink={openInfoOverlay}
                onOpenContact={openContactUs}
                onRefresh={reload}
                refreshing={loading}
                breaking={homeSections.breaking}
                onOpenBreaking={setReadModalArticleFromArticle}
                onToggleSavedHeadline={onLongPressSave}
                onOpenHeadlinesPage={() => setHeadlinesListOpen(true)}
                sections={homeSections.sections}
                onOpenSection={selectCategory}
                ads={homeAds.ads}
                adsLoading={homeAds.loading}
              />
            ) : (
              <FlatList
                key={`pager-${category}`}
                ref={pagerRef}
                data={data}
                horizontal
                pagingEnabled
                initialScrollIndex={
                  homeDrilled &&
                  homeStartIndex > 0 &&
                  homeStartIndex < data.length
                    ? homeStartIndex
                    : undefined
                }
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                getItemLayout={(_, i) => ({length: width, offset: width * i, index: i})}
                windowSize={3}
                initialNumToRender={1}
                maxToRenderPerBatch={2}
                updateCellsBatchingPeriod={50}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{itemVisiblePercentThreshold: 60}}
                onScrollToIndexFailed={({index: failed}) => {
                  const fallback = Math.min(data.length - 1, Math.max(0, failed));
                  pagerRef.current?.scrollToIndex({index: fallback, animated: true});
                }}
                onScroll={e => {
                  const x = e.nativeEvent.contentOffset.x;
                  const dx = x - horizontalOffsetRef.current;
                  horizontalOffsetRef.current = x;
                  if (Math.abs(dx) < 1.2) {
                    return;
                  }
                  showSwipeHint(dx > 0 ? 'next' : 'prev');
                }}
                scrollEventThrottle={16}
                renderItem={({item, index: itemIndex}) => {
                  const savedState = isSaved(item.id);
                  const hasNext = itemIndex < data.length - 1;
                  return (
                    <Animated.View
                      style={[
                        styles.page,
                        {
                          width,
                          backgroundColor: palette.backgroundSubtle,
                          opacity: transitionAnim,
                          transform: [{scale: transitionAnim}],
                        },
                      ]}>
                      <Animated.View
                        style={[
                          styles.topPanel,
                          {
                            height: heroHeightAnim,
                            backgroundColor: palette.background,
                            overflow: 'hidden',
                          },
                        ]}>
                        <Animated.View
                          style={[styles.heroExpandedLayer, {opacity: heroVisualOpacity}]}
                          pointerEvents={isHeroCollapsed ? 'none' : 'auto'}>
                          {item.imageUrl ? (
                            <Image
                              source={{uri: item.imageUrl}}
                              style={styles.heroImage}
                              resizeMode="cover"
                              onLoad={ev => {
                                const {width: iw, height: ih} = ev.nativeEvent.source;
                                onHeroImageLoad(item.id, iw, ih);
                              }}
                            />
                          ) : (
                            <View style={styles.imagePlaceholder} />
                          )}
                          <View style={styles.imageTopRightControls}>
                            <View style={styles.imageControlStack}>
                              <Pressable
                                onPress={() =>
                                  setBodyFontSize(s =>
                                    Math.min(ARTICLE_FONT_MAX, s + 1),
                                  )
                                }
                                style={[
                                  styles.imageControlBtn,
                                  styles.imageControlBtnTop,
                                ]}>
                                <Text style={styles.imageControlTxt}>+</Text>
                              </Pressable>
                              <Pressable
                                onPress={() =>
                                  setBodyFontSize(s =>
                                    Math.max(ARTICLE_FONT_MIN, s - 1),
                                  )
                                }
                                style={styles.imageControlBtn}>
                                <Text style={styles.imageControlTxt}>-</Text>
                              </Pressable>
                            </View>
                          </View>
                          {swipeHintDir === 'prev' ? (
                            <Animated.View
                              pointerEvents="none"
                              style={[
                                styles.imageArrow,
                                styles.imageArrowLeft,
                                styles.imageArrowHint,
                                {opacity: swipeHintOpacity},
                              ]}>
                              <Text style={styles.imageArrowTxt}>{'<'}</Text>
                            </Animated.View>
                          ) : null}
                          {swipeHintDir === 'next' ? (
                            <Animated.View
                              pointerEvents="none"
                              style={[
                                styles.imageArrow,
                                styles.imageArrowRight,
                                styles.imageArrowHint,
                                {opacity: swipeHintOpacity},
                              ]}>
                              <Text style={styles.imageArrowTxt}>{'>'}</Text>
                            </Animated.View>
                          ) : null}
                          <View
                            style={[
                              styles.heroOverlay,
                              {backgroundColor: palette.overlay},
                            ]}>
                            <Text style={styles.heroTitle} numberOfLines={3}>
                              {item.title}
                            </Text>
                          </View>
                        </Animated.View>
                        <Animated.View
                          style={[
                            styles.heroCollapsedTitleWrap,
                            {opacity: heroCollapsedTitleOpacity},
                          ]}
                          pointerEvents={isHeroCollapsed ? 'auto' : 'none'}>
                          <Text
                            style={[styles.heroTitleReading, {color: palette.text}]}
                            numberOfLines={3}>
                            {item.title}
                          </Text>
                        </Animated.View>
                      </Animated.View>
                      <View
                        style={[
                          styles.adSpacer,
                          {
                            backgroundColor: palette.backgroundSubtle,
                            borderColor: palette.border,
                          },
                        ]}
                      />
                      <View style={styles.bottomPanel}>
                        <View
                          collapsable={false}
                          style={[
                            styles.stickyMetaRow,
                            {
                              backgroundColor: palette.background,
                              borderBottomColor: palette.border,
                            },
                          ]}>
                          <Text
                            style={[styles.author, styles.authorInline, {color: palette.textSecondary}]}
                            numberOfLines={2}>
                            {formatArticleMetaLine(item)}
                          </Text>
                          <View style={styles.titleActions}>
                            <DentArticleAction
                              onPress={() => {
                                onShareArticle(item).catch(() => {});
                              }}
                              accessibilityRole="button"
                              accessibilityLabel="Share article"
                              hitSlop={8}
                              style={[
                                styles.articleMetaAction,
                                {
                                  backgroundColor: palette.background,
                                  borderWidth: 0,
                                },
                              ]}>
                              <View style={styles.articleMetaIconBox}>
                                <Image
                                  source={isDark ? ICON_SHARE_DARK : ICON_SHARE}
                                  style={styles.articleMetaShareImg}
                                  resizeMode="contain"
                                />
                              </View>
                            </DentArticleAction>
                            <DentArticleAction
                              onPress={() => {
                                onToggleSaved(item).catch(() => {});
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={
                                savedState ? 'Remove from saved' : 'Save article'
                              }
                              hitSlop={8}
                              style={[
                                styles.articleMetaAction,
                                {
                                  backgroundColor: palette.background,
                                  borderWidth: savedState
                                    ? StyleSheet.hairlineWidth
                                    : 0,
                                  borderColor: savedState
                                    ? palette.accent
                                    : 'transparent',
                                },
                              ]}>
                              <View style={styles.articleMetaIconBox}>
                                {savedState ? (
                                  <Image
                                    source={ICON_SAVE_INNER_TEMPLATE}
                                    style={styles.articleSaveInnerLayer}
                                    resizeMode="contain"
                                    tintColor={palette.accent}
                                  />
                                ) : null}
                                <Image
                                  source={
                                    isDark
                                      ? ICON_SAVE_ARTICLE_DARK
                                      : ICON_SAVE_ARTICLE
                                  }
                                  style={styles.articleSaveStrokeLayer}
                                  resizeMode="contain"
                                  tintColor={
                                    savedState ? palette.accent : undefined
                                  }
                                />
                              </View>
                            </DentArticleAction>
                          </View>
                        </View>
                        <GHScrollView
                        style={styles.bottomScroll}
                        contentContainerStyle={styles.bodyWrap}
                        onScroll={e => {
                          if (focusedArticleIdRef.current !== item.id) {
                            return;
                          }
                          onArticleScroll(e);
                        }}
                        scrollEventThrottle={16}>
                        <PinchZoomArticleBody
                          fontSizeRef={bodyFontSizeRef}
                          setFontSize={setBodyFontSize}>
                        <View style={styles.titleRow}>
                          <Text style={[styles.title, styles.titleTight, {color: palette.text}]}>
                            {item.title}
                          </Text>
                        </View>
                        {item.bodyText ? (
                          <Text
                            style={[
                              styles.body,
                              {
                                color: palette.text,
                                fontSize: bodyFontSize,
                                lineHeight: Math.round(bodyFontSize * 1.68),
                              },
                            ]}>
                            {item.bodyText}
                          </Text>
                        ) : (
                          <View style={styles.inlineLoading}>
                            <ActivityIndicator color={palette.accent} />
                            <Text style={[styles.loadingInline, {color: palette.textSecondary}]}>लेख लोड हुँदैछ …</Text>
                          </View>
                        )}
                        <ArticleVideoEmbeds videos={item.videos} palette={palette} />
                        </PinchZoomArticleBody>
                        </GHScrollView>
                        {isIPad && hasNext ? (
                          <Pressable
                            onPress={() => goToNextArticle(itemIndex)}
                            accessibilityRole="button"
                            accessibilityLabel="Next article"
                            hitSlop={12}
                            style={({pressed}) => [
                              styles.iPadNextFab,
                              pressed ? styles.iPadNextFabPressed : null,
                            ]}>
                            <View
                              style={[
                                styles.iPadNextFabGlass,
                                isDark
                                  ? styles.iPadNextFabGlassDark
                                  : styles.iPadNextFabGlassLight,
                              ]}>
                              <View
                                style={[
                                  styles.iPadNextFabHighlight,
                                  isDark
                                    ? styles.iPadNextFabHighlightDark
                                    : styles.iPadNextFabHighlightLight,
                                ]}
                                pointerEvents="none"
                              />
                              <Text
                                style={[
                                  styles.iPadNextFabArrow,
                                  {color: isDark ? '#F2F3F4' : '#0D1912'},
                                ]}>
                                {'\u203A'}
                              </Text>
                            </View>
                          </Pressable>
                        ) : null}
                      </View>
                    </Animated.View>
                  );
                }}
              />
            )}
          </>
        ) : loadingSaved ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.accent} />
            <Text style={[styles.loading, {color: palette.textSecondary}]}>READ सूची लोड हुँदैछ…</Text>
          </View>
        ) : saved.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.loading, {color: palette.textSecondary}]}>अहिलेसम्म कुनै लेख सुरक्षित गरिएको छैन ।</Text>
          </View>
        ) : (
          <FlatList
            data={saved}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.savedListPad}
            ListHeaderComponent={
              <Text style={[styles.savedHint, {color: palette.textSecondary}]}>सुरक्षित लेख: {saved.length}/{maxSaved}</Text>
            }
            renderItem={({item}) => (
              <Pressable
                onPress={() => setReadModalArticle(item)}
                style={[
                  styles.savedRow,
                  {borderBottomColor: palette.border, backgroundColor: palette.card},
                ]}>
                <Text style={[styles.savedTitle, {color: palette.text}]}>{item.title}</Text>
                <Pressable
                  onPress={() => {
                    unsave(item.id).catch(() => {});
                  }}
                  style={[
                    styles.unsaveBtn,
                    {backgroundColor: palette.card},
                  ]}>
                  <Image
                    source={
                      isDark ? ICON_REMOVE_BOOKMARK_DARK : ICON_REMOVE_BOOKMARK
                    }
                    style={styles.unsaveIconImg}
                    resizeMode="contain"
                  />
                </Pressable>
              </Pressable>
            )}
          />
        )}

        {readModalArticle ? (
        <Modal
          visible
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setReadModalArticle(null)}>
          {/**
           * Modal is presented in its own native window, so the root
           * `SafeAreaProvider` is unreachable. Without this wrapper the
           * header renders under the status bar / Dynamic Island and the
           * X / zoom controls become untappable.
           */}
          <SafeAreaProvider>
            <SafeAreaView
              edges={['top', 'right', 'left']}
              style={[styles.readModalRoot, {backgroundColor: palette.backgroundSubtle}]}>
            <View
              style={[
                styles.readModalHeader,
                {borderBottomColor: palette.border, backgroundColor: palette.background},
              ]}>
              <Pressable
                onPress={() => setReadModalArticle(null)}
                hitSlop={12}
                style={[styles.closeBtn, {borderColor: palette.border}]}> 
                <Text style={[styles.closeText, {color: palette.text}]}>✕</Text>
              </Pressable>
              <View style={styles.readHeaderActions}>
                <View style={styles.readZoomStack}>
                  <Pressable
                    onPress={() =>
                      setBodyFontSize(s => Math.min(ARTICLE_FONT_MAX, s + 1))
                    }
                    style={[
                      styles.readZoomBtn,
                      {backgroundColor: palette.mutedBtn, borderColor: palette.border},
                    ]}>
                    <Text style={[styles.fontBtnTxt, {color: palette.text}]}>+</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setBodyFontSize(s => Math.max(ARTICLE_FONT_MIN, s - 1))
                    }
                    style={[
                      styles.readZoomBtn,
                      {backgroundColor: palette.mutedBtn, borderColor: palette.border},
                    ]}>
                    <Text style={[styles.fontBtnTxt, {color: palette.text}]}>-</Text>
                  </Pressable>
                </View>
                {readModalArticle ? (
                  <>
                    <Pressable
                      onPress={() => {
                        onShareArticle(readModalArticle).catch(() => {});
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Share article"
                      hitSlop={8}
                      style={[
                        styles.unsaveBtn,
                        {backgroundColor: palette.background},
                      ]}>
                      <Image
                        source={isDark ? ICON_SHARE_DARK : ICON_SHARE}
                        style={styles.articleMetaShareImg}
                        resizeMode="contain"
                      />
                    </Pressable>
                    <Pressable
                    onPress={() => {
                      onToggleSaved(readModalArticle).catch(() => {});
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isSaved(readModalArticle.id)
                        ? 'Remove from saved'
                        : 'Save article'
                    }
                    style={[
                      styles.unsaveBtn,
                      {backgroundColor: palette.background},
                    ]}>
                    <Image
                      source={
                        isSaved(readModalArticle.id)
                          ? isDark
                            ? ICON_REMOVE_BOOKMARK_DARK
                            : ICON_REMOVE_BOOKMARK
                          : isDark
                          ? ICON_SAVE_ARTICLE_DARK
                          : ICON_SAVE_ARTICLE
                      }
                      style={styles.unsaveIconImg}
                      resizeMode="contain"
                    />
                  </Pressable>
                  </>
                ) : null}
              </View>
            </View>
            {readModalArticle ? (
              <GHScrollView contentContainerStyle={styles.readBodyWrap}>
                <PinchZoomArticleBody
                  fontSizeRef={bodyFontSizeRef}
                  setFontSize={setBodyFontSize}>
                <Text style={[styles.title, {color: palette.text}]}>{readModalArticle.title}</Text>
                {readModalMetaLine.length > 0 ? (
                  <Text style={[styles.author, {color: palette.textSecondary}]}>
                    {readModalMetaLine}
                  </Text>
                ) : null}
                {httpUri(readModalArticle.imageUrl) ? (
                  <Image
                    source={{uri: httpUri(readModalArticle.imageUrl)}}
                    style={[styles.readHero, {height: readHeroHeight}]}
                    resizeMode="cover"
                    onLoad={ev => {
                      const {width: iw, height: ih} = ev.nativeEvent.source;
                      if (!iw || !ih) {
                        return;
                      }
                      const target = Math.max(
                        160,
                        Math.min(Math.round(height * 0.55), Math.round(width * (ih / iw))),
                      );
                      setReadHeroHeight(prev => (prev === target ? prev : target));
                    }}
                  />
                ) : null}
                <Text
                  style={[
                    styles.body,
                    {
                      color: palette.text,
                      fontSize: bodyFontSize,
                      lineHeight: Math.round(bodyFontSize * 1.68),
                    },
                  ]}>
                  {readModalArticle.bodyText}
                </Text>
                <ArticleVideoEmbeds
                  videos={readModalArticle.videos}
                  palette={palette}
                />
                </PinchZoomArticleBody>
              </GHScrollView>
            ) : null}
            </SafeAreaView>
          </SafeAreaProvider>
        </Modal>
        ) : null}

        <InfoOverlayModal
          activeKey={infoOverlay}
          about={infoPages.about}
          team={infoPages.team}
          loading={infoPages.loading}
          online={infoPages.online}
          error={infoPages.error}
          onRefresh={infoPages.refresh}
          onClose={closeInfoOverlay}
          palette={palette}
        />

        <SideDrawer
          visible={drawerVisible}
          anim={drawerAnim}
          width={Math.min(288, Math.round(width * 0.74))}
          topInset={insets.top}
          bottomInset={insets.bottom}
          palette={palette}
          category={category}
          isDark={isDark}
          isSaved={mode === 'read'}
          onToggleTheme={() => setIsDark(v => !v)}
          onClose={closeDrawer}
          onSelectHome={goHomeFeed}
          onSelectCategory={selectCategory}
          onSelectSaved={openSavedList}
          onSelectInfo={openInfoOverlay}
        />
        {!articlePagerVisible ? (
          <View
            testID="drawer-edge-swipe"
            style={[styles.drawerEdgeSwipe, {top: insets.top + 56}]}
            {...drawerEdgePan.panHandlers}
          />
        ) : null}
        {saveToast ? (
          <View
            pointerEvents="none"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.saveToastWrap}>
            <View style={[styles.saveToast, {backgroundColor: palette.accent}]}>
              <Text style={[styles.saveToastText, {color: palette.onAccent}]}>
                {saveToast}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </>
  );
}

type HomePalette = {
  background: string;
  backgroundSubtle: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  accent: string;
  onAccent: string;
  mutedBtn: string;
};

/** Hairline between burger-menu rows — theme-aware muted gray. */
function DrawerHairline({color}: {color: string}): React.JSX.Element {
  return <View style={[styles.drawerHairline, {backgroundColor: color}]} />;
}

/** Single tappable row inside {@link SideDrawer}. */
function DrawerItem({
  label,
  sublabel,
  active,
  palette,
  onPress,
  icon,
  iconEnd,
  iconStyle,
  tintIcon = true,
  testID,
}: {
  label: string;
  sublabel?: string;
  active: boolean;
  palette: HomePalette;
  onPress: () => void;
  icon?: number;
  /** Bookmark on the right (saved-articles row). */
  iconEnd?: boolean;
  iconStyle?: ImageStyle;
  tintIcon?: boolean;
  testID?: string;
}): React.JSX.Element {
  const accessibilityLabel = sublabel ? `${label} / ${sublabel}` : label;
  const iconEl = icon ? (
    <Image
      source={icon}
      style={[styles.drawerItemIcon, iconStyle]}
      resizeMode="contain"
      tintColor={tintIcon ? (active ? palette.accent : palette.text) : undefined}
    />
  ) : null;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({pressed}) => [
        styles.drawerItem,
        {
          backgroundColor: active ? palette.mutedBtn : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <View
        style={[
          styles.drawerItemDot,
          {backgroundColor: active ? palette.accent : 'transparent'},
        ]}
      />
      {!iconEnd ? iconEl : null}
      <View style={styles.drawerItemTextWrap}>
        <Text
          numberOfLines={1}
          style={[
            styles.drawerItemText,
            {color: active ? palette.accent : palette.text, fontWeight: active ? '800' : '600'},
          ]}>
          {label}
        </Text>
        {sublabel ? (
          <Text
            numberOfLines={1}
            style={[styles.drawerItemSublabel, {color: palette.textSecondary}]}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {iconEnd ? iconEl : null}
    </Pressable>
  );
}

/**
 * Simple side burger menu — replaces the old collapsing category chip bar.
 * Brand mark is Home; saved articles next; categories scroll; theme sits
 * on the floor of the drawer. Overlay tap (not an ✕) closes the menu.
 */
function SideDrawer({
  visible,
  anim,
  width,
  topInset,
  bottomInset,
  palette,
  category,
  isDark,
  isSaved,
  onToggleTheme,
  onClose,
  onSelectHome,
  onSelectCategory,
  onSelectSaved,
  onSelectInfo,
}: {
  visible: boolean;
  anim: Animated.Value;
  width: number;
  /** From the root window — Modal's nested SafeAreaProvider is 0 on iOS 26. */
  topInset: number;
  bottomInset: number;
  palette: HomePalette;
  category: CategoryKey;
  isDark: boolean;
  isSaved: boolean;
  onToggleTheme: () => void;
  onClose: () => void;
  onSelectHome: () => void;
  onSelectCategory: (slug: CategoryKey) => void;
  onSelectSaved: () => void;
  onSelectInfo: (key: InfoPageKey) => void;
}): React.JSX.Element {
  const hairlineColor = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(128,128,128,0.85)';
  const contactCategory = NEWS_CATEGORIES.find(cat => cat.slug === 'contact-us');
  const brandHeight = scaleFont(48);
  const brandWidth = Math.min(
    Math.round(brandHeight * (201 / 88)),
    Math.max(120, width - 72),
  );
  const themeLabel = isDark ? 'उज्यालो मोड' : 'अँध्यारो मोड';
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.drawerRoot}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.drawerOverlay, {opacity: anim}]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="मेनु बन्द गर्नुहोस्"
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.drawerPanel,
              {
                width,
                backgroundColor: palette.background,
                transform: [
                  {
                    translateX: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-width, 0],
                    }),
                  },
                ],
              },
            ]}>
            <View
              style={[
                styles.drawerSafeArea,
                {paddingTop: topInset, paddingBottom: bottomInset},
              ]}>
              <View style={styles.drawerHeader}>
                <Pressable
                  testID="drawer-brand"
                  onPress={() => {
                    onSelectHome();
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="गृहपृष्ठ"
                  hitSlop={8}
                  style={styles.drawerBrandHit}>
                  <Image
                    source={ICON_BRAND_LONG}
                    resizeMode="contain"
                    style={{width: brandWidth, height: brandHeight}}
                  />
                </Pressable>
              </View>
              <DrawerItem
                testID="drawer-saved"
                label="सुरक्षित लेखहरू"
                active={isSaved}
                palette={palette}
                icon={isDark ? ICON_SAVE_ARTICLE_DARK : ICON_SAVE_ARTICLE}
                iconEnd
                iconStyle={styles.drawerSavedIcon}
                onPress={() => {
                  onSelectSaved();
                  onClose();
                }}
              />
              <DrawerHairline color={hairlineColor} />
              <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerBody}>
                {DRAWER_FEED_CATEGORIES.map((cat, index) => (
                  <React.Fragment key={cat.slug}>
                    {index > 0 ? <DrawerHairline color={hairlineColor} /> : null}
                    <DrawerItem
                      label={cat.label}
                      active={category === cat.slug}
                      palette={palette}
                      onPress={() => {
                        onSelectCategory(cat.slug);
                        onClose();
                      }}
                    />
                  </React.Fragment>
                ))}
                {contactCategory ? (
                  <>
                    <DrawerHairline color={hairlineColor} />
                    <DrawerItem
                      label={contactCategory.label}
                      sublabel={contactCategory.labelEn}
                      active={category === contactCategory.slug}
                      palette={palette}
                      onPress={() => {
                        onSelectCategory(contactCategory.slug);
                        onClose();
                      }}
                    />
                  </>
                ) : null}
                <DrawerHairline color={hairlineColor} />
                <DrawerItem
                  label="हाम्रो बारेमा"
                  active={false}
                  palette={palette}
                  onPress={() => {
                    onSelectInfo('about');
                    onClose();
                  }}
                />
                <DrawerHairline color={hairlineColor} />
                <DrawerItem
                  label="हाम्रो टिम"
                  active={false}
                  palette={palette}
                  onPress={() => {
                    onSelectInfo('team');
                    onClose();
                  }}
                />
              </ScrollView>
              <DrawerHairline color={hairlineColor} />
              <Pressable
                testID="drawer-theme-toggle"
                onPress={onToggleTheme}
                accessibilityRole="button"
                accessibilityLabel={isDark ? 'Light theme' : 'Dark theme'}
                hitSlop={8}
                style={({pressed}) => [
                  styles.drawerThemeRow,
                  {opacity: pressed ? 0.7 : 1},
                ]}>
                <Text
                  numberOfLines={1}
                  style={[styles.drawerItemText, styles.drawerThemeLabel, {color: palette.text}]}>
                  {themeLabel}
                </Text>
                <Image
                  source={isDark ? ICON_THEME_SUN : ICON_THEME_MOON}
                  style={styles.themeIcon}
                  resizeMode="contain"
                  tintColor={palette.text}
                />
              </Pressable>
            </View>
          </Animated.View>
        </View>
    </Modal>
  );
}

/**
 * Full-screen in-app modal that renders the parsed About / Team content.
 * Content is supplied by `useInfoPages`, which serves cached results
 * instantly (offline-friendly) and refreshes in the background.
 */
function InfoOverlayModal({
  activeKey,
  about,
  team,
  loading,
  online,
  error,
  onRefresh,
  onClose,
  palette,
}: {
  activeKey: InfoPageKey | null;
  about: import('./src/types/infoPages').AboutContent | undefined;
  team: import('./src/types/infoPages').TeamContent | undefined;
  loading: boolean;
  online: boolean;
  error: string | null;
  onRefresh: () => void;
  onClose: () => void;
  palette: HomePalette;
}): React.JSX.Element | null {
  const visible = activeKey != null;
  const content = activeKey === 'team' ? team : about;
  const fallbackTitle =
    activeKey === 'team' ? 'हाम्रो टिम' : 'हाम्रो बारेमा';
  const title =
    typeof content?.heading === 'string' && content.heading.length > 0
      ? content.heading
      : fallbackTitle;
  const aboutParagraphs = Array.isArray(about?.paragraphs)
    ? about.paragraphs.filter((p): p is string => typeof p === 'string')
    : [];
  const teamCategories = Array.isArray(team?.categories) ? team.categories : [];
  const hasBody =
    activeKey === 'team' ? teamCategories.length > 0 : aboutParagraphs.length > 0;
  const showEmpty = !loading && !hasBody;
  const emptyMessage = error ?? 'सामग्री उपलब्ध छैन ।';
  const refreshLabel = online
    ? 'ताजा गर्नुहोस्'
    : error
    ? 'पुनः कोसिस गर्नुहोस्'
    : 'ताजा गर्नुहोस्';
  /**
   * Expansion state must stay above any conditional return so hook order is
   * stable. Fast Refresh from the previous `string | null` state can leave
   * a non-array here — never call `.includes` on it directly.
   */
  const TEAM_COLLAPSED_PREVIEW = 2;
  const [expandedTeamTitles, setExpandedTeamTitles] = useState<string[]>([]);
  useEffect(() => {
    setExpandedTeamTitles([]);
  }, [activeKey]);
  const expandedIds = Array.isArray(expandedTeamTitles)
    ? expandedTeamTitles
    : [];
  if (!visible) {
    return null;
  }
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      {/** See note on the saved-article modal: Modal needs its own provider. */}
      <SafeAreaProvider>
        <SafeAreaView
          edges={['top', 'right', 'left']}
          style={[styles.readModalRoot, {backgroundColor: palette.backgroundSubtle}]}>
        <View
          style={[
            styles.readModalHeader,
            {borderBottomColor: palette.border, backgroundColor: palette.background},
          ]}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={[styles.closeBtn, {borderColor: palette.border}]}>
            <Text style={[styles.closeText, {color: palette.text}]}>✕</Text>
          </Pressable>
          <Text
            numberOfLines={1}
            style={[styles.infoModalTitle, {color: palette.text}]}>
            {title}
          </Text>
          <Pressable
            onPress={onRefresh}
            style={[
              styles.infoRefreshBtn,
              {borderColor: palette.border, backgroundColor: palette.background},
            ]}
            accessibilityRole="button"
            accessibilityLabel={refreshLabel}>
            <Text style={[styles.infoRefreshTxt, {color: palette.accent}]}>↻</Text>
          </Pressable>
        </View>
        {!online && content ? (
          <View
            style={[styles.infoOfflineBanner, {backgroundColor: palette.mutedBtn}]}>
            <Text style={[styles.infoOfflineTxt, {color: palette.textSecondary}]}>
              अफलाइन दृश्य — स्थानीय बफरबाट देखाइँदै
            </Text>
          </View>
        ) : null}
        {loading && !hasBody ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.accent} />
            <Text style={[styles.loading, {color: palette.textSecondary}]}>
              लोड हुँदैछ …
            </Text>
          </View>
        ) : showEmpty ? (
          <View style={styles.center}>
            <Text style={[styles.error, {color: palette.accent}]}>
              {emptyMessage}
            </Text>
          </View>
        ) : activeKey === 'team' ? (
          <ScrollView contentContainerStyle={styles.infoModalBody}>
            {teamCategories.map((cat, catIndex) => {
              const catTitle =
                typeof cat?.title === 'string' && cat.title.length > 0
                  ? cat.title
                  : `section-${catIndex}`;
              const members = (Array.isArray(cat?.members) ? cat.members : []).filter(
                member => member && typeof member.name === 'string',
              );
              const expanded = expandedIds.includes(catTitle);
              const hasMore = members.length > TEAM_COLLAPSED_PREVIEW;
              const visibleMembers =
                expanded || !hasMore
                  ? members
                  : members.slice(0, TEAM_COLLAPSED_PREVIEW);
              const toggleExpanded = () => {
                setExpandedTeamTitles(prev => {
                  const current = Array.isArray(prev) ? prev : [];
                  return expanded
                    ? current.filter(id => id !== catTitle)
                    : [...current, catTitle];
                });
              };
              return (
              <View key={`${catTitle}-${catIndex}`} style={styles.teamCategoryBlock}>
                {hasMore ? (
                <Pressable
                  onPress={toggleExpanded}
                  accessibilityRole="button"
                  accessibilityState={{expanded}}
                  accessibilityLabel={
                    expanded
                      ? `${catTitle} संक्षिप्त गर्नुहोस्`
                      : `${catTitle} विस्तृत गर्नुहोस्`
                  }
                  style={[
                    styles.teamCategoryHeader,
                    {backgroundColor: palette.accent},
                  ]}>
                  <Text
                    style={[
                      styles.teamCategoryHeaderText,
                      {color: palette.onAccent},
                    ]}>
                    {catTitle}
                  </Text>
                  <Text
                    style={[
                      styles.teamCategoryChevron,
                      {color: palette.onAccent},
                    ]}>
                    {expanded ? '▾' : '▸'}
                  </Text>
                </Pressable>
                ) : (
                <View
                  style={[
                    styles.teamCategoryHeader,
                    {backgroundColor: palette.accent},
                  ]}>
                  <Text
                    style={[
                      styles.teamCategoryHeaderText,
                      {color: palette.onAccent},
                    ]}>
                    {catTitle}
                  </Text>
                </View>
                )}
                <View style={styles.teamMemberGrid}>
                  {visibleMembers.map((member, memberIndex) => {
                    const photoUri = httpUri(member.imageUrl);
                    const role =
                      typeof member.role === 'string' ? member.role : '';
                    return (
                    <View
                      key={`${catTitle}-${memberIndex}-${member.name}`}
                      style={[
                        styles.teamMemberCard,
                        {
                          backgroundColor: palette.background,
                          borderColor: palette.border,
                        },
                      ]}>
                      {photoUri ? (
                        <Image
                          source={{uri: photoUri}}
                          style={[
                            styles.teamMemberPhoto,
                            {backgroundColor: palette.backgroundSubtle},
                          ]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.teamMemberPhoto,
                            {backgroundColor: palette.backgroundSubtle},
                          ]}
                        />
                      )}
                      <Text
                        style={[styles.teamMemberName, {color: palette.text}]}
                        numberOfLines={2}>
                        {member.name}
                      </Text>
                      {role ? (
                        <Text
                          style={[
                            styles.teamMemberRole,
                            {color: palette.textSecondary},
                          ]}
                          numberOfLines={2}>
                          {role}
                        </Text>
                      ) : null}
                    </View>
                    );
                  })}
                </View>
              </View>
              );
            })}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.infoModalBody}>
            {aboutParagraphs.map((p, i) => (
              <Text
                key={`about-${i}`}
                style={[styles.infoParagraph, {color: palette.text}]}>
                {p}
              </Text>
            ))}
          </ScrollView>
        )}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

/**
 * Website-style home view: slim “शीर्ष समाचार” ribbon, then a compact
 * internally scrolling headline pane, then a larger horizontal ताजा
 * समाचार strip, then the existing category previews + footer.
 */
function HomeFeedList({
  items,
  palette,
  onSelect,
  onOpenLink,
  onOpenContact,
  onRefresh,
  refreshing,
  breaking,
  onOpenBreaking,
  onToggleSavedHeadline,
  onOpenHeadlinesPage,
  sections,
  onOpenSection,
  ads,
  adsLoading,
}: {
  items: Article[];
  palette: HomePalette;
  onSelect: (index: number) => void;
  onOpenLink: (key: InfoPageKey) => void;
  onOpenContact: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  breaking: Article[];
  onOpenBreaking: (article: Article) => void;
  onToggleSavedHeadline: (article: Article) => void;
  onOpenHeadlinesPage: () => void;
  sections: HomeCategorySection[];
  onOpenSection: (slug: CategoryKey, articleId?: string) => void;
  ads: HomeAdsMap;
  adsLoading: boolean;
}): React.JSX.Element {
  const homeHeadlines = breaking.slice(0, HOME_HEADLINE_PREVIEW);
  const tajaCards = items.slice(0, TAJA_HORIZONTAL_LIMIT);
  const headlinesPaneMaxHeight = Math.round(
    Dimensions.get('window').height * HOME_HEADLINES_PANE_RATIO,
  );

  const renderTajaCard = useCallback(
    ({item, index}: {item: Article; index: number}) => (
      <Pressable
        onPress={() => onSelect(index)}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        style={({pressed}) => [
          styles.breakingCard,
          {backgroundColor: palette.card, borderColor: palette.border, opacity: pressed ? 0.8 : 1},
        ]}>
        {item.imageUrl ? (
          <Image
            source={{uri: item.imageUrl}}
            style={[styles.breakingCardThumb, {backgroundColor: palette.backgroundSubtle}]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[styles.breakingCardThumb, {backgroundColor: palette.backgroundSubtle}]}
          />
        )}
        <Text
          style={[styles.breakingCardTitle, {color: palette.text}]}
          numberOfLines={3}>
          {item.title}
        </Text>
      </Pressable>
    ),
    [onSelect, palette.backgroundSubtle, palette.border, palette.card, palette.text],
  );

  return (
    <FlatList
      data={HOME_FEED_LIST_DATA}
      keyExtractor={item => item.id}
      renderItem={() => null}
      contentContainerStyle={styles.homeListContent}
      ItemSeparatorComponent={null}
      onRefresh={onRefresh}
      refreshing={refreshing}
      ListEmptyComponent={null}
      ListHeaderComponent={
        homeHeadlines.length > 0 ? (
          <View>
            <View style={[styles.homeRibbon, styles.homeRibbonCentered, {backgroundColor: palette.accent}]}>
              <Text
                style={[
                  styles.homeRibbonText,
                  styles.homeRibbonTextCentered,
                  {color: palette.onAccent},
                ]}>
                शीर्ष समाचार
              </Text>
            </View>
            <View style={styles.headlinePane}>
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
                style={{maxHeight: headlinesPaneMaxHeight}}>
                {homeHeadlines.map((item, headlineIndex) => (
                  <Pressable
                    key={item.id}
                    testID={headlineIndex === 0 ? 'home-headline-0' : undefined}
                    onPress={() => onOpenBreaking(item)}
                    onLongPress={() => onToggleSavedHeadline(item)}
                    delayLongPress={400}
                    accessibilityRole="button"
                    accessibilityLabel={item.title}
                    accessibilityHint="लामो थिचेर सुरक्षित गर्नुहोस्"
                    style={({pressed}) => [
                      styles.headlineRow,
                      {
                        backgroundColor: palette.background,
                        borderBottomColor: palette.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}>
                    <Text
                      style={[styles.headlineRowTitle, {color: palette.text}]}
                      numberOfLines={2}>
                      {item.title}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={onOpenHeadlinesPage}
                  accessibilityRole="button"
                  accessibilityLabel={MORE_HEADLINES_LABEL}
                  style={({pressed}) => [
                    styles.moreHeadlinesBtn,
                    {opacity: pressed ? 0.6 : 1},
                  ]}>
                  <Text style={[styles.moreHeadlinesText, {color: palette.textSecondary}]}>
                    {MORE_HEADLINES_LABEL}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        ) : null
      }
      ListFooterComponent={
        <View style={styles.homeFooterWrap}>
          <HomeAdSlot
            ad={ads['below-breaking-two']}
            loading={adsLoading}
            palette={palette}
          />
          <HomeAdSlot
            ad={ads['below-breaking-three']}
            loading={adsLoading}
            palette={palette}
          />
          <View style={[styles.homeRibbon, {backgroundColor: palette.accent}]}>
            <Text style={[styles.homeRibbonText, {color: palette.onAccent}]}>
              ताजा समाचार
            </Text>
          </View>
          {tajaCards.length > 0 ? (
            <FlatList
              data={tajaCards}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.breakingListContent}
              renderItem={renderTajaCard}
            />
          ) : (
            <View style={styles.center}>
              <Text style={[styles.loading, {color: palette.textSecondary}]}>
                लोड हुँदैछ …
              </Text>
            </View>
          )}
          {sections.map(section => (
              <View key={section.slug}>
                {section.items.length === 0 ? null : (
                <>
                <Pressable
                  onPress={() => onOpenSection(section.slug)}
                  accessibilityRole="button"
                  accessibilityLabel={`${section.label} — सबै हेर्नुहोस्`}
                  style={[
                    styles.homeRibbon,
                    styles.homeSectionHeaderFooter,
                    styles.homeRibbonRow,
                    {backgroundColor: palette.accent},
                  ]}>
                  <Text style={[styles.homeRibbonText, {color: palette.onAccent}]}>
                    {section.label}
                  </Text>
                  <Text style={[styles.homeRibbonSeeAll, {color: palette.onAccent}]}>
                    सबै हेर्नुहोस् {'\u203A'}
                  </Text>
                </Pressable>
                {section.items.map(item => {
                  const meta = formatArticleMetaLine(item);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => onOpenSection(section.slug, item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={item.title}
                      style={({pressed}) => [
                        styles.homeRow,
                        {
                          backgroundColor: palette.background,
                          borderBottomColor: palette.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}>
                      {item.imageUrl ? (
                        <Image
                          source={{uri: item.imageUrl}}
                          style={[
                            styles.homeRowThumb,
                            {backgroundColor: palette.backgroundSubtle},
                          ]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.homeRowThumb,
                            {backgroundColor: palette.backgroundSubtle},
                          ]}
                        />
                      )}
                      <View style={styles.homeRowTextWrap}>
                        <Text
                          style={[styles.homeRowTitle, {color: palette.text}]}
                          numberOfLines={3}>
                          {item.title}
                        </Text>
                        {meta.length > 0 ? (
                          <Text
                            style={[styles.homeRowMeta, {color: palette.textSecondary}]}
                            numberOfLines={1}>
                            {meta}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
                </>
                )}
                {section.slug === 'economy' ? (
                  <HomeAdSlot
                    ad={ads['below-artha']}
                    loading={adsLoading}
                    palette={palette}
                  />
                ) : null}
                {section.slug === 'sport' ? (
                  <HomeAdSlot
                    ad={ads['below-khel']}
                    loading={adsLoading}
                    palette={palette}
                  />
                ) : null}
                {section.slug === 'nation' ? (
                  <HomeAdSlot
                    ad={ads['below-nation']}
                    loading={adsLoading}
                    palette={palette}
                  />
                ) : null}
              </View>
            ),
          )}
          {/**
           * Google Play (News and Magazines policy) requires a clearly
           * visible, easy-to-find front-page Contact Us link on Android —
           * see docs/play-store/NEWS_POLICY_COMPLIANCE.md. iOS has no such
           * requirement and keeps Contact Us in the burger menu only, so
           * this front-page section is Android-only. Footer copy stays
           * English-only; the drawer uses the bilingual label.
           */}
          {Platform.OS === 'android' ? (
            <>
              <View
                style={[
                  styles.homeRibbon,
                  styles.homeSectionHeaderFooter,
                  {backgroundColor: palette.accent},
                ]}>
                <Text style={[styles.homeRibbonText, {color: palette.onAccent}]}>
                  Contact Us
                </Text>
              </View>
              <Pressable
                onPress={onOpenContact}
                accessibilityRole="link"
                accessibilityLabel="Contact Us"
                style={({pressed}) => [
                  styles.homeFooterLink,
                  styles.homeFooterContactLink,
                  {
                    backgroundColor: palette.background,
                    borderBottomColor: palette.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <View style={styles.homeFooterContactTextWrap}>
                  <Text style={[styles.homeFooterLinkText, {color: palette.text}]}>
                    Contact Us
                  </Text>
                  <Text style={[styles.homeFooterContactMeta, {color: palette.textSecondary}]}>
                    {nepaliDigitsToAscii(FOOTER_INFO.contact.phones[0])} ·{' '}
                    {FOOTER_INFO.contact.emails[0]}
                  </Text>
                </View>
                <Text style={[styles.homeFooterLinkArrow, {color: palette.accent}]}>
                  {'\u203A'}
                </Text>
              </Pressable>
            </>
          ) : null}
          <View
            style={[
              styles.homeRibbon,
              styles.homeSectionHeaderFooter,
              {backgroundColor: palette.accent},
            ]}>
            <Text style={[styles.homeRibbonText, {color: palette.onAccent}]}>
              About
            </Text>
          </View>
          {INFO_LINKS.map(link => (
            <Pressable
              key={link.key}
              onPress={() => onOpenLink(link.key)}
              accessibilityRole="link"
              accessibilityLabel={link.label}
              style={({pressed}) => [
                styles.homeFooterLink,
                {
                  backgroundColor: palette.background,
                  borderBottomColor: palette.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <Text style={[styles.homeFooterLinkText, {color: palette.text}]}>
                {link.label}
              </Text>
              <Text
                style={[styles.homeFooterLinkArrow, {color: palette.accent}]}>
                {'\u203A'}
              </Text>
            </Pressable>
          ))}
        </View>
      }
    />
  );
}

/** Full in-app list of banner शीर्ष समाचार. Tap opens the headline reader. */
function HeadlinesList({
  items,
  palette,
  onOpen,
  onToggleSaved,
}: {
  items: Article[];
  palette: HomePalette;
  onOpen: (article: Article) => void;
  onToggleSaved: (article: Article) => void;
}): React.JSX.Element {
  return (
    <FlatList
      data={items}
      keyExtractor={item => item.id}
      initialNumToRender={items.length || 10}
      contentContainerStyle={styles.homeListContent}
      ListHeaderComponent={
        <View style={[styles.homeRibbon, {backgroundColor: palette.accent}]}>
          <Text style={[styles.homeRibbonText, {color: palette.onAccent}]}>
            शीर्ष समाचार
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={[styles.loading, {color: palette.textSecondary}]}>
            लोड हुँदैछ …
          </Text>
        </View>
      }
      renderItem={({item}) => (
        <Pressable
          onPress={() => onOpen(item)}
          onLongPress={() => onToggleSaved(item)}
          delayLongPress={400}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          accessibilityHint="लामो थिचेर सुरक्षित गर्नुहोस्"
          style={({pressed}) => [
            styles.homeRow,
            {
              backgroundColor: palette.background,
              borderBottomColor: palette.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}>
          {item.imageUrl ? (
            <Image
              source={{uri: item.imageUrl}}
              style={[styles.homeRowThumb, {backgroundColor: palette.backgroundSubtle}]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[styles.homeRowThumb, {backgroundColor: palette.backgroundSubtle}]}
            />
          )}
          <View style={styles.homeRowTextWrap}>
            <Text
              style={[styles.homeRowTitle, {color: palette.text}]}
              numberOfLines={3}>
              {item.title}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

/**
 * Dedicated in-app Contact Us page (News policy). Phone, email, and address
 * match https://baahrakhari.com/contact
 */
function ContactUsView({
  palette,
}: {
  palette: HomePalette;
}): React.JSX.Element {
  const dial = useCallback(async (phone: string) => {
    const tel = `tel:${nepaliDigitsToAscii(phone).replace(/[^\d+]/g, '')}`;
    try {
      await Linking.openURL(tel);
    } catch {
      /* device has no Phone app */
    }
  }, []);
  const mail = useCallback(async (email: string) => {
    try {
      await Linking.openURL(`mailto:${email}`);
    } catch {
      /* device has no mail client configured */
    }
  }, []);
  const openWeb = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      /* no browser available */
    }
  }, []);

  const renderContactBlocks = (info: ContactBlocksContent, keyPrefix: string) => (
    <>
      <View
        style={[
          styles.footerBlock,
          {backgroundColor: palette.background, borderColor: palette.border},
        ]}>
        <Text style={[styles.footerBlockTitle, {color: palette.accent}]}>
          {info.contact.title}
        </Text>
        {info.contact.phones.map(phone => (
          <Pressable
            key={`${keyPrefix}-phone-${phone}`}
            onPress={() => dial(phone)}
            hitSlop={6}>
            <Text style={[styles.footerLinkText, {color: palette.text}]}>
              {phone}
            </Text>
          </Pressable>
        ))}
        {info.contact.emails.map(email => (
          <Pressable
            key={`${keyPrefix}-email-${email}`}
            onPress={() => mail(email)}
            hitSlop={6}>
            <Text style={[styles.footerLinkText, {color: palette.text}]}>
              {email}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        style={[
          styles.footerBlock,
          {backgroundColor: palette.background, borderColor: palette.border},
        ]}>
        <Text style={[styles.footerBlockTitle, {color: palette.accent}]}>
          {info.address.title}
        </Text>
        {info.address.lines.map(line => (
          <Text
            key={`${keyPrefix}-addr-${line}`}
            style={[styles.footerBlockText, {color: palette.text}]}>
            {line}
          </Text>
        ))}
      </View>

      <View
        style={[
          styles.footerBlock,
          {backgroundColor: palette.background, borderColor: palette.border},
        ]}>
        <Text style={[styles.footerBlockTitle, {color: palette.accent}]}>
          {info.marketing.title}
        </Text>
        {info.marketing.phones.map(phone => (
          <Pressable
            key={`${keyPrefix}-mkt-phone-${phone}`}
            onPress={() => dial(phone)}
            hitSlop={6}>
            <Text style={[styles.footerLinkText, {color: palette.text}]}>
              {phone}
            </Text>
          </Pressable>
        ))}
        {info.marketing.emails.map(email => (
          <Pressable
            key={`${keyPrefix}-mkt-email-${email}`}
            onPress={() => mail(email)}
            hitSlop={6}>
            <Text style={[styles.footerLinkText, {color: palette.text}]}>
              {email}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.footerRow}>
        <View
          style={[
            styles.footerBlock,
            styles.footerBlockHalf,
            {backgroundColor: palette.background, borderColor: palette.border},
          ]}>
          <Text style={[styles.footerBlockTitle, {color: palette.accent}]}>
            {info.editor.title}
          </Text>
          <Text style={[styles.footerBlockText, {color: palette.text}]}>
            {info.editor.name}
          </Text>
        </View>
        <View
          style={[
            styles.footerBlock,
            styles.footerBlockHalf,
            {backgroundColor: palette.background, borderColor: palette.border},
          ]}>
          <Text style={[styles.footerBlockTitle, {color: palette.accent}]}>
            {info.director.title}
          </Text>
          <Text style={[styles.footerBlockText, {color: palette.text}]}>
            {info.director.name}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.footerBlock,
          {backgroundColor: palette.background, borderColor: palette.border},
        ]}>
        <Text style={[styles.footerBlockTitle, {color: palette.accent}]}>
          {info.social.title}
        </Text>
        <View style={styles.footerSocialRow}>
          {info.social.links.map(link => (
            <Pressable
              key={`${keyPrefix}-social-${link.label}`}
              onPress={() => openWeb(link.url)}
              accessibilityRole="link"
              accessibilityLabel={link.label}
              style={({pressed}) => [
                styles.footerSocialBtn,
                {
                  backgroundColor: palette.accent,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Text style={[styles.footerSocialTxt, {color: palette.onAccent}]}>
                {link.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </>
  );

  return (
    <ScrollView
      contentContainerStyle={[
        styles.contactUsRoot,
        {backgroundColor: palette.backgroundSubtle},
      ]}>
      <View style={[styles.contactUsBanner, {backgroundColor: palette.accent}]}>
        <Text style={[styles.contactUsBannerTitle, {color: palette.onAccent}]}>
          Contact Us
        </Text>
        <Text style={[styles.contactUsBannerSub, {color: palette.onAccent}]}>
          {APP_PUBLISHER.legalName}
        </Text>
        <Text style={[styles.contactUsBannerSub, {color: palette.onAccent}]}>
          {APP_PUBLISHER.legalNameNepali}
        </Text>
      </View>

      <View
        style={[
          styles.contactUsPrimaryCard,
          {backgroundColor: palette.background, borderColor: palette.border},
        ]}>
        <Text style={[styles.contactUsPrimaryLabel, {color: palette.accent}]}>
          {CONTACT_INFO_EN.contact.title}
        </Text>
        {CONTACT_INFO_EN.contact.phones.map(phone => (
          <Pressable key={`primary-phone-${phone}`} onPress={() => dial(phone)} hitSlop={6}>
            <Text style={[styles.contactUsPrimaryValue, {color: palette.text}]}>
              {phone}
            </Text>
          </Pressable>
        ))}
        {CONTACT_INFO_EN.contact.emails.map(email => (
          <Pressable key={`primary-email-${email}`} onPress={() => mail(email)} hitSlop={6}>
            <Text style={[styles.contactUsPrimaryValue, {color: palette.text}]}>
              {email}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={() => openWeb(SITE_CONTACT_URL)} hitSlop={6}>
          <Text style={[styles.contactUsWebLink, {color: palette.accent}]}>
            {CONTACT_INFO_EN.websiteLabel}: {SITE_CONTACT_URL}
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.contactUsSubheading, {color: palette.textSecondary}]}>
        सम्पर्क गर्नुहोस्
      </Text>
      <Text style={[styles.contactUsIntro, {color: palette.textSecondary}]}>
        बाह्रखरीसँग फोन, इमेल वा कार्यालयमा सम्पर्क गर्नुहोस् ।
      </Text>

      {renderContactBlocks(FOOTER_INFO, 'ne')}

      <View
        style={[
          styles.contactUsDivider,
          {borderColor: palette.border, backgroundColor: palette.background},
        ]}>
        <Text style={[styles.contactUsDividerText, {color: palette.accent}]}>
          {CONTACT_INFO_EN.pageTitle} (English)
        </Text>
      </View>
      <Text style={[styles.contactUsIntro, {color: palette.textSecondary}]}>
        {CONTACT_INFO_EN.intro}
      </Text>

      {renderContactBlocks(CONTACT_INFO_EN, 'en')}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.backgroundSubtle},
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center', zIndex: 2, width: 44},
  burgerBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burgerIcon: {fontSize: scaleFont(20), fontWeight: '700'},
  headerBrand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerDate: {
    marginTop: 2,
    fontSize: scaleFont(isTablet ? 13 : 11),
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  headerRightSpacer: {width: 44},
  /** Slim, static replacement for the old animated collapsing category bar. */
  categoryIndicatorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  categoryIndicatorText: {fontWeight: '800', fontSize: scaleFont(14)},
  categoryIndicatorChevron: {fontSize: scaleFont(12), fontWeight: '800'},
  modeRow: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  modeBtn: {
    borderRadius: 999,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  modeIconHeader: {width: 24, height: 24},
  themeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  themeIcon: {width: 28, height: 28},
  /** Side burger menu */
  drawerRoot: {flex: 1, flexDirection: 'row'},
  drawerOverlay: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: {width: 4, height: 0},
    elevation: 12,
  },
  drawerSafeArea: {flex: 1},
  drawerHeader: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  drawerBrandHit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerScroll: {flex: 1},
  drawerEdgeSwipe: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 22,
    zIndex: 20,
  },
  drawerThemeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
  },
  drawerThemeLabel: {
    flex: 1,
    fontWeight: '600',
    paddingRight: 8,
  },
  drawerBody: {paddingBottom: 16},
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  drawerItemDot: {width: 6, height: 6, borderRadius: 3},
  drawerItemIcon: {width: 22, height: 22},
  drawerSavedIcon: {width: 36, height: 36},
  drawerItemTextWrap: {flex: 1},
  drawerItemText: {fontSize: scaleFont(15)},
  drawerItemSublabel: {fontSize: scaleFont(12), fontWeight: '600', marginTop: 1},
  drawerHairline: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loading: {marginTop: 10, color: Colors.textSecondary},
  error: {color: Colors.accent, textAlign: 'center', paddingHorizontal: 20},
  page: {flex: 1, backgroundColor: Colors.backgroundSubtle},
  topPanel: {},
  heroExpandedLayer: {
    ...StyleSheet.absoluteFill,
  },
  heroCollapsedTitleWrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroTitleReading: {
    fontSize: scaleFont(17),
    fontWeight: '800',
    textAlign: 'center',
  },
  heroImage: {width: '100%', height: '100%'},
  imagePlaceholder: {width: '100%', height: '100%', backgroundColor: '#ddd'},
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.33)',
  },
  imageTopRightControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'column',
    zIndex: 4,
  },
  imageControlStack: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(4,7,7,0.22)',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  imageControlBtn: {
    width: 38,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  imageControlBtnTop: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(4,7,7,0.16)',
    marginBottom: 6,
  },
  imageControlTxt: {fontSize: scaleFont(18), fontWeight: '800', color: '#040707'},
  /** Meta row actions — clip icon layers so hero images cannot bleed through on Android */
  articleMetaAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
  },
  articleMetaShareImg: {
    width: ARTICLE_SHARE_ICON_SIZE,
    height: ARTICLE_SHARE_ICON_SIZE,
  },
  articleMetaIconBox: {
    width: ARTICLE_SAVE_ICON_BOX,
    height: ARTICLE_SAVE_ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  /** Accent fill — same footprint as stroke; drawn beneath */
  articleSaveInnerLayer: {
    position: 'absolute',
    width: ARTICLE_SAVE_ICON_BOX,
    height: ARTICLE_SAVE_ICON_BOX,
    transform: [{scale: 1.14}],
  },
  /** Outline ribbon — hollow interior when unsaved; sits above inner fill when saved */
  articleSaveStrokeLayer: {
    width: ARTICLE_SAVE_ICON_BOX,
    height: ARTICLE_SAVE_ICON_BOX,
    transform: [{scale: 1.14}],
  },
  heroTitle: {color: '#fff', fontSize: scaleFont(18), fontWeight: '800'},
  adSpacer: {
    height: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  imageArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 34,
    height: 40,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,7,7,0.35)',
    zIndex: 2,
  },
  imageArrowHint: {
    backgroundColor: 'rgba(4,7,7,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  imageArrowLeft: {left: 10},
  imageArrowRight: {right: 10},
  imageArrowTxt: {color: '#FFFFFF', fontSize: 24, fontWeight: '800'},
  bottomPanel: {flex: 1},
  bottomScroll: {flex: 1},
  titleRow: {
    flexDirection: 'column',
    marginBottom: 6,
  },
  titleTight: {marginBottom: 0},
  titleActions: {
    flexDirection: 'row',
    gap: 6,
  },
  stickyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
    zIndex: 2,
    ...(Platform.OS === 'android' ? {elevation: 2} : null),
  },
  authorInline: {marginBottom: 0, flex: 1},
  fontBtnTxt: {fontSize: scaleFont(18), fontWeight: '800'},
  bodyWrap: {padding: 14, paddingBottom: 80},
  title: {fontSize: scaleFont(22), fontWeight: '800', color: Colors.text, marginBottom: 10},
  author: {fontSize: scaleFont(13), color: Colors.textSecondary, marginBottom: 12},
  body: {fontSize: scaleFont(17), lineHeight: scaleFont(29), color: Colors.text},
  inlineLoading: {flexDirection: 'row', alignItems: 'center', gap: 8},
  loadingInline: {color: Colors.textSecondary},
  navArrowBtnDisabled: {opacity: 0.35},
  savedListPad: {paddingVertical: 12},
  savedHint: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  savedRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: Colors.card,
  },
  savedTitle: {flex: 1, color: Colors.text, fontSize: scaleFont(16), fontWeight: '700'},
  unsaveBtn: {
    borderWidth: 0,
    borderRadius: 8,
    minWidth: 40,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsaveIconImg: {width: 22, height: 22},
  readModalRoot: {flex: 1, backgroundColor: Colors.backgroundSubtle},
  readModalHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  readHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readZoomStack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readZoomBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeText: {fontWeight: '800', color: Colors.text},
  readBodyWrap: {padding: 14, paddingBottom: 40},
  readHero: {width: '100%', height: 220, borderRadius: 8, marginBottom: 12},
  /**
   * iPadOS-only floating "Next article" control. Approximates iOS 26
   * Liquid Glass with a translucent fill, bright inner highlight ring,
   * and soft drop shadow — readable on light hero images, body copy,
   * or dark theme alike.
   */
  iPadNextFab: {
    position: 'absolute',
    right: 18,
    bottom: 44,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 6},
    elevation: 8,
    zIndex: 6,
  },
  iPadNextFabPressed: {
    transform: [{scale: 0.94}],
    shadowOpacity: 0.18,
  },
  iPadNextFabGlass: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iPadNextFabGlassLight: {
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderColor: 'rgba(255,255,255,0.85)',
  },
  iPadNextFabGlassDark: {
    backgroundColor: 'rgba(28,32,36,0.55)',
    borderColor: 'rgba(255,255,255,0.32)',
  },
  iPadNextFabHighlight: {
    position: 'absolute',
    top: 3,
    left: 6,
    right: 6,
    height: 22,
    borderRadius: 18,
  },
  iPadNextFabHighlightLight: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  iPadNextFabHighlightDark: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  iPadNextFabArrow: {
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 40,
    marginTop: -2,
    marginLeft: 4,
  },
  homeListContent: {
    paddingBottom: 36,
  },
  /** Slim ribbon shared by शीर्ष समाचार, ताजा समाचार, and below-the-fold
   *  section headers (politics, economy, …). “Open more” sits on the
   *  same row so those bars stay the same height. */
  homeRibbon: {
    paddingHorizontal: 16,
    paddingVertical: isTablet ? 7 : 5,
  },
  homeRibbonText: {
    fontWeight: '800',
    fontSize: scaleFont(isTablet ? 19 : 16),
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  homeRibbonCentered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeRibbonTextCentered: {
    textAlign: 'center',
    width: '100%',
  },
  homeRibbonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  homeRibbonSeeAll: {
    fontWeight: '700',
    fontSize: scaleFont(isTablet ? 14 : 12),
    flexShrink: 0,
  },
  homeSectionHeaderFooter: {
    marginTop: 22,
  },
  breakingWrap: {
    marginBottom: 4,
  },
  breakingListContent: {
    paddingHorizontal: isTablet ? 18 : 12,
    paddingVertical: 12,
    gap: 10,
  },
  breakingCard: {
    width: isTablet ? 220 : 168,
    marginRight: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
  },
  breakingCardThumb: {
    width: '100%',
    height: isTablet ? 130 : 96,
  },
  breakingCardTitle: {
    padding: 8,
    fontSize: scaleFont(isTablet ? 15 : 13),
    fontWeight: '700',
    lineHeight: scaleFont(isTablet ? 21 : 18),
  },
  headlinePane: {
    flexGrow: 0,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isTablet ? 18 : 12,
    paddingVertical: isTablet ? 10 : 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
    backgroundColor: Colors.background,
  },
  headlineRowTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(isTablet ? 18 : 16),
    fontWeight: '700',
    lineHeight: scaleFont(isTablet ? 25 : 22),
  },
  moreHeadlinesBtn: {
    paddingHorizontal: isTablet ? 18 : 12,
    paddingVertical: isTablet ? 10 : 8,
    alignItems: 'center',
  },
  moreHeadlinesText: {
    fontSize: scaleFont(isTablet ? 14 : 12),
    fontWeight: '600',
    opacity: 0.5,
  },
  homeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: isTablet ? 22 : 14,
    paddingVertical: isTablet ? 16 : 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: isTablet ? 16 : 12,
  },
  homeRowThumb: {
    width: isTablet ? 110 : 72,
    height: isTablet ? 80 : 56,
    borderRadius: 8,
  },
  homeRowTextWrap: {
    flex: 1,
    minHeight: isTablet ? 80 : 56,
    justifyContent: 'center',
  },
  homeRowTitle: {
    fontSize: scaleFont(isTablet ? 19 : 16),
    fontWeight: '700',
    lineHeight: scaleFont(isTablet ? 27 : 22),
  },
  homeRowMeta: {
    marginTop: 4,
    fontSize: scaleFont(12),
  },
  homeFooterWrap: {
    marginTop: 0,
  },
  homeFooterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isTablet ? 24 : 18,
    paddingVertical: isTablet ? 20 : 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  homeFooterLinkText: {
    fontSize: scaleFont(isTablet ? 19 : 17),
    fontWeight: '700',
  },
  homeFooterLinkArrow: {
    fontSize: scaleFont(isTablet ? 28 : 22),
    fontWeight: '800',
  },
  homeFooterContactLink: {
    alignItems: 'flex-start',
  },
  homeFooterContactTextWrap: {
    flex: 1,
    gap: 4,
  },
  homeFooterContactMeta: {
    fontSize: scaleFont(isTablet ? 14 : 12),
    fontWeight: '600',
  },
  contactUsRoot: {
    flexGrow: 1,
    paddingHorizontal: isTablet ? 32 : 16,
    paddingVertical: isTablet ? 28 : 18,
    gap: isTablet ? 18 : 14,
  },
  contactUsHeading: {
    fontSize: scaleFont(isTablet ? 26 : 22),
    fontWeight: '800',
    marginBottom: isTablet ? 2 : 0,
  },
  contactUsBanner: {
    borderRadius: 14,
    paddingHorizontal: isTablet ? 22 : 16,
    paddingVertical: isTablet ? 20 : 16,
    marginBottom: isTablet ? 14 : 10,
  },
  contactUsBannerTitle: {
    fontSize: scaleFont(isTablet ? 28 : 24),
    fontWeight: '800',
    marginBottom: 6,
  },
  contactUsBannerSub: {
    fontSize: scaleFont(isTablet ? 15 : 13),
    fontWeight: '600',
    opacity: 0.95,
  },
  contactUsPrimaryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: isTablet ? 20 : 16,
    paddingVertical: isTablet ? 18 : 14,
    marginBottom: isTablet ? 12 : 8,
    gap: 6,
  },
  contactUsPrimaryLabel: {
    fontSize: scaleFont(isTablet ? 17 : 15),
    fontWeight: '800',
    marginBottom: 4,
  },
  contactUsPrimaryValue: {
    fontSize: scaleFont(isTablet ? 18 : 16),
    fontWeight: '700',
  },
  contactUsWebLink: {
    marginTop: 8,
    fontSize: scaleFont(isTablet ? 14 : 12),
    fontWeight: '700',
  },
  contactUsSubheading: {
    fontSize: scaleFont(isTablet ? 18 : 16),
    fontWeight: '600',
    marginBottom: isTablet ? 8 : 4,
  },
  contactUsIntro: {
    fontSize: scaleFont(isTablet ? 16 : 14),
    marginBottom: isTablet ? 8 : 4,
  },
  contactUsDivider: {
    marginTop: isTablet ? 12 : 8,
    marginBottom: isTablet ? 4 : 2,
    paddingVertical: isTablet ? 16 : 12,
    paddingHorizontal: isTablet ? 20 : 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    alignItems: 'center',
  },
  contactUsDividerText: {
    fontSize: scaleFont(isTablet ? 20 : 17),
    fontWeight: '800',
  },
  footerBlock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: isTablet ? 20 : 16,
    paddingVertical: isTablet ? 16 : 14,
    marginTop: isTablet ? 8 : 6,
  },
  footerBlockHalf: {
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: isTablet ? 14 : 10,
    marginTop: 0,
  },
  footerBlockTitle: {
    fontSize: scaleFont(isTablet ? 16 : 14),
    fontWeight: '800',
    marginBottom: isTablet ? 8 : 6,
    letterSpacing: 0.2,
  },
  footerBlockText: {
    fontSize: scaleFont(isTablet ? 17 : 15),
    lineHeight: scaleFont(isTablet ? 26 : 22),
  },
  footerLinkText: {
    fontSize: scaleFont(isTablet ? 17 : 15),
    lineHeight: scaleFont(isTablet ? 26 : 22),
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  footerSocialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  footerSocialBtn: {
    paddingHorizontal: isTablet ? 18 : 14,
    paddingVertical: isTablet ? 10 : 8,
    borderRadius: 999,
  },
  footerSocialTxt: {
    fontWeight: '700',
    fontSize: scaleFont(isTablet ? 15 : 13),
    letterSpacing: 0.2,
  },
  infoModalTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(isTablet ? 22 : 18),
    fontWeight: '800',
    paddingHorizontal: 8,
  },
  infoRefreshBtn: {
    borderWidth: 1,
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRefreshTxt: {
    fontSize: scaleFont(20),
    fontWeight: '800',
  },
  infoOfflineBanner: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  infoOfflineTxt: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  infoModalBody: {
    paddingHorizontal: isTablet ? 32 : 16,
    paddingVertical: isTablet ? 24 : 16,
    paddingBottom: 48,
  },
  infoParagraph: {
    fontSize: scaleFont(isTablet ? 19 : 16),
    lineHeight: scaleFont(isTablet ? 30 : 26),
    marginBottom: isTablet ? 18 : 14,
  },
  teamCategoryBlock: {
    marginBottom: isTablet ? 26 : 20,
  },
  teamCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: isTablet ? 10 : 8,
    borderRadius: 6,
    marginBottom: isTablet ? 14 : 10,
  },
  teamCategoryHeaderText: {
    fontSize: scaleFont(isTablet ? 20 : 17),
    fontWeight: '800',
    flex: 1,
    paddingRight: 8,
  },
  teamCategoryChevron: {
    fontSize: scaleFont(isTablet ? 22 : 18),
    fontWeight: '800',
  },
  teamMemberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTablet ? 14 : 10,
  },
  teamMemberCard: {
    width: isTablet ? '23.5%' : '47.5%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: 'center',
  },
  teamMemberPhoto: {
    width: isTablet ? 110 : 84,
    height: isTablet ? 110 : 84,
    borderRadius: isTablet ? 55 : 42,
    marginBottom: 8,
  },
  teamMemberName: {
    fontSize: scaleFont(isTablet ? 16 : 14),
    fontWeight: '800',
    textAlign: 'center',
  },
  teamMemberRole: {
    marginTop: 3,
    fontSize: scaleFont(isTablet ? 13 : 11),
    textAlign: 'center',
  },
  saveToastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    alignItems: 'center',
    zIndex: 50,
    elevation: 20,
  },
  saveToast: {
    maxWidth: 360,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveToastText: {
    fontSize: scaleFont(isTablet ? 16 : 14),
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default App;
