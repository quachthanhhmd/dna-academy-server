import { DEFAULT_LOCALE } from './locale';
import { TranslationMap } from './translation-map.type';

const usableValue = (
  translations: TranslationMap | null | undefined,
  locale: string,
): string | undefined => {
  const value = translations?.[locale];

  // A blank translation is a gap, not a value — an admin who saves the form
  // with an empty English box must not blank the label for English users.
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
};

/**
 * Epic 6 §2.3 rendering rule:
 * `requested locale → default locale (vi) → the plain column`.
 *
 * The base value is returned as-is (including `null`/`undefined`) so nullable
 * description columns keep their nullability.
 */
export function pickLocalized<T extends string | null | undefined>(
  translations: TranslationMap | null | undefined,
  locale: string,
  base: T,
): string | T {
  return (
    usableValue(translations, locale) ??
    usableValue(translations, DEFAULT_LOCALE) ??
    base
  );
}
