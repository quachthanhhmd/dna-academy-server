import { describe, expect, it } from '@jest/globals';
import { validate } from 'class-validator';
import { IsTranslationMap } from './is-translation-map.validator';
import { TranslationMap } from './translation-map.type';

class Payload {
  @IsTranslationMap()
  nameTranslations?: TranslationMap;
}

const check = async (value: unknown) => {
  const payload = new Payload();
  payload.nameTranslations = value as TranslationMap;
  return validate(payload);
};

describe('IsTranslationMap', () => {
  it('should accept a map of supported locales to strings', async () => {
    await expect(check({ vi: 'Cơ bản', en: 'Beginner' })).resolves.toEqual([]);
  });

  it('should accept an empty map', async () => {
    await expect(check({})).resolves.toEqual([]);
  });

  it('should reject an unsupported locale key', async () => {
    const errors = await check({ vi: 'Cơ bản', fr: 'Débutant' });

    expect(errors).toHaveLength(1);
    expect(JSON.stringify(errors)).toContain('unsupportedLocaleKey');
  });

  it('should reject a non-string value', async () => {
    const errors = await check({ vi: 42 });

    expect(errors).toHaveLength(1);
  });

  it('should reject an array or a scalar', async () => {
    await expect(check(['vi'])).resolves.toHaveLength(1);
    await expect(check('vi')).resolves.toHaveLength(1);
  });

  it('should reject a value beyond the column length', async () => {
    await expect(check({ vi: 'x'.repeat(1001) })).resolves.toHaveLength(1);
  });
});
