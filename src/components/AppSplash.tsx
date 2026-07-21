import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {scaleFont} from '../theme/device';

const ICON_BRAND_LONG = require('../../assets/icons/12kharilogo_longer.png');
const NEPAL_FLAG = require('../../assets/icons/nepali_flag.webp');

/** Long brand mark aspect (px from source PNG: 201×88). */
const LOGO_ASPECT = 201 / 88;
/** Nepal flag aspect (source WebP is 800×800 — flag inscribed in a square,
 *  giving us padding around the asymmetric pennant silhouette). */
const FLAG_ASPECT = 1;

type Props = {
  /** Tint everything against this surface; defaults to brand off-white. */
  background?: string;
  /** Caption shown beneath the logo; pass empty to hide. */
  caption?: string;
  /** Spinner + caption color. */
  accent?: string;
  /** Secondary text tone. */
  secondary?: string;
};

/**
 * Initial-load splash.
 *
 * Brand mark (`12kharilogo_longer`) is the source of truth: it is rendered
 * unconditionally and remains the only visual identifier of the app. The
 * Nepali flag is decorative background art that fades in once the asset has
 * finished decoding. If the flag fails to load, we silently fall back to the
 * logo-only layout — no "बाह्रखरी" wordmark ever appears on this screen.
 */
export function AppSplash({
  background = '#FAFBFC',
  caption = 'लोड हुँदैछ …',
  accent = '#B6191D',
  secondary = '#5A6066',
}: Props) {
  const skew = useRef(new Animated.Value(0)).current;
  const stretch = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const flagOpacity = useRef(new Animated.Value(0)).current;

  const [flagAvailable, setFlagAvailable] = useState<boolean>(true);

  useEffect(() => {
    /**
     * Three offset cosine cycles produce a non-mechanical wind-flap:
     *  • skew  → flag fabric shearing left/right (skewX)
     *  • stretch → fabric bunching/extending (scaleX)
     *  • drift → slow translateX so the apparent tip wanders
     */
    const loop = (
      value: Animated.Value,
      duration: number,
    ): Animated.CompositeAnimation =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: duration / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: -1,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: duration / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );

    const a1 = loop(skew, 2600);
    const a2 = loop(stretch, 3300);
    const a3 = loop(drift, 4100);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [drift, skew, stretch]);

  const handleFlagLoaded = useCallback(() => {
    Animated.timing(flagOpacity, {
      toValue: 0.16,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [flagOpacity]);

  const handleFlagError = useCallback(() => {
    setFlagAvailable(false);
  }, []);

  const skewX = skew.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-7deg', '7deg'],
  });
  const scaleX = stretch.interpolate({
    inputRange: [-1, 1],
    outputRange: [0.94, 1.06],
  });
  const translateX = drift.interpolate({
    inputRange: [-1, 1],
    outputRange: [-6, 6],
  });

  /** Flag is sized off the viewport's smaller dimension at render time. */
  const flagHeight = scaleFont(380);
  const flagWidth = Math.round(flagHeight * FLAG_ASPECT);

  /** Long mark scaled to match the iPad header logo at ~1.6×. */
  const logoHeight = scaleFont(96);
  const logoWidth = Math.round(logoHeight * LOGO_ASPECT);

  return (
    <View style={[styles.root, {backgroundColor: background}]}>
      {flagAvailable ? (
        <Animated.Image
          source={NEPAL_FLAG}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          onLoad={handleFlagLoaded}
          onError={handleFlagError}
          style={[
            styles.flag,
            {
              width: flagWidth,
              height: flagHeight,
              opacity: flagOpacity,
              transform: [
                {translateX},
                {scaleX},
                {skewX},
              ],
            },
          ]}
        />
      ) : null}
      <View style={styles.foreground}>
        <Image
          source={ICON_BRAND_LONG}
          resizeMode="contain"
          style={{width: logoWidth, height: logoHeight}}
        />
        {caption.length > 0 ? (
          <View style={styles.captionWrap}>
            <ActivityIndicator color={accent} />
            <Text style={[styles.captionText, {color: secondary}]}>{caption}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  flag: {
    position: 'absolute',
  },
  foreground: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionWrap: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  captionText: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
