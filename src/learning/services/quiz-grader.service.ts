import { Injectable } from '@nestjs/common';
export { QUESTION_TYPES } from '../../quiz-questions/quiz-question-types';

/** Graded all-or-nothing against the stored answer key. */
export const ALL_OR_NOTHING_TYPES = ['multiple_choice', 'true_false'] as const;

/** Graded proportionally — see `gradeMultipleSelect`. */
export const PARTIAL_CREDIT_TYPES = ['multiple_select'] as const;

/**
 * Epic 4 v2.1 §2.4 — types with no answer key. Any non-empty answer scores
 * full marks; an empty one scores nothing. There is no reviewer and no
 * `passed: null` state.
 */
export const AUTO_PASS_TYPES = [
  'short_answer',
  'essay',
  'rating_scale',
  'file_upload',
] as const;

/** Every type that contributes to the denominator of `score`. */
export const SCORED_TYPES = [
  ...ALL_OR_NOTHING_TYPES,
  ...PARTIAL_CREDIT_TYPES,
  ...AUTO_PASS_TYPES,
] as const;

export type GradableQuestion = {
  id: string;
  questionType: string;
  options: { id: string; isCorrect: boolean }[];
  /**
   * Relative weight in the score. The schema has no weight column yet, so in
   * practice every question weighs 1 — the formula is here because §2.4
   * defines the score in weighted terms and a future column must not require
   * re-deriving it.
   */
  weight?: number | null;
  ratingMin?: number | null;
  ratingMax?: number | null;
};

export type SubmittedAnswer = {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string | null;
  ratingAnswer?: number | null;
  fileId?: string | null;
};

export type QuestionGrade = {
  questionId: string;
  /** 0–1 fraction of this question's weight that was earned. */
  score: number;
  /** True only at full marks — what the review panel shows as a ✓. */
  isCorrect: boolean;
  /** Full marks awarded without an answer key (§2.4 auto-pass). */
  autoPassed: boolean;
  /** Correct choices selected / total correct — the partial-credit chip. */
  correctSelected: number;
  totalCorrect: number;
};

export type GradeResult = {
  perQuestion: QuestionGrade[];
  /** Weighted percentage across every scored question, 0–100. */
  score: number;
  passed: boolean;
};

const includes = (list: readonly string[], value: string): boolean =>
  list.includes(value);

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const hasText = (value?: string | null): boolean =>
  typeof value === 'string' && value.trim() !== '';

/**
 * Epic 4 v2.1 §2.4 — the whole of quiz grading. Synchronous by design: a
 * submit resolves to `passed: true` (auto-advance) or `passed: false` (inline
 * retry), never to a queue.
 *
 * The score is `Σ(questionScore × weight) / Σ(weight) × 100`. Auto-passed
 * subjective questions sit in both the numerator and the denominator at full
 * marks, so they neither dilute nor inflate the threshold: a quiz that is half
 * essay still needs the objective half answered to clear 70%.
 */
@Injectable()
export class QuizGraderService {
  grade(
    questions: GradableQuestion[],
    answers: SubmittedAnswer[],
    passThresholdPercent: number,
  ): GradeResult {
    const answerByQuestion = new Map(
      answers.map((answer) => [answer.questionId, answer]),
    );

    const perQuestion: QuestionGrade[] = [];
    let earned = 0;
    let total = 0;

    for (const question of questions) {
      if (!includes(SCORED_TYPES, question.questionType)) {
        // An unrecognised type is carried by neither side of the ratio, so a
        // future type added to the DB cannot silently fail every student.
        continue;
      }

      const grade = this.gradeQuestion(
        question,
        answerByQuestion.get(question.id),
      );
      const weight = question.weight ?? 1;

      perQuestion.push(grade);
      earned += grade.score * weight;
      total += weight;
    }

    const score = total > 0 ? Math.round((earned / total) * 100) : 0;

    return {
      perQuestion,
      score,
      passed: total > 0 && score >= passThresholdPercent,
    };
  }

  private gradeQuestion(
    question: GradableQuestion,
    answer?: SubmittedAnswer,
  ): QuestionGrade {
    const correctIds = question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id);
    const selected = answer?.selectedOptionIds ?? [];
    const correctSelected = selected.filter((id) =>
      correctIds.includes(id),
    ).length;

    const base = {
      questionId: question.id,
      correctSelected,
      totalCorrect: correctIds.length,
    };

    if (includes(AUTO_PASS_TYPES, question.questionType)) {
      const score = this.autoPassScore(question, answer);

      return {
        ...base,
        score,
        isCorrect: score === 1,
        autoPassed: score === 1,
      };
    }

    if (includes(PARTIAL_CREDIT_TYPES, question.questionType)) {
      const wrongSelected = selected.length - correctSelected;
      const score = correctIds.length
        ? clamp01((correctSelected - wrongSelected) / correctIds.length)
        : 0;

      return { ...base, score, isCorrect: score === 1, autoPassed: false };
    }

    // All-or-nothing: the selection must be exactly the answer key.
    const exact =
      correctIds.length > 0 &&
      selected.length === correctIds.length &&
      correctSelected === correctIds.length;

    return {
      ...base,
      score: exact ? 1 : 0,
      isCorrect: exact,
      autoPassed: false,
    };
  }

  /** Full marks for any answer that is actually present. */
  private autoPassScore(
    question: GradableQuestion,
    answer?: SubmittedAnswer,
  ): number {
    if (!answer) {
      return 0;
    }

    if (question.questionType === 'file_upload') {
      return answer.fileId ? 1 : 0;
    }

    if (question.questionType === 'rating_scale') {
      const value = answer.ratingAnswer;

      if (typeof value !== 'number' || Number.isNaN(value)) {
        return 0;
      }

      // An unset range means the question declares no bounds to violate.
      const min = question.ratingMin ?? Number.NEGATIVE_INFINITY;
      const max = question.ratingMax ?? Number.POSITIVE_INFINITY;

      return value >= min && value <= max ? 1 : 0;
    }

    return hasText(answer.textAnswer) ? 1 : 0;
  }
}
