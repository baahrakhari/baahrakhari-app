/**
 * Home advertisement parser: `home.*` static creatives only.
 * Drops scripts, expired `published_to`, and non-home placements.
 */

import {
  parseHomeAdvertisements,
  emptyHomeAds,
} from '../src/scrape/advertisements';

const NOW = Date.parse('2026-09-20T12:00:00');

const liveCreative = {
  id: 10,
  title: 'Sipradi',
  url: 'https://example.com/desktop',
  mobile_url: 'https://example.com/mobile',
  is_script: 0,
  published_to: '2027-11-30 00:00:00',
  image_link: 'https://baahrakhari.com/uploads/bigyaapan/desktop.gif',
  mobile_image_link: 'https://baahrakhari.com/uploads/bigyaapan/mobile.gif',
};

it('returns empty slots for non-objects', () => {
  expect(parseHomeAdvertisements(null, NOW)).toEqual(emptyHomeAds());
  expect(parseHomeAdvertisements({sidebar: {}}, NOW)).toEqual(emptyHomeAds());
});

it('keeps the first valid home creative and prefers mobile image + tap URL', () => {
  const ads = parseHomeAdvertisements(
    {
      home: {
        'below-breaking-two': [liveCreative],
      },
      detail: {
        above_title: [liveCreative],
      },
      sidebar: {
        'inner-video-inner': [liveCreative],
      },
      header_ad: {
        header_ad: [liveCreative],
      },
    },
    NOW,
  );
  expect(ads['below-breaking-two']).toEqual({
    id: '10',
    title: 'Sipradi',
    imageUrl: 'https://baahrakhari.com/uploads/bigyaapan/mobile.gif',
    tapUrl: 'https://example.com/mobile',
  });
  expect(ads['below-artha']).toBeNull();
  expect(ads['below-khel']).toBeNull();
  expect(ads['below-nation']).toBeNull();
  expect(ads['below-breaking-three']).toBeNull();
});

it('falls back to desktop url and image_link when mobile fields are missing', () => {
  const ads = parseHomeAdvertisements(
    {
      home: {
        'below-artha': [
          {
            id: 11,
            title: 'Bank',
            url: 'https://example.com/bank',
            mobile_url: null,
            is_script: 0,
            published_to: '2028-01-01 00:00:00',
            image_link: 'https://baahrakhari.com/uploads/bigyaapan/bank.png',
            mobile_image_link: null,
          },
        ],
      },
    },
    NOW,
  );
  expect(ads['below-artha']).toEqual({
    id: '11',
    title: 'Bank',
    imageUrl: 'https://baahrakhari.com/uploads/bigyaapan/bank.png',
    tapUrl: 'https://example.com/bank',
  });
});

it('drops script ads and expired published_to', () => {
  const ads = parseHomeAdvertisements(
    {
      home: {
        'below-khel': [
          {
            ...liveCreative,
            id: 1,
            is_script: 1,
            title: 'script',
          },
          {
            ...liveCreative,
            id: 2,
            title: 'expired',
            published_to: '2026-01-01 00:00:00',
            is_script: 0,
          },
          {
            ...liveCreative,
            id: 3,
            title: 'live',
          },
        ],
      },
    },
    NOW,
  );
  expect(ads['below-khel']?.id).toBe('3');
  expect(ads['below-khel']?.title).toBe('live');
});

it('parses every home slot we render', () => {
  const ads = parseHomeAdvertisements(
    {
      home: {
        'below-breaking-two': [{...liveCreative, id: 21, title: 'two'}],
        'below-breaking-three': [{...liveCreative, id: 22, title: 'three'}],
        'below-artha': [{...liveCreative, id: 23, title: 'artha'}],
        'below-khel': [{...liveCreative, id: 24, title: 'khel'}],
        'below-nation': [{...liveCreative, id: 25, title: 'nation'}],
      },
    },
    NOW,
  );
  expect(ads['below-breaking-two']?.title).toBe('two');
  expect(ads['below-breaking-three']?.title).toBe('three');
  expect(ads['below-artha']?.title).toBe('artha');
  expect(ads['below-khel']?.title).toBe('khel');
  expect(ads['below-nation']?.title).toBe('nation');
});
