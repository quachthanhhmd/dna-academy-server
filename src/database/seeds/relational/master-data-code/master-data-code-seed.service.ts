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
      // EPIC-08 D8: the forms reuse this group so instructor supply
      // (instructor_expertise) and student demand join on the same codes.
      {
        code: 'business_analysis',
        displayOrder: 9,
        nameTranslations: {
          vi: 'Phân tích nghiệp vụ',
          en: 'Business Analysis',
        },
      },
      {
        code: 'software_testing_qa',
        displayOrder: 10,
        nameTranslations: {
          vi: 'Kiểm thử phần mềm (QA)',
          en: 'Software Testing & QA',
        },
      },
      {
        code: 'project_management',
        displayOrder: 11,
        nameTranslations: { vi: 'Quản lý dự án', en: 'Project Management' },
      },
      {
        code: 'product_management',
        displayOrder: 12,
        nameTranslations: { vi: 'Quản lý sản phẩm', en: 'Product Management' },
      },
      {
        code: 'ui_ux',
        displayOrder: 13,
        nameTranslations: { vi: 'Thiết kế UI/UX', en: 'UI/UX Design' },
      },
      {
        code: 'other',
        displayOrder: 14,
        nameTranslations: { vi: 'Khác', en: 'Other' },
      },
      {
        // Form B only: a real answer ("no field yet"), never demand — §6.2 and
        // §6.5 exclude it from the ranking and the matrix.
        code: 'undecided',
        displayOrder: 15,
        nameTranslations: { vi: 'Chưa xác định', en: 'Undecided' },
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
      {
        code: 'career_switch',
        displayOrder: 6,
        nameTranslations: {
          vi: 'Đang chuyển hướng nghề nghiệp',
          en: 'Switching careers',
        },
      },
      {
        code: 'other',
        displayOrder: 7,
        nameTranslations: { vi: 'Khác', en: 'Other' },
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
      {
        code: 'other',
        displayOrder: 9,
        nameTranslations: { vi: 'Khác', en: 'Other' },
      },
    ],
  },
  {
    // GoalsStep current-status options. The API localizes `name` from these
    // translations through MasterDataCodeMapper and X-Locale.
    groupKey: 'learning_goal',
    codes: [
      {
        code: 'university_career',
        displayOrder: 1,
        nameTranslations: {
          vi: 'Tìm ngành nghề phù hợp khi đang học đại học',
          en: 'Find the right career while at university',
        },
      },
      {
        code: 'job_transition',
        displayOrder: 2,
        nameTranslations: {
          vi: 'Tìm ngành nghề phù hợp để chuyển đổi công việc',
          en: 'Find the right career to transition jobs',
        },
      },
      {
        code: 'deeper_understanding',
        displayOrder: 3,
        nameTranslations: {
          vi: 'Hiểu sâu hơn về một ngành nghề cụ thể',
          en: 'Deepen my understanding of a specific career',
        },
      },
      {
        code: 'core_skills',
        displayOrder: 4,
        nameTranslations: {
          vi: 'Xây dựng kỹ năng và dự án để tìm việc',
          en: 'Build core skills and projects that help me get a job',
        },
      },
      {
        code: 'other',
        displayOrder: 5,
        nameTranslations: { vi: 'Khác', en: 'Other' },
      },
    ],
  },
  {
    // EPIC-08. Prefixed `form_` so it cannot collide with an existing group
    // (the first draft's `learning_goal` already held onboarding rows).
    groupKey: 'form_current_level',
    codes: [
      {
        code: 'dna_intro_completed',
        displayOrder: 1,
        nameTranslations: {
          vi: 'Đã học khoá nhập môn DNA',
          en: 'Completed the DNA intro course',
        },
      },
      {
        code: 'has_basics',
        displayOrder: 2,
        nameTranslations: { vi: 'Có kiến thức cơ bản', en: 'Has the basics' },
      },
      {
        code: 'self_taught',
        displayOrder: 3,
        nameTranslations: { vi: 'Tự học', en: 'Self-taught' },
      },
      {
        code: 'project_experience',
        displayOrder: 4,
        nameTranslations: {
          vi: 'Đã làm dự án thực tế',
          en: 'Project experience',
        },
      },
      {
        code: 'working_in_field',
        displayOrder: 5,
        nameTranslations: {
          vi: 'Đang làm trong ngành',
          en: 'Working in the field',
        },
      },
    ],
  },
  {
    // EPIC-08. Prefixed `form_` so it cannot collide with an existing group
    // (the first draft's `learning_goal` already held onboarding rows).
    groupKey: 'form_learning_goal',
    codes: [
      {
        code: 'upskill',
        displayOrder: 1,
        nameTranslations: { vi: 'Nâng cao kỹ năng hiện có', en: 'Upskill' },
      },
      {
        code: 'apply_to_current_job',
        displayOrder: 2,
        nameTranslations: {
          vi: 'Áp dụng vào công việc hiện tại',
          en: 'Apply to the current job',
        },
      },
      {
        code: 'real_project',
        displayOrder: 3,
        nameTranslations: {
          vi: 'Làm một dự án thật',
          en: 'Build a real project',
        },
      },
      {
        code: 'portfolio',
        displayOrder: 4,
        nameTranslations: {
          vi: 'Có sản phẩm để giới thiệu',
          en: 'Build a portfolio',
        },
      },
      {
        code: 'internship_fresher',
        displayOrder: 5,
        nameTranslations: {
          vi: 'Thực tập / vị trí fresher',
          en: 'Internship or fresher role',
        },
      },
      {
        code: 'career_switch',
        displayOrder: 8,
        nameTranslations: {
          vi: 'Chuyển hướng nghề nghiệp',
          en: 'Switch careers',
        },
      },
      {
        code: 'promotion',
        displayOrder: 6,
        nameTranslations: { vi: 'Thăng tiến trong công việc', en: 'Promotion' },
      },
      {
        code: 'other',
        displayOrder: 7,
        nameTranslations: { vi: 'Khác', en: 'Other' },
      },
    ],
  },
  {
    // EPIC-08. Prefixed `form_` so it cannot collide with an existing group
    // (the first draft's `learning_goal` already held onboarding rows).
    groupKey: 'form_session_slot',
    codes: [
      {
        code: 'weekday_evening',
        displayOrder: 1,
        nameTranslations: { vi: 'Buổi tối ngày thường', en: 'Weekday evening' },
      },
      {
        code: 'sat_morning',
        displayOrder: 2,
        nameTranslations: { vi: 'Sáng thứ Bảy', en: 'Saturday morning' },
      },
      {
        code: 'sat_afternoon',
        displayOrder: 3,
        nameTranslations: { vi: 'Chiều thứ Bảy', en: 'Saturday afternoon' },
      },
      {
        code: 'sun_morning',
        displayOrder: 4,
        nameTranslations: { vi: 'Sáng Chủ nhật', en: 'Sunday morning' },
      },
      {
        code: 'sun_afternoon',
        displayOrder: 5,
        nameTranslations: { vi: 'Chiều Chủ nhật', en: 'Sunday afternoon' },
      },
      {
        code: 'other',
        displayOrder: 6,
        nameTranslations: { vi: 'Khác', en: 'Other' },
      },
    ],
  },
  {
    // EPIC-08. Prefixed `form_` so it cannot collide with an existing group
    // (the first draft's `learning_goal` already held onboarding rows).
    groupKey: 'form_time_band',
    codes: [
      {
        code: 'slot_18_20',
        displayOrder: 1,
        nameTranslations: { vi: '18:00 – 20:00', en: '18:00 – 20:00' },
      },
      {
        code: 'slot_19_21',
        displayOrder: 2,
        nameTranslations: { vi: '19:00 – 21:00', en: '19:00 – 21:00' },
      },
      {
        code: 'slot_20_22',
        displayOrder: 3,
        nameTranslations: { vi: '20:00 – 22:00', en: '20:00 – 22:00' },
      },
      {
        code: 'flexible',
        displayOrder: 4,
        nameTranslations: { vi: 'Linh hoạt', en: 'Flexible' },
      },
    ],
  },
  {
    // EPIC-08. Prefixed `form_` so it cannot collide with an existing group
    // (the first draft's `learning_goal` already held onboarding rows).
    groupKey: 'form_weekly_hours',
    codes: [
      {
        code: 'lt_3',
        displayOrder: 1,
        nameTranslations: { vi: 'Dưới 3 giờ', en: 'Under 3 hours' },
      },
      {
        code: '3_5',
        displayOrder: 2,
        nameTranslations: { vi: '3 – 5 giờ', en: '3 – 5 hours' },
      },
      {
        code: '5_8',
        displayOrder: 3,
        nameTranslations: { vi: '5 – 8 giờ', en: '5 – 8 hours' },
      },
      {
        code: 'gt_8',
        displayOrder: 4,
        nameTranslations: { vi: 'Trên 8 giờ', en: 'Over 8 hours' },
      },
    ],
  },
  {
    // EPIC-08. Prefixed `form_` so it cannot collide with an existing group
    // (the first draft's `learning_goal` already held onboarding rows).
    groupKey: 'form_referral_source',
    codes: [
      {
        code: 'facebook',
        displayOrder: 1,
        nameTranslations: { vi: 'Facebook', en: 'Facebook' },
      },
      {
        code: 'tiktok',
        displayOrder: 2,
        nameTranslations: { vi: 'TikTok', en: 'TikTok' },
      },
      {
        code: 'youtube',
        displayOrder: 3,
        nameTranslations: { vi: 'YouTube', en: 'YouTube' },
      },
      {
        code: 'friend_referral',
        displayOrder: 4,
        nameTranslations: {
          vi: 'Bạn bè giới thiệu',
          en: 'Referred by a friend',
        },
      },
      {
        code: 'other',
        displayOrder: 5,
        nameTranslations: { vi: 'Khác', en: 'Other' },
      },
    ],
  },
  {
    // EPIC-08. Prefixed `form_` so it cannot collide with an existing group
    // (the first draft's `learning_goal` already held onboarding rows).
    groupKey: 'form_skill',
    codes: [
      {
        code: 'sql',
        displayOrder: 1,
        nameTranslations: { vi: 'SQL', en: 'SQL' },
      },
      {
        code: 'jira_confluence',
        displayOrder: 2,
        nameTranslations: { vi: 'Jira / Confluence', en: 'Jira / Confluence' },
      },
      {
        code: 'wireframing',
        displayOrder: 3,
        nameTranslations: { vi: 'Wireframing', en: 'Wireframing' },
      },
      {
        code: 'requirements_gathering',
        displayOrder: 4,
        nameTranslations: {
          vi: 'Thu thập yêu cầu',
          en: 'Requirements gathering',
        },
      },
      {
        code: 'user_stories',
        displayOrder: 5,
        nameTranslations: { vi: 'Viết user story', en: 'User stories' },
      },
      {
        code: 'process_modelling_bpmn',
        displayOrder: 6,
        nameTranslations: {
          vi: 'Mô hình hoá quy trình (BPMN)',
          en: 'Process modelling (BPMN)',
        },
      },
      {
        code: 'uml_modelling',
        displayOrder: 7,
        nameTranslations: { vi: 'Mô hình hoá UML', en: 'UML modelling' },
      },
      {
        code: 'data_analysis_excel',
        displayOrder: 8,
        nameTranslations: {
          vi: 'Phân tích dữ liệu với Excel',
          en: 'Data analysis with Excel',
        },
      },
      {
        code: 'stakeholder_management',
        displayOrder: 9,
        nameTranslations: {
          vi: 'Quản lý các bên liên quan',
          en: 'Stakeholder management',
        },
      },
      {
        code: 'agile_scrum',
        displayOrder: 10,
        nameTranslations: { vi: 'Agile / Scrum', en: 'Agile / Scrum' },
      },
      {
        code: 'other',
        displayOrder: 11,
        nameTranslations: { vi: 'Khác', en: 'Other' },
      },
    ],
  },
  {
    // EPIC-08. Prefixed `form_` so it cannot collide with an existing group
    // (the first draft's `learning_goal` already held onboarding rows).
    groupKey: 'form_contribution_mode',
    codes: [
      {
        code: 'teach',
        displayOrder: 1,
        nameTranslations: { vi: 'Giảng dạy trực tiếp', en: 'Teach live' },
      },
      {
        code: 'build_content',
        displayOrder: 2,
        nameTranslations: {
          vi: 'Xây dựng nội dung bài học',
          en: 'Build lesson content',
        },
      },
      {
        code: 'design_exercise',
        displayOrder: 3,
        nameTranslations: { vi: 'Thiết kế bài tập', en: 'Design exercises' },
      },
      {
        code: 'share_case_study',
        displayOrder: 4,
        nameTranslations: {
          vi: 'Chia sẻ case study',
          en: 'Share a case study',
        },
      },
      {
        code: 'review_content',
        displayOrder: 5,
        nameTranslations: { vi: 'Phản biện nội dung', en: 'Review content' },
      },
      {
        code: 'mentor_career_talk',
        displayOrder: 6,
        nameTranslations: {
          vi: 'Cố vấn / chia sẻ nghề nghiệp',
          en: 'Mentor or career talk',
        },
      },
      {
        code: 'undecided',
        displayOrder: 7,
        nameTranslations: { vi: 'Chưa xác định', en: 'Undecided' },
      },
    ],
  },
  {
    // EPIC-08. Prefixed `form_` so it cannot collide with an existing group
    // (the first draft's `learning_goal` already held onboarding rows).
    groupKey: 'form_experience_years',
    codes: [
      {
        code: 'lt_1',
        displayOrder: 1,
        nameTranslations: { vi: 'Dưới 1 năm', en: 'Under 1 year' },
      },
      {
        code: '1_3',
        displayOrder: 2,
        nameTranslations: { vi: '1 – 3 năm', en: '1 – 3 years' },
      },
      {
        code: '3_5',
        displayOrder: 3,
        nameTranslations: { vi: '3 – 5 năm', en: '3 – 5 years' },
      },
      {
        code: '5_10',
        displayOrder: 4,
        nameTranslations: { vi: '5 – 10 năm', en: '5 – 10 years' },
      },
      {
        code: 'gt_10',
        displayOrder: 5,
        nameTranslations: { vi: 'Trên 10 năm', en: 'Over 10 years' },
      },
    ],
  },
  {
    // EPIC-08. Prefixed `form_` so it cannot collide with an existing group
    // (the first draft's `learning_goal` already held onboarding rows).
    groupKey: 'form_monthly_capacity',
    codes: [
      {
        code: 'lt_5',
        displayOrder: 1,
        nameTranslations: { vi: 'Dưới 5 buổi', en: 'Under 5 sessions' },
      },
      {
        code: '5_10',
        displayOrder: 2,
        nameTranslations: { vi: '5 – 10 buổi', en: '5 – 10 sessions' },
      },
      {
        code: '10_20',
        displayOrder: 3,
        nameTranslations: { vi: '10 – 20 buổi', en: '10 – 20 sessions' },
      },
      {
        code: 'gt_20',
        displayOrder: 4,
        nameTranslations: { vi: 'Trên 20 buổi', en: 'Over 20 sessions' },
      },
      {
        code: 'discuss',
        displayOrder: 5,
        nameTranslations: { vi: 'Cần trao đổi thêm', en: 'Needs discussion' },
      },
    ],
  },
  {
    // EPIC-08. Form C's "have you taught before?" — a two-option group so the
    // answer is a code, not free text, and stays chartable.
    groupKey: 'form_teaching_experience',
    codes: [
      {
        code: 'yes',
        displayOrder: 1,
        nameTranslations: { vi: 'Rồi', en: 'Yes' },
      },
      {
        code: 'no',
        displayOrder: 2,
        nameTranslations: { vi: 'Chưa', en: 'No' },
      },
    ],
  },
  {
    // PLAN-forms-insights B6. The themes an admin tags Form B's
    // "biggest challenge" free text with. `other` is offered so a genuine
    // category outside the list is still chartable.
    groupKey: 'form_theme_biggest_challenge',
    codes: [
      {
        code: 'time',
        displayOrder: 1,
        nameTranslations: { vi: 'Thiếu thời gian', en: 'Lack of time' },
      },
      {
        code: 'roadmap',
        displayOrder: 2,
        nameTranslations: {
          vi: 'Không biết bắt đầu từ đâu',
          en: 'No clear roadmap',
        },
      },
      {
        code: 'practice',
        displayOrder: 3,
        nameTranslations: {
          vi: 'Thiếu dự án thực tế',
          en: 'No real-world practice',
        },
      },
      {
        code: 'cost',
        displayOrder: 4,
        nameTranslations: { vi: 'Chi phí', en: 'Cost' },
      },
      {
        code: 'english',
        displayOrder: 5,
        nameTranslations: { vi: 'Tiếng Anh', en: 'English' },
      },
      {
        code: 'confidence',
        displayOrder: 6,
        nameTranslations: {
          vi: 'Thiếu tự tin, động lực',
          en: 'Confidence & motivation',
        },
      },
      {
        code: 'other',
        displayOrder: 7,
        nameTranslations: { vi: 'Khác', en: 'Other' },
      },
    ],
  },
  {
    // PLAN-forms-insights B6. Themes for Form C's "experiences to design".
    groupKey: 'form_theme_experiences_to_design',
    codes: [
      {
        code: 'domain',
        displayOrder: 1,
        nameTranslations: {
          vi: 'Case nghiệp vụ theo ngành',
          en: 'Industry cases',
        },
      },
      {
        code: 'tools',
        displayOrder: 2,
        nameTranslations: {
          vi: 'Công cụ & kỹ thuật',
          en: 'Tools & techniques',
        },
      },
      {
        code: 'career',
        displayOrder: 3,
        nameTranslations: {
          vi: 'Chuyển ngành & phỏng vấn',
          en: 'Career switch & interviews',
        },
      },
      {
        code: 'leadership',
        displayOrder: 4,
        nameTranslations: {
          vi: 'Quản lý dự án & team',
          en: 'Project & team leadership',
        },
      },
      {
        code: 'other',
        displayOrder: 5,
        nameTranslations: { vi: 'Khác', en: 'Other' },
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
        JSON.stringify(existing.nameTranslations ?? {}) &&
      existing.displayOrder === code.displayOrder &&
      existing.isActive
    ) {
      return;
    }

    // Update in place — the id, and therefore every foreign key pointing at
    // it, is preserved.
    existing.nameTranslations = nameTranslations;
    existing.name = nameTranslations[DEFAULT_LOCALE] ?? existing.name;
    existing.displayOrder = code.displayOrder;
    existing.isActive = true;
    await this.repository.save(existing);
  }
}
