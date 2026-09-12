import { describe, expect, it } from '@jest/globals';
import { MasterDataCodeMapper } from './master-data-code.mapper';
import { MasterDataCodeEntity } from '../entities/master-data-code.entity';
import {
  LocaleContext,
  LocaleHolder,
} from '../../../../../utils/i18n/locale-context';

const withLocale = <T>(locale: string, fn: () => T): T => {
  const holder = new LocaleHolder();
  holder.explicit = locale;
  return LocaleContext.run(holder, fn);
};

const entity = (): MasterDataCodeEntity =>
  Object.assign(new MasterDataCodeEntity(), {
    id: 'code-1',
    code: 'beginner',
    name: 'Cơ bản',
    description: 'Dành cho người mới bắt đầu',
    nameTranslations: { vi: 'Cơ bản', en: 'Beginner' },
    descriptionTranslations: {
      vi: 'Dành cho người mới bắt đầu',
      en: 'For first-time learners',
    },
    thumbnailUrl: null,
    isActive: true,
    displayOrder: 1,
    createdAt: new Date('2026-08-30T00:00:00Z'),
    updatedAt: new Date('2026-08-30T00:00:00Z'),
  });

describe('MasterDataCodeMapper', () => {
  describe('toDomain', () => {
    it('should resolve name and description into the ambient locale', () => {
      const domain = withLocale('en', () =>
        MasterDataCodeMapper.toDomain(entity()),
      );

      expect(domain.name).toBe('Beginner');
      expect(domain.description).toBe('For first-time learners');
    });

    it('should keep the default locale when none is requested', () => {
      const domain = MasterDataCodeMapper.toDomain(entity());

      expect(domain.name).toBe('Cơ bản');
    });

    it('should fall back to Vietnamese when the locale has no translation', () => {
      const raw = entity();
      raw.nameTranslations = { vi: 'Cơ bản' };

      const domain = withLocale('en', () => MasterDataCodeMapper.toDomain(raw));

      expect(domain.name).toBe('Cơ bản');
    });

    it('should fall back to the base column when translations are empty', () => {
      const raw = entity();
      raw.nameTranslations = {};
      raw.descriptionTranslations = {};

      const domain = withLocale('en', () => MasterDataCodeMapper.toDomain(raw));

      expect(domain.name).toBe('Cơ bản');
      expect(domain.description).toBe('Dành cho người mới bắt đầu');
    });

    it('should always expose the raw translation maps for the admin editor', () => {
      const domain = withLocale('en', () =>
        MasterDataCodeMapper.toDomain(entity()),
      );

      expect(domain.nameTranslations).toEqual({
        vi: 'Cơ bản',
        en: 'Beginner',
      });
    });

    it('should normalise missing translation columns to an empty object', () => {
      const raw = entity();
      // Rows written before the Epic 6 migration.
      (raw as { nameTranslations?: unknown }).nameTranslations = undefined;
      (raw as { descriptionTranslations?: unknown }).descriptionTranslations =
        undefined;

      const domain = MasterDataCodeMapper.toDomain(raw);

      expect(domain.nameTranslations).toEqual({});
      expect(domain.descriptionTranslations).toEqual({});
      expect(domain.name).toBe('Cơ bản');
    });
  });

  describe('toPersistence', () => {
    it('should write the default-locale value into the base columns', () => {
      const persisted = MasterDataCodeMapper.toPersistence(
        MasterDataCodeMapper.toDomain(entity()),
      );

      expect(persisted.name).toBe('Cơ bản');
    });

    it('should NOT let a localized read leak into the base column', () => {
      // The repository's update() is a read-modify-write through both mappers,
      // so a PATCH issued under ?locale=en must not overwrite the Vietnamese
      // name with the English one.
      const domain = withLocale('en', () =>
        MasterDataCodeMapper.toDomain(entity()),
      );
      expect(domain.name).toBe('Beginner');

      const persisted = withLocale('en', () =>
        MasterDataCodeMapper.toPersistence(domain),
      );

      expect(persisted.name).toBe('Cơ bản');
      expect(persisted.description).toBe('Dành cho người mới bắt đầu');
      expect(persisted.nameTranslations).toEqual({
        vi: 'Cơ bản',
        en: 'Beginner',
      });
    });

    it('should survive repeated round-trips under a non-default locale', () => {
      let current = entity();

      for (let i = 0; i < 3; i += 1) {
        current = withLocale('en', () =>
          MasterDataCodeMapper.toPersistence(
            MasterDataCodeMapper.toDomain(current),
          ),
        );
      }

      expect(current.name).toBe('Cơ bản');
      expect(current.nameTranslations).toEqual({
        vi: 'Cơ bản',
        en: 'Beginner',
      });
    });

    it('should fall back to the domain name when the default locale is absent', () => {
      const domain = MasterDataCodeMapper.toDomain(entity());
      domain.nameTranslations = { en: 'Beginner' };

      expect(MasterDataCodeMapper.toPersistence(domain).name).toBe('Cơ bản');
    });
  });
});
