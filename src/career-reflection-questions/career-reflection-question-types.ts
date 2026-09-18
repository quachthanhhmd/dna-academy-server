import { TranslationMap } from '../utils/i18n/translation-map.type';

/**
 * Epic 4.6 §2.1 — how the certificate-screen form renders a question.
 *
 * Replaces Epic 4.1's `slider | radio | select`. The reworked form asks two
 * open questions and three single-choice ones; nothing on it is a scale any
 * more, so there is no slider and no end labels.
 */
export const CAREER_QUESTION_TYPES = ['free_text', 'selection'] as const;

export type CareerQuestionType = (typeof CAREER_QUESTION_TYPES)[number];

export const FREE_TEXT_TYPE: CareerQuestionType = 'free_text';
export const SELECTION_TYPE: CareerQuestionType = 'selection';

export const OPTION_COUNT_MIN = 2;
export const OPTION_COUNT_MAX = 7;

/**
 * Options on the reworked form are whole sentences — Q2's first choice is
 * about 150 characters in Vietnamese — so the old 100-character cap no longer
 * fits the content it is meant to hold.
 */
export const OPTION_LABEL_MAX = 500;

/** Upper bound on a free-text answer. The minimum is configurable (BE-7). */
export const TEXT_ANSWER_MAX = 5000;

/**
 * One choice on a `selection` question.
 *
 * `key` is what lands in `career_reflection_answer.rating_answer`, and it is
 * the option's own declared number — never its position in the array. That
 * distinction is what lets an admin reorder options for display without
 * silently re-labelling every answer already given: the array order is the
 * display order, the key is the identity.
 */
export type CareerReflectionOption = {
  key: number;
  /** Default locale (`vi`); other locales live in `labelTranslations`. */
  label: string;
  labelTranslations?: TranslationMap | null;
};
