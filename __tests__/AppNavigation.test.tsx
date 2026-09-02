/**
 * Screen-level navigation: home list → reader, burger-menu category
 * switching, saved articles, Contact Us (Android front page vs iOS drawer),
 * the breaking strip, and the About/Team overlay.
 *
 * Every network-backed hook is mocked so the suite exercises transitions
 * rather than the feed pipeline.
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';
import {Platform} from 'react-native';
import App from '../App';
import {APP_PUBLISHER} from '../src/config/site';
import type {Article} from '../src/types/article';
import {article, feedState, savedArticle} from '../test-utils/fixtures';

let mockFeed = feedState();
let mockSections: {
  breaking: Article[];
  sections: Array<{slug: string; label: string; items: Article[]}>;
  loading: boolean;
} = {breaking: [], sections: [], loading: false};
let mockSaved = {
  saved: [] as ReturnType<typeof savedArticle>[],
  loadingSaved: false,
  isSaved: () => false,
  toggleSaved: jest.fn(async () => false),
  unsave: jest.fn(async () => {}),
  maxSaved: 20,
};

jest.mock('../src/state/useArticleFeed', () => ({
  useArticleFeed: jest.fn(() => mockFeed),
}));
jest.mock('../src/state/useHomeSections', () => ({
  useHomeSections: jest.fn(() => mockSections),
}));
jest.mock('../src/state/useReadLater', () => ({
  useReadLater: jest.fn(() => mockSaved),
}));
jest.mock('../src/state/useInfoPages', () => ({
  useInfoPages: jest.fn(() => ({
    about: {heading: 'हाम्रो बारेमा', paragraphs: ['बाह्रखरी परिचय']},
    team: {categories: []},
    loading: false,
    online: true,
    error: null,
    refresh: jest.fn(),
  })),
}));
jest.mock('../src/state/useArticleAlerts', () => ({
  useArticleAlerts: jest.fn(() => ({
    loadingAlerts: false,
    notificationsAllowed: true,
    requestPermission: jest.fn(async () => true),
    checkNow: jest.fn(async () => {}),
  })),
}));
jest.mock('../src/scrape/tajaNewsApi', () => ({
  fetchNewsDetail: jest.fn(async () => null),
}));

const useArticleFeedMock = jest.requireMock('../src/state/useArticleFeed')
  .useArticleFeed as jest.Mock;

const HOME_ARTICLES = [article('101'), article('102'), article('103')];

/** Renders the app and waits for the home list to settle. */
async function renderApp() {
  const view = render(<App />);
  await waitFor(() => expect(screen.getByLabelText('समाचार 101')).toBeTruthy());
  return view;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFeed = feedState(HOME_ARTICLES);
  mockSections = {breaking: [], sections: [], loading: false};
  mockSaved = {
    saved: [],
    loadingSaved: false,
    isSaved: () => false,
    toggleSaved: jest.fn(async () => false),
    unsave: jest.fn(async () => {}),
    maxSaved: 20,
  };
});

/** Undoes the per-test `Platform.OS` swaps so suites stay independent. */
afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * Lets the drawer's slide animation land inside `act`. Its completion
 * callback flips state, which React otherwise flags after the test ends.
 */
function settleAnimations() {
  return act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 50));
  });
}

describe('home feed', () => {
  it('lists the ताजा समाचार headlines', async () => {
    await renderApp();

    expect(screen.getAllByText('ताजा समाचार').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('समाचार 102')).toBeTruthy();
    expect(screen.getByLabelText('समाचार 103')).toBeTruthy();
  });

  it('opens the swipe reader when a headline is tapped, and the home icon returns', async () => {
    await renderApp();
    expect(screen.queryByLabelText('Share article')).toBeNull();

    fireEvent.press(screen.getByLabelText('समाचार 102'));

    await waitFor(() =>
      expect(screen.getAllByLabelText('Share article').length).toBeGreaterThan(0),
    );

    fireEvent.press(screen.getByText('⌂'));

    await waitFor(() => expect(screen.queryByLabelText('Share article')).toBeNull());
    expect(screen.getByLabelText('समाचार 101')).toBeTruthy();
  });

  it('shows the breaking strip and opens a breaking story in the reader overlay', async () => {
    mockSections = {
      breaking: [article('900', {title: 'ब्रेकिंग शीर्षक', bodyText: 'ब्रेकिंग पूरा पाठ'})],
      sections: [],
      loading: false,
    };

    await renderApp();

    expect(screen.getByText('ब्रेकिंग')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('ब्रेकिंग शीर्षक'));

    await waitFor(() => expect(screen.getByText('ब्रेकिंग पूरा पाठ')).toBeTruthy());
  });

  it('hides the breaking strip when the banner feed is empty', async () => {
    await renderApp();

    expect(screen.queryByText('ब्रेकिंग')).toBeNull();
  });

  it('switches category from a home section "सबै हेर्नुहोस्" link', async () => {
    mockSections = {
      breaking: [],
      sections: [{slug: 'politics', label: 'राजनीति', items: [article('201')]}],
      loading: false,
    };

    await renderApp();

    fireEvent.press(screen.getByLabelText('राजनीति — सबै हेर्नुहोस्'));

    await waitFor(() =>
      expect(useArticleFeedMock).toHaveBeenLastCalledWith('politics'),
    );
  });
});

describe('burger menu', () => {
  it('opens the drawer and switches category', async () => {
    await renderApp();

    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() => expect(screen.getByLabelText('खेल')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('खेल'));

    await waitFor(() => expect(useArticleFeedMock).toHaveBeenLastCalledWith('sport'));
    await settleAnimations();
  });

  it('opens the About overlay', async () => {
    await renderApp();

    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() =>
      expect(screen.getAllByLabelText('हाम्रो बारेमा')).toHaveLength(2),
    );

    /** The home footer link renders first; the drawer entry is the later one. */
    const drawerEntry = screen.getAllByLabelText('हाम्रो बारेमा')[1];
    fireEvent.press(drawerEntry);

    await waitFor(() => expect(screen.getByText('बाह्रखरी परिचय')).toBeTruthy());
    await settleAnimations();
  });

  it('closes without changing the category', async () => {
    await renderApp();
    const callsBefore = useArticleFeedMock.mock.calls.length;

    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() => expect(screen.getByLabelText('बन्द गर्नुहोस्')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('बन्द गर्नुहोस्'));

    await settleAnimations();
    expect(useArticleFeedMock.mock.calls.slice(callsBefore).flat()).not.toContain(
      'sport',
    );
  });
});

describe('saved articles', () => {
  it('shows the empty state, then the saved list', async () => {
    await renderApp();

    fireEvent.press(screen.getByLabelText('Read later list'));
    await waitFor(() =>
      expect(screen.getByText('अहिलेसम्म कुनै लेख सुरक्षित गरिएको छैन ।')).toBeTruthy(),
    );

    mockSaved = {
      ...mockSaved,
      saved: [savedArticle('301', {title: 'सुरक्षित लेख'})],
      isSaved: () => true,
    };
    screen.rerender(<App />);
    fireEvent.press(screen.getByLabelText('Read later list'));

    await waitFor(() => expect(screen.getByText('सुरक्षित लेख')).toBeTruthy());
    expect(screen.getByText('सुरक्षित लेख: 1/20')).toBeTruthy();
  });
});

describe('Contact Us placement', () => {
  it('is on the Android home footer (Play News policy)', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    await renderApp();

    const link = screen.getByLabelText('Contact Us');
    fireEvent.press(link);

    await waitFor(() =>
      expect(screen.getByText(APP_PUBLISHER.legalName)).toBeTruthy(),
    );
  });

  it('is drawer-only on iOS', async () => {
    await renderApp();

    expect(screen.queryByLabelText('Contact Us')).toBeNull();

    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() => expect(screen.getByLabelText('Contact Us')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Contact Us'));

    await waitFor(() =>
      expect(screen.getByText(APP_PUBLISHER.legalName)).toBeTruthy(),
    );
    await settleAnimations();
  });
});

describe('theme toggle', () => {
  it('flips between light and dark', async () => {
    await renderApp();

    fireEvent.press(screen.getByLabelText('Dark theme'));

    await waitFor(() => expect(screen.getByLabelText('Light theme')).toBeTruthy());
  });
});
