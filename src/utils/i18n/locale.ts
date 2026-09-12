/**
 * Epic 6 — bilingual master data.
 *
 * `vi` is the default locale: the plain `name` / `description` columns hold it
 * and every other locale lives in the `*Translations` JSONB columns. Nothing
 * here touches nestjs-i18n, which resolves a different header (`x-custom-lang`)
 * for transactional email copy only.
 */

export const DEFAULT_LOCALE = 'vi';

const LOCALE_NAMES: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
};

/**
 * V1 ships vi + en. Overridable so a new locale is a config change plus
 * translation data, never a schema change.
 */
export const SUPPORTED_LOCALES: readonly string[] = (
  process.env.APP_SUPPORTED_LOCALES || 'vi,en'
)
  .split(',')
  .map((locale) => locale.trim().toLowerCase())
  .filter(Boolean);

export type LocaleDetail = {
  code: string;
  name: string;
  isDefault: boolean;
};

/**
 * Reduces a raw client value to a supported locale, or `undefined` when it is
 * not one. Regional tags collapse to their base language, so `vi-VN` and
 * `en_US` both resolve.
 */
export function normalizeLocale(raw?: string | null): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }

  const base = raw.trim().toLowerCase().split(/[-_]/)[0];

  return base && SUPPORTED_LOCALES.includes(base) ? base : undefined;
}

export function isSupportedLocale(raw?: string | null): boolean {
  return normalizeLocale(raw) !== undefined;
}

/**
 * Picks the highest-quality supported language out of an `Accept-Language`
 * header. `*` carries no preference and is ignored.
 */
export function parseAcceptLanguage(
  header?: string | null,
): string | undefined {
  if (!header) {
    return undefined;
  }

  const candidates = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params
        .map((param) => param.trim())
        .find((param) => param.startsWith('q='));
      const quality = q ? Number.parseFloat(q.slice(2)) : 1;

      return {
        tag: tag.trim(),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((candidate) => candidate.tag && candidate.tag !== '*')
    // Stable sort: equal q-values keep header order, matching RFC 9110.
    .sort((a, b) => b.quality - a.quality);

  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate.tag);
    if (locale) {
      return locale;
    }
  }

  return undefined;
}

export function supportedLocaleDetails(): LocaleDetail[] {
  return SUPPORTED_LOCALES.map((code) => ({
    code,
    name: LOCALE_NAMES[code] ?? code,
    isDefault: code === DEFAULT_LOCALE,
  }));
}
