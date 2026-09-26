import { TranslationMap } from '../../../../utils/i18n/translation-map.type';

/**
 * The three EPIC-08 form definitions (spec §0.1, §3).
 *
 * Content, not code: the tree is written as data so the questions, their
 * allowlists and their conditionals are reviewable side by side. The seed
 * upserts by `code` (definition), `(definition, code)` (question) and
 * `(question, option_code)` (allowlist), so re-running is a no-op and an admin
 * rename of a label survives.
 *
 * Every `masterDataGroupKey` points at a group the master-data seed owns; an
 * empty `options` array means "the whole active group", which is how Form B
 * gets all eleven professions without listing them (spec §2.2).
 */

export type SeedQuestion = {
  code: string;
  questionType:
    | 'short_text'
    | 'long_text'
    | 'email'
    | 'phone'
    | 'url'
    | 'single_select'
    | 'multi_select'
    | 'consent';
  sectionCode: string;
  masterDataGroupKey?: string;
  isRequired: boolean;
  displayOrder: number;
  labelTranslations: TranslationMap;
  placeholderTranslations?: TranslationMap;
  helperTranslations?: TranslationMap;
  minLength?: number;
  maxLength?: number;
  allowOther?: boolean;
  consentCode?: string;
  parentQuestionCode?: string;
  parentOptionCode?: string;
  /** Allowlist of option codes; omitted/empty = whole group. */
  options?: string[];
};

export type SeedForm = {
  code: string;
  nameTranslations: TranslationMap;
  descriptionTranslations?: TranslationMap;
  questions: SeedQuestion[];
};

const BA_SKILLS = [
  'sql',
  'jira_confluence',
  'wireframing',
  'requirements_gathering',
  'user_stories',
  'process_modelling_bpmn',
  'uml_modelling',
  'data_analysis_excel',
  'stakeholder_management',
  'agile_scrum',
  'other',
];

/** The six professions with a course, plus other — Form A's allowlist. */
const FORM_A_PROFESSIONS = [
  'business_analysis',
  'data_analytics',
  'software_testing_qa',
  'supply_chain',
  'project_management',
  'other',
];

export const FORM_DEFINITIONS: SeedForm[] = [
  // ───────────────────────── Form B — free course waitlist ─────────────────
  {
    code: 'free_course_waitlist',
    nameTranslations: {
      vi: 'Đăng ký nhận thông tin khoá học',
      en: 'Free course waitlist',
    },
    questions: [
      {
        code: 'full_name',
        questionType: 'short_text',
        sectionCode: 'student_info',
        isRequired: true,
        displayOrder: 1,
        labelTranslations: { vi: 'Họ và tên', en: 'Full name' },
        placeholderTranslations: { vi: 'Nguyễn Văn A', en: 'Jane Doe' },
        minLength: 2,
        maxLength: 160,
      },
      {
        code: 'email',
        questionType: 'email',
        sectionCode: 'student_info',
        isRequired: true,
        displayOrder: 2,
        labelTranslations: { vi: 'Email', en: 'Email' },
        placeholderTranslations: {
          vi: 'ban@example.com',
          en: 'you@example.com',
        },
        maxLength: 255,
      },
      {
        code: 'phone',
        questionType: 'phone',
        sectionCode: 'student_info',
        isRequired: false,
        displayOrder: 3,
        labelTranslations: { vi: 'Số điện thoại', en: 'Phone' },
        placeholderTranslations: { vi: '0901 234 567', en: '0901 234 567' },
        maxLength: 32,
      },
      {
        code: 'profession',
        questionType: 'multi_select',
        sectionCode: 'learning_needs',
        masterDataGroupKey: 'expertise_area',
        isRequired: true,
        displayOrder: 1,
        allowOther: true,
        labelTranslations: {
          vi: 'Bạn quan tâm đến nghề/lĩnh vực nào?',
          en: 'Which fields interest you?',
        },
      },
      {
        code: 'referral_source',
        questionType: 'single_select',
        sectionCode: 'learning_needs',
        masterDataGroupKey: 'form_referral_source',
        isRequired: false,
        displayOrder: 2,
        allowOther: true,
        labelTranslations: {
          vi: 'Bạn biết đến DNA Academy từ đâu?',
          en: 'Where did you hear about DNA Academy?',
        },
      },
      {
        code: 'biggest_challenge',
        questionType: 'long_text',
        sectionCode: 'learning_needs',
        isRequired: false,
        displayOrder: 3,
        labelTranslations: {
          vi: 'Điều gì đang cản trở bạn nhiều nhất?',
          en: 'What is holding you back the most?',
        },
        minLength: 10,
        maxLength: 2000,
      },
      {
        code: 'contact_consent',
        questionType: 'consent',
        sectionCode: 'consent',
        isRequired: true,
        displayOrder: 1,
        allowOther: false,
        consentCode: 'contact',
        labelTranslations: {
          vi: 'Tôi đồng ý được liên hệ về các khoá học phù hợp.',
          en: 'I agree to be contacted about suitable courses.',
        },
      },
    ],
  },

  // ───────────────────── Form C — instructor application ───────────────────
  {
    code: 'instructor_application',
    nameTranslations: {
      vi: 'Đăng ký làm giảng viên',
      en: 'Instructor application',
    },
    questions: [
      {
        code: 'full_name',
        questionType: 'short_text',
        sectionCode: 'about_you',
        isRequired: true,
        displayOrder: 1,
        labelTranslations: { vi: 'Họ và tên', en: 'Full name' },
        minLength: 2,
        maxLength: 160,
      },
      {
        code: 'email',
        questionType: 'email',
        sectionCode: 'about_you',
        isRequired: true,
        displayOrder: 2,
        labelTranslations: { vi: 'Email', en: 'Email' },
        maxLength: 255,
      },
      {
        code: 'phone',
        questionType: 'phone',
        sectionCode: 'about_you',
        isRequired: true,
        displayOrder: 3,
        labelTranslations: { vi: 'Số điện thoại', en: 'Phone' },
        maxLength: 32,
      },
      {
        code: 'profession',
        questionType: 'single_select',
        sectionCode: 'about_you',
        masterDataGroupKey: 'expertise_area',
        isRequired: true,
        displayOrder: 4,
        allowOther: true,
        labelTranslations: {
          vi: 'Lĩnh vực chuyên môn của bạn là gì?',
          en: 'What is your field of expertise?',
        },
      },
      {
        code: 'experience_years',
        questionType: 'single_select',
        sectionCode: 'about_you',
        masterDataGroupKey: 'form_experience_years',
        isRequired: true,
        displayOrder: 5,
        labelTranslations: {
          vi: 'Bạn có bao nhiêu năm kinh nghiệm?',
          en: 'How many years of experience do you have?',
        },
      },
      {
        code: 'taught_before',
        questionType: 'single_select',
        sectionCode: 'teaching',
        masterDataGroupKey: 'form_teaching_experience',
        isRequired: true,
        displayOrder: 1,
        labelTranslations: {
          vi: 'Bạn đã từng giảng dạy chưa?',
          en: 'Have you taught before?',
        },
      },
      {
        code: 'contribution_mode',
        questionType: 'multi_select',
        sectionCode: 'teaching',
        masterDataGroupKey: 'form_contribution_mode',
        isRequired: true,
        displayOrder: 2,
        labelTranslations: {
          vi: 'Bạn muốn đóng góp theo hình thức nào?',
          en: 'How would you like to contribute?',
        },
      },
      {
        code: 'monthly_capacity',
        questionType: 'single_select',
        sectionCode: 'teaching',
        masterDataGroupKey: 'form_monthly_capacity',
        isRequired: false,
        displayOrder: 3,
        labelTranslations: {
          vi: 'Bạn có thể dạy bao nhiêu buổi mỗi tháng?',
          en: 'How many sessions per month can you teach?',
        },
      },
      {
        code: 'experiences_to_design',
        questionType: 'long_text',
        sectionCode: 'experiences_to_design',
        isRequired: true,
        displayOrder: 1,
        labelTranslations: {
          vi: 'Bạn muốn thiết kế khoá học dựa trên kinh nghiệm nào của mình?',
          en: 'What experience would you build a course around?',
        },
        minLength: 10,
        maxLength: 2000,
      },
      {
        code: 'contact_consent',
        questionType: 'consent',
        sectionCode: 'consent',
        isRequired: true,
        displayOrder: 1,
        allowOther: false,
        consentCode: 'contact',
        labelTranslations: {
          vi: 'Tôi đồng ý được liên hệ về việc tham gia giảng dạy.',
          en: 'I agree to be contacted about teaching.',
        },
      },
    ],
  },

  // ────────────────── Form A — advanced course interest ────────────────────
  {
    code: 'advanced_course_interest',
    nameTranslations: {
      vi: 'Đăng ký khoá học chuyên sâu',
      en: 'Advanced course interest',
    },
    questions: [
      {
        code: 'full_name',
        questionType: 'short_text',
        sectionCode: 'student_info',
        isRequired: true,
        displayOrder: 1,
        labelTranslations: { vi: 'Họ và tên', en: 'Full name' },
        minLength: 2,
        maxLength: 160,
      },
      {
        code: 'email',
        questionType: 'email',
        sectionCode: 'student_info',
        isRequired: true,
        displayOrder: 2,
        labelTranslations: { vi: 'Email', en: 'Email' },
        maxLength: 255,
      },
      {
        code: 'phone',
        questionType: 'phone',
        sectionCode: 'student_info',
        isRequired: true,
        displayOrder: 3,
        labelTranslations: { vi: 'Số điện thoại', en: 'Phone' },
        maxLength: 32,
      },
      {
        code: 'current_level',
        questionType: 'single_select',
        sectionCode: 'student_info',
        masterDataGroupKey: 'form_current_level',
        isRequired: true,
        displayOrder: 4,
        labelTranslations: {
          vi: 'Trình độ hiện tại của bạn?',
          en: 'What is your current level?',
        },
      },
      {
        code: 'profession',
        questionType: 'single_select',
        sectionCode: 'learning_needs',
        masterDataGroupKey: 'expertise_area',
        isRequired: true,
        displayOrder: 1,
        allowOther: true,
        options: FORM_A_PROFESSIONS,
        labelTranslations: {
          vi: 'Bạn muốn đăng ký khoá học nào?',
          en: 'Which course would you like to join?',
        },
      },
      {
        code: 'skills',
        questionType: 'multi_select',
        sectionCode: 'learning_needs',
        masterDataGroupKey: 'form_skill',
        isRequired: false,
        displayOrder: 2,
        options: BA_SKILLS,
        parentQuestionCode: 'profession',
        parentOptionCode: 'business_analysis',
        labelTranslations: {
          vi: 'Bạn muốn cải thiện kỹ năng nào?',
          en: 'Which skills do you want to improve?',
        },
      },
      {
        code: 'skills_other_text',
        questionType: 'long_text',
        sectionCode: 'learning_needs',
        isRequired: false,
        displayOrder: 3,
        parentQuestionCode: 'profession',
        parentOptionCode: 'other',
        labelTranslations: {
          vi: 'Kỹ năng bạn muốn cải thiện là gì?',
          en: 'Which skills do you want to improve?',
        },
        minLength: 10,
        maxLength: 2000,
      },
      {
        code: 'session_slot',
        questionType: 'multi_select',
        sectionCode: 'schedule',
        masterDataGroupKey: 'form_session_slot',
        isRequired: true,
        displayOrder: 1,
        allowOther: true,
        labelTranslations: {
          vi: 'Bạn có thể học vào thời gian nào?',
          en: 'When can you attend?',
        },
      },
      {
        code: 'time_band',
        questionType: 'single_select',
        sectionCode: 'schedule',
        masterDataGroupKey: 'form_time_band',
        isRequired: false,
        displayOrder: 2,
        labelTranslations: {
          vi: 'Khung giờ phù hợp nhất?',
          en: 'Which time band suits you best?',
        },
      },
      {
        code: 'weekly_hours',
        questionType: 'single_select',
        sectionCode: 'schedule',
        masterDataGroupKey: 'form_weekly_hours',
        isRequired: false,
        displayOrder: 3,
        labelTranslations: {
          vi: 'Bạn có thể dành bao nhiêu giờ mỗi tuần?',
          en: 'How many hours per week can you commit?',
        },
      },
      {
        code: 'learning_goal',
        questionType: 'single_select',
        sectionCode: 'goals',
        masterDataGroupKey: 'form_learning_goal',
        isRequired: true,
        displayOrder: 1,
        allowOther: true,
        labelTranslations: {
          vi: 'Sau khoá học bạn muốn làm được gì?',
          en: 'What do you want to achieve after the course?',
        },
      },
      {
        code: 'zoom_format_consent',
        questionType: 'consent',
        sectionCode: 'consent',
        isRequired: true,
        displayOrder: 1,
        allowOther: false,
        consentCode: 'zoom_format',
        labelTranslations: {
          vi: 'Tôi hiểu khoá học diễn ra trực tiếp qua Zoom theo nhóm.',
          en: 'I understand the course runs live on Zoom in a group.',
        },
      },
      {
        code: 'contact_consent',
        questionType: 'consent',
        sectionCode: 'consent',
        isRequired: true,
        displayOrder: 2,
        allowOther: false,
        consentCode: 'contact',
        labelTranslations: {
          vi: 'Tôi đồng ý được liên hệ về khoá học này.',
          en: 'I agree to be contacted about this course.',
        },
      },
    ],
  },
];
