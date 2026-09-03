/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-gesture-handler', () => {
  const RN = require('react-native');
  return {
    GestureHandlerRootView: RN.View,
    PinchGestureHandler: RN.View,
    ScrollView: RN.ScrollView,
    State: {},
  };
});

jest.mock('../src/state/useArticleFeed', () => ({
  useArticleFeed: () => ({
    items: [],
    articleById: {},
    loading: false,
    error: null,
    hydrateArticle: jest.fn(),
    prefetchTarget: 12,
    prefetchConcurrency: 2,
    reload: jest.fn(),
  }),
}));

jest.mock('../src/state/useHomeSections', () => ({
  useHomeSections: () => ({
    breaking: [],
    sections: [],
    loading: false,
  }),
}));

jest.mock('../src/state/useReadLater', () => ({
  useReadLater: () => ({
    saved: [],
    loadingSaved: false,
    isSaved: () => false,
    toggleSaved: jest.fn(() => Promise.resolve(false)),
    unsave: jest.fn(() => Promise.resolve()),
    maxSaved: 20,
  }),
}));

jest.mock('../src/state/useInfoPages', () => ({
  useInfoPages: () => ({
    about: undefined,
    team: undefined,
    loading: false,
    online: true,
    error: null,
    refresh: jest.fn(),
  }),
}));

jest.mock('../src/state/useArticleAlerts', () => ({
  useArticleAlerts: () => ({
    loadingAlerts: false,
  }),
}));

jest.mock('../src/state/useSiteHeaderDate', () => ({
  useSiteHeaderDate: () => 'बिहीबार, भदौ १८, २०८३',
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
