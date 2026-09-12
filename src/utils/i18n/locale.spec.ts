import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  normalizeLocale,
  parseAcceptLanguage,
  supportedLocaleDetails,
} from './locale';

describe('locale', () => {
  it('should default to Vietnamese per Epic 6', () => {
    expect(DEFAULT_LOCALE).toBe('vi');
    expect(SUPPORTED_LOCALES).toEqual(['vi', 'en']);
  });

  describe('normalizeLocale', () => {
    it('should lower-case and trim a supported locale', () => {
      expect(normalizeLocale(' EN ')).toBe('en');
    });

    it('should reduce a regional tag to its base language', () => {
      expect(normalizeLocale('vi-VN')).toBe('vi');
      expect(normalizeLocale('en_US')).toBe('en');
    });

    it('should return undefined for an unsupported locale', () => {
      expect(normalizeLocale('fr')).toBeUndefined();
      expect(normalizeLocale('klingon')).toBeUndefined();
    });

    it('should return undefined for empty input', () => {
      expect(normalizeLocale(undefined)).toBeUndefined();
      expect(normalizeLocale(null)).toBeUndefined();
      expect(normalizeLocale('   ')).toBeUndefined();
    });
  });

  describe('isSupportedLocale', () => {
    it('should accept supported values and reject others', () => {
      expect(isSupportedLocale('vi')).toBe(true);
      expect(isSupportedLocale('en-GB')).toBe(true);
      expect(isSupportedLocale('fr')).toBe(false);
    });
  });

  describe('parseAcceptLanguage', () => {
    it('should pick the highest-quality supported language', () => {
      expect(parseAcceptLanguage('vi-VN,vi;q=0.9,en;q=0.8')).toBe('vi');
    });

    it('should respect q-values rather than document order', () => {
      expect(parseAcceptLanguage('en;q=0.4,vi;q=0.9')).toBe('vi');
    });

    it('should skip unsupported languages and fall through to a supported one', () => {
      expect(parseAcceptLanguage('fr-FR,fr;q=0.9,en;q=0.5')).toBe('en');
    });

    it('should return undefined when nothing is supported', () => {
      expect(parseAcceptLanguage('fr-FR,de;q=0.8')).toBeUndefined();
      expect(parseAcceptLanguage('')).toBeUndefined();
      expect(parseAcceptLanguage(undefined)).toBeUndefined();
    });

    it('should treat a bare wildcard as no preference', () => {
      expect(parseAcceptLanguage('*')).toBeUndefined();
    });
  });

  describe('supportedLocaleDetails', () => {
    it('should describe every supported locale and flag exactly one default', () => {
      const details = supportedLocaleDetails();

      expect(details.map((item) => item.code)).toEqual(['vi', 'en']);
      expect(details.filter((item) => item.isDefault)).toHaveLength(1);
      expect(details[0]).toEqual({
        code: 'vi',
        name: 'Tiếng Việt',
        isDefault: true,
      });
    });
  });
});
