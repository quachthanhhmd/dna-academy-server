/**
 * The question types the grader understands (Epic 4 v2.1 §2.4).
 *
 * Kept here rather than beside the grader because both the authoring side
 * (admin lecture-content editor) and the grading side have to agree on the
 * spelling. They did not: the admin API documented `single_choice`,
 * `short_text` and `rating`, none of which the grader has ever recognised, so
 * a quiz authored through the documented contract scored those questions as
 * nothing at all.
 */
export const QUESTION_TYPES = [
  'multiple_choice',
  'multiple_select',
  'true_false',
  'short_answer',
  'essay',
  'rating_scale',
  'file_upload',
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];
