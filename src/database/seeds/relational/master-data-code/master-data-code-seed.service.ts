import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MasterDataCodeEntity } from '../../../../master-data-codes/infrastructure/persistence/relational/entities/master-data-code.entity';
import { MasterDataGroupEntity } from '../../../../master-data-groups/infrastructure/persistence/relational/entities/master-data-group.entity';
import { DEFAULT_LOCALE } from '../../../../utils/i18n/locale';
import { TranslationMap } from '../../../../utils/i18n/translation-map.type';
import { mergeSeedTranslations } from '../shared/merge-seed-translations';

type SeedCode = {
  code: string;
  displayOrder: number;
  nameTranslations: TranslationMap;
};

// V1: the values below are hard-coded alongside the group_key values in
// master-data-group-seed.service.ts. Admins may add/edit/deactivate codes
// through /admin/master-data at runtime.
//
// Codes are matched on (groupKey, code) and UPSERTED — never deleted and
// re-inserted — because course.levelId, course.categoryId,
// course_group_assignment.groupId, instructor_expertise.expertiseCodeId,
// student_profile.educationStageCodeId and
// student_career_interest.careerInterestId all reference these rows by id.
//
// Epic 6: `nameTranslations.vi` is the default locale and the source of the
// plain `name` column. A translation an admin edited is never overwritten —
// see mergeSeedTranslations for the one exception (the migration backfill).
const MASTER_DATA_CODES: ReadonlyArray<{
  groupKey: string;
  codes: ReadonlyArray<SeedCode>;
}> = [
  {
    // Homepage / catalog collections. Referenced by course_group_assignment
    // and by GET /courses?groupId=... in Epic 4.
    groupKey: 'course_group',
    codes: [
      {
        code: 'featured',
        displayOrder: 1,
        nameTranslations: { vi: 'Nổi bật', en: 'Featured' },
      },
      {
        code: 'popular',
        displayOrder: 2,
        nameTranslations: { vi: 'Phổ biến', en: 'Popular' },
      },
      {
        code: 'new_release',
        displayOrder: 3,
        nameTranslations: { vi: 'Mới ra mắt', en: 'New Release' },
      },
      {
        code: 'recommended',
        displayOrder: 4,
        nameTranslations: { vi: 'Đề xuất', en: 'Recommended' },
      },
    ],
  },
  {
    // Referenced by course.levelId.
    groupKey: 'course_level',
    codes: [
      {
        code: 'beginner',
        displayOrder: 1,
        nameTranslations: { vi: 'Cơ bản', en: 'Beginner' },
      },
      {
        code: 'intermediate',
        displayOrder: 2,
        nameTranslations: { vi: 'Trung cấp', en: 'Intermediate' },
      },
      {
        code: 'advanced',
        displayOrder: 3,
        nameTranslations: { vi: 'Nâng cao', en: 'Advanced' },
      },
    ],
  },
  {
    // Referenced by course.categoryId.
    groupKey: 'course_category',
    codes: [
      {
        code: 'career',
        displayOrder: 1,
        nameTranslations: { vi: 'Nghề nghiệp', en: 'Career' },
      },
      {
        code: 'technology',
        displayOrder: 2,
        nameTranslations: { vi: 'Công nghệ', en: 'Technology' },
      },
      {
        code: 'business',
        displayOrder: 3,
        nameTranslations: { vi: 'Kinh doanh', en: 'Business' },
      },
      {
        code: 'soft_skills',
        displayOrder: 4,
        nameTranslations: { vi: 'Kỹ năng mềm', en: 'Soft Skills' },
      },
      {
        code: 'language',
        displayOrder: 5,
        nameTranslations: { vi: 'Ngoại ngữ', en: 'Language' },
      },
    ],
  },
  {
    // Display labels for lecture.lectureType. The authoritative validation
    // list is LECTURE_TYPES in courses-admin/dto/create-lecture-admin.dto.ts —
    // these codes must stay in sync with it.
    groupKey: 'lecture_type',
    codes: [
      {
        code: 'video',
        displayOrder: 1,
        nameTranslations: { vi: 'Video', en: 'Video' },
      },
      {
        code: 'article',
        displayOrder: 2,
        nameTranslations: { vi: 'Bài viết', en: 'Article' },
      },
      {
        code: 'pdf_document',
        displayOrder: 3,
        nameTranslations: { vi: 'Tài liệu PDF', en: 'PDF Document' },
      },
      {
        code: 'quiz',
        displayOrder: 4,
        nameTranslations: { vi: 'Trắc nghiệm', en: 'Quiz' },
      },
      {
        code: 'reflection',
        displayOrder: 5,
        nameTranslations: { vi: 'Bài suy ngẫm', en: 'Reflection' },
      },
    ],
  },
  {
    // Instructor expertise areas (Epic 5). Referenced by
    // instructor_expertise.expertiseCodeId and by the ADM_INS_19 filter.
    groupKey: 'expertise_area',
    codes: [
      {
        code: 'data_analytics',
        displayOrder: 1,
        nameTranslations: { vi: 'Phân tích dữ liệu', en: 'Data Analytics' },
      },
      {
        code: 'supply_chain',
        displayOrder: 2,
        nameTranslations: { vi: 'Chuỗi cung ứng', en: 'Supply Chain' },
      },
      {
        code: 'software_dev',
        displayOrder: 3,
        nameTranslations: {
          vi: 'Phát triển phần mềm',
          en: 'Software Development',
        },
      },
      {
        code: 'digital_marketing',
        displayOrder: 4,
        nameTranslations: { vi: 'Tiếp thị số', en: 'Digital Marketing' },
      },
      {
        code: 'finance',
        displayOrder: 5,
        nameTranslations: { vi: 'Tài chính', en: 'Finance' },
      },
      {
        code: 'human_resources',
        displayOrder: 6,
        nameTranslations: { vi: 'Nhân sự', en: 'Human Resources' },
      },
      {
        code: 'design',
        displayOrder: 7,
        nameTranslations: { vi: 'Thiết kế', en: 'Design' },
      },
      {
        code: 'career_coaching',
        displayOrder: 8,
        nameTranslations: {
          vi: 'Huấn luyện nghề nghiệp',
          en: 'Career Coaching',
        },
      },
    ],
  },
  {
    // Display labels for course.status, written by the admin publish flow.
    groupKey: 'course_status',
    codes: [
      {
        code: 'draft',
        displayOrder: 1,
        nameTranslations: { vi: 'Bản nháp', en: 'Draft' },
      },
      {
        code: 'published',
        displayOrder: 2,
        nameTranslations: { vi: 'Đã xuất bản', en: 'Published' },
      },
      {
        code: 'unpublished',
        displayOrder: 3,
        nameTranslations: { vi: 'Ngừng xuất bản', en: 'Unpublished' },
      },
    ],
  },
  {
    // Onboarding options (Epic 1). Referenced by
    // student_profile.educationStageCodeId.
    groupKey: 'education_stage',
    codes: [
      {
        code: 'middle_school',
        displayOrder: 1,
        nameTranslations: { vi: 'Trung học cơ sở', en: 'Middle School' },
      },
      {
        code: 'high_school',
        displayOrder: 2,
        nameTranslations: { vi: 'Trung học phổ thông', en: 'High School' },
      },
      {
        code: 'university',
        displayOrder: 3,
        nameTranslations: { vi: 'Đại học', en: 'University' },
      },
      {
        code: 'graduated',
        displayOrder: 4,
        nameTranslations: { vi: 'Đã tốt nghiệp', en: 'Graduated' },
      },
      {
        code: 'working',
        displayOrder: 5,
        nameTranslations: { vi: 'Đang đi làm', en: 'Working' },
      },
    ],
  },
  {
    // Onboarding options (Epic 1). Referenced by
    // student_career_interest.careerInterestId.
    groupKey: 'career_interest',
    codes: [
      {
        code: 'technology',
        displayOrder: 1,
        nameTranslations: { vi: 'Công nghệ thông tin', en: 'Technology' },
      },
      {
        code: 'business',
        displayOrder: 2,
        nameTranslations: { vi: 'Kinh doanh', en: 'Business' },
      },
      {
        code: 'design',
        displayOrder: 3,
        nameTranslations: { vi: 'Thiết kế', en: 'Design' },
      },
      {
        code: 'healthcare',
        displayOrder: 4,
        nameTranslations: { vi: 'Y tế - Sức khỏe', en: 'Healthcare' },
      },
      {
        code: 'education',
        displayOrder: 5,
        nameTranslations: { vi: 'Giáo dục', en: 'Education' },
      },
      {
        code: 'finance',
        displayOrder: 6,
        nameTranslations: { vi: 'Tài chính - Ngân hàng', en: 'Finance' },
      },
      {
        code: 'marketing',
        displayOrder: 7,
        nameTranslations: { vi: 'Tiếp thị - Truyền thông', en: 'Marketing' },
      },
      {
        code: 'engineering',
        displayOrder: 8,
        nameTranslations: { vi: 'Kỹ thuật', en: 'Engineering' },
      },
    ],
  },
];

@Injectable()
export class MasterDataCodeSeedService {
  constructor(
    @InjectRepository(MasterDataCodeEntity)
    private readonly repository: Repository<MasterDataCodeEntity>,
    @InjectRepository(MasterDataGroupEntity)
    private readonly groupRepository: Repository<MasterDataGroupEntity>,
  ) {}

  async run() {
    for (const { groupKey, codes } of MASTER_DATA_CODES) {
      const group = await this.groupRepository.findOne({
        where: { groupKey },
      });

      // The group seed runs first; if the row is still missing the database is
      // in an unexpected state, so skip rather than create a half-formed group.
      if (!group) {
        continue;
      }

      for (const code of codes) {
        await this.upsertCode(group, code);
      }
    }
  }

  private async upsertCode(
    group: MasterDataGroupEntity,
    code: SeedCode,
  ): Promise<void> {
    const existing = await this.repository.findOne({
      where: { code: code.code, group: { id: group.id } },
    });

    if (!existing) {
      await this.repository.save(
        this.repository.create({
          code: code.code,
          name: code.nameTranslations[DEFAULT_LOCALE],
          nameTranslations: code.nameTranslations,
          descriptionTranslations: {},
          displayOrder: code.displayOrder,
          isActive: true,
          group,
        }),
      );
      return;
    }

    const nameTranslations = mergeSeedTranslations(
      existing.nameTranslations,
      code.nameTranslations,
    );

    if (
      JSON.stringify(nameTranslations) ===
      JSON.stringify(existing.nameTranslations ?? {})
    ) {
      return;
    }

    // Update in place — the id, and therefore every foreign key pointing at
    // it, is preserved.
    existing.nameTranslations = nameTranslations;
    existing.name = nameTranslations[DEFAULT_LOCALE] ?? existing.name;
    await this.repository.save(existing);
  }
}
