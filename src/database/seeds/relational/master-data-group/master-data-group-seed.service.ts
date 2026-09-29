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
  /*
    EPIC-08. Every group this epic adds is prefixed `form_`: `learning_goal`
    already exists with live onboarding rows attached, and the forms ask
    overlapping questions with different option sets, so they need their own
    groups rather than a rename of someone else's.
  */
  {
    groupKey: 'form_current_level',
    displayOrder: 10,
    nameTranslations: { vi: 'Trình độ hiện tại', en: 'Current Level' },
  },
  {
    groupKey: 'form_learning_goal',
    displayOrder: 11,
    nameTranslations: { vi: 'Mục tiêu học tập', en: 'Learning Goal' },
  },
  {
    groupKey: 'form_session_slot',
    displayOrder: 12,
    nameTranslations: {
      vi: 'Buổi học mong muốn',
      en: 'Preferred Session Slot',
    },
  },
  {
    groupKey: 'form_time_band',
    displayOrder: 13,
    nameTranslations: { vi: 'Khung giờ học', en: 'Time Band' },
  },
  {
    groupKey: 'form_weekly_hours',
    displayOrder: 14,
    nameTranslations: {
      vi: 'Thời lượng học mỗi tuần',
      en: 'Weekly Study Hours',
    },
  },
  {
    groupKey: 'form_referral_source',
    displayOrder: 15,
    nameTranslations: { vi: 'Bạn biết đến từ đâu', en: 'Referral Source' },
  },
  {
    groupKey: 'form_skill',
    displayOrder: 16,
    nameTranslations: { vi: 'Kỹ năng', en: 'Skill' },
  },
  {
    groupKey: 'form_contribution_mode',
    displayOrder: 17,
    nameTranslations: {
      vi: 'Hình thức đóng góp',
      en: 'Contribution Mode',
    },
  },
  {
    groupKey: 'form_experience_years',
    displayOrder: 18,
    nameTranslations: {
      vi: 'Số năm kinh nghiệm',
      en: 'Years of Experience',
    },
  },
  {
    groupKey: 'form_monthly_capacity',
    displayOrder: 19,
    nameTranslations: {
      vi: 'Số lớp có thể dạy mỗi tháng',
      en: 'Monthly Teaching Capacity',
    },
  },
  {
    groupKey: 'form_teaching_experience',
    displayOrder: 20,
    nameTranslations: {
      vi: 'Kinh nghiệm giảng dạy',
      en: 'Teaching Experience',
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
