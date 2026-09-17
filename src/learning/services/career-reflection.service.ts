import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CareerReflectionAnswersService } from '../../career-reflection-answers/career-reflection-answers.service';
import {
  FREE_TEXT_TYPE,
  SELECTION_TYPE,
} from '../../career-reflection-questions/career-reflection-question-types';
import { isAllowedOptionKey } from '../../career-reflection-questions/career-reflection-shape';
import { CareerReflectionQuestionsService } from '../../career-reflection-questions/career-reflection-questions.service';
import { CareerReflectionQuestion } from '../../career-reflection-questions/domain/career-reflection-question';
import { AllConfigType } from '../../config/config.type';
import { Enrollment } from '../../enrollments/domain/enrollment';
import { EnrollmentsService } from '../../enrollments/enrollments.service';
import { LocaleContext } from '../../utils/i18n/locale-context';
import { pickLocalized } from '../../utils/i18n/pick-localized';
import { DEFAULT_CAREER_REFLECTION_MIN_CHARS } from '../config/learning.config';

/** What the certificate-screen form renders, already in the caller's locale. */
export type CareerQuestionView = {
  id: string;
  questionType: string;
  questionText: string;
  isRequired: boolean;
  displayOrder: number;
  options: { key: number; label: string }[] | null;
};

export type CareerAnswerView = {
  questionId: string;
  ratingAnswer: number | null;
  textAnswer: string | null;
  submittedAt: Date | null;
  updatedAt: Date | null;
};

export type CareerReflectionRules = {
  /** Minimum trimmed characters for a free-text answer (D3). */
  minTextLength: number;
};

export type CareerAnswerInput = {
  questionId: string;
  ratingAnswer?: number | null;
  textAnswer?: string | null;
};

/** Per-question validation codes returned under `errors.answers`. */
export type CareerAnswerError =
  | 'unknownQuestion'
  | 'duplicateQuestion'
  | 'required'
  | 'answerTypeMismatch'
  | 'invalidOptionKey'
  | 'textTooShort';

/**
 * Text as the server measures and stores it.
 *
 * NFC first: Vietnamese typed through some input methods arrives decomposed,
 * where "ệ" is three code points rather than one. Without normalising, the
 * same visible answer would count as a different length depending on the
 * keyboard, and could pass on one device and fail on another.
 */
export const normaliseText = (value: string | null | undefined): string =>
  (value ?? '').normalize('NFC').trim();

/**
 * Epic 4.6 — the career reflection on the certificate screen (`STU_CER_10`).
 *
 * Split out of `CompletionService`, which it had outgrown: the rework adds a
 * per-question validation matrix, server-side localisation and a real upsert,
 * none of which has anything to do with ratings or certificates.
 */
@Injectable()
export class CareerReflectionService {
  constructor(
    private readonly questions: CareerReflectionQuestionsService,
    private readonly answers: CareerReflectionAnswersService,
    private readonly enrollments: EnrollmentsService,
    private readonly config: ConfigService<AllConfigType>,
  ) {}

  rules(): CareerReflectionRules {
    return {
      minTextLength:
        this.config.get('learning.careerReflectionMinChars', { infer: true }) ??
        DEFAULT_CAREER_REFLECTION_MIN_CHARS,
    };
  }

  /**
   * D5 — text and option labels localised on the server, falling back to
   * Vietnamese.
   *
   * Projected rather than passed through: the stored rows carry every
   * translation, and returning them would ship the whole translation table on
   * a public endpoint for a client that only ever needs one language.
   */
  private view(question: CareerReflectionQuestion): CareerQuestionView {
    const locale = LocaleContext.current();

    return {
      id: question.id,
      questionType: question.questionType,
      questionText: pickLocalized(
        question.questionTextTranslations,
        locale,
        question.questionText,
      ),
      isRequired: question.isRequired,
      displayOrder: question.displayOrder,
      options:
        question.questionType === SELECTION_TYPE
          ? (question.options ?? []).map((option) => ({
              key: option.key,
              label: pickLocalized(
                option.labelTranslations,
                locale,
                option.label,
              ),
            }))
          : null,
    };
  }

  /** BE-3 — `GET /career-reflection-questions/grouped?courseId=`. */
  async questionsForCourse(courseId: string) {
    const questions = await this.questions.findForCourse(courseId);

    return {
      questions: questions.map((question) => this.view(question)),
      rules: this.rules(),
    };
  }

  /** BE-5 — `GET /enrollments/:id/career-reflection`. */
  async getForEnrollment(enrollmentId: string, studentId: number) {
    const enrollment = await this.findOwnEnrollment(enrollmentId, studentId);
    const questions = await this.questions.findForCourse(enrollment.course.id);

    return {
      questions: questions.map((question) => this.view(question)),
      answers: await this.currentAnswers(enrollmentId, questions),
      rules: this.rules(),
    };
  }

  /**
   * BE-4 — `POST /enrollments/:id/career-reflection`.
   *
   * Every answer is checked before anything is written, and **every** problem
   * is reported at once, keyed by question id — so the form can put an inline
   * error under each question instead of revealing them one submit at a time.
   */
  async submit(
    enrollmentId: string,
    studentId: number,
    input: CareerAnswerInput[],
  ) {
    const enrollment = await this.findOwnEnrollment(enrollmentId, studentId);

    // findForCourse returns active questions only, so an answer to one that
    // was deactivated while the form was open is rejected as unknown.
    const questions = await this.questions.findForCourse(enrollment.course.id);
    const byId = new Map(questions.map((question) => [question.id, question]));
    const { minTextLength } = this.rules();

    const errors: Record<string, CareerAnswerError> = {};
    const writes: {
      questionId: string;
      ratingAnswer: number | null;
      textAnswer: string | null;
    }[] = [];
    const seen = new Set<string>();

    for (const answer of input) {
      if (seen.has(answer.questionId)) {
        errors[answer.questionId] = 'duplicateQuestion';
        continue;
      }

      seen.add(answer.questionId);

      const question = byId.get(answer.questionId);

      if (!question) {
        errors[answer.questionId] = 'unknownQuestion';
        continue;
      }

      const result = CareerReflectionService.check(
        question,
        answer,
        minTextLength,
      );

      if (result.error) {
        errors[question.id] = result.error;
      } else if (result.write) {
        writes.push(result.write);
      }
    }

    // A required question the payload never mentioned is as unanswered as one
    // it sent blank.
    for (const question of questions) {
      if (question.isRequired && !seen.has(question.id)) {
        errors[question.id] = 'required';
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { answers: errors },
      });
    }

    await this.answers.upsertForEnrollment(enrollmentId, writes);

    return {
      savedCount: writes.length,
      answers: await this.currentAnswers(enrollmentId, questions),
    };
  }

  /**
   * The rules for one answer, by question type (§2.2).
   *
   * Exactly one of `ratingAnswer` / `textAnswer` belongs to each type, and
   * sending the other is rejected rather than ignored: a client that puts text
   * under a selection has misread the question list, and saving the half that
   * happened to fit would hide that.
   *
   * An optional question left blank is not an error and is not written.
   */
  static check(
    question: CareerReflectionQuestion,
    answer: CareerAnswerInput,
    minTextLength: number,
  ): {
    error?: CareerAnswerError;
    write?: {
      questionId: string;
      ratingAnswer: number | null;
      textAnswer: string | null;
    };
  } {
    const hasRating =
      answer.ratingAnswer !== undefined && answer.ratingAnswer !== null;
    const hasText =
      answer.textAnswer !== undefined && answer.textAnswer !== null;

    if (question.questionType === FREE_TEXT_TYPE) {
      if (hasRating) {
        return { error: 'answerTypeMismatch' };
      }

      const text = normaliseText(answer.textAnswer);

      if (text === '') {
        return question.isRequired ? { error: 'required' } : {};
      }

      if (text.length < minTextLength) {
        return { error: 'textTooShort' };
      }

      return {
        write: {
          questionId: question.id,
          ratingAnswer: null,
          textAnswer: text,
        },
      };
    }

    if (hasText) {
      return { error: 'answerTypeMismatch' };
    }

    if (!hasRating) {
      return question.isRequired ? { error: 'required' } : {};
    }

    // The key must be one this question declares. An array index sent in its
    // place looks like a plausible number and would quietly count toward the
    // wrong option on the dashboard, so it is rejected, not coerced.
    if (!isAllowedOptionKey(question, answer.ratingAnswer)) {
      return { error: 'invalidOptionKey' };
    }

    return {
      write: {
        questionId: question.id,
        ratingAnswer: answer.ratingAnswer as number,
        textAnswer: null,
      },
    };
  }

  /**
   * Answers to the questions currently on the form.
   *
   * Answers to deactivated questions — including every answer to Epic 4.1's
   * retired Likert form — are left out, so a revisit never pre-fills a
   * question the student can no longer see.
   */
  private async currentAnswers(
    enrollmentId: string,
    questions: CareerReflectionQuestion[],
  ): Promise<CareerAnswerView[]> {
    const onForm = new Set(questions.map((question) => question.id));
    const rows = await this.answers.findByEnrollmentId(enrollmentId);

    return rows
      .filter((row) => onForm.has(row.question.id))
      .map((row) => ({
        questionId: row.question.id,
        ratingAnswer: row.ratingAnswer ?? null,
        textAnswer: row.textAnswer ?? null,
        submittedAt: row.submittedAt ?? null,
        updatedAt: row.updatedAt ?? null,
      }));
  }

  private async findOwnEnrollment(
    enrollmentId: string,
    studentId: number,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollments.findById(enrollmentId);

    if (!enrollment) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'enrollmentNotFound',
      });
    }

    if (enrollment.student.id !== studentId) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        error: 'notYourEnrollment',
      });
    }

    return enrollment;
  }
}
