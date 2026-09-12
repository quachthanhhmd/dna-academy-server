import { describe, expect, it } from '@jest/globals';
import { pickLocalized } from './pick-localized';

describe('pickLocalized', () => {
  const translations = { vi: 'Cơ bản', en: 'Beginner' };

  it('should return the requested locale when present', () => {
    expect(pickLocalized(translations, 'en', 'fallback')).toBe('Beginner');
  });

  it('should fall back to the default locale when the requested one is missing', () => {
    expect(pickLocalized({ vi: 'Cơ bản' }, 'en', 'fallback')).toBe('Cơ bản');
  });

  it('should fall back to the base column when no translation exists', () => {
    expect(pickLocalized({}, 'en', 'Beginner')).toBe('Beginner');
    expect(pickLocalized(null, 'en', 'Beginner')).toBe('Beginner');
    expect(pickLocalized(undefined, 'en', 'Beginner')).toBe('Beginner');
  });

  it('should treat a blank translation as missing so labels never render empty', () => {
    expect(pickLocalized({ vi: 'Cơ bản', en: '   ' }, 'en', 'base')).toBe(
      'Cơ bản',
    );
    expect(pickLocalized({ en: '' }, 'en', 'base')).toBe('base');
  });

  it('should ignore non-string values defensively', () => {
    expect(
      pickLocalized(
        { en: 42 } as unknown as Record<string, string>,
        'en',
        'base',
      ),
    ).toBe('base');
  });

  it('should preserve a null base for nullable description columns', () => {
    expect(pickLocalized({}, 'en', null)).toBeNull();
    expect(pickLocalized(undefined, 'en', undefined)).toBeUndefined();
  });
});
