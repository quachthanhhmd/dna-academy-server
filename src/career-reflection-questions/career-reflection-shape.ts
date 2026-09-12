import { HttpStatus, UnprocessableEntityException } from '@nestjs/common';
import {
  CAREER_QUESTION_TYPES,
  CareerReflectionOption,
  OPTION_COUNT_MAX,
  OPTION_COUNT_MIN,
  SLIDER_MAX_VALUE,
  SLIDER_MIN_VALUE,
  SLIDER_TYPE,
} from './career-reflection-question-types';

export type QuestionShape = {
  questionType: string;
  options?: CareerReflectionOption[] | null;
  labelMin?: string | null;
  labelMax?: string | null;
};

const reject = (field: string, code: string): never => {
  throw new UnprocessableEntityException({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    errors: { [field]: code },
  });
};

/**
 * Epic 4.1 §3.3 / D1 — a slider is described by its two end labels, a
 * radio/select by its options, and neither may borrow the other's fields.
 *
 * The database enforces the same rule (`CK_crq_shape`), which is what keeps a
 * bad row out no matter how it arrives. This runs first so an admin gets a
 * named field back instead of a raw constraint violation.
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

  if (question.questionType === SLIDER_TYPE) {
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
    if (!Number.isInteger(option?.value)) {
      reject('options', 'valueMustBeInteger');
    }

    if (typeof option?.label !== 'string' || option.label.trim() === '') {
      reject('options', 'labelRequired');
    }
  }

  if (new Set(list.map((option) => option.value)).size !== list.length) {
    reject('options', 'duplicateValue');
  }

  // D2 — every scale is authored ascending, least to most positive. Two
  // questions running in opposite directions land in the same `category`
  // bucket, and averaging them produces a number that means nothing.
  const ascending = list.every(
    (option, index) => index === 0 || option.value > list[index - 1].value,
  );

  if (!ascending) {
    reject('options', 'mustAscend');
  }
};

/**
 * Epic 4.1 §3.3 — is this the value of one of the question's own options
 * (radio/select), or inside the slider range?
 *
 * The value is the option's declared `value`, never its array position: an FE
 * that sends the index produces a plausible-looking number that quietly
 * corrupts the aggregate, so it has to be rejected rather than coerced.
 */
export const isAllowedAnswerValue = (
  question: Pick<QuestionShape, 'questionType' | 'options'>,
  value: number | null | undefined,
): boolean => {
  if (!Number.isInteger(value)) {
    return false;
  }

  const answer = value as number;

  if (question.questionType === SLIDER_TYPE) {
    return answer >= SLIDER_MIN_VALUE && answer <= SLIDER_MAX_VALUE;
  }

  return (question.options ?? []).some((option) => option.value === answer);
};
