import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LocaleContext, LocaleHolder } from '../../utils/i18n/locale-context';
import {
  CareerReflectionService,
  normaliseText,
} from './career-reflection.service';

const Q1 = 'q1-purpose';
const Q2 = 'q2-outcome';
const Q4 = 'q4-feedback';
const Q5 = 'q5-share';

const questions = () => [
  {
    id: Q1,
    questionType: 'free_text',
    questionText: 'Mục đích ban đầu bạn tham gia khóa học này là gì?',
    questionTextTranslations: { en: 'What was your initial purpose?' },
    isRequired: true,
    displayOrder: 1,
    options: null,
  },
  {
    id: Q2,
    questionType: 'selection',
    questionText: 'Bạn đạt được gì sau khi hoàn thành khóa học',
    questionTextTranslations: { en: 'What did you gain?' },
    isRequired: true,
    displayOrder: 2,
    options: [
      { key: 1, label: 'Có thể hợp', labelTranslations: { en: 'Could fit' } },
      { key: 2, label: 'Không hợp', labelTranslations: { en: 'Not suited' } },
      // Translation deliberately missing — must fall back to Vietnamese.
      { key: 3, label: 'Chưa xác định' },
    ],
  },
  {
    id: Q4,
    questionType: 'free_text',
    questionText: 'Feedback về chất lượng khóa học',
    questionTextTranslations: null,
    isRequired: false,
    displayOrder: 4,
    options: null,
  },
  {
    id: Q5,
    questionType: 'selection',
    questionText: 'Chia sẻ cho bạn bè?',
    questionTextTranslations: { en: 'Share with friends?' },
    isRequired: true,
    displayOrder: 5,
    options: [
      { key: 1, label: 'Chắc chắn' },
      { key: 2, label: 'Không phải lúc này' },
    ],
  },
];

const complete = () => [
  { questionId: Q1, textAnswer: 'Muốn thử sức với ngành tài chính' },
  { questionId: Q2, ratingAnswer: 1 },
  { questionId: Q5, ratingAnswer: 2 },
];

/** Runs `fn` as if the request had arrived with this locale. */
const inLocale = <T>(locale: string, fn: () => T): T => {
  const holder = new LocaleHolder();
  holder.explicit = locale;
  return LocaleContext.run(holder, fn);
};

/** Epic 4.6 BE-4/BE-5/BE-9. */
describe('CareerReflectionService', () => {
  let service: CareerReflectionService;
  let deps: Record<string, Record<string, jest.Mock<any>>>;

  const expectErrors = async (
    promise: Promise<unknown>,
    errors: Record<string, string>,
  ) => {
    await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
    await promise.catch((error: { response: unknown }) => {
      expect(error.response).toEqual({
        status: 422,
        errors: { answers: errors },
      });
    });
  };

  beforeEach(() => {
    deps = {
      questions: {
        findForCourse: (jest.fn() as jest.Mock<any>).mockResolvedValue(
          questions(),
        ),
      },
      answers: {
        upsertForEnrollment: (jest.fn() as jest.Mock<any>).mockResolvedValue(
          undefined,
        ),
        findByEnrollmentId: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
      },
      enrollments: {
        findById: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          id: 'enr-1',
          student: { id: 7 },
          course: { id: 'course-1' },
        }),
      },
      config: {
        get: (jest.fn() as jest.Mock<any>).mockReturnValue(10),
      },
    };

    service = new CareerReflectionService(
      deps.questions as never,
      deps.answers as never,
      deps.enrollments as never,
      deps.config as never,
    );
  });

  describe('validation matrix', () => {
    it('should save a complete, valid form', async () => {
      const result = await service.submit('enr-1', 7, complete());

      expect(result.savedCount).toBe(3);
      expect(deps.answers.upsertForEnrollment).toHaveBeenCalledWith('enr-1', [
        {
          questionId: Q1,
          ratingAnswer: null,
          textAnswer: 'Muốn thử sức với ngành tài chính',
        },
        { questionId: Q2, ratingAnswer: 1, textAnswer: null },
        { questionId: Q5, ratingAnswer: 2, textAnswer: null },
      ]);
    });

    it('should report a required question the payload never mentions', async () => {
      await expectErrors(
        service.submit(
          'enr-1',
          7,
          complete().filter((a) => a.questionId !== Q5),
        ),
        { [Q5]: 'required' },
      );
    });

    it('should report a required free-text answer sent blank', async () => {
      await expectErrors(
        service.submit('enr-1', 7, [
          { questionId: Q1, textAnswer: '    ' },
          ...complete().slice(1),
        ]),
        { [Q1]: 'required' },
      );
    });

    it('should report a required selection sent with a null key', async () => {
      await expectErrors(
        service.submit('enr-1', 7, [
          complete()[0],
          { questionId: Q2, ratingAnswer: null },
          complete()[2],
        ]),
        { [Q2]: 'required' },
      );
    });

    it('should reject text shorter than the minimum, measured after trimming', async () => {
      // 9 characters inside the padding: the spaces must not count.
      await expectErrors(
        service.submit('enr-1', 7, [
          { questionId: Q1, textAnswer: '   123456789   ' },
          ...complete().slice(1),
        ]),
        { [Q1]: 'textTooShort' },
      );
    });

    it('should accept text at exactly the minimum', async () => {
      await expect(
        service.submit('enr-1', 7, [
          { questionId: Q1, textAnswer: '1234567890' },
          ...complete().slice(1),
        ]),
      ).resolves.toMatchObject({ savedCount: 3 });
    });

    it('should honour a configured minimum', async () => {
      deps.config.get.mockReturnValue(40);

      await expectErrors(service.submit('enr-1', 7, complete()), {
        [Q1]: 'textTooShort',
      });
    });

    it('should reject an option key the question does not declare', async () => {
      await expectErrors(
        service.submit('enr-1', 7, [
          complete()[0],
          { questionId: Q2, ratingAnswer: 9 },
          complete()[2],
        ]),
        { [Q2]: 'invalidOptionKey' },
      );
    });

    it('should reject an array index sent in place of a key', async () => {
      await expectErrors(
        service.submit('enr-1', 7, [
          complete()[0],
          { questionId: Q2, ratingAnswer: 0 },
          complete()[2],
        ]),
        { [Q2]: 'invalidOptionKey' },
      );
    });

    it('should reject text sent to a selection question', async () => {
      await expectErrors(
        service.submit('enr-1', 7, [
          complete()[0],
          { questionId: Q2, textAnswer: 'một' },
          complete()[2],
        ]),
        { [Q2]: 'answerTypeMismatch' },
      );
    });

    it('should reject a key sent to a free-text question', async () => {
      await expectErrors(
        service.submit('enr-1', 7, [
          { questionId: Q1, ratingAnswer: 1 },
          ...complete().slice(1),
        ]),
        { [Q1]: 'answerTypeMismatch' },
      );
    });

    it('should reject a question that is not on the form', async () => {
      await expectErrors(
        service.submit('enr-1', 7, [
          ...complete(),
          { questionId: 'retired-slider', ratingAnswer: 4 },
        ]),
        { 'retired-slider': 'unknownQuestion' },
      );
    });

    it('should reject the same question sent twice', async () => {
      await expectErrors(
        service.submit('enr-1', 7, [...complete(), complete()[1]]),
        { [Q2]: 'duplicateQuestion' },
      );
    });

    it('should report every problem in one response, not just the first', async () => {
      await expectErrors(
        service.submit('enr-1', 7, [
          { questionId: Q1, textAnswer: 'ngắn' },
          { questionId: Q2, ratingAnswer: 9 },
        ]),
        { [Q1]: 'textTooShort', [Q2]: 'invalidOptionKey', [Q5]: 'required' },
      );
    });

    it('should write nothing when any answer is invalid', async () => {
      await service
        .submit('enr-1', 7, [
          complete()[0],
          { questionId: Q2, ratingAnswer: 9 },
        ])
        .catch(() => undefined);

      expect(deps.answers.upsertForEnrollment).not.toHaveBeenCalled();
    });

    it('should skip an optional question left blank, without an error', async () => {
      const result = await service.submit('enr-1', 7, [
        ...complete(),
        { questionId: Q4, textAnswer: '' },
      ]);

      expect(result.savedCount).toBe(3);
    });

    it('should still validate an optional question that was answered', async () => {
      await expectErrors(
        service.submit('enr-1', 7, [
          ...complete(),
          { questionId: Q4, textAnswer: 'ngắn' },
        ]),
        { [Q4]: 'textTooShort' },
      );
    });

    it('should store free text trimmed', async () => {
      await service.submit('enr-1', 7, [
        {
          questionId: Q1,
          textAnswer: '\n  Muốn thử sức với ngành tài chính  \t',
        },
        ...complete().slice(1),
      ]);

      const writes = deps.answers.upsertForEnrollment.mock.calls[0][1] as {
        textAnswer: string | null;
      }[];

      expect(writes[0].textAnswer).toBe('Muốn thử sức với ngành tài chính');
    });
  });

  describe('text normalisation', () => {
    // "ệ" typed as e + combining circumflex + combining dot below is three
    // code points. Some Vietnamese input methods produce exactly that.
    it('should count a decomposed Vietnamese character as one', () => {
      const decomposed = 'Hệ'.normalize('NFD');

      expect(decomposed.length).toBe(4);
      expect(normaliseText(decomposed)).toHaveLength(2);
    });

    it('should treat null and undefined as empty', () => {
      expect(normaliseText(null)).toBe('');
      expect(normaliseText(undefined)).toBe('');
    });
  });

  describe('upsert', () => {
    it('should send the whole form in one call so it lands in one transaction', async () => {
      await service.submit('enr-1', 7, complete());

      expect(deps.answers.upsertForEnrollment).toHaveBeenCalledTimes(1);
    });

    it('should produce identical writes when the same form is submitted twice', async () => {
      await service.submit('enr-1', 7, complete());
      await service.submit('enr-1', 7, complete());

      const [first, second] = deps.answers.upsertForEnrollment.mock.calls;

      expect(second).toEqual(first);
    });
  });

  describe('localisation (D5)', () => {
    it('should serve Vietnamese by default', async () => {
      const { questions: view } = await inLocale('vi', () =>
        service.questionsForCourse('course-1'),
      );

      expect(view[1].questionText).toBe(
        'Bạn đạt được gì sau khi hoàn thành khóa học',
      );
      expect(view[1].options?.[0].label).toBe('Có thể hợp');
    });

    it('should serve English when the request asks for it', async () => {
      const { questions: view } = await inLocale('en', () =>
        service.questionsForCourse('course-1'),
      );

      expect(view[1].questionText).toBe('What did you gain?');
      expect(view[1].options?.[1].label).toBe('Not suited');
    });

    it('should fall back to Vietnamese for a label with no translation', async () => {
      const { questions: view } = await inLocale('en', () =>
        service.questionsForCourse('course-1'),
      );

      expect(view[1].options?.[2].label).toBe('Chưa xác định');
    });

    it('should fall back to Vietnamese for question text with no translation', async () => {
      const { questions: view } = await inLocale('en', () =>
        service.questionsForCourse('course-1'),
      );

      expect(view[2].questionText).toBe('Feedback về chất lượng khóa học');
    });

    it('should never ship the raw translation maps', async () => {
      const result = await service.questionsForCourse('course-1');

      expect(JSON.stringify(result)).not.toContain('Translations');
    });

    it('should return options as null for free text', async () => {
      const { questions: view } = await service.questionsForCourse('course-1');

      expect(view[0].options).toBeNull();
    });
  });

  describe('reading', () => {
    it('should send the minimum length with the questions', async () => {
      const result = await service.questionsForCourse('course-1');

      expect(result.rules).toEqual({ minTextLength: 10 });
    });

    it('should return questions, answers and rules for pre-filling', async () => {
      deps.answers.findByEnrollmentId.mockResolvedValue([
        {
          question: { id: Q2 },
          ratingAnswer: 3,
          textAnswer: null,
          submittedAt: new Date('2026-09-01T00:00:00Z'),
          updatedAt: new Date('2026-09-02T00:00:00Z'),
        },
      ]);

      const result = await service.getForEnrollment('enr-1', 7);

      expect(result.questions).toHaveLength(4);
      expect(result.answers).toEqual([
        {
          questionId: Q2,
          ratingAnswer: 3,
          textAnswer: null,
          submittedAt: new Date('2026-09-01T00:00:00Z'),
          updatedAt: new Date('2026-09-02T00:00:00Z'),
        },
      ]);
      expect(result.rules.minTextLength).toBe(10);
    });

    it('should not pre-fill an answer to a question that is no longer on the form', async () => {
      deps.answers.findByEnrollmentId.mockResolvedValue([
        {
          question: { id: 'retired-slider' },
          ratingAnswer: 4,
          textAnswer: null,
        },
      ]);

      const result = await service.getForEnrollment('enr-1', 7);

      expect(result.answers).toEqual([]);
    });
  });

  describe('ownership', () => {
    it('should 404 an enrollment that does not exist', async () => {
      deps.enrollments.findById.mockResolvedValue(null);

      await expect(
        service.submit('nope', 7, complete()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should 403 another student's enrollment", async () => {
      await expect(
        service.submit('enr-1', 99, complete()),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.getForEnrollment('enr-1', 99),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
