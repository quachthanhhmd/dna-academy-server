import { describe, expect, it } from '@jest/globals';
import { extractYoutubeVideoId, parseIsoDuration } from './youtube-data-api';

describe('parseIsoDuration', () => {
  it.each([
    ['PT3M33S', 213],
    ['PT1H24M5S', 5045],
    ['PT45S', 45],
    ['PT2H', 7200],
    ['P1DT1S', 86401],
  ])('%s is %i seconds', (iso, secs) => {
    expect(parseIsoDuration(iso)).toBe(secs);
  });

  it.each(['P0D', 'PT0S', '', 'garbage', undefined, null])(
    'has no usable length for %p',
    (iso) => {
      expect(parseIsoDuration(iso)).toBeNull();
    },
  );
});

describe('extractYoutubeVideoId', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?t=10',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/live/dQw4w9WgXcQ',
  ])('reads the id from %s', (url) => {
    expect(extractYoutubeVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should return null for a non-YouTube link', () => {
    expect(extractYoutubeVideoId('https://vimeo.com/123456')).toBeNull();
  });
});
