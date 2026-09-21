import React from 'react';
import {Image, Linking, Pressable, StyleSheet, View} from 'react-native';
import type {HomeAdCreative} from '../scrape/advertisements';

/** Reserved while the creative loads so the home list does not jump. */
export const HOME_AD_MIN_HEIGHT = 108;

type Palette = {
  backgroundSubtle: string;
  border: string;
};

type Props = {
  ad: HomeAdCreative | null;
  loading: boolean;
  palette: Palette;
};

/**
 * Static house banner. GIFs render as the first frame via RN Image
 * (no animation library). Empty after load → render nothing (no gap).
 */
export function HomeAdSlot({ad, loading, palette}: Props): React.JSX.Element | null {
  if (!loading && !ad) {
    return null;
  }
  if (loading || !ad) {
    return (
      <View
        accessibilityLabel="विज्ञापन लोड हुँदैछ"
        style={[
          styles.slot,
          {
            minHeight: HOME_AD_MIN_HEIGHT,
            backgroundColor: palette.backgroundSubtle,
            borderColor: palette.border,
          },
        ]}
      />
    );
  }

  const image = (
    <Image
      source={{uri: ad.imageUrl}}
      style={styles.image}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );

  if (!ad.tapUrl) {
    return (
      <View
        accessibilityLabel={ad.title}
        style={[
          styles.slot,
          {
            minHeight: HOME_AD_MIN_HEIGHT,
            backgroundColor: palette.backgroundSubtle,
            borderColor: palette.border,
          },
        ]}>
        {image}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={ad.title}
      onPress={() => {
        Linking.openURL(ad.tapUrl!).catch(() => {});
      }}
      style={({pressed}) => [
        styles.slot,
        {
          minHeight: HOME_AD_MIN_HEIGHT,
          backgroundColor: palette.backgroundSubtle,
          borderColor: palette.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      {image}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: HOME_AD_MIN_HEIGHT,
  },
});
