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
import {Image, Platform, StyleSheet, Text} from 'react-native';
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
let mockInfo = {
  about: {heading: 'हाम्रो बारेमा', paragraphs: ['बाह्रखरी परिचय']},
  team: {
    heading: 'हाम्रो टिम',
    categories: [] as Array<{
      title: string;
      members: Array<{name: string; role: string; imageUrl?: string}>;
    }>,
  },
  loading: false,
  online: true,
  error: null as string | null,
  refresh: jest.fn(),
};

jest.mock('../src/state/useArticleFeed', () => ({
  useArticleFeed: jest.fn(() => mockFeed),
}));
jest.mock('../src/state/useHomeSections', () => ({
  useHomeSections: jest.fn(() => mockSections),
}));
jest.mock('../src/state/useHomeAds', () => ({
  useHomeAds: jest.fn(() => ({
    ads: {
      'below-breaking-two': null,
      'below-breaking-three': null,
      'below-artha': null,
      'below-khel': null,
      'below-nation': null,
    },
    loading: false,
  })),
}));
jest.mock('../src/state/useReadLater', () => ({
  useReadLater: jest.fn(() => mockSaved),
}));
jest.mock('../src/state/useInfoPages', () => ({
  useInfoPages: jest.fn(() => mockInfo),
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
jest.mock('../src/state/useSiteHeaderDate', () => ({
  useSiteHeaderDate: () => 'बिहीबार, भदौ १८, २०८३',
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
  mockInfo = {
    about: {heading: 'हाम्रो बारेमा', paragraphs: ['बाह्रखरी परिचय']},
    team: {heading: 'हाम्रो टिम', categories: []},
    loading: false,
    online: true,
    error: null,
    refresh: jest.fn(),
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

/** Host-component types under a node, document order (Text before Image, etc.). */
function hostTypeOrder(node: {findAll: (pred: (n: {type: unknown}) => boolean) => Array<{type: unknown}>}): string[] {
  return node
    .findAll(() => true)
    .map(n => n.type)
    .filter((t): t is string => typeof t === 'string');
}

describe('home feed', () => {
  it('lists the ताजा समाचार headlines', async () => {
    await renderApp();

    expect(screen.queryByLabelText('श्रेणी परिवर्तन गर्नुहोस्')).toBeNull();
    expect(screen.getAllByText('ताजा समाचार').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('समाचार 102')).toBeTruthy();
    expect(screen.getByLabelText('समाचार 103')).toBeTruthy();
  });

  it('shows the Nepali header date under the tappable logo', async () => {
    await renderApp();

    expect(screen.getByText('बिहीबार, भदौ १८, २०८३')).toBeTruthy();
    expect(screen.getByLabelText('गृहपृष्ठ')).toBeTruthy();
  });

  it('opens the swipe reader when a ताजा card is tapped, and the logo returns home', async () => {
    await renderApp();
    expect(screen.queryByLabelText('Share article')).toBeNull();

    fireEvent.press(screen.getByLabelText('समाचार 102'));

    await waitFor(() =>
      expect(screen.getAllByLabelText('Share article').length).toBeGreaterThan(0),
    );

    fireEvent.press(screen.getByLabelText('गृहपृष्ठ'));

    await waitFor(() => expect(screen.queryByLabelText('Share article')).toBeNull());
    expect(screen.getByLabelText('समाचार 101')).toBeTruthy();
  });

  it('shows a शीर्ष समाचार ribbon and compact headline rows, then opens a story in the reader overlay', async () => {
    mockSections = {
      breaking: [article('900', {title: 'ब्रेकिंग शीर्षक', bodyText: 'ब्रेकिंग पूरा पाठ'})],
      sections: [],
      loading: false,
    };

    await renderApp();

    expect(screen.queryByLabelText('श्रेणी परिवर्तन गर्नुहोस्')).toBeNull();
    expect(screen.getAllByText('शीर्ष समाचार').length).toBeGreaterThan(0);
    expect(screen.queryByText('ब्रेकिंग')).toBeNull();
    expect(screen.getByLabelText('थप शीर्ष समाचार...')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('ब्रेकिंग शीर्षक'));

    await waitFor(() => expect(screen.getByText('ब्रेकिंग पूरा पाठ')).toBeTruthy());
    expect(screen.getByLabelText('Share article')).toBeTruthy();
    expect(screen.getByLabelText('Save article')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Save article'));
    await waitFor(() => expect(mockSaved.toggleSaved).toHaveBeenCalled());
    expect(screen.getByText('ब्रेकिंग पूरा पाठ')).toBeTruthy();
  });

  it('hides the headlines block when the banner feed is empty', async () => {
    await renderApp();

    expect(screen.queryByText('शीर्ष समाचार')).toBeNull();
    expect(screen.queryByLabelText('थप शीर्ष समाचार...')).toBeNull();
  });

  it('caps home headlines at 12 and opens the full list from थप शीर्ष समाचार...', async () => {
    mockSections = {
      breaking: Array.from({length: 14}, (_, i) =>
        article(`9${i}`, {title: `शीर्षक ${i + 1}`}),
      ),
      sections: [],
      loading: false,
    };

    await renderApp();

    expect(screen.getAllByText('शीर्ष समाचार').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('श्रेणी परिवर्तन गर्नुहोस्')).toBeNull();
    expect(screen.getByLabelText('शीर्षक 1')).toBeTruthy();
    expect(screen.getByLabelText('शीर्षक 12')).toBeTruthy();
    expect(screen.queryByLabelText('शीर्षक 13')).toBeNull();
    expect(screen.getByLabelText('थप शीर्ष समाचार...')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('थप शीर्ष समाचार...'));

    await waitFor(() => expect(screen.getByLabelText('शीर्षक 13')).toBeTruthy());
    expect(screen.getByLabelText('शीर्षक 14')).toBeTruthy();
    expect(screen.getAllByText('शीर्ष समाचार').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('श्रेणी परिवर्तन गर्नुहोस्')).toBeNull();

    fireEvent.press(screen.getByLabelText('गृहपृष्ठ'));
    await waitFor(() => expect(screen.queryByLabelText('शीर्षक 13')).toBeNull());
  });

  it('has no share icon on home headlines and saves on long-press', async () => {
    mockSections = {
      breaking: [article('900', {title: 'ब्रेकिंग शीर्षक'})],
      sections: [],
      loading: false,
    };

    await renderApp();
    expect(screen.queryByLabelText('Share ब्रेकिंग शीर्षक')).toBeNull();
    fireEvent(screen.getByLabelText('ब्रेकिंग शीर्षक'), 'longPress');

    await waitFor(() => expect(mockSaved.toggleSaved).toHaveBeenCalled());
    expect(mockSaved.toggleSaved).toHaveBeenCalledWith(
      expect.objectContaining({id: '900', title: 'ब्रेकिंग शीर्षक'}),
    );
    await waitFor(() => expect(screen.getByText('सुरक्षित भयो')).toBeTruthy());
    const headlineTitle = screen
      .getByLabelText('ब्रेकिंग शीर्षक')
      .findAllByType(Text)[0];
    expect(StyleSheet.flatten(headlineTitle.props.style).textAlign).toBe('center');
    const ribbon = screen.getAllByText('शीर्ष समाचार')[0];
    expect(StyleSheet.flatten(ribbon.props.style).textAlign).toBe('center');
  });

  it('confirms an already-saved headline instead of unsaving', async () => {
    mockSections = {
      breaking: [article('900', {title: 'ब्रेकिंग शीर्षक'})],
      sections: [],
      loading: false,
    };
    mockSaved = {
      ...mockSaved,
      isSaved: () => true,
    };

    await renderApp();
    fireEvent(screen.getByLabelText('ब्रेकिंग शीर्षक'), 'longPress');

    await waitFor(() => expect(screen.getByText('पहिले नै सुरक्षित छ')).toBeTruthy());
    expect(mockSaved.toggleSaved).not.toHaveBeenCalled();
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
    expect(screen.getByLabelText('श्रेणी परिवर्तन गर्नुहोस्')).toBeTruthy();
    expect(screen.getByText('राजनीति')).toBeTruthy();
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
    expect(screen.getByLabelText('श्रेणी परिवर्तन गर्नुहोस्')).toBeTruthy();
    expect(screen.getByText('खेल')).toBeTruthy();
  });

  it('uses the drawer logo as Home and has no extra ताजा समाचार row', async () => {
    mockSections = {
      breaking: [article('900', {title: 'ब्रेकिंग शीर्षक'})],
      sections: [],
      loading: false,
    };
    await renderApp();
    fireEvent.press(screen.getByLabelText('थप शीर्ष समाचार...'));
    await waitFor(() =>
      expect(screen.getAllByText('शीर्ष समाचार').length).toBeGreaterThan(0),
    );

    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() => expect(screen.getByLabelText('मेनु बन्द गर्नुहोस्')).toBeTruthy());
    expect(screen.queryByLabelText('बन्द गर्नुहोस्')).toBeNull();
    expect(screen.queryByLabelText('ताजा समाचार')).toBeNull();

    const homeMarks = screen.getAllByLabelText('गृहपृष्ठ');
    fireEvent.press(homeMarks[homeMarks.length - 1]);
    await settleAnimations();

    await waitFor(() => expect(screen.getByLabelText('समाचार 101')).toBeTruthy());
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
    await waitFor(() => expect(screen.getByLabelText('मेनु बन्द गर्नुहोस्')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('मेनु बन्द गर्नुहोस्'));

    await settleAnimations();
    expect(useArticleFeedMock.mock.calls.slice(callsBefore).flat()).not.toContain(
      'sport',
    );
  });

  it('places saved under the logo and pins theme after categories', async () => {
    await renderApp();

    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() => expect(screen.getByLabelText('सुरक्षित लेखहरू')).toBeTruthy());

    const labels = screen
      .getAllByRole('button')
      .map(node => node.props.accessibilityLabel)
      .filter((label): label is string => typeof label === 'string');
    expect(labels.indexOf('Dark theme')).toBeGreaterThan(labels.indexOf('विदेश'));
    expect(labels.indexOf('Dark theme')).toBeGreaterThan(labels.indexOf('हाम्रो टिम'));
    expect(labels.indexOf('पछिल्ला')).toBeGreaterThan(labels.indexOf('सुरक्षित लेखहरू'));
    expect(labels.indexOf('सम्पर्क गर्नुहोस् / Contact us')).toBeGreaterThan(
      labels.indexOf('पछिल्ला'),
    );

    const themeRowStyle = StyleSheet.flatten(
      screen.getByTestId('drawer-theme-toggle').props.style,
    );
    expect(themeRowStyle.flexDirection).toBe('row');
    expect(themeRowStyle.justifyContent).toBe('flex-end');
    expect(screen.getByText('अँध्यारो मोड')).toBeTruthy();

    const brandImg = screen.getByTestId('drawer-brand').findAllByType(Image)[0];
    const brandStyle = StyleSheet.flatten(brandImg.props.style);
    expect(brandStyle.width).toBeGreaterThan(0);
    expect(brandStyle.height).toBeGreaterThan(0);

    const themeImgs = screen.getByTestId('drawer-theme-toggle').findAllByType(Image);
    expect(themeImgs.length).toBe(1);
    expect(StyleSheet.flatten(themeImgs[0].props.style).width).toBeGreaterThan(0);

    const savedOrder = hostTypeOrder(screen.getByLabelText('सुरक्षित लेखहरू'));
    expect(savedOrder.indexOf('Text')).toBeGreaterThanOrEqual(0);
    expect(savedOrder.indexOf('Image')).toBeGreaterThan(savedOrder.indexOf('Text'));
    const savedImg = screen
      .getByLabelText('सुरक्षित लेखहरू')
      .findAllByType(Image)[0];
    expect(StyleSheet.flatten(savedImg.props.style).width).toBeGreaterThan(20);

    expect(screen.getByText('सम्पर्क गर्नुहोस्')).toBeTruthy();
    expect(screen.getByText('Contact us')).toBeTruthy();
    await settleAnimations();
  });

  it('opens the Team overlay even when categories are empty', async () => {
    await renderApp();

    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() =>
      expect(screen.getAllByLabelText('हाम्रो टिम').length).toBeGreaterThan(0),
    );
    const teamEntries = screen.getAllByLabelText('हाम्रो टिम');
    fireEvent.press(teamEntries[teamEntries.length - 1]);

    await waitFor(() => expect(screen.getByLabelText('ताजा गर्नुहोस्')).toBeTruthy());
    expect(screen.getAllByText('हाम्रो टिम').length).toBeGreaterThan(0);
    await settleAnimations();
  });

  it('shows both names and no chevron when a team section has two members', async () => {
    mockInfo = {
      ...mockInfo,
      team: {
        heading: 'हाम्रो टिम',
        categories: [
          {
            title: 'सम्पादकीय समूह',
            members: [
              {
                name: 'प्रतीक प्रधान',
                role: 'प्रधान सम्पादक',
                imageUrl: 'https://baahrakhari.com/uploads/members/a.jpg',
              },
              {name: 'बलराम पाण्डे', role: 'कार्यकारी सम्पादक'},
            ],
          },
        ],
      },
    };

    await renderApp();
    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() =>
      expect(screen.getAllByLabelText('हाम्रो टिम').length).toBeGreaterThan(0),
    );
    const teamEntries = screen.getAllByLabelText('हाम्रो टिम');
    fireEvent.press(teamEntries[teamEntries.length - 1]);

    await waitFor(() => expect(screen.getByText('प्रतीक प्रधान')).toBeTruthy());
    expect(screen.getByText('बलराम पाण्डे')).toBeTruthy();
    expect(screen.queryByLabelText('सम्पादकीय समूह विस्तृत गर्नुहोस्')).toBeNull();
    expect(screen.getByText('सम्पादकीय समूह')).toBeTruthy();
    await settleAnimations();
  });

  it('starts hamro team sections collapsed until a header is opened', async () => {
    mockInfo = {
      ...mockInfo,
      team: {
        heading: 'हाम्रो टिम',
        categories: [
          {
            title: 'सम्पादकीय समूह',
            members: [
              {name: 'प्रतीक प्रधान', role: 'प्रधान सम्पादक'},
              {name: 'दोश्रो सम्पादक', role: 'सम्पादक'},
              {name: 'तेस्रो सम्पादक', role: 'सह-सम्पादक'},
            ],
          },
          {
            title: 'व्यवस्थापन',
            members: [
              {name: 'ज्ञानेश्वर आचार्य', role: 'प्रबन्ध निर्देशक'},
              {name: 'दोस्रो व्यवस्थापक', role: 'प्रबन्धक'},
              {name: 'तेस्रो व्यवस्थापक', role: 'सहायक'},
            ],
          },
        ],
      },
    };

    await renderApp();
    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() =>
      expect(screen.getAllByLabelText('हाम्रो टिम').length).toBeGreaterThan(0),
    );
    const teamEntries = screen.getAllByLabelText('हाम्रो टिम');
    fireEvent.press(teamEntries[teamEntries.length - 1]);

    await waitFor(() =>
      expect(screen.getByLabelText('सम्पादकीय समूह विस्तृत गर्नुहोस्')).toBeTruthy(),
    );
    expect(screen.getByLabelText('व्यवस्थापन विस्तृत गर्नुहोस्')).toBeTruthy();
    expect(screen.getByText('प्रतीक प्रधान')).toBeTruthy();
    expect(screen.getByText('दोश्रो सम्पादक')).toBeTruthy();
    expect(screen.queryByText('तेस्रो सम्पादक')).toBeNull();
    expect(screen.getByText('ज्ञानेश्वर आचार्य')).toBeTruthy();
    expect(screen.getByText('दोस्रो व्यवस्थापक')).toBeTruthy();
    expect(screen.queryByText('तेस्रो व्यवस्थापक')).toBeNull();

    fireEvent.press(screen.getByLabelText('सम्पादकीय समूह विस्तृत गर्नुहोस्'));
    await waitFor(() => expect(screen.getByText('तेस्रो सम्पादक')).toBeTruthy());
    expect(screen.queryByText('तेस्रो व्यवस्थापक')).toBeNull();

    fireEvent.press(screen.getByLabelText('व्यवस्थापन विस्तृत गर्नुहोस्'));
    await waitFor(() => expect(screen.getByText('तेस्रो व्यवस्थापक')).toBeTruthy());
    expect(screen.getByText('तेस्रो सम्पादक')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('सम्पादकीय समूह संक्षिप्त गर्नुहोस्'));
    await waitFor(() => expect(screen.queryByText('तेस्रो सम्पादक')).toBeNull());
    expect(screen.getByText('प्रतीक प्रधान')).toBeTruthy();
    expect(screen.getByText('तेस्रो व्यवस्थापक')).toBeTruthy();
    await settleAnimations();
  });

  it('renders About and Team overlays when cached content is malformed', async () => {
    mockInfo = {
      ...mockInfo,
      about: {heading: 'हाम्रो बारेमा'} as unknown as (typeof mockInfo)['about'],
      team: {heading: 'हाम्रो टिम', categories: null} as unknown as (typeof mockInfo)['team'],
    };

    await renderApp();
    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() =>
      expect(screen.getAllByLabelText('हाम्रो बारेमा').length).toBeGreaterThan(1),
    );
    fireEvent.press(screen.getAllByLabelText('हाम्रो बारेमा')[1]);
    await waitFor(() => expect(screen.getByText('सामग्री उपलब्ध छैन ।')).toBeTruthy());
    fireEvent.press(screen.getByText('✕'));

    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() =>
      expect(screen.getAllByLabelText('हाम्रो टिम').length).toBeGreaterThan(0),
    );
    const teamEntries = screen.getAllByLabelText('हाम्रो टिम');
    fireEvent.press(teamEntries[teamEntries.length - 1]);
    await waitFor(() => expect(screen.getByText('सामग्री उपलब्ध छैन ।')).toBeTruthy());
    expect(screen.getAllByText('हाम्रो टिम').length).toBeGreaterThan(0);
    await settleAnimations();
  });
});

describe('saved articles', () => {
  it('shows the empty state, then the saved list', async () => {
    await renderApp();

    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() => expect(screen.getByLabelText('सुरक्षित लेखहरू')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('सुरक्षित लेखहरू'));
    await settleAnimations();

    await waitFor(() =>
      expect(screen.getByText('अहिलेसम्म कुनै लेख सुरक्षित गरिएको छैन ।')).toBeTruthy(),
    );

    mockSaved = {
      ...mockSaved,
      saved: [savedArticle('301', {title: 'सुरक्षित लेख'})],
      isSaved: () => true,
    };
    screen.rerender(<App />);
    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() => expect(screen.getByLabelText('सुरक्षित लेखहरू')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('सुरक्षित लेखहरू'));
    await settleAnimations();

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
    expect(screen.queryByLabelText('सम्पर्क गर्नुहोस् / Contact us')).toBeNull();

    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() => {
      expect(screen.getByText('सम्पर्क गर्नुहोस्')).toBeTruthy();
      expect(screen.getByText('Contact us')).toBeTruthy();
      expect(screen.getByLabelText('सम्पर्क गर्नुहोस् / Contact us')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('सम्पर्क गर्नुहोस् / Contact us'));

    await waitFor(() =>
      expect(screen.getByText(APP_PUBLISHER.legalName)).toBeTruthy(),
    );
    await settleAnimations();
  });
});

describe('theme toggle', () => {
  it('sits on the right edge of its drawer row', async () => {
    await renderApp();

    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() => expect(screen.getByTestId('drawer-theme-toggle')).toBeTruthy());

    const style = StyleSheet.flatten(
      screen.getByTestId('drawer-theme-toggle').props.style,
    );
    expect(style.flexDirection).toBe('row');
    expect(style.justifyContent).toBe('flex-end');
    await settleAnimations();
  });

  it('flips between light and dark from the drawer', async () => {
    await renderApp();

    fireEvent.press(screen.getByLabelText('मेनु खोल्नुहोस्'));
    await waitFor(() => expect(screen.getByLabelText('Dark theme')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Dark theme'));

    await waitFor(() => expect(screen.getByLabelText('Light theme')).toBeTruthy());
    await settleAnimations();
  });
});
