import {Linking, Platform} from 'react-native';
import {openArticleVideo, youTubeAppUrl} from '../src/linking/videoLinks';
import {toArticleVideo, type ArticleVideo} from '../src/scrape/articleVideos';

/** `Platform.OS` is a plain field on the module object, so tests can swap it. */
const platform = Platform as {OS: string};
const REAL_OS = Platform.OS;

function video(url: string): ArticleVideo {
  const parsed = toArticleVideo(url);
  if (!parsed) {
    throw new Error(`Expected ${url} to parse as a video`);
  }
  return parsed;
}

const YOUTUBE = () => video('https://www.youtube.com/embed/4_4OKkFJHfw');
const MP4 = () => video('https://cdn.baahrakhari.com/clips/report.mp4');

const canOpenURL = jest.spyOn(Linking, 'canOpenURL');
const openURL = jest.spyOn(Linking, 'openURL');

beforeEach(() => {
  canOpenURL.mockReset().mockResolvedValue(true);
  openURL.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  platform.OS = REAL_OS;
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('youTubeAppUrl', () => {
  it('uses the scheme each platform’s YouTube app registers', () => {
    expect(youTubeAppUrl('4_4OKkFJHfw', 'android')).toBe('vnd.youtube:4_4OKkFJHfw');
    expect(youTubeAppUrl('4_4OKkFJHfw', 'ios')).toBe(
      'youtube://watch?v=4_4OKkFJHfw',
    );
  });
});

describe('openArticleVideo — YouTube app installed', () => {
  it('opens the Android YouTube app', async () => {
    platform.OS = 'android';
    await expect(openArticleVideo(YOUTUBE())).resolves.toBe('youtube-app');
    expect(openURL).toHaveBeenCalledWith('vnd.youtube:4_4OKkFJHfw');
  });

  it('opens the iOS YouTube app', async () => {
    platform.OS = 'ios';
    await expect(openArticleVideo(YOUTUBE())).resolves.toBe('youtube-app');
    expect(openURL).toHaveBeenCalledWith('youtube://watch?v=4_4OKkFJHfw');
  });
});

describe('openArticleVideo — falls back to the browser', () => {
  it('uses the watch page when YouTube is not installed', async () => {
    canOpenURL.mockResolvedValue(false);
    await expect(openArticleVideo(YOUTUBE())).resolves.toBe('browser');
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=4_4OKkFJHfw',
    );
  });

  it('uses the watch page when the scheme is not queryable', async () => {
    canOpenURL.mockRejectedValue(new Error('scheme not declared'));
    await expect(openArticleVideo(YOUTUBE())).resolves.toBe('browser');
    expect(openURL).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=4_4OKkFJHfw',
    );
  });

  it('never probes for an app on non-YouTube videos', async () => {
    await expect(openArticleVideo(MP4())).resolves.toBe('browser');
    expect(canOpenURL).not.toHaveBeenCalled();
    expect(openURL).toHaveBeenCalledWith(
      'https://cdn.baahrakhari.com/clips/report.mp4',
    );
  });

  it('reports failure when nothing can handle the URL', async () => {
    canOpenURL.mockResolvedValue(false);
    openURL.mockRejectedValue(new Error('no handler'));
    await expect(openArticleVideo(YOUTUBE())).resolves.toBe('failed');
  });
});
