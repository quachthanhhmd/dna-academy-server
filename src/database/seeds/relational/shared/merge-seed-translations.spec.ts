import { describe, expect, it } from '@jest/globals';
import { mergeSeedTranslations } from './merge-seed-translations';

describe('mergeSeedTranslations', () => {
  const seed = { vi: 'Cơ bản', en: 'Beginner' };

  it('should return the seed wholesale for a brand-new row', () => {
    expect(mergeSeedTranslations(undefined, seed)).toEqual(seed);
    expect(mergeSeedTranslations({}, seed)).toEqual(seed);
  });

  it('should add a locale that is missing without touching the others', () => {
    expect(mergeSeedTranslations({ vi: 'Sơ cấp' }, seed)).toEqual({
      vi: 'Sơ cấp',
      en: 'Beginner',
    });
  });

  it('should never overwrite a value an admin has edited', () => {
    expect(mergeSeedTranslations({ vi: 'Sơ cấp', en: 'Novice' }, seed)).toEqual(
      { vi: 'Sơ cấp', en: 'Novice' },
    );
  });

  it('should replace a vi value left behind by the migration backfill', () => {
    // The Epic 6 migration copies the old English `name` into the vi slot so
    // the CHECK constraint can be applied. When vi still holds exactly that
    // English text, nobody has localized the row and the seed owns it.
    expect(mergeSeedTranslations({ vi: 'Beginner' }, seed)).toEqual(seed);
  });

  it('should not treat a coincidental match on a non-default locale as a backfill', () => {
    expect(
      mergeSeedTranslations({ vi: 'Sơ cấp', en: 'Beginner' }, seed),
    ).toEqual({ vi: 'Sơ cấp', en: 'Beginner' });
  });

  it('should replace a blank existing value', () => {
    expect(mergeSeedTranslations({ vi: '   ' }, seed)).toEqual(seed);
  });

  it('should report whether anything actually changed', () => {
    expect(
      mergeSeedTranslations({ vi: 'Cơ bản', en: 'Beginner' }, seed),
    ).toEqual(seed);
    // Identity is preserved so callers can skip a pointless UPDATE.
    const unchanged = { vi: 'Cơ bản', en: 'Beginner' };
    expect(mergeSeedTranslations(unchanged, seed)).toEqual(unchanged);
  });

  it('should ignore seed locales with blank values', () => {
    expect(
      mergeSeedTranslations({ vi: 'Cơ bản' }, { vi: 'Cơ bản', en: '' }),
    ).toEqual({ vi: 'Cơ bản' });
  });
});
