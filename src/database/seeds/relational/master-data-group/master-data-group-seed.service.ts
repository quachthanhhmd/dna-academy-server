import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MasterDataGroupEntity } from '../../../../master-data-groups/infrastructure/persistence/relational/entities/master-data-group.entity';
import { DEFAULT_LOCALE } from '../../../../utils/i18n/locale';
import { TranslationMap } from '../../../../utils/i18n/translation-map.type';
import { mergeSeedTranslations } from '../shared/merge-seed-translations';

// V1: group_key values are hard-coded here rather than admin-manageable —
// see epic_2_roles_master_data.md ("V1 need to hard the group_key code in
// the database, improve later"). Admins may only manage codes within these
// groups in V1, not the groups themselves.
//
// Epic 6: each group carries its Vietnamese (default) and English wording.
// `name` is derived from the vi translation and is never authored separately.
const MASTER_DATA_GROUPS: ReadonlyArray<{
  groupKey: string;
  displayOrder: number;
  nameTranslations: TranslationMap;
}> = [
  {
    groupKey: 'course_group',
    displayOrder: 1,
    nameTranslations: { vi: 'Nhóm khóa học', en: 'Course Group' },
  },
  {
    groupKey: 'course_level',
    displayOrder: 2,
    nameTranslations: { vi: 'Cấp độ khóa học', en: 'Course Level' },
  },
  {
    groupKey: 'course_category',
    displayOrder: 3,
    nameTranslations: { vi: 'Danh mục khóa học', en: 'Course Category' },
  },
  {
    groupKey: 'lecture_type',
    displayOrder: 4,
    nameTranslations: { vi: 'Loại bài giảng', en: 'Lecture Type' },
  },
  {
    groupKey: 'course_status',
    displayOrder: 5,
    nameTranslations: { vi: 'Trạng thái khóa học', en: 'Course Status' },
  },
  {
    groupKey: 'education_stage',
    displayOrder: 6,
    nameTranslations: { vi: 'Bậc học', en: 'Education Stage' },
  },
  {
    groupKey: 'career_interest',
    displayOrder: 7,
    nameTranslations: {
      vi: 'Lĩnh vực nghề nghiệp quan tâm',
      en: 'Career Interest',
    },
  },
  {
    groupKey: 'learning_goal',
    displayOrder: 8,
    nameTranslations: { vi: 'Mục tiêu học tập', en: 'Learning Goal' },
  },
  {
    groupKey: 'expertise_area',
    displayOrder: 9,
    nameTranslations: {
      vi: 'Lĩnh vực chuyên môn',
      en: 'Instructor Expertise Area',
    },
  },
];

@Injectable()
export class MasterDataGroupSeedService {
  constructor(
    @InjectRepository(MasterDataGroupEntity)
    private readonly repository: Repository<MasterDataGroupEntity>,
  ) {}

  /**
   * Upsert, never delete-and-insert: `master_data_code.groupId` points here,
   * so a row must keep its id across every run.
   */
  async run() {
    for (const group of MASTER_DATA_GROUPS) {
      const existing = await this.repository.findOne({
        where: { groupKey: group.groupKey },
      });

      if (!existing) {
        await this.repository.save(
          this.repository.create({
            groupKey: group.groupKey,
            name: group.nameTranslations[DEFAULT_LOCALE],
            nameTranslations: group.nameTranslations,
            descriptionTranslations: {},
            isActive: true,
            displayOrder: group.displayOrder,
          }),
        );
        continue;
      }

      const nameTranslations = mergeSeedTranslations(
        existing.nameTranslations,
        group.nameTranslations,
      );

      // Only write when something actually changed, so a steady-state boot
      // issues no UPDATE at all.
      if (
        JSON.stringify(nameTranslations) !==
        JSON.stringify(existing.nameTranslations ?? {})
      ) {
        existing.nameTranslations = nameTranslations;
        existing.name = nameTranslations[DEFAULT_LOCALE] ?? existing.name;
        await this.repository.save(existing);
      }
    }
  }
}
