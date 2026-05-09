import React, {useEffect} from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type {Article} from '../src/types/article';
import {useReadLater} from '../src/state/useReadLater';

type Store = Map<string, string>;

const mockStore: Store = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
}));

function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function HookHarness({
  onUpdate,
}: {
  onUpdate: (state: ReturnType<typeof useReadLater>) => void;
}) {
  const state = useReadLater();
  useEffect(() => {
    onUpdate(state);
  }, [onUpdate, state]);
  return null;
}

function sampleArticle(id: string): Article {
  return {
    id,
    url: `https://www.baahrakhari.com/news/${id}`,
    title: `समाचार ${id}`,
    author: 'परीक्षण लेखक',
    imageUrl: 'https://example.com/image.jpg',
    bodyText: `यो परीक्षण लेख ${id} हो ।`,
    fetchedAt: Date.now(),
  };
}

function expectState(
  state: ReturnType<typeof useReadLater> | null,
): ReturnType<typeof useReadLater> {
  if (!state) {
    throw new Error('Expected read-later state to be initialized');
  }
  return state;
}

describe('useReadLater persistence', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
  });

  it('persists saved articles across unmount/remount', async () => {
    let latest: ReturnType<typeof useReadLater> | null = null;
    const onUpdate = (state: ReturnType<typeof useReadLater>) => {
      latest = state;
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<HookHarness onUpdate={onUpdate} />);
      await flush();
    });
    await ReactTestRenderer.act(async () => {
      await flush();
    });

    const initial = expectState(latest);
    const first = sampleArticle('a1');
    await ReactTestRenderer.act(async () => {
      await initial.toggleSaved(first);
      await flush();
    });

    const afterSave = expectState(latest);
    expect(afterSave.saved).toHaveLength(1);
    expect(afterSave.saved[0]?.bodyText).toContain('परीक्षण लेख');

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
      await flush();
    });

    latest = null;
    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(<HookHarness onUpdate={onUpdate} />);
      await flush();
    });

    const afterRemount = expectState(latest);
    expect(afterRemount.saved).toHaveLength(1);
    expect(afterRemount.saved[0]?.id).toBe('a1');
    expect(afterRemount.saved[0]?.bodyText).toContain('परीक्षण लेख');
  });

  it('keeps only the newest 20 saved articles', async () => {
    let latest: ReturnType<typeof useReadLater> | null = null;
    const onUpdate = (state: ReturnType<typeof useReadLater>) => {
      latest = state;
    };

    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(<HookHarness onUpdate={onUpdate} />);
      await flush();
    });

    for (let i = 1; i <= 22; i += 1) {
      const state = expectState(latest);
      await ReactTestRenderer.act(async () => {
        await state.toggleSaved(sampleArticle(`id-${i}`));
        await flush();
      });
    }

    const finalState = expectState(latest);
    expect(finalState.saved).toHaveLength(20);
    expect(finalState.saved.some(item => item.id === 'id-1')).toBe(false);
    expect(finalState.saved.some(item => item.id === 'id-2')).toBe(false);
    expect(finalState.saved[0]?.id).toBe('id-22');
  });

  it('unsave removes one article by id', async () => {
    let latest: ReturnType<typeof useReadLater> | null = null;
    const onUpdate = (state: ReturnType<typeof useReadLater>) => {
      latest = state;
    };

    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(<HookHarness onUpdate={onUpdate} />);
      await flush();
    });

    await ReactTestRenderer.act(async () => {
      await expectState(latest).toggleSaved(sampleArticle('keep'));
      await flush();
    });
    await ReactTestRenderer.act(async () => {
      await expectState(latest).toggleSaved(sampleArticle('drop'));
      await flush();
    });

    expect(expectState(latest).saved.map(a => a.id)).toEqual(['drop', 'keep']);

    await ReactTestRenderer.act(async () => {
      await expectState(latest).unsave('drop');
      await flush();
    });

    const after = expectState(latest);
    expect(after.saved).toHaveLength(1);
    expect(after.saved[0]?.id).toBe('keep');
    expect(after.isSaved('drop')).toBe(false);
  });
});
