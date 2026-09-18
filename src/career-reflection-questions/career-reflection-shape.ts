import { HttpStatus, UnprocessableEntityException } from '@nestjs/common';
import {
  CAREER_QUESTION_TYPES,
  CareerReflectionOption,
  FREE_TEXT_TYPE,
  OPTION_COUNT_MAX,
  OPTION_COUNT_MIN,
  SELECTION_TYPE,
} from './career-reflection-question-types';

export type QuestionShape = {
  questionType: string;
  options?: CareerReflectionOption[] | null;
};

const reject = (field: string, code: string): never => {
  throw new UnprocessableEntityException({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    errors: { [field]: code },
  });
};

/**
 * Epic 4.6 §2.2 — a `free_text` question carries no options; a `selection`
 * carries between two and seven.
 *
 * The database enforces the same rule (`CK_crq_shape`), which is what keeps a
 * bad row out however it arrives. This runs first so an admin gets a named
 * field back instead of a raw constraint violation.
 */
export const assertQuestionShape = (question: QuestionShape): void => {
  if (
    !(CAREER_QUESTION_TYPES as readonly string[]).includes(
      question.questionType,
    )
  ) {
    reject('questionType', 'unsupported');
  }

  const { options } = question;

  if (question.questionType === FREE_TEXT_TYPE) {
    if (options != null) {
      reject('options', 'notAllowedForType');
    }
    return;
  }

  if (!Array.isArray(options) || options.length === 0) {
    reject('options', 'requiredForType');
  }

  const list = options as CareerReflectionOption[];

  if (list.length < OPTION_COUNT_MIN || list.length > OPTION_COUNT_MAX) {
    reject('options', 'outOfRange');
  }

  for (const option of list) {
    if (!Number.isInteger(option?.key) || option.key < 1) {
      reject('options', 'keyMustBePositiveInteger');
    }

    if (typeof option?.label !== 'string' || option.label.trim() === '') {
      reject('options', 'labelRequired');
    }
  }

  if (new Set(list.map((option) => option.key)).size !== list.length) {
    reject('options', 'duplicateKey');
  }

  // Epic 4.1 required keys to ascend, because its scales were averaged and
  // two scales running in opposite directions would cancel out. Nothing is
  // averaged any more — a selection is counted per option — and requiring
  // ascending keys would stop an admin reordering options without renumbering
  // them, which is exactly the edit that corrupts answers already given.
};

/** Epic 4.6 §2.2 — is `key` one of this selection question's own options? */
export const isAllowedOptionKey = (
  question: Pick<QuestionShape, 'questionType' | 'options'>,
  key: number | null | undefined,
): boolean =>
  question.questionType === SELECTION_TYPE &&
  Number.isInteger(key) &&
  (question.options ?? []).some((option) => option.key === key);
