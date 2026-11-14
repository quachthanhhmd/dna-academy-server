/** The survey question types — kept in one place for the admin and learner sides. */
export const SURVEY_QUESTION_TYPES = [
  'single_choice',
  'multiple_choice',
  'rating_scale',
  'short_text',
  'long_text',
] as const;

export type SurveyQuestionType = (typeof SURVEY_QUESTION_TYPES)[number];

export const SURVEY_CHOICE_TYPES: readonly string[] = [
  'single_choice',
  'multiple_choice',
];

/** A rating scale runs 1–5 or 1–10. */
export const SURVEY_RATING_MAXES = [5, 10] as const;

export const SURVEY_MIN_OPTIONS = 2;

/** Longest answer kept for each text type, in characters. */
export const SURVEY_TEXT_LIMITS: Record<string, number> = {
  short_text: 500,
  long_text: 5000,
};
