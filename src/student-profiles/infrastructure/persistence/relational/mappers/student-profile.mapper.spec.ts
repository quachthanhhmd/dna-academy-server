import { describe, expect, it } from '@jest/globals';
import {
  LocaleContext,
  LocaleHolder,
} from '../../../../../utils/i18n/locale-context';
import { StudentProfileMapper } from './student-profile.mapper';

const mapInLocale = (
  locale: string,
  code = 'core_skills',
  customStatus?: string,
) => {
  const holder = new LocaleHolder();
  holder.explicit = locale;

  return LocaleContext.run(holder, () =>
    StudentProfileMapper.toDomain({
      id: 'profile-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 1 },
      educationStageCode: null,
      customStatus: customStatus ?? null,
      currentStatusCode: {
        id: 'goal-1',
        code,
        name: 'Xây dựng kỹ năng và dự án để tìm việc',
        nameTranslations: {
          vi: 'Xây dựng kỹ năng và dự án để tìm việc',
          en: 'Build core skills and projects that help me get a job',
        },
        descriptionTranslations: {},
        description: null,
        displayOrder: 4,
        isActive: true,
        thumbnailUrl: null,
        group: {
          id: 'group-1',
          groupKey: 'learning_goal',
          name: 'Mục tiêu học tập',
          nameTranslations: { vi: 'Mục tiêu học tập', en: 'Learning Goal' },
          descriptionTranslations: {},
          description: null,
          displayOrder: 8,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as any),
  );
};

describe('StudentProfileMapper currentStatus', () => {
  it('should localize the current status name for X-Locale=en', () => {
    expect(mapInLocale('en').currentStatus).toEqual({
      code: 'core_skills',
      name: 'Build core skills and projects that help me get a job',
      customLabel: null,
    });
  });

  it('should expose customLabel only for other', () => {
    expect(mapInLocale('vi', 'other', 'Nghiên cứu').currentStatus).toEqual({
      code: 'other',
      name: 'Xây dựng kỹ năng và dự án để tìm việc',
      customLabel: 'Nghiên cứu',
    });
  });

  it('should return null when the profile has no current status', () => {
    const profile = StudentProfileMapper.toDomain({
      id: 'profile-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 1 },
      educationStageCode: null,
      currentStatusCode: null,
      customStatus: null,
    } as any);

    expect(profile.currentStatus).toBeNull();
  });
});
