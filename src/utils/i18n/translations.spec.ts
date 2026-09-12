import { describe, expect, it } from '@jest/globals';
import {
  mergeTranslations,
  sanitizeTranslations,
  withDefaultLocale,
} from './translations';

describe('sanitizeTranslations', () => {
  it('should drop unsupported locale keys', () => {
    expect(
      sanitizeTranslations({ vi: 'Cơ bản', en: 'Beginner', fr: 'Débutant' }),
    ).toEqual({ vi: 'Cơ bản', en: 'Beginner' });
  });

  it('should normalise regional keys onto their base language', () => {
    expect(sanitizeTranslations({ 'en-US': 'Beginner' })).toEqual({
      en: 'Beginner',
    });
  });

  it('should drop blank values so they never shadow the fallback', () => {
    expect(sanitizeTranslations({ vi: 'Cơ bản', en: '  ' })).toEqual({
      vi: 'Cơ bản',
    });
  });

  it('should trim retained values', () => {
    expect(sanitizeTranslations({ vi: '  Cơ bản  ' })).toEqual({
      vi: 'Cơ bản',
    });
  });

  it('should ignore non-string values', () => {
    expect(sanitizeTranslations({ vi: 'Cơ bản', en: 5 } as never)).toEqual({
      vi: 'Cơ bản',
    });
  });

  it('should return an empty object for nullish input', () => {
    expect(sanitizeTranslations(undefined)).toEqual({});
    expect(sanitizeTranslations(null)).toEqual({});
  });
});

describe('withDefaultLocale', () => {
  it('should seed the default locale from the base value when absent', () => {
    expect(withDefaultLocale({ en: 'Beginner' }, 'Cơ bản')).toEqual({
      en: 'Beginner',
      vi: 'Cơ bản',
    });
  });

  it('should not overwrite an explicit default-locale value', () => {
    expect(withDefaultLocale({ vi: 'Sơ cấp' }, 'Cơ bản')).toEqual({
      vi: 'Sơ cấp',
    });
  });

  it('should leave the map alone when there is no base value', () => {
    expect(withDefaultLocale({ en: 'Beginner' }, null)).toEqual({
      en: 'Beginner',
    });
  });
});

describe('mergeTranslations', () => {
  it('should patch a single locale without dropping the others', () => {
    expect(
      mergeTranslations({ vi: 'Cơ bản', en: 'Beginner' }, { en: 'Novice' }),
    ).toEqual({ vi: 'Cơ bản', en: 'Novice' });
  });

  it('should leave the existing map untouched when the patch is undefined', () => {
    expect(mergeTranslations({ vi: 'Cơ bản' }, undefined)).toEqual({
      vi: 'Cơ bản',
    });
  });

  it('should remove a locale when the patch blanks it', () => {
    expect(
      mergeTranslations({ vi: 'Cơ bản', en: 'Beginner' }, { en: '' }),
    ).toEqual({ vi: 'Cơ bản' });
  });

  it('should not mutate its inputs', () => {
    const existing = { vi: 'Cơ bản' };
    mergeTranslations(existing, { en: 'Beginner' });

    expect(existing).toEqual({ vi: 'Cơ bản' });
  });
});
