import {
  extractArticleVideos,
  isVideoUrl,
  parseYouTubeId,
} from '../src/scrape/articleVideos';
import {mapTajaApiItem} from '../src/scrape/tajaNewsApi';

/**
 * Verbatim from `getTajaNews` (post 497711) — the shape baahrakhari.com's
 * CMS actually emits for a YouTube embed.
 */
const LIVE_EMBED_HTML = `
<p style="text-align: justify;">काठमाडौं । वृत्तचित्र ‘रोड टु एभरेस्ट’को ट्रेलर सार्वजनिक गरिएको छ ।</p>

<p style="text-align: justify;"><iframe allow="accelerometer; autoplay" allowfullscreen="true" frameborder="0" height="625" referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube.com/embed/4_4OKkFJHfw" title="ROAD TO EVEREST | Official Trailer" width="1491" style="max-width:100%;"></iframe></p>
`;

describe('parseYouTubeId', () => {
  it.each([
    ['https://www.youtube.com/embed/4_4OKkFJHfw', '4_4OKkFJHfw'],
    ['https://www.youtube-nocookie.com/embed/4_4OKkFJHfw', '4_4OKkFJHfw'],
    ['https://www.youtube.com/watch?v=4_4OKkFJHfw&t=30s', '4_4OKkFJHfw'],
    ['https://www.youtube.com/watch?app=desktop&v=4_4OKkFJHfw', '4_4OKkFJHfw'],
    ['https://youtu.be/4_4OKkFJHfw?si=abc', '4_4OKkFJHfw'],
    ['https://www.youtube.com/shorts/4_4OKkFJHfw', '4_4OKkFJHfw'],
    ['https://www.youtube.com/live/4_4OKkFJHfw', '4_4OKkFJHfw'],
    ['https://www.youtube.com/v/4_4OKkFJHfw', '4_4OKkFJHfw'],
  ])('reads the id out of %s', (url, id) => {
    expect(parseYouTubeId(url)).toBe(id);
  });

  it('decodes HTML-escaped query separators', () => {
    expect(
      parseYouTubeId('https://www.youtube.com/watch?list=PL1&amp;v=4_4OKkFJHfw'),
    ).toBe('4_4OKkFJHfw');
  });

  it.each([
    'https://www.youtube.com/channel/UCswjHGDAfchSHs7gcxwdZNw',
    'https://baahrakhari.com/detail/497711',
    '',
    undefined,
  ])('returns undefined for %s', url => {
    expect(parseYouTubeId(url)).toBeUndefined();
  });
});

describe('isVideoUrl', () => {
  it.each([
    'https://youtu.be/4_4OKkFJHfw',
    'https://player.vimeo.com/video/76979871',
    'https://www.dailymotion.com/video/x8abcd',
    'https://cdn.baahrakhari.com/clips/report.mp4',
    'https://cdn.baahrakhari.com/live/stream.m3u8?token=1',
  ])('accepts %s', url => {
    expect(isVideoUrl(url)).toBe(true);
  });

  it.each([
    'https://baahrakhari.com/detail/497711',
    'https://www.facebook.com/baahrakhari',
    'https://baahrakhari.com/img/497711.jpg',
  ])('rejects %s', url => {
    expect(isVideoUrl(url)).toBe(false);
  });
});

describe('extractArticleVideos', () => {
  it('pulls the YouTube player out of a real article body', () => {
    const videos = extractArticleVideos(LIVE_EMBED_HTML);
    expect(videos).toHaveLength(1);
    expect(videos[0]).toEqual({
      key: 'yt:4_4OKkFJHfw',
      provider: 'youtube',
      webUrl: 'https://www.youtube.com/watch?v=4_4OKkFJHfw',
      youtubeId: '4_4OKkFJHfw',
      thumbnailUrl: 'https://img.youtube.com/vi/4_4OKkFJHfw/hqdefault.jpg',
      title: 'ROAD TO EVEREST | Official Trailer',
    });
  });

  it('finds anchors, bare links, and <video> tags', () => {
    const videos = extractArticleVideos(`
      <p><a href="https://youtu.be/aaaaaaaaaaa">पूरा भिडियो</a></p>
      <p>हेर्नुहोस्: https://www.youtube.com/watch?v=bbbbbbbbbbb</p>
      <video controls title="घटनास्थलको दृश्य"><source src="https://cdn.baahrakhari.com/clips/c.mp4" type="video/mp4"></video>
    `);
    expect(videos.map(v => v.webUrl)).toEqual([
      'https://www.youtube.com/watch?v=aaaaaaaaaaa',
      'https://www.youtube.com/watch?v=bbbbbbbbbbb',
      'https://cdn.baahrakhari.com/clips/c.mp4',
    ]);
    expect(videos[0].title).toBe('पूरा भिडियो');
    expect(videos[2].provider).toBe('other');
    expect(videos[2].title).toBe('घटनास्थलको दृश्य');
    /** Only YouTube gives us a poster frame without a network call. */
    expect(videos[2].thumbnailUrl).toBeUndefined();
  });

  it('reports one entry when the same video is embedded and linked', () => {
    const videos = extractArticleVideos(`
      <iframe src="https://www.youtube.com/embed/4_4OKkFJHfw" title="ट्रेलर"></iframe>
      <p><a href="https://youtu.be/4_4OKkFJHfw">https://youtu.be/4_4OKkFJHfw</a></p>
    `);
    expect(videos).toHaveLength(1);
    expect(videos[0].title).toBe('ट्रेलर');
  });

  it('ignores non-video iframes and plain site links', () => {
    const videos = extractArticleVideos(`
      <iframe src="https://ads.example.com/banner.html" title="विज्ञापन"></iframe>
      <p><a href="https://www.youtube.com/channel/UCswjHGDAfchSHs7gcxwdZNw">हाम्रो च्यानल</a></p>
      <p><a href="https://baahrakhari.com/detail/497711">सम्बन्धित समाचार</a></p>
    `);
    expect(videos).toEqual([]);
  });

  it.each([undefined, null, '', '   '])('returns [] for %p', html => {
    expect(extractArticleVideos(html)).toEqual([]);
  });
});

describe('mapTajaApiItem', () => {
  it('attaches embedded videos and keeps the body plain text', () => {
    const article = mapTajaApiItem({
      id: 497711,
      title: 'ट्रेलर सार्वजनिक',
      content: LIVE_EMBED_HTML,
    });
    expect(article.videos?.map(v => v.youtubeId)).toEqual(['4_4OKkFJHfw']);
    expect(article.bodyText).not.toContain('iframe');
    expect(article.bodyText).toContain('रोड टु एभरेस्ट');
  });

  it('leaves videos unset when the body has no embeds', () => {
    const article = mapTajaApiItem({
      id: 1,
      title: 'सामान्य समाचार',
      content: '<p>कुनै भिडियो छैन ।</p>',
    });
    expect(article.videos).toBeUndefined();
  });
});
