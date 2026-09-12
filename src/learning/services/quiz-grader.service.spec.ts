import { describe, expect, it, beforeEach } from '@jest/globals';
import { QuizGraderService } from './quiz-grader.service';

describe('QuizGraderService', () => {
  let service: QuizGraderService;

  const mc = (id: string, correctId: string) => ({
    id,
    questionType: 'multiple_choice',
    options: [
      { id: correctId, isCorrect: true },
      { id: `${id}-wrong`, isCorrect: false },
    ],
  });
  const ms = (id: string, correctIds: string[], wrongIds: string[]) => ({
    id,
    questionType: 'multiple_select',
    options: [
      ...correctIds.map((o) => ({ id: o, isCorrect: true })),
      ...wrongIds.map((o) => ({ id: o, isCorrect: false })),
    ],
  });
  const tf = (id: string, correctId: string) => ({
    id,
    questionType: 'true_false',
    options: [
      { id: correctId, isCorrect: true },
      { id: `${id}-f`, isCorrect: false },
    ],
  });
  const essay = (id: string) => ({ id, questionType: 'essay', options: [] });
  const shortAnswer = (id: string) => ({
    id,
    questionType: 'short_answer',
    options: [],
  });
  const upload = (id: string) => ({
    id,
    questionType: 'file_upload',
    options: [],
  });
  const rating = (id: string, ratingMin = 1, ratingMax = 5) => ({
    id,
    questionType: 'rating_scale',
    options: [],
    ratingMin,
    ratingMax,
  });

  beforeEach(() => {
    service = new QuizGraderService();
  });

  describe('all-or-nothing objective types', () => {
    it('should award full credit for a correct multiple choice answer', () => {
      const result = service.grade(
        [mc('q1', 'a')],
        [{ questionId: 'q1', selectedOptionIds: ['a'] }],
        50,
      );

      expect(result.perQuestion[0]).toMatchObject({
        questionId: 'q1',
        score: 1,
        isCorrect: true,
      });
      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
    });

    it('should award nothing for a wrong multiple choice answer', () => {
      const result = service.grade(
        [mc('q1', 'a')],
        [{ questionId: 'q1', selectedOptionIds: ['q1-wrong'] }],
        50,
      );

      expect(result.perQuestion[0]).toMatchObject({
        score: 0,
        isCorrect: false,
      });
      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('should treat an unanswered objective question as wrong', () => {
      const result = service.grade([mc('q1', 'a')], [], 50);

      expect(result.perQuestion[0]).toMatchObject({
        score: 0,
        isCorrect: false,
      });
      expect(result.score).toBe(0);
    });

    it('should grade true_false all-or-nothing', () => {
      const result = service.grade(
        [tf('q1', 't')],
        [{ questionId: 'q1', selectedOptionIds: ['t'] }],
        50,
      );

      expect(result.perQuestion[0].score).toBe(1);
    });
  });

  describe('multiple_select partial credit', () => {
    // score = clamp((correctSelected - wrongSelected) / totalCorrect, 0, 1)

    it('should award full credit when exactly the correct set is chosen', () => {
      const result = service.grade(
        [ms('q1', ['a', 'b'], ['c', 'd'])],
        [{ questionId: 'q1', selectedOptionIds: ['a', 'b'] }],
        50,
      );

      expect(result.perQuestion[0]).toMatchObject({
        score: 1,
        isCorrect: true,
      });
      expect(result.score).toBe(100);
    });

    it('should award half credit for one of two correct choices', () => {
      const result = service.grade(
        [ms('q1', ['a', 'b'], ['c', 'd'])],
        [{ questionId: 'q1', selectedOptionIds: ['a'] }],
        50,
      );

      expect(result.perQuestion[0]).toMatchObject({
        score: 0.5,
        isCorrect: false,
      });
      expect(result.score).toBe(50);
    });

    it('should subtract wrong selections from correct ones', () => {
      // 2 correct - 1 wrong = 1, over 2 total correct = 0.5
      const result = service.grade(
        [ms('q1', ['a', 'b'], ['c', 'd'])],
        [{ questionId: 'q1', selectedOptionIds: ['a', 'b', 'c'] }],
        50,
      );

      expect(result.perQuestion[0].score).toBe(0.5);
    });

    it('should score 0 when every option is selected', () => {
      // §2.4 — the clamp is what stops "select everything" from passing.
      const result = service.grade(
        [ms('q1', ['a', 'b'], ['c', 'd'])],
        [{ questionId: 'q1', selectedOptionIds: ['a', 'b', 'c', 'd'] }],
        50,
      );

      expect(result.perQuestion[0].score).toBe(0);
      expect(result.score).toBe(0);
    });

    it('should never go below zero when wrong selections outnumber correct', () => {
      const result = service.grade(
        [ms('q1', ['a'], ['b', 'c', 'd'])],
        [{ questionId: 'q1', selectedOptionIds: ['b', 'c', 'd'] }],
        50,
      );

      expect(result.perQuestion[0].score).toBe(0);
    });

    it('should score a question with no correct option as 0 rather than dividing by zero', () => {
      const result = service.grade(
        [ms('q1', [], ['a', 'b'])],
        [{ questionId: 'q1', selectedOptionIds: ['a'] }],
        50,
      );

      expect(result.perQuestion[0].score).toBe(0);
      expect(Number.isFinite(result.score)).toBe(true);
    });
  });

  describe('subjective types auto-pass', () => {
    it('should award full credit for a non-empty essay', () => {
      const result = service.grade(
        [essay('q1')],
        [{ questionId: 'q1', textAnswer: 'my thoughts' }],
        70,
      );

      expect(result.perQuestion[0]).toMatchObject({
        score: 1,
        isCorrect: true,
        autoPassed: true,
      });
      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
    });

    it('should award full credit for a non-empty short_answer', () => {
      const result = service.grade(
        [shortAnswer('q1')],
        [{ questionId: 'q1', textAnswer: 'because' }],
        70,
      );

      expect(result.perQuestion[0].score).toBe(1);
    });

    it('should reject a whitespace-only essay', () => {
      const result = service.grade(
        [essay('q1')],
        [{ questionId: 'q1', textAnswer: '   ' }],
        70,
      );

      expect(result.perQuestion[0]).toMatchObject({
        score: 0,
        autoPassed: false,
      });
    });

    it('should award full credit for a file_upload with a fileId', () => {
      const result = service.grade(
        [upload('q1')],
        [{ questionId: 'q1', fileId: 'file-1' }],
        70,
      );

      expect(result.perQuestion[0].score).toBe(1);
    });

    it('should score an unanswered file_upload as 0', () => {
      const result = service.grade([upload('q1')], [], 70);

      expect(result.perQuestion[0].score).toBe(0);
    });

    it('should award full credit for a rating inside the allowed range', () => {
      const result = service.grade(
        [rating('q1', 1, 5)],
        [{ questionId: 'q1', ratingAnswer: 3 }],
        70,
      );

      expect(result.perQuestion[0].score).toBe(1);
    });

    it('should score a rating outside the allowed range as 0', () => {
      const result = service.grade(
        [rating('q1', 1, 5)],
        [{ questionId: 'q1', ratingAnswer: 9 }],
        70,
      );

      expect(result.perQuestion[0].score).toBe(0);
    });

    it('should accept any numeric rating when the question declares no range', () => {
      const result = service.grade(
        [{ id: 'q1', questionType: 'rating_scale', options: [] }],
        [{ questionId: 'q1', ratingAnswer: 42 }],
        70,
      );

      expect(result.perQuestion[0].score).toBe(1);
    });

    it('should never report a subjective question as pending review', () => {
      const result = service.grade(
        [essay('q1'), upload('q2')],
        [
          { questionId: 'q1', textAnswer: 'x' },
          { questionId: 'q2', fileId: 'f' },
        ],
        70,
      );

      expect(result.passed).toBe(true);
      expect(result.perQuestion.every((q) => q.isCorrect !== null)).toBe(true);
    });
  });

  describe('score aggregation', () => {
    it('should count subjective questions at full weight in the denominator', () => {
      // 1 objective wrong + 1 essay auto-passed = 50%, not 0% and not 100%.
      const result = service.grade(
        [mc('q1', 'a'), essay('q2')],
        [
          { questionId: 'q1', selectedOptionIds: ['q1-wrong'] },
          { questionId: 'q2', textAnswer: 'words' },
        ],
        70,
      );

      expect(result.score).toBe(50);
      expect(result.passed).toBe(false);
    });

    it('should honour a per-question weight', () => {
      // q1 weight 3 correct, q2 weight 1 wrong → 3/4 = 75%.
      const result = service.grade(
        [
          { ...mc('q1', 'a'), weight: 3 },
          { ...mc('q2', 'b'), weight: 1 },
        ],
        [
          { questionId: 'q1', selectedOptionIds: ['a'] },
          { questionId: 'q2', selectedOptionIds: ['q2-wrong'] },
        ],
        70,
      );

      expect(result.score).toBe(75);
    });

    it('should default a missing weight to 1', () => {
      const result = service.grade(
        [mc('q1', 'a'), mc('q2', 'b')],
        [{ questionId: 'q1', selectedOptionIds: ['a'] }],
        50,
      );

      expect(result.score).toBe(50);
    });

    it('should round the percentage to a whole number', () => {
      const result = service.grade(
        [mc('q1', 'a'), mc('q2', 'b'), mc('q3', 'c')],
        [{ questionId: 'q1', selectedOptionIds: ['a'] }],
        50,
      );

      expect(result.score).toBe(33);
    });

    it('should score an empty quiz as 0 rather than NaN', () => {
      const result = service.grade([], [], 70);

      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('should ignore an answer for a question that is not in the quiz', () => {
      const result = service.grade(
        [mc('q1', 'a')],
        [
          { questionId: 'q1', selectedOptionIds: ['a'] },
          { questionId: 'ghost', selectedOptionIds: ['z'] },
        ],
        50,
      );

      expect(result.perQuestion).toHaveLength(1);
      expect(result.score).toBe(100);
    });

    it('should ignore an unknown question type rather than counting it', () => {
      const result = service.grade(
        [mc('q1', 'a'), { id: 'q2', questionType: 'ouija', options: [] }],
        [{ questionId: 'q1', selectedOptionIds: ['a'] }],
        50,
      );

      expect(result.score).toBe(100);
    });
  });

  describe('pass decision', () => {
    it('should pass when the score equals the threshold', () => {
      const result = service.grade(
        [mc('q1', 'a'), mc('q2', 'b')],
        [{ questionId: 'q1', selectedOptionIds: ['a'] }],
        50,
      );

      expect(result.score).toBe(50);
      expect(result.passed).toBe(true);
    });

    it('should fail one point below the threshold', () => {
      const result = service.grade(
        [mc('q1', 'a'), mc('q2', 'b'), mc('q3', 'c')],
        [
          { questionId: 'q1', selectedOptionIds: ['a'] },
          { questionId: 'q2', selectedOptionIds: ['b'] },
        ],
        70,
      );

      expect(result.score).toBe(67);
      expect(result.passed).toBe(false);
    });

    it('should always return a boolean, never null', () => {
      const result = service.grade(
        [essay('q1'), upload('q2'), mc('q3', 'a')],
        [{ questionId: 'q1', textAnswer: 'x' }],
        70,
      );

      expect(typeof result.passed).toBe('boolean');
    });
  });
});
