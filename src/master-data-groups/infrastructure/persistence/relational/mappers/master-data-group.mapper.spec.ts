import { describe, expect, it } from '@jest/globals';
import { MasterDataGroupMapper } from './master-data-group.mapper';
import { MasterDataGroupEntity } from '../entities/master-data-group.entity';
import {
  LocaleContext,
  LocaleHolder,
} from '../../../../../utils/i18n/locale-context';

const withLocale = <T>(locale: string, fn: () => T): T => {
  const holder = new LocaleHolder();
  holder.explicit = locale;
  return LocaleContext.run(holder, fn);
};

const entity = (): MasterDataGroupEntity =>
  Object.assign(new MasterDataGroupEntity(), {
    id: 'group-1',
    groupKey: 'course_level',
    name: 'Cấp độ khóa học',
    description: null,
    nameTranslations: { vi: 'Cấp độ khóa học', en: 'Course Level' },
    descriptionTranslations: {},
    isActive: true,
    displayOrder: 2,
    createdAt: new Date('2026-08-30T00:00:00Z'),
    updatedAt: new Date('2026-08-30T00:00:00Z'),
  });

describe('MasterDataGroupMapper', () => {
  it('should resolve the group name into the ambient locale', () => {
    const domain = withLocale('en', () =>
      MasterDataGroupMapper.toDomain(entity()),
    );

    expect(domain.name).toBe('Course Level');
    expect(domain.groupKey).toBe('course_level');
  });

  it('should never translate the stable groupKey', () => {
    const domain = withLocale('en', () =>
      MasterDataGroupMapper.toDomain(entity()),
    );

    expect(domain.groupKey).toBe('course_level');
  });

  it('should keep a null description null when nothing is translated', () => {
    const domain = withLocale('en', () =>
      MasterDataGroupMapper.toDomain(entity()),
    );

    expect(domain.description).toBeNull();
  });

  it('should not let a localized read leak into the base column', () => {
    const domain = withLocale('en', () =>
      MasterDataGroupMapper.toDomain(entity()),
    );
    expect(domain.name).toBe('Course Level');

    const persisted = withLocale('en', () =>
      MasterDataGroupMapper.toPersistence(domain),
    );

    expect(persisted.name).toBe('Cấp độ khóa học');
  });

  it('should normalise missing translation columns on legacy rows', () => {
    const raw = entity();
    (raw as { nameTranslations?: unknown }).nameTranslations = undefined;

    const domain = MasterDataGroupMapper.toDomain(raw);

    expect(domain.nameTranslations).toEqual({});
    expect(domain.name).toBe('Cấp độ khóa học');
  });
});
