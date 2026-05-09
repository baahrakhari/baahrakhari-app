import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {NEWS_CATEGORIES} from './src/config/site';
import {fetchHtml, parseDetailArticle} from './src/scrape/baahrakhari';
import {useArticleAlerts} from './src/state/useArticleAlerts';
import {useArticleFeed} from './src/state/useArticleFeed';
import {useReadLater} from './src/state/useReadLater';
import {ScrollView as GHScrollView} from 'react-native-gesture-handler';
import {
  PinchZoomArticleBody,
  ARTICLE_FONT_MAX,
  ARTICLE_FONT_MIN,
} from './src/components/PinchZoomArticleBody';
import {Colors} from './src/theme/colors';
import type {Article, CategoryKey, SavedArticle} from './src/types/article';
import {DentArticleAction} from './src/components/DentArticleAction';
import {formatArticleMetaLine} from './src/format/articleMeta';

const HOME_ICON = '⌂';
const ICON_SAVE_ARTICLE = require('./assets/icons/save_article.png');
const ICON_SAVE_ARTICLE_DARK = require('./assets/icons/save_article_dark.png');
const ICON_READ_LATER = require('./assets/icons/read_later_icon.png');
const ICON_SHARE = require('./assets/icons/share_icon.png');
const ICON_SHARE_DARK = require('./assets/icons/share_icon_dark.png');
const ICON_BRAND = require('./assets/icons/12khari_app_icon.png');
const ICON_REMOVE_BOOKMARK = require('./assets/icons/remove_bookmark.png');
const ICON_REMOVE_BOOKMARK_DARK = require('./assets/icons/remove_bookmark_dark.png');
const ICON_THEME_MOON = require('./assets/icons/nepali_flag_moon.png');
const ICON_THEME_SUN = require('./assets/icons/nepali_flag_sun.png');
/** White interior blob — tinted with accent when article is saved */
const ICON_SAVE_INNER_TEMPLATE = require('./assets/icons/save_article_inner_template.png');
const APP_TITLE = 'बाह्रखरी';
/** Hit box matches meta row icon button */
const ARTICLE_SAVE_ICON_BOX = 36;
/** Pixels: treat body as scrollable only if content is taller than the viewport by at least this much. */
const SCROLL_CHROME_EPS = 3;

function App(): React.JSX.Element {
  const [isDark, setIsDark] = useState(false);
  const [mode, setMode] = useState<'feed' | 'read'>('feed');
  const [category, setCategory] = useState<CategoryKey>('home');
  const [bodyFontSize, setBodyFontSize] = useState(17);
  const bodyFontSizeRef = useRef(bodyFontSize);
  bodyFontSizeRef.current = bodyFontSize;
  const [isHeroCollapsed, setIsHeroCollapsed] = useState(false);
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const [headerPinnedExpanded, setHeaderPinnedExpanded] = useState(false);
  const [swipeHintDir, setSwipeHintDir] = useState<'next' | 'prev' | null>(null);
  const [readModalArticle, setReadModalArticle] = useState<SavedArticle | null>(null);
  const width = Dimensions.get('window').width;
  const height = Dimensions.get('window').height;
  const pagerRef = useRef<FlatList<Article>>(null);
  const transitionAnim = useRef(new Animated.Value(1)).current;
  const headerCompactAnim = useRef(new Animated.Value(0)).current;
  const swipeHintOpacity = useRef(new Animated.Value(0)).current;
  const horizontalOffsetRef = useRef(0);
  const lastHintAtRef = useRef(0);
  const heroExpanded = Math.max(150, height * 0.2);
  /** Scroll-collapse: title strip only (image hidden); taller than old partial collapse */
  const heroCollapsedReading = Math.max(52, Math.min(72, Math.floor(height * 0.072)));
  const heroHeightAnim = useRef(new Animated.Value(heroExpanded)).current;
  const heroCollapsedRef = useRef(false);
  const articleBodyViewportHRef = useRef<Record<string, number>>({});
  /** Which feed article owns scroll-driven chrome (ignore off-screen rows). */
  const focusedArticleIdRef = useRef<string | null>(null);
  const {
    items,
    articleById,
    loading,
    error,
    hydrateArticle,
    prefetchTarget,
    reload,
  } =
    useArticleFeed(category);
  const {saved, isSaved, toggleSaved, unsave, loadingSaved, maxSaved} = useReadLater();
  useArticleAlerts();

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
      const cur = items[i];
      const next = items[i + 1];
      if (cur) {
        focusedArticleIdRef.current = cur.id;
        hydrateArticle(cur).catch(() => {});
      }
      if (next) {
        hydrateArticle(next).catch(() => {});
      }
      /** New article is active: restore hero to default size. */
      heroCollapsedRef.current = false;
      setIsHeroCollapsed(false);
      setIsHeaderCompact(false);
      setHeaderPinnedExpanded(false);
      headerCompactAnim.setValue(0);
      heroHeightAnim.setValue(heroExpanded);
      transitionAnim.setValue(0.985);
      Animated.timing(transitionAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    },
  ).current;

  const onToggleSaved = async (article: Article) => {
    if (article.bodyText.trim().length > 0) {
      await toggleSaved(article);
      return;
    }
    try {
      const html = await fetchHtml(article.url);
      const detailed = parseDetailArticle(article, html);
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

  const goHomeFeed = () => {
    const shouldRefreshNow = mode === 'feed' && category === 'home';
    setMode('feed');
    setCategory('home');
    heroCollapsedRef.current = false;
    setIsHeroCollapsed(false);
    setIsHeaderCompact(false);
    setHeaderPinnedExpanded(false);
    headerCompactAnim.setValue(0);
    heroHeightAnim.setValue(heroExpanded);
    if (shouldRefreshNow) {
      reload();
    }
  };

  const openSavedList = () => {
    setMode('read');
    setHeaderPinnedExpanded(false);
    setCompactHeader(false);
  };

  const setCompactHeader = useCallback(
    (compact: boolean) => {
      setIsHeaderCompact(compact);
      Animated.timing(headerCompactAnim, {
        toValue: compact ? 1 : 0,
        duration: 190,
        useNativeDriver: true,
      }).start();
    },
    [headerCompactAnim],
  );

  const expandReadingChromeIfShortArticle = useCallback(() => {
    setHeaderPinnedExpanded(false);
    setCompactHeader(false);
    if (!heroCollapsedRef.current) {
      return;
    }
    heroCollapsedRef.current = false;
    setIsHeroCollapsed(false);
    Animated.timing(heroHeightAnim, {
      toValue: heroExpanded,
      duration: 170,
      useNativeDriver: false,
    }).start();
  }, [heroExpanded, heroHeightAnim, setCompactHeader]);

  const onToggleNavBar = () => {
    if (isHeaderCompact) {
      setHeaderPinnedExpanded(true);
      setCompactHeader(false);
      return;
    }
    setHeaderPinnedExpanded(false);
    setCompactHeader(true);
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
      if (heroCollapsedRef.current || isHeaderCompact) {
        expandReadingChromeIfShortArticle();
      }
      return;
    }

    const shouldCollapse = offsetY > 20;
    if (offsetY < 40 && headerPinnedExpanded) {
      setHeaderPinnedExpanded(false);
    }
    const shouldCompactHeader = !headerPinnedExpanded && offsetY > 95;
    if (shouldCompactHeader !== isHeaderCompact) {
      setCompactHeader(shouldCompactHeader);
    }

    if (shouldCollapse === heroCollapsedRef.current) {
      return;
    }
    heroCollapsedRef.current = shouldCollapse;
    setIsHeroCollapsed(shouldCollapse);
    Animated.timing(heroHeightAnim, {
      toValue: shouldCollapse ? heroCollapsedReading : heroExpanded,
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

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={palette.background}
      />
      <SafeAreaView style={[styles.root, {backgroundColor: palette.backgroundSubtle}]}>
        <View
          style={[
            styles.header,
            {backgroundColor: palette.background, borderBottomColor: palette.border},
          ]}>
          <Animated.Text
            style={[
              styles.headerTitle,
              {
                color: palette.text,
                opacity: Animated.subtract(1, headerCompactAnim),
                transform: [
                  {
                    translateY: headerCompactAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8],
                    }),
                  },
                ],
              },
            ]}>
            {APP_TITLE}
          </Animated.Text>
          <View style={styles.headerLeft}>
            <Pressable onPress={goHomeFeed} style={styles.homeBtn}>
              <View
                style={[
                  styles.homeBtnInner,
                  {
                    borderColor: palette.border,
                    backgroundColor:
                      mode === 'feed' ? palette.accent : palette.mutedBtn,
                  },
                ]}>
                <Text
                  style={[
                    styles.homeIcon,
                    {color: mode === 'feed' ? palette.onAccent : palette.text},
                  ]}>
                  {HOME_ICON}
                </Text>
              </View>
            </Pressable>
            <Animated.View style={{opacity: Animated.subtract(1, headerCompactAnim)}}>
              <Pressable onPress={goHomeFeed}>
                <Image source={ICON_BRAND} resizeMode="contain" style={styles.logo} />
              </Pressable>
            </Animated.View>
          </View>
          <Animated.View
            pointerEvents={isHeaderCompact ? 'auto' : 'none'}
            style={[
              styles.centerLogoWrap,
              {
                opacity: headerCompactAnim,
                transform: [
                  {
                    scale: headerCompactAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.88, 1],
                    }),
                  },
                ],
              },
            ]}>
            <Pressable onPress={onToggleNavBar} style={styles.centerLogoBtn}>
              <Image source={ICON_BRAND} resizeMode="contain" style={styles.centerLogo} />
            </Pressable>
          </Animated.View>
          <View style={styles.modeRow}>
            <Pressable
              onPress={openSavedList}
              accessibilityRole="button"
              accessibilityLabel="Read later list"
              hitSlop={10}
              style={[
                styles.modeBtn,
                {
                  borderWidth:
                    mode === 'read' ? StyleSheet.hairlineWidth : 0,
                  borderColor:
                    mode === 'read' ? palette.accent : 'transparent',
                  backgroundColor:
                    mode === 'read' ? palette.accent : palette.background,
                },
              ]}>
              <Image
                source={ICON_READ_LATER}
                style={styles.modeIconHeader}
                resizeMode="contain"
                tintColor={mode === 'read' ? palette.onAccent : palette.actionIcon}
              />
            </Pressable>
            <Pressable
              onPress={() => setIsDark(v => !v)}
              accessibilityRole="button"
              accessibilityLabel={isDark ? 'Light theme' : 'Dark theme'}
              hitSlop={10}
              style={[
                styles.themeBtn,
                {
                  borderWidth: 0,
                  borderColor: 'transparent',
                  backgroundColor: palette.background,
                },
              ]}>
              <Image
                source={isDark ? ICON_THEME_SUN : ICON_THEME_MOON}
                style={styles.themeIcon}
                resizeMode="contain"
                tintColor={palette.actionIcon}
              />
            </Pressable>
          </View>
        </View>
        {mode === 'feed' ? (
          <>
            {isHeaderCompact ? (
              <View style={[styles.compactRedLine, {backgroundColor: palette.accent}]} />
            ) : (
              <View style={[styles.categoryBar, {backgroundColor: palette.accent}]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {NEWS_CATEGORIES.map(cat => (
                    <Pressable
                      key={cat.slug}
                      onPress={() => {
                        setCategory(cat.slug);
                        heroCollapsedRef.current = false;
                        setIsHeroCollapsed(false);
                        setHeaderPinnedExpanded(false);
                        setCompactHeader(false);
                        heroHeightAnim.setValue(heroExpanded);
                      }}
                      style={[
                        styles.catChip,
                        styles.catChipBorderDefault,
                        {
                          backgroundColor:
                            category === cat.slug ? palette.chipOn : palette.chipOff,
                        },
                        category === cat.slug ? {borderColor: palette.chipOn} : undefined,
                      ]}>
                      <Text
                        style={[
                          styles.catText,
                          {
                            color:
                              category === cat.slug ? palette.accent : palette.onAccent,
                          },
                        ]}>
                        {cat.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            {isHeaderCompact ? (
              <View style={styles.navLipWrap}>
                <Pressable
                  onPress={onToggleNavBar}
                  style={[
                    styles.navLipBtn,
                    styles.navLipCompactDown,
                    {
                      backgroundColor: palette.accent,
                      borderColor: palette.accent,
                      transform: [{translateY: 0}],
                    },
                  ]}>
                  <Text style={[styles.navLipArrow, {color: palette.onAccent}]}>⌄</Text>
                </Pressable>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={palette.accent} size="large" />
                <Text style={[styles.loading, {color: palette.textSecondary}]}>लोड हुँदैछ … (बफर {prefetchTarget})</Text>
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Text style={[styles.error, {color: palette.accent}]}>{error}</Text>
              </View>
            ) : (
              <FlatList
                ref={pagerRef}
                data={data}
                horizontal
                pagingEnabled
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                getItemLayout={(_, i) => ({length: width, offset: width * i, index: i})}
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
                renderItem={({item}) => {
                  const savedState = isSaved(item.id);
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
                              <Image
                                source={isDark ? ICON_SHARE_DARK : ICON_SHARE}
                                style={styles.articleMetaShareImg}
                                resizeMode="contain"
                              />
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
                              <View style={styles.articleSaveIconBox}>
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
                        onLayout={ev => {
                          articleBodyViewportHRef.current[item.id] =
                            ev.nativeEvent.layout.height;
                        }}
                        onContentSizeChange={(_cw, ch) => {
                          if (focusedArticleIdRef.current !== item.id) {
                            return;
                          }
                          const lh = articleBodyViewportHRef.current[item.id] ?? 0;
                          if (
                            lh > SCROLL_CHROME_EPS &&
                            ch <= lh + SCROLL_CHROME_EPS
                          ) {
                            expandReadingChromeIfShortArticle();
                          }
                        }}
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
                        </PinchZoomArticleBody>
                        </GHScrollView>
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

        <Modal
          visible={readModalArticle != null}
          animationType="slide"
          onRequestClose={() => setReadModalArticle(null)}>
          <SafeAreaView style={[styles.readModalRoot, {backgroundColor: palette.backgroundSubtle}]}> 
            <View
              style={[
                styles.readModalHeader,
                {borderBottomColor: palette.border, backgroundColor: palette.background},
              ]}>
              <Pressable
                onPress={() => setReadModalArticle(null)}
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
                  <Pressable
                    onPress={() => {
                      unsave(readModalArticle.id).catch(() => {});
                      setReadModalArticle(null);
                    }}
                    style={[
                      styles.unsaveBtn,
                      {backgroundColor: palette.background},
                    ]}>
                    <Image
                      source={
                        isDark ? ICON_REMOVE_BOOKMARK_DARK : ICON_REMOVE_BOOKMARK
                      }
                      style={styles.unsaveIconImg}
                      resizeMode="contain"
                    />
                  </Pressable>
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
                {readModalArticle.imageUrl ? (
                  <Image source={{uri: readModalArticle.imageUrl}} style={styles.readHero} />
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
                </PinchZoomArticleBody>
              </GHScrollView>
            ) : null}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.backgroundSubtle},
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 2},
  centerLogoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  centerLogoBtn: {alignItems: 'center', justifyContent: 'center'},
  centerLogo: {height: 42, width: 42, borderRadius: 10},
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '800',
    top: 3,
  },
  logo: {height: 32, width: 32, borderRadius: 8},
  homeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIcon: {fontSize: 20, fontWeight: '800'},
  navLipWrap: {
    alignItems: 'center',
    height: 0,
    overflow: 'visible',
    zIndex: 4,
  },
  navLipBtn: {
    width: 128,
    height: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLipExpanded: {
    borderTopWidth: 1,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  navLipCompactDown: {
    borderTopWidth: 1,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  navLipArrow: {fontSize: 15, fontWeight: '900'},
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
  themeIcon: {width: 24, height: 24},
  categoryBar: {
    backgroundColor: Colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  compactRedLine: {
    height: 3,
    width: '100%',
  },
  catChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  catChipBorderDefault: {borderColor: 'rgba(255,255,255,0.45)'},
  catText: {fontWeight: '700'},
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
    fontSize: 17,
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
  imageControlTxt: {fontSize: 18, fontWeight: '800', color: '#040707'},
  /** Seamless row — PNGs are transparent; row background shows through */
  articleMetaAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: 'visible',
  },
  /** Share glyph scaled down (~70%) vs save for visual balance */
  articleMetaShareImg: {
    width: '100%',
    height: '100%',
    transform: [{scale: 0.7}],
  },
  articleSaveIconBox: {
    width: ARTICLE_SAVE_ICON_BOX,
    height: ARTICLE_SAVE_ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center',
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
  heroTitle: {color: '#fff', fontSize: 18, fontWeight: '800'},
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
  },
  authorInline: {marginBottom: 0, flex: 1},
  fontBtnTxt: {fontSize: 18, fontWeight: '800'},
  bodyWrap: {padding: 14, paddingBottom: 80},
  title: {fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 10},
  author: {fontSize: 13, color: Colors.textSecondary, marginBottom: 12},
  body: {fontSize: 17, lineHeight: 29, color: Colors.text},
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
  savedTitle: {flex: 1, color: Colors.text, fontSize: 16, fontWeight: '700'},
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
});

export default App;
