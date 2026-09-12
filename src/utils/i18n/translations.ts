import { DEFAULT_LOCALE, normalizeLocale } from './locale';
import { TranslationMap } from './translation-map.type';

/**
 * Keeps only supported locales with non-blank string values, normalising
 * regional keys (`en-US` → `en`) and trimming values.
 */
export function sanitizeTranslations(
  input: TranslationMap | null | undefined,
): TranslationMap {
  const result: TranslationMap = {};

  for (const [rawLocale, rawValue] of Object.entries(input ?? {})) {
    const locale = normalizeLocale(rawLocale);

    if (!locale || typeof rawValue !== 'string') {
      continue;
    }

    const value = rawValue.trim();
    if (value !== '') {
      result[locale] = value;
    }
  }

  return result;
}

/**
 * Guarantees the default-locale key, seeding it from the plain column value.
 * This is what keeps legacy `{ name }`-only writes satisfying the DB CHECK
 * constraint `nameTranslations ? 'vi'`.
 */
export function withDefaultLocale(
  translations: TranslationMap,
  base?: string | null,
): TranslationMap {
  if (translations[DEFAULT_LOCALE] || typeof base !== 'string') {
    return translations;
  }

  const value = base.trim();

  return value === ''
    ? translations
    : { ...translations, [DEFAULT_LOCALE]: value };
}

/**
 * Applies a partial translation patch. A blank value removes that locale, so
 * an admin can clear the English box and fall back to Vietnamese again.
 */
export function mergeTranslations(
  existing: TranslationMap | null | undefined,
  patch: TranslationMap | null | undefined,
): TranslationMap {
  const result = sanitizeTranslations(existing);

  if (!patch) {
    return result;
  }

  for (const [rawLocale, rawValue] of Object.entries(patch)) {
    const locale = normalizeLocale(rawLocale);
    if (!locale) {
      continue;
    }

    const value = typeof rawValue === 'string' ? rawValue.trim() : '';
    if (value === '') {
      delete result[locale];
    } else {
      result[locale] = value;
    }
  }

  return result;
}
