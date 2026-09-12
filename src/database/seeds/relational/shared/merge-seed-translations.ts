import { DEFAULT_LOCALE } from '../../../../utils/i18n/locale';
import { TranslationMap } from '../../../../utils/i18n/translation-map.type';

const isBlank = (value?: string): boolean =>
  typeof value !== 'string' || value.trim() === '';

/**
 * Additive merge used by the master data seeds.
 *
 * Rules, in order:
 *  1. A locale the row does not have yet is added.
 *  2. A locale the row already has is left alone — an admin rename survives
 *     every subsequent boot, which is the seed's long-standing contract.
 *  3. Exception: when the default-locale value is byte-identical to the seed's
 *     English wording, it is the artifact of the Epic 6 migration backfill
 *     (which copied the old English `name` into the `vi` slot so the CHECK
 *     constraint could be applied). Nobody localized that row, so the seed
 *     replaces it with the real Vietnamese wording.
 */
export function mergeSeedTranslations(
  existing: TranslationMap | null | undefined,
  seed: TranslationMap,
): TranslationMap {
  const result: TranslationMap = { ...(existing ?? {}) };

  for (const [locale, seedValue] of Object.entries(seed)) {
    if (isBlank(seedValue)) {
      continue;
    }

    const current = result[locale];

    const isBackfillArtifact =
      locale === DEFAULT_LOCALE &&
      typeof current === 'string' &&
      current === seed.en;

    if (isBlank(current) || isBackfillArtifact) {
      result[locale] = seedValue;
    }
  }

  return result;
}
