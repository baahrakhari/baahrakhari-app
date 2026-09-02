/**
 * Breaking-news alert pipeline.
 *
 * These cover the regression that left users with no notifications at all:
 * the hook used to only *check* an OS permission that nothing ever
 * *requested*, so `notificationsAllowed` was permanently false and
 * `localNotification` was never reached.
 */

import {act, renderHook, waitFor} from '@testing-library/react-native';
import {PermissionsAndroid, Platform} from 'react-native';
import PushNotification from 'react-native-push-notification';
import {fetchBreakingHeadlines, fetchTajaNews} from '../src/scrape/tajaNewsApi';
import {useArticleAlerts} from '../src/state/useArticleAlerts';
import {article, listing} from '../test-utils/fixtures';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  createChannel: jest.fn(),
  localNotification: jest.fn(),
  checkPermissions: jest.fn(),
  requestPermissions: jest.fn(),
}));

jest.mock('../src/scrape/tajaNewsApi', () => ({
  fetchTajaNews: jest.fn(),
  fetchBreakingHeadlines: jest.fn(),
}));

const push = PushNotification as unknown as {
  configure: jest.Mock;
  createChannel: jest.Mock;
  localNotification: jest.Mock;
  checkPermissions: jest.Mock;
  requestPermissions: jest.Mock;
};
const storage = jest.requireMock(
  '@react-native-async-storage/async-storage',
) as {__store: Map<string, string>};
const taja = fetchTajaNews as jest.MockedFunction<typeof fetchTajaNews>;
const breaking = fetchBreakingHeadlines as jest.MockedFunction<
  typeof fetchBreakingHeadlines
>;

/** iOS permission state reported by the native module. */
function iosPermission(granted: boolean) {
  push.checkPermissions.mockImplementation((cb: (p: unknown) => void) =>
    cb({alert: granted, badge: granted, sound: granted}),
  );
}

function tajaFeed(...ids: string[]) {
  taja.mockResolvedValue({listing: listing(...ids), articlesById: {}});
}

function breakingFeed(...ids: string[]) {
  breaking.mockResolvedValue(ids.map(id => article(id)));
}

/** Renders the hook and waits for the initial permission + poll pass. */
async function renderAlerts() {
  const onOpenArticle = jest.fn();
  const view = renderHook(() => useArticleAlerts({onOpenArticle}));
  await waitFor(() => expect(view.result.current.loadingAlerts).toBe(false));
  return {...view, onOpenArticle};
}

beforeEach(() => {
  jest.clearAllMocks();
  storage.__store.clear();
  iosPermission(false);
  push.requestPermissions.mockResolvedValue({
    alert: true,
    badge: true,
    sound: true,
  });
  tajaFeed();
  breakingFeed();
});

describe('permission handling', () => {
  it('asks iOS for permission on first launch instead of only checking it', async () => {
    const {result} = await renderAlerts();

    await waitFor(() => expect(push.requestPermissions).toHaveBeenCalled());
    await waitFor(() =>
      expect(result.current.notificationsAllowed).toBe(true),
    );
  });

  it('does not ask again when the OS already granted it', async () => {
    iosPermission(true);

    const {result} = await renderAlerts();

    await waitFor(() =>
      expect(result.current.notificationsAllowed).toBe(true),
    );
    expect(push.requestPermissions).not.toHaveBeenCalled();
  });

  it('stays disabled and silent when the user denies', async () => {
    push.requestPermissions.mockResolvedValue({
      alert: false,
      badge: false,
      sound: false,
    });
    tajaFeed('1', '2');

    const {result} = await renderAlerts();

    await waitFor(() => expect(push.requestPermissions).toHaveBeenCalled());
    expect(result.current.notificationsAllowed).toBe(false);
    await act(async () => {
      await result.current.checkNow();
    });
    expect(taja).not.toHaveBeenCalled();
    expect(push.localNotification).not.toHaveBeenCalled();
  });

  it('creates the Android notification channel before notifying', async () => {
    await renderAlerts();

    expect(push.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({channelId: 'baahrakhari-news-alerts'}),
      expect.any(Function),
    );
  });

  describe('on Android', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'android');
      jest
        .spyOn(PermissionsAndroid, 'check')
        .mockResolvedValue(false as unknown as boolean);
      jest
        .spyOn(PermissionsAndroid, 'request')
        .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
    });

    it('requests POST_NOTIFICATIONS on API 33+', async () => {
      jest.spyOn(Platform, 'Version', 'get').mockReturnValue(36 as never);

      const {result} = await renderAlerts();

      await waitFor(() =>
        expect(PermissionsAndroid.request).toHaveBeenCalledWith(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        ),
      );
      await waitFor(() =>
        expect(result.current.notificationsAllowed).toBe(true),
      );
    });

    it('treats pre-Android-13 as already granted without prompting', async () => {
      jest.spyOn(Platform, 'Version', 'get').mockReturnValue(31 as never);

      const {result} = await renderAlerts();

      await waitFor(() =>
        expect(result.current.notificationsAllowed).toBe(true),
      );
      expect(PermissionsAndroid.request).not.toHaveBeenCalled();
    });
  });
});

describe('new-article detection', () => {
  beforeEach(() => {
    iosPermission(true);
  });

  it('seeds the first poll silently so install does not spam the feed', async () => {
    tajaFeed('1', '2', '3');
    breakingFeed('9');

    await renderAlerts();

    await waitFor(() => expect(taja).toHaveBeenCalled());
    expect(push.localNotification).not.toHaveBeenCalled();
  });

  it('notifies when a breaking headline appears', async () => {
    tajaFeed('1');
    breakingFeed('9');
    const {result} = await renderAlerts();
    await waitFor(() => expect(breaking).toHaveBeenCalled());

    breakingFeed('99', '9');
    await act(async () => {
      await result.current.checkNow();
    });

    expect(push.localNotification).toHaveBeenCalledTimes(1);
    expect(push.localNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: 'baahrakhari-news-alerts',
        title: 'ब्रेकिंग समाचार',
        message: 'समाचार 99',
        userInfo: {url: 'https://baahrakhari.com/detail/99'},
      }),
    );
  });

  it('notifies for a plain new article when nothing is breaking', async () => {
    tajaFeed('1');
    breakingFeed('9');
    const {result} = await renderAlerts();
    await waitFor(() => expect(taja).toHaveBeenCalled());

    tajaFeed('42', '1');
    await act(async () => {
      await result.current.checkNow();
    });

    expect(push.localNotification).toHaveBeenCalledWith(
      expect.objectContaining({title: 'नयाँ समाचार', message: 'समाचार 42'}),
    );
  });

  it('prefers the breaking item when both feeds have something new', async () => {
    tajaFeed('1');
    breakingFeed('9');
    const {result} = await renderAlerts();
    await waitFor(() => expect(taja).toHaveBeenCalled());

    tajaFeed('42', '1');
    breakingFeed('99', '9');
    await act(async () => {
      await result.current.checkNow();
    });

    expect(push.localNotification).toHaveBeenCalledTimes(1);
    expect(push.localNotification).toHaveBeenCalledWith(
      expect.objectContaining({title: 'ब्रेकिंग समाचार', message: 'समाचार 99'}),
    );
  });

  it('sends one alert per poll even when several articles are new', async () => {
    tajaFeed('1');
    const {result} = await renderAlerts();
    await waitFor(() => expect(taja).toHaveBeenCalled());

    tajaFeed('44', '43', '42', '1');
    await act(async () => {
      await result.current.checkNow();
    });

    expect(push.localNotification).toHaveBeenCalledTimes(1);
    expect(push.localNotification).toHaveBeenCalledWith(
      expect.objectContaining({message: 'समाचार 44'}),
    );
  });

  it('never repeats an article it has already announced', async () => {
    tajaFeed('1');
    const {result} = await renderAlerts();
    await waitFor(() => expect(taja).toHaveBeenCalled());

    tajaFeed('42', '1');
    await act(async () => {
      await result.current.checkNow();
    });
    await act(async () => {
      await result.current.checkNow();
    });
    await act(async () => {
      await result.current.checkNow();
    });

    expect(push.localNotification).toHaveBeenCalledTimes(1);
  });

  it('remembers announced articles across an app restart', async () => {
    tajaFeed('1');
    const first = await renderAlerts();
    await waitFor(() => expect(taja).toHaveBeenCalled());
    tajaFeed('42', '1');
    await act(async () => {
      await first.result.current.checkNow();
    });
    expect(push.localNotification).toHaveBeenCalledTimes(1);
    first.unmount();

    push.localNotification.mockClear();
    const second = await renderAlerts();
    await waitFor(() =>
      expect(second.result.current.notificationsAllowed).toBe(true),
    );
    await act(async () => {
      await second.result.current.checkNow();
    });

    expect(push.localNotification).not.toHaveBeenCalled();
  });

  it('does not seed (or burst) when both feeds are unreachable', async () => {
    taja.mockRejectedValue(new Error('offline'));
    breaking.mockRejectedValue(new Error('offline'));

    const {result} = await renderAlerts();
    await waitFor(() => expect(taja).toHaveBeenCalled());
    expect(push.localNotification).not.toHaveBeenCalled();

    /** Back online: this poll must seed, not announce the whole backlog. */
    tajaFeed('3', '2', '1');
    breakingFeed();
    await act(async () => {
      await result.current.checkNow();
    });

    expect(push.localNotification).not.toHaveBeenCalled();
  });

  it('keeps polling on the background interval', async () => {
    jest.useFakeTimers();
    try {
      tajaFeed('1');
      const view = renderHook(() => useArticleAlerts());
      await waitFor(() => expect(taja).toHaveBeenCalledTimes(1));

      tajaFeed('42', '1');
      await act(async () => {
        jest.advanceTimersByTime(3 * 60 * 1000);
      });

      await waitFor(() => expect(push.localNotification).toHaveBeenCalled());
      view.unmount();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('notification taps', () => {
  it('deep-links into the tapped article', async () => {
    iosPermission(true);
    const {onOpenArticle} = await renderAlerts();

    const {onNotification} = push.configure.mock.calls[0][0];
    act(() => {
      onNotification({
        userInteraction: true,
        userInfo: {url: 'https://baahrakhari.com/detail/77'},
      });
    });

    expect(onOpenArticle).toHaveBeenCalledWith(
      'https://baahrakhari.com/detail/77',
    );
  });

  it('ignores a notification that was merely delivered, not tapped', async () => {
    iosPermission(true);
    const {onOpenArticle} = await renderAlerts();

    const {onNotification} = push.configure.mock.calls[0][0];
    act(() => {
      onNotification({
        userInteraction: false,
        userInfo: {url: 'https://baahrakhari.com/detail/77'},
      });
    });

    expect(onOpenArticle).not.toHaveBeenCalled();
  });
});
