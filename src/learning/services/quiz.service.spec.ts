import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizGraderService } from './quiz-grader.service';

describe('QuizService', () => {
  let service: QuizService;
  let deps: Record<string, any>;

  const question = (id: string, questionType = 'multiple_choice') => ({
    id,
    questionType,
    questionText: `Q-${id}`,
    isRequired: true,
    displayOrder: 1,
    minWordCount: null,
    ratingMin: null,
    ratingMax: null,
    ratingLabelMin: null,
    ratingLabelMax: null,
    allowedMimeTypes: null,
    maxFileSizeMb: null,
    explanation: 'Because the first option follows from the premise.',
  });

  const option = (id: string, questionId: string, isCorrect: boolean) => ({
    id,
    isCorrect,
    optionText: `O-${id}`,
    displayOrder: 1,
    question: { id: questionId },
  });

  beforeEach(() => {
    deps = {
      resolver: {
        resolveEnrollment: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          enrollment: { id: 'enr-1' },
          course: { id: 'course-1' },
          lecture: { id: 'lec-1', lectureType: 'quiz' },
        }),
      },
      quizzesService: {
        findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          id: 'quiz-1',
          passingScore: 50,
          passThresholdPercent: 50,
          allowResume: true,
          instructions: 'Do well',
          timeLimitSecs: null,
        }),
      },
      quizQuestionsService: {
        findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue([
          question('q1'),
        ]),
      },
      quizAnswerOptionsService: {
        findByQuestionIds: (jest.fn() as jest.Mock<any>).mockResolvedValue([
          option('o1', 'q1', true),
          option('o2', 'q1', false),
        ]),
      },
      quizAttemptsService: {
        create: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          id: 'att-1',
        }),
        findById: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          id: 'att-1',
          submittedAt: null,
          enrollment: {
            id: 'enr-1',
            student: { id: 7 },
            course: { id: 'course-1' },
          },
          lecture: { id: 'lec-1' },
        }),
        update: (jest.fn() as jest.Mock<any>).mockResolvedValue({}),
        findByEnrollmentAndLecture: (
          jest.fn() as jest.Mock<any>
        ).mockResolvedValue([]),
      },
      quizAttemptAnswersService: {
        create: (jest.fn() as jest.Mock<any>).mockResolvedValue({}),
        removeByAttemptId: (jest.fn() as jest.Mock<any>).mockResolvedValue(
          undefined,
        ),
        findByAttemptId: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
      },
      quizSavesService: {
        findByEnrollmentAndLecture: (
          jest.fn() as jest.Mock<any>
        ).mockResolvedValue(null),
        create: (jest.fn() as jest.Mock<any>).mockResolvedValue({}),
        update: (jest.fn() as jest.Mock<any>).mockResolvedValue({}),
      },
      progressService: {
        record: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          progressPct: 100,
          enrollmentStatus: 'completed',
        }),
      },
      curriculumService: {
        orderedLectures: (jest.fn() as jest.Mock<any>).mockResolvedValue([
          { id: 'lec-1' },
          { id: 'lec-2' },
        ]),
      },
    };

    service = new QuizService(
      deps.resolver,
      deps.quizzesService,
      deps.quizQuestionsService,
      deps.quizAnswerOptionsService,
      deps.quizAttemptsService,
      deps.quizAttemptAnswersService,
      deps.quizSavesService,
      new QuizGraderService(),
      deps.progressService,
      deps.curriculumService,
    );
  });

  describe('startAttempt', () => {
    it('should never leak which option is correct', async () => {
      const result = await service.startAttempt('lec-1', 7);

      const [first] = result.questions;
      expect(first.options).toEqual([
        { id: 'o1', optionText: 'O-o1', displayOrder: 1 },
        { id: 'o2', optionText: 'O-o2', displayOrder: 1 },
      ]);
      expect(JSON.stringify(result)).not.toContain('isCorrect');
    });

    it('should return the quiz meta the instructions screen needs', async () => {
      const result = await service.startAttempt('lec-1', 7);

      expect(result).toMatchObject({
        attemptId: 'att-1',
        passThresholdPercent: 50,
        instructions: 'Do well',
        timeLimitSecs: null,
      });
    });

    // §5.6 — the instructions screen shows "best previous score"; §2.4 says it
    // is MAX(score) computed on read, with no column to drift out of date.
    it('should report the best previous score', async () => {
      deps.quizAttemptsService.findByEnrollmentAndLecture.mockResolvedValue([
        { id: 'a', score: 40, submittedAt: new Date() },
        { id: 'b', score: 90, submittedAt: new Date() },
        { id: 'c', score: 55, submittedAt: new Date() },
      ]);

      const result = await service.startAttempt('lec-1', 7);

      expect(result.bestScore).toBe(90);
      expect(result.previousAttempts).toBe(3);
    });

    it('should report no best score before the first submitted attempt', async () => {
      const result = await service.startAttempt('lec-1', 7);

      expect(result.bestScore).toBeNull();
      expect(result.previousAttempts).toBe(0);
    });

    it('should ignore unsubmitted attempts when picking the best score', async () => {
      deps.quizAttemptsService.findByEnrollmentAndLecture.mockResolvedValue([
        { id: 'a', score: 80, submittedAt: new Date() },
        { id: 'b', score: null, submittedAt: null },
      ]);

      expect((await service.startAttempt('lec-1', 7)).bestScore).toBe(80);
    });

    // Retries are unlimited (§2.4) — there is no attempt-count gate to trip.
    it('should start another attempt however many came before', async () => {
      deps.quizAttemptsService.findByEnrollmentAndLecture.mockResolvedValue(
        Array.from({ length: 25 }, (_, i) => ({
          id: `a${i}`,
          score: 10,
          submittedAt: new Date(),
        })),
      );

      await expect(service.startAttempt('lec-1', 7)).resolves.toMatchObject({
        attemptId: 'att-1',
      });
    });

    it('should return a resumable draft when one exists', async () => {
      deps.quizSavesService.findByEnrollmentAndLecture.mockResolvedValue({
        answersJson: '{"q1":["o1"]}',
      });

      const result = await service.startAttempt('lec-1', 7);

      expect(result.resumedAnswers).toEqual({ q1: ['o1'] });
    });

    it('should ignore a draft when the quiz forbids resuming', async () => {
      deps.quizzesService.findByLectureId.mockResolvedValue({
        id: 'quiz-1',
        passingScore: 50,
        passThresholdPercent: 50,
        allowResume: false,
      });
      deps.quizSavesService.findByEnrollmentAndLecture.mockResolvedValue({
        answersJson: '{"q1":["o1"]}',
      });

      expect(
        (await service.startAttempt('lec-1', 7)).resumedAnswers,
      ).toBeNull();
    });

    it('should tolerate a corrupt draft rather than failing the start', async () => {
      deps.quizSavesService.findByEnrollmentAndLecture.mockResolvedValue({
        answersJson: 'not json',
      });

      expect(
        (await service.startAttempt('lec-1', 7)).resumedAnswers,
      ).toBeNull();
    });

    it('should 422 when the lecture has no quiz content', async () => {
      deps.quizzesService.findByLectureId.mockResolvedValue(null);

      await expect(service.startAttempt('lec-1', 7)).rejects.toMatchObject({
        status: 422,
      });
    });
  });

  describe('submit', () => {
    const answers = [{ questionId: 'q1', selectedOptionIds: ['o1'] }];

    it('should grade, store the score and mark the lecture complete on a pass', async () => {
      const result = await service.submit('att-1', 7, answers);

      expect(result).toMatchObject({ score: 100, passed: true });
      expect(deps.quizAttemptsService.update).toHaveBeenCalledWith(
        'att-1',
        expect.objectContaining({
          score: 100,
          passed: true,
          submittedAt: expect.any(Date),
        }),
      );
      expect(deps.progressService.record).toHaveBeenCalledWith('lec-1', 7, {
        status: 'completed',
      });
    });

    it('should not complete the lecture on a fail', async () => {
      const result = await service.submit('att-1', 7, [
        { questionId: 'q1', selectedOptionIds: ['o2'] },
      ]);

      expect(result.passed).toBe(false);
      expect(deps.progressService.record).not.toHaveBeenCalled();
    });

    // v2.1 removed the manual queue: an essay resolves synchronously.
    it('should auto-pass a non-empty essay and complete the lecture', async () => {
      deps.quizQuestionsService.findByLectureId.mockResolvedValue([
        question('q1', 'essay'),
      ]);
      deps.quizAnswerOptionsService.findByQuestionIds.mockResolvedValue([]);

      const result = await service.submit('att-1', 7, [
        { questionId: 'q1', textAnswer: 'My essay' },
      ]);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(deps.progressService.record).toHaveBeenCalledWith('lec-1', 7, {
        status: 'completed',
      });
    });

    it('should fail an empty essay rather than parking the attempt', async () => {
      deps.quizQuestionsService.findByLectureId.mockResolvedValue([
        question('q1', 'essay'),
      ]);
      deps.quizAnswerOptionsService.findByQuestionIds.mockResolvedValue([]);

      const result = await service.submit('att-1', 7, [
        { questionId: 'q1', textAnswer: '  ' },
      ]);

      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
    });

    it('should never return a null passed verdict', async () => {
      deps.quizQuestionsService.findByLectureId.mockResolvedValue([
        question('q1', 'file_upload'),
      ]);
      deps.quizAnswerOptionsService.findByQuestionIds.mockResolvedValue([]);

      const result = await service.submit('att-1', 7, [
        { questionId: 'q1', fileId: 'f-1' },
      ]);

      expect(result.passed).toBe(true);
      expect(result.passed).not.toBeNull();
    });

    it('should grade against passThresholdPercent, not the legacy passingScore', async () => {
      deps.quizzesService.findByLectureId.mockResolvedValue({
        id: 'quiz-1',
        // Legacy value would pass this attempt; the new one must not.
        passingScore: 0,
        passThresholdPercent: 100,
        allowResume: true,
      });
      deps.quizQuestionsService.findByLectureId.mockResolvedValue([
        question('q1'),
        question('q2'),
      ]);
      deps.quizAnswerOptionsService.findByQuestionIds.mockResolvedValue([
        option('o1', 'q1', true),
        option('o2', 'q1', false),
        option('o3', 'q2', true),
      ]);

      const result = await service.submit('att-1', 7, answers);

      expect(result.score).toBe(50);
      expect(result.passed).toBe(false);
      expect(result.passThresholdPercent).toBe(100);
    });

    // §5.6 pass path — toast, then auto-navigate. The FE should not have to
    // hold the neighbour ids from an earlier request to do that.
    it('should return the next lecture to advance to on a pass', async () => {
      const result = await service.submit('att-1', 7, answers);

      expect(result.nextLectureId).toBe('lec-2');
    });

    it('should return a null next lecture at the end of the course', async () => {
      deps.curriculumService.orderedLectures.mockResolvedValue([
        { id: 'lec-1' },
      ]);

      expect(
        (await service.submit('att-1', 7, answers)).nextLectureId,
      ).toBeNull();
    });

    // §5.6 fail path renders inline, so the verdict has to come back with the
    // submit rather than in a follow-up round trip.
    it('should return per-question feedback for the inline review panel', async () => {
      deps.quizQuestionsService.findByLectureId.mockResolvedValue([
        question('q1'),
      ]);

      const result = await service.submit('att-1', 7, [
        { questionId: 'q1', selectedOptionIds: ['o2'] },
      ]);

      expect(result.feedback).toEqual([
        expect.objectContaining({
          questionId: 'q1',
          isCorrect: false,
          score: 0,
          correctOptionIds: ['o1'],
        }),
      ]);
    });

    it('should store each answer score as a whole percentage', async () => {
      deps.quizQuestionsService.findByLectureId.mockResolvedValue([
        question('q1', 'multiple_select'),
      ]);
      deps.quizAnswerOptionsService.findByQuestionIds.mockResolvedValue([
        option('o1', 'q1', true),
        option('o2', 'q1', true),
        option('o3', 'q1', false),
      ]);

      await service.submit('att-1', 7, [
        { questionId: 'q1', selectedOptionIds: ['o1'] },
      ]);

      expect(deps.quizAttemptAnswersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ score: 50, isCorrect: false }),
      );
    });

    it('should reject a rating outside the question scale', async () => {
      deps.quizQuestionsService.findByLectureId.mockResolvedValue([
        { ...question('q1', 'rating_scale'), ratingMin: 1, ratingMax: 5 },
      ]);
      deps.quizAnswerOptionsService.findByQuestionIds.mockResolvedValue([]);

      const result = await service.submit('att-1', 7, [
        { questionId: 'q1', ratingAnswer: 11 },
      ]);

      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('should accept a rating inside the question scale', async () => {
      deps.quizQuestionsService.findByLectureId.mockResolvedValue([
        { ...question('q1', 'rating_scale'), ratingMin: 1, ratingMax: 5 },
      ]);
      deps.quizAnswerOptionsService.findByQuestionIds.mockResolvedValue([]);

      const result = await service.submit('att-1', 7, [
        { questionId: 'q1', ratingAnswer: 4 },
      ]);

      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
    });

    it('should replace answers from a previous submit of the same attempt', async () => {
      await service.submit('att-1', 7, answers);

      expect(
        deps.quizAttemptAnswersService.removeByAttemptId,
      ).toHaveBeenCalledWith('att-1');
    });

    it('should 409 an already submitted attempt', async () => {
      deps.quizAttemptsService.findById.mockResolvedValue({
        id: 'att-1',
        submittedAt: new Date(),
        enrollment: {
          id: 'enr-1',
          student: { id: 7 },
          course: { id: 'course-1' },
        },
        lecture: { id: 'lec-1' },
      });

      await expect(service.submit('att-1', 7, answers)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it("should refuse another student's attempt", async () => {
      await expect(
        service.submit('att-1', 999, answers),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getAttempt', () => {
    it('should withhold review data before submission', async () => {
      const result = await service.getAttempt('att-1', 7);

      expect(result.review).toBeNull();
    });

    it('should expose the correct options once submitted', async () => {
      deps.quizAttemptsService.findById.mockResolvedValue({
        id: 'att-1',
        submittedAt: new Date(),
        score: 100,
        passed: true,
        enrollment: {
          id: 'enr-1',
          student: { id: 7 },
          course: { id: 'course-1' },
        },
        lecture: { id: 'lec-1' },
      });
      deps.quizAttemptAnswersService.findByAttemptId.mockResolvedValue([
        {
          question: { id: 'q1' },
          selectedOptionIds: '["o1"]',
          isCorrect: true,
          score: 100,
        },
      ]);

      const result = await service.getAttempt('att-1', 7);

      expect(result.review).toEqual([
        expect.objectContaining({
          questionId: 'q1',
          correctOptionIds: ['o1'],
          selectedOptionIds: ['o1'],
          isCorrect: true,
        }),
      ]);
    });
  });

  // §5.6 — the fail-review panel shows an "x / total_correct" chip for
  // multiple_select, so the stored per-question score has to come back out.
  describe('review partial credit', () => {
    it('should return the stored per-question score', async () => {
      deps.quizAttemptsService.findById.mockResolvedValue({
        id: 'att-1',
        submittedAt: new Date(),
        score: 50,
        passed: false,
        enrollment: {
          id: 'enr-1',
          student: { id: 7 },
          course: { id: 'course-1' },
        },
        lecture: { id: 'lec-1' },
      });
      deps.quizAttemptAnswersService.findByAttemptId.mockResolvedValue([
        {
          question: { id: 'q1' },
          selectedOptionIds: '["o1"]',
          isCorrect: false,
          score: 50,
        },
      ]);

      const result = await service.getAttempt('att-1', 7);

      expect(result.review?.[0]).toMatchObject({
        questionId: 'q1',
        isCorrect: false,
        score: 50,
      });
    });

    it('should return a null score for an answer that was never graded', async () => {
      deps.quizAttemptsService.findById.mockResolvedValue({
        id: 'att-1',
        submittedAt: new Date(),
        score: 0,
        passed: false,
        enrollment: {
          id: 'enr-1',
          student: { id: 7 },
          course: { id: 'course-1' },
        },
        lecture: { id: 'lec-1' },
      });
      deps.quizAttemptAnswersService.findByAttemptId.mockResolvedValue([
        { question: { id: 'q1' }, selectedOptionIds: null, isCorrect: null },
      ]);

      expect(
        (await service.getAttempt('att-1', 7)).review?.[0].score,
      ).toBeNull();
    });
  });

  /**
   * Epic 4 v2.3 — `explanation` is answer-key material and rides the same
   * secrecy rules as `isCorrect`: absent from every pre-submit payload,
   * present only once the attempt has been graded.
   */
  describe('v2.3 explanation gating', () => {
    it('should never leak the explanation when starting an attempt', async () => {
      const result = await service.startAttempt('lec-1', 7);

      expect(JSON.stringify(result)).not.toContain('explanation');
      expect(JSON.stringify(result)).not.toContain('follows from the premise');
      expect(result.questions[0]).not.toHaveProperty('explanation');
    });

    it('should not leak the explanation through a resumed draft either', async () => {
      deps.quizSavesService.findByEnrollmentAndLecture.mockResolvedValue({
        answersJson: '{"q1":["o1"]}',
      });

      const result = await service.startAttempt('lec-1', 7);

      expect(JSON.stringify(result)).not.toContain('follows from the premise');
    });

    it('should return the explanation in the submit feedback', async () => {
      const result = await service.submit('att-1', 7, [
        { questionId: 'q1', selectedOptionIds: ['o2'] },
      ]);

      expect(result.feedback[0]).toMatchObject({
        questionId: 'q1',
        explanation: 'Because the first option follows from the premise.',
      });
    });

    it('should return the explanation on a pass as well as a fail', async () => {
      const result = await service.submit('att-1', 7, [
        { questionId: 'q1', selectedOptionIds: ['o1'] },
      ]);

      expect(result.passed).toBe(true);
      expect(result.feedback[0].explanation).toBe(
        'Because the first option follows from the premise.',
      );
    });

    it('should return null when no explanation was authored', async () => {
      deps.quizQuestionsService.findByLectureId.mockResolvedValue([
        { ...question('q1'), explanation: null },
      ]);

      const result = await service.submit('att-1', 7, [
        { questionId: 'q1', selectedOptionIds: ['o1'] },
      ]);

      expect(result.feedback[0].explanation).toBeNull();
    });

    it('should expose the explanation in post-submit review', async () => {
      deps.quizAttemptsService.findById.mockResolvedValue({
        id: 'att-1',
        submittedAt: new Date(),
        score: 0,
        passed: false,
        enrollment: {
          id: 'enr-1',
          student: { id: 7 },
          course: { id: 'course-1' },
        },
        lecture: { id: 'lec-1' },
      });
      deps.quizAttemptAnswersService.findByAttemptId.mockResolvedValue([
        {
          question: { id: 'q1' },
          selectedOptionIds: '["o2"]',
          isCorrect: false,
        },
      ]);

      const result = await service.getAttempt('att-1', 7);

      expect(result.review?.[0].explanation).toBe(
        'Because the first option follows from the premise.',
      );
    });

    it('should withhold the explanation from review before submission', async () => {
      const result = await service.getAttempt('att-1', 7);

      expect(result.review).toBeNull();
      expect(JSON.stringify(result)).not.toContain('follows from the premise');
    });
  });
});
