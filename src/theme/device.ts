import {Platform} from 'react-native';

/**
 * Device idiom detection.
 *
 * `Platform.isPad` is iOS-only and returns true when the current device
 * reports the `pad` UIUserInterfaceIdiom — i.e. a real iPad or an iPad
 * simulator. It is also true when an iPhone-target app runs under
 * "Designed for iPad" on iPadOS, which is the correct behavior for layout
 * adaptation purposes.
 */
export const isIPad: boolean =
  Platform.OS === 'ios' && (Platform as unknown as {isPad?: boolean}).isPad === true;

export const isIPhone: boolean = Platform.OS === 'ios' && !isIPad;

export type DeviceIdiom = 'ipad' | 'iphone' | 'android' | 'other';

export const deviceIdiom: DeviceIdiom = isIPad
  ? 'ipad'
  : Platform.OS === 'ios'
  ? 'iphone'
  : Platform.OS === 'android'
  ? 'android'
  : 'other';

/**
 * Multiplier applied to every iPhone-tuned numeric size when running on iOS.
 * Bumps both iPhone and iPad above the original "iPhone-baseline" design,
 * making chrome and body copy noticeably more readable.
 */
export const IOS_FONT_FACTOR = 1.18;

/**
 * Additional multiplier stacked on top of `IOS_FONT_FACTOR` for iPad-class
 * screens. Tuned so body copy is comfortable at arm's length on an 11–13"
 * tablet without making chrome feel oversized.
 */
export const IPAD_FONT_FACTOR = 1.22;

/**
 * Effective composite scale factor for the current device idiom:
 *   • Android / other: 1
 *   • iPhone:           IOS_FONT_FACTOR
 *   • iPad:             IOS_FONT_FACTOR * IPAD_FONT_FACTOR
 */
export const FONT_FACTOR: number =
  Platform.OS === 'ios'
    ? isIPad
      ? IOS_FONT_FACTOR * IPAD_FONT_FACTOR
      : IOS_FONT_FACTOR
    : 1;

/**
 * Scale an iPhone-tuned numeric size for the current device idiom.
 * Honors the iOS-wide bump on every iOS device and adds the iPad bonus
 * on tablets. Caller may override the factor explicitly when needed.
 */
export function scaleFont(base: number, factor: number = FONT_FACTOR): number {
  return Math.round(base * factor);
}

/**
 * Initial article body font size. Derived from a single iPhone-baseline
 * value so it automatically tracks `IOS_FONT_FACTOR` / `IPAD_FONT_FACTOR`.
 */
export const READING_DEFAULT_BODY: number = scaleFont(19);

/** Pinch-to-zoom / +/- bounds. iPad gets more headroom on the upper end. */
export const ARTICLE_FONT_MIN: number = 14;
export const ARTICLE_FONT_MAX: number = isIPad ? 48 : 38;
