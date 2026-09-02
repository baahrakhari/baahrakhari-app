import React, {useCallback, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {openArticleVideo} from '../linking/videoLinks';
import type {ArticleVideo} from '../scrape/articleVideos';
import {scaleFont} from '../theme/device';

type Palette = {
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  accent: string;
  onAccent: string;
};

type Props = {
  videos: ArticleVideo[] | undefined;
  palette: Palette;
};

const YOUTUBE_HINT = 'YouTube मा हेर्नुहोस्';
const BROWSER_HINT = 'ब्राउजरमा हेर्नुहोस्';

function ArticleVideoCard({
  video,
  palette,
}: {
  video: ArticleVideo;
  palette: Palette;
}): React.JSX.Element {
  const [posterFailed, setPosterFailed] = useState(false);
  const isYouTube = video.provider === 'youtube';
  const hint = isYouTube ? YOUTUBE_HINT : BROWSER_HINT;
  const showPoster = Boolean(video.thumbnailUrl) && !posterFailed;

  const open = useCallback(() => {
    openArticleVideo(video).catch(() => {});
  }, [video]);

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityHint={hint}
      accessibilityLabel={video.title ?? hint}
      style={({pressed}) => [
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View style={styles.poster}>
        {showPoster ? (
          <Image
            source={{uri: video.thumbnailUrl}}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setPosterFailed(true)}
          />
        ) : null}
        <View style={[styles.playBadge, {backgroundColor: palette.accent}]}>
          <Text style={[styles.playGlyph, {color: palette.onAccent}]}>
            {'\u25B6'}
          </Text>
        </View>
      </View>
      <View style={styles.caption}>
        {video.title ? (
          <Text
            style={[styles.captionTitle, {color: palette.text}]}
            numberOfLines={2}>
            {video.title}
          </Text>
        ) : null}
        <Text style={[styles.captionHint, {color: palette.textSecondary}]}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Tappable stand-ins for the players stripped out of the article body.
 * Tapping hands off to the YouTube app or the browser — nothing plays
 * in-app. Renders nothing when the article has no embeds.
 */
export function ArticleVideoEmbeds({videos, palette}: Props): React.JSX.Element | null {
  if (!videos || videos.length === 0) {
    return null;
  }
  return (
    <View style={styles.list}>
      {videos.map(video => (
        <ArticleVideoCard key={video.key} video={video} palette={palette} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {marginTop: 18, gap: 12},
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    /** Shows through until (or unless) the poster frame decodes. */
    backgroundColor: '#101314',
  },
  playBadge: {
    width: 58,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlyph: {
    fontSize: 18,
    /** Optical centering: the glyph's bounding box leans left. */
    marginLeft: 2,
  },
  caption: {paddingHorizontal: 12, paddingVertical: 10, gap: 3},
  captionTitle: {fontSize: scaleFont(14), fontWeight: '700'},
  captionHint: {fontSize: scaleFont(12), fontWeight: '600'},
});
