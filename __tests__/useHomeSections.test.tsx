/**
 * Home screen data assembly: the ब्रेकिंग strip (`getBannerDatas`) plus the
 * curated category previews (`getCategoryList`).
 */

import {renderHook, waitFor} from '@testing-library/react-native';
import {fetchBreakingHeadlines, fetchCategoryList} from '../src/scrape/tajaNewsApi';
import {useHomeSections} from '../src/state/useHomeSections';
import {article, articlesById, listing} from '../test-utils/fixtures';

jest.mock('../src/scrape/tajaNewsApi', () => ({
  fetchBreakingHeadlines: jest.fn(),
  fetchCategoryList: jest.fn(),
}));

const breaking = fetchBreakingHeadlines as jest.MockedFunction<
  typeof fetchBreakingHeadlines
>;
const categoryList = fetchCategoryList as jest.MockedFunction<
  typeof fetchCategoryList
>;

beforeEach(() => {
  jest.clearAllMocks();
  breaking.mockResolvedValue([]);
  categoryList.mockResolvedValue({listing: [], articlesById: {}});
});

it('exposes breaking headlines and the four preview categories', async () => {
  breaking.mockResolvedValue([article('900'), article('901')]);
  categoryList.mockImplementation(async slug => ({
    listing: listing(`${slug}-1`, `${slug}-2`),
    articlesById: articlesById(`${slug}-1`, `${slug}-2`),
  }));

  const {result} = renderHook(() => useHomeSections());

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.breaking.map(item => item.id)).toEqual(['900', '901']);
  expect(result.current.sections.map(section => section.slug)).toEqual([
    'politics',
    'economy',
    'sport',
    'opinion',
  ]);
  expect(result.current.sections[0].label).toBe('राजनीति');
  expect(result.current.sections[0].items.map(item => item.id)).toEqual([
    'politics-1',
    'politics-2',
  ]);
});

it('caps each preview section at four articles', async () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  categoryList.mockResolvedValue({
    listing: listing(...ids),
    articlesById: articlesById(...ids),
  });

  const {result} = renderHook(() => useHomeSections());

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.sections[0].items).toHaveLength(4);
});

it('degrades to an empty strip when the banner feed fails', async () => {
  breaking.mockRejectedValue(new Error('banner api down'));
  categoryList.mockResolvedValue({
    listing: listing('x'),
    articlesById: articlesById('x'),
  });

  const {result} = renderHook(() => useHomeSections());

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.breaking).toEqual([]);
  expect(result.current.sections[0].items.map(item => item.id)).toEqual(['x']);
});

it('drops listing rows that have no hydrated article', async () => {
  categoryList.mockResolvedValue({
    listing: listing('present', 'missing'),
    articlesById: articlesById('present'),
  });

  const {result} = renderHook(() => useHomeSections());

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.sections[0].items.map(item => item.id)).toEqual([
    'present',
  ]);
});
