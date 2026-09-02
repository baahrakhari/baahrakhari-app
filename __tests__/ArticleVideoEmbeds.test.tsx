/**
 * The tap target itself: article bodies are plain text, so these cards are
 * the only way a reader reaches an embedded video — and they must hand off
 * to another app rather than play in-place.
 */

import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import React from 'react';
import {Linking} from 'react-native';
import {ArticleVideoEmbeds} from '../src/components/ArticleVideoEmbeds';
import {extractArticleVideos} from '../src/scrape/articleVideos';

const palette = {
  card: '#FFFFFF',
  border: '#E5E5E5',
  text: '#040707',
  textSecondary: '#666666',
  accent: '#ED1C24',
  onAccent: '#FFFFFF',
};

const canOpenURL = jest.spyOn(Linking, 'canOpenURL');
const openURL = jest.spyOn(Linking, 'openURL');

beforeEach(() => {
  canOpenURL.mockReset().mockResolvedValue(true);
  openURL.mockReset().mockResolvedValue(undefined);
});

afterAll(() => {
  jest.restoreAllMocks();
});

it('renders nothing for an article without embeds', () => {
  const {toJSON} = render(
    <ArticleVideoEmbeds videos={undefined} palette={palette} />,
  );
  expect(toJSON()).toBeNull();
});

it('hands a tapped YouTube embed to the YouTube app', async () => {
  const videos = extractArticleVideos(
    '<iframe src="https://www.youtube.com/embed/4_4OKkFJHfw" title="ट्रेलर"></iframe>',
  );
  render(<ArticleVideoEmbeds videos={videos} palette={palette} />);

  fireEvent.press(screen.getByLabelText('ट्रेलर'));

  await waitFor(() =>
    expect(openURL).toHaveBeenCalledWith('youtube://watch?v=4_4OKkFJHfw'),
  );
  expect(screen.getByText('YouTube मा हेर्नुहोस्')).toBeTruthy();
});

it('sends a non-YouTube embed to the browser', async () => {
  const videos = extractArticleVideos(
    '<video><source src="https://cdn.baahrakhari.com/clips/c.mp4"></video>',
  );
  render(<ArticleVideoEmbeds videos={videos} palette={palette} />);

  fireEvent.press(screen.getByText('ब्राउजरमा हेर्नुहोस्'));

  await waitFor(() =>
    expect(openURL).toHaveBeenCalledWith('https://cdn.baahrakhari.com/clips/c.mp4'),
  );
  expect(canOpenURL).not.toHaveBeenCalled();
});
