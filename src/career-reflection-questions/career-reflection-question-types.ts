import { TranslationMap } from '../utils/i18n/translation-map.type';

/** Epic 4.1 §3.1 — how the post-completion form renders a question. */
export const CAREER_QUESTION_TYPES = ['slider', 'radio', 'select'] as const;

export type CareerQuestionType = (typeof CAREER_QUESTION_TYPES)[number];

export const SLIDER_TYPE: CareerQuestionType = 'slider';

/** Sliders have no declared options; §3.3 validates them against this range. */
export const SLIDER_MIN_VALUE = 1;
export const SLIDER_MAX_VALUE = 5;

export const OPTION_COUNT_MIN = 2;
export const OPTION_COUNT_MAX = 7;

/**
 * One choice on a `radio` / `select` question.
 *
 * `value` is what lands in `career_reflection_answer.ratingAnswer`, and it is
 * the option's own declared number — never its array position. Epic 4.1 D2:
 * two questions whose scales ran in opposite directions were both averaged
 * into the same `category` bucket, which made the aggregate meaningless.
 * Every scale is authored ascending, least → most positive.
 */
export type CareerReflectionOption = {
  value: number;
  /** Default locale (`vi`); other locales live in `labelTranslations`. */
  label: string;
  labelTranslations?: TranslationMap | null;
};
