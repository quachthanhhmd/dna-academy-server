import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LectureContentQuizzesService } from '../../lecture-content-quizzes/lecture-content-quizzes.service';
import { QuizQuestionsService } from '../../quiz-questions/quiz-questions.service';
import { QuizAnswerOptionsService } from '../../quiz-answer-options/quiz-answer-options.service';
import { QuizAttemptsService } from '../../quiz-attempts/quiz-attempts.service';
import { QuizAttemptAnswersService } from '../../quiz-attempt-answers/quiz-attempt-answers.service';
import { QuizSavesService } from '../../quiz-saves/quiz-saves.service';
import { EnrollmentResolverService } from './enrollment-resolver.service';
import { QuizGraderService, SubmittedAnswer } from './quiz-grader.service';
import { ProgressService } from './progress.service';
import { CourseCurriculumService } from './course-curriculum.service';
import { QuizAttemptDto, QuizResultDto } from '../dto/quiz.dto';
import { bestScore } from '../best-score';

const parseJson = (value?: string | null): Record<string, unknown> | null => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    // A corrupt draft must not stop the student starting the quiz.
    return null;
  }
};

@Injectable()
export class QuizService {
  constructor(
    private readonly resolver: EnrollmentResolverService,
    private readonly quizzesService: LectureContentQuizzesService,
    private readonly quizQuestionsService: QuizQuestionsService,
    private readonly quizAnswerOptionsService: QuizAnswerOptionsService,
    private readonly quizAttemptsService: QuizAttemptsService,
    private readonly quizAttemptAnswersService: QuizAttemptAnswersService,
    private readonly quizSavesService: QuizSavesService,
    private readonly grader: QuizGraderService,
    private readonly progressService: ProgressService,
    private readonly curriculumService: CourseCurriculumService,
  ) {}

  /** Epic 4 v2 §2.3 — `POST /lectures/:lectureId/quiz-attempts`. */
  async startAttempt(
    lectureId: string,
    studentId: number,
  ): Promise<QuizAttemptDto> {
    const { enrollment } = await this.resolver.resolveEnrollment(
      lectureId,
      studentId,
    );

    const quiz = await this.quizzesService.findByLectureId(lectureId);

    if (!quiz) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { lecture: 'notAQuiz' },
      });
    }

    const { questions } = await this.loadQuestions(lectureId);

    const previous = await this.quizAttemptsService.findByEnrollmentAndLecture(
      enrollment.id,
      lectureId,
    );

    const attempt = await this.quizAttemptsService.create({
      enrollment: { id: enrollment.id } as never,
      lecture: { id: lectureId } as never,
      score: null,
      passed: null,
      submittedAt: null,
    });

    const draft = quiz.allowResume
      ? await this.quizSavesService.findByEnrollmentAndLecture(
          enrollment.id,
          lectureId,
        )
      : null;

    return {
      attemptId: attempt.id,
      passThresholdPercent: quiz.passThresholdPercent,
      passingScore: quiz.passingScore,
      instructions: quiz.instructions ?? null,
      timeLimitSecs: quiz.timeLimitSecs ?? null,
      previousAttempts: previous.length,
      bestScore: bestScore(previous),
      resumedAnswers: parseJson(draft?.answersJson),
      questions,
    };
  }

  /** Epic 4 v2 §2.3 — `PUT /lectures/:lectureId/quiz-save`. */
  async saveDraft(
    lectureId: string,
    studentId: number,
    answersJson: Record<string, unknown>,
  ): Promise<void> {
    const { enrollment } = await this.resolver.resolveEnrollment(
      lectureId,
      studentId,
    );

    const serialized = JSON.stringify(answersJson ?? {});
    const existing = await this.quizSavesService.findByEnrollmentAndLecture(
      enrollment.id,
      lectureId,
    );

    if (existing) {
      await this.quizSavesService.update(existing.id, {
        answersJson: serialized,
        savedAt: new Date(),
      });
      return;
    }

    await this.quizSavesService.create({
      enrollment: { id: enrollment.id } as never,
      lecture: { id: lectureId } as never,
      answersJson: serialized,
      savedAt: new Date(),
    });
  }

  /** Epic 4 v2 §2.3 — `POST /quiz-attempts/:id/submit`. */
  async submit(
    attemptId: string,
    studentId: number,
    answers: SubmittedAnswer[],
  ): Promise<QuizResultDto> {
    const attempt = await this.findOwnAttempt(attemptId, studentId);

    if (attempt.submittedAt) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        code: 'ATTEMPT_ALREADY_SUBMITTED',
      });
    }

    const lectureId = attempt.lecture.id;
    const quiz = await this.quizzesService.findByLectureId(lectureId);

    if (!quiz) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { lecture: 'notAQuiz' },
      });
    }

    const { gradable } = await this.loadQuestions(lectureId);
    // §2.1 — passingScore is legacy and only explains historical attempts.
    const result = this.grader.grade(
      gradable,
      answers,
      quiz.passThresholdPercent,
    );

    // Re-submitting the same attempt id replaces its answers rather than
    // stacking a second set.
    await this.quizAttemptAnswersService.removeByAttemptId(attemptId);

    const gradeByQuestion = new Map(
      result.perQuestion.map((grade) => [grade.questionId, grade]),
    );

    for (const answer of answers) {
      const grade = gradeByQuestion.get(answer.questionId);

      await this.quizAttemptAnswersService.create({
        attempt: { id: attemptId } as never,
        question: { id: answer.questionId } as never,
        selectedOptionIds: answer.selectedOptionIds
          ? JSON.stringify(answer.selectedOptionIds)
          : null,
        textAnswer: answer.textAnswer ?? null,
        ratingAnswer: answer.ratingAnswer ?? null,
        file: answer.fileId ? ({ id: answer.fileId } as never) : null,
        isCorrect: grade?.isCorrect ?? null,
        // The column is an integer, so partial credit is stored as a whole
        // percentage of this question rather than a 0-1 fraction.
        score: grade ? Math.round(grade.score * 100) : null,
        gradedAt: new Date(),
      });
    }

    await this.quizAttemptsService.update(attemptId, {
      score: result.score,
      passed: result.passed,
      submittedAt: new Date(),
    });

    // §2.4 — unlimited retakes: any passing attempt completes the lecture,
    // and a later failed retake never undoes it.
    if (result.passed) {
      await this.progressService.record(lectureId, studentId, {
        status: 'completed',
      });
    }

    const correctByQuestion = new Map(
      gradable.map((question) => [
        question.id,
        question.options.filter((o) => o.isCorrect).map((o) => o.id),
      ]),
    );
    // v2.3 — safe to reveal from here on: the attempt has just been graded.
    const explanationByQuestion = new Map(
      gradable.map((question) => [question.id, question.explanation]),
    );

    return {
      attemptId,
      score: result.score,
      passed: result.passed,
      passThresholdPercent: quiz.passThresholdPercent,
      passingScore: quiz.passingScore,
      nextLectureId: await this.nextLectureId(attempt, lectureId),
      feedback: result.perQuestion.map((grade) => ({
        questionId: grade.questionId,
        isCorrect: grade.isCorrect,
        score: Math.round(grade.score * 100),
        autoPassed: grade.autoPassed,
        correctSelected: grade.correctSelected,
        totalCorrect: grade.totalCorrect,
        correctOptionIds: correctByQuestion.get(grade.questionId) ?? [],
        explanation: explanationByQuestion.get(grade.questionId) ?? null,
      })),
    };
  }

  /**
   * §5.6 pass path auto-advances. Resolved from the attempt's own enrollment
   * so the answer cannot disagree with the player's own ordering.
   */
  private async nextLectureId(
    attempt: { enrollment: { course?: { id: string } | null } },
    lectureId: string,
  ): Promise<string | null> {
    const courseId = attempt.enrollment?.course?.id;

    if (!courseId) {
      return null;
    }

    const ordered = await this.curriculumService.orderedLectures(courseId);

    return CourseCurriculumService.neighbours(ordered, lectureId).nextLectureId;
  }

  /** Epic 4 v2 §2.3 — `GET /quiz-attempts/:id`. */
  async getAttempt(attemptId: string, studentId: number) {
    const attempt = await this.findOwnAttempt(attemptId, studentId);

    if (!attempt.submittedAt) {
      return {
        attemptId,
        score: null,
        passed: null,
        submittedAt: null,
        review: null,
      };
    }

    const { gradable } = await this.loadQuestions(attempt.lecture.id);
    const optionsByQuestion = new Map(
      gradable.map((question) => [
        question.id,
        question.options.filter((option) => option.isCorrect).map((o) => o.id),
      ]),
    );
    const explanationByQuestion = new Map(
      gradable.map((question) => [question.id, question.explanation]),
    );

    const answers =
      await this.quizAttemptAnswersService.findByAttemptId(attemptId);

    return {
      attemptId,
      score: attempt.score ?? null,
      passed: attempt.passed ?? null,
      submittedAt: attempt.submittedAt,
      review: answers.map((answer) => ({
        questionId: answer.question.id,
        selectedOptionIds: parseArray(answer.selectedOptionIds),
        correctOptionIds: optionsByQuestion.get(answer.question.id) ?? [],
        textAnswer: answer.textAnswer ?? null,
        ratingAnswer: answer.ratingAnswer ?? null,
        isCorrect: answer.isCorrect ?? null,
        // Percentage of this question earned — the x/y partial-credit chip.
        score: answer.score ?? null,
        explanation: explanationByQuestion.get(answer.question.id) ?? null,
      })),
    };
  }

  private async loadQuestions(lectureId: string) {
    const questions = (
      await this.quizQuestionsService.findByLectureId(lectureId)
    ).sort((a, b) => a.displayOrder - b.displayOrder);

    const options = await this.quizAnswerOptionsService.findByQuestionIds(
      questions.map((question) => question.id),
    );

    const optionsByQuestion = new Map<string, typeof options>();
    for (const option of options) {
      const bucket = optionsByQuestion.get(option.question.id) ?? [];
      bucket.push(option);
      optionsByQuestion.set(option.question.id, bucket);
    }

    return {
      // Client projection — `isCorrect` is deliberately absent.
      questions: questions.map((question) => ({
        id: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        isRequired: question.isRequired,
        displayOrder: question.displayOrder,
        minWordCount: question.minWordCount ?? null,
        ratingMin: question.ratingMin ?? null,
        ratingMax: question.ratingMax ?? null,
        ratingLabelMin: question.ratingLabelMin ?? null,
        ratingLabelMax: question.ratingLabelMax ?? null,
        allowedMimeTypes: question.allowedMimeTypes ?? null,
        maxFileSizeMb: question.maxFileSizeMb ?? null,
        options: (optionsByQuestion.get(question.id) ?? []).map((option) => ({
          id: option.id,
          optionText: option.optionText,
          displayOrder: option.displayOrder,
        })),
      })),
      // Server projection for the grader — keeps isCorrect and, since v2.3,
      // the explanation. Both are answer-key material: the client projection
      // above omits them on purpose, and nothing pre-submit reads this one.
      gradable: questions.map((question) => ({
        id: question.id,
        questionType: question.questionType,
        explanation: question.explanation ?? null,
        // The grader rejects a rating outside the question's own scale, so
        // the bounds have to travel with it.
        ratingMin: question.ratingMin ?? null,
        ratingMax: question.ratingMax ?? null,
        options: (optionsByQuestion.get(question.id) ?? []).map((option) => ({
          id: option.id,
          isCorrect: option.isCorrect,
        })),
      })),
    };
  }

  /** Shared with QuizFileUploadService — ownership is checked in one place. */
  async findOwnAttempt(attemptId: string, studentId: number) {
    const attempt = await this.quizAttemptsService.findById(attemptId);

    if (!attempt) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'attemptNotFound',
      });
    }

    if (attempt.enrollment.student?.id !== studentId) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        error: 'notYourAttempt',
      });
    }

    return attempt;
  }
}

const parseArray = (value?: string | null): string[] => {
  const parsed = parseJson(value);
  return Array.isArray(parsed) ? (parsed as string[]) : [];
};
