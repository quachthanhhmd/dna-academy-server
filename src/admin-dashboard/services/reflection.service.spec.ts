import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { CareerReflectionAnswerEntity } from '../../career-reflection-answers/infrastructure/persistence/relational/entities/career-reflection-answer.entity';
import { CareerReflectionQuestionEntity } from '../../career-reflection-questions/infrastructure/persistence/relational/entities/career-reflection-question.entity';
import { LocaleContext, LocaleHolder } from '../../utils/i18n/locale-context';
import { resolvePeriod } from '../period';
import { DashboardFilters, MetricsQueryService } from './metrics-query.service';
import { ReflectionService } from './reflection.service';

/** A query builder that records what was asked of it and returns fixed rows. */
const makeQb = (
  many: Record<string, unknown>[] = [],
  one: Record<string, unknown> = {},
) => {
  const qb: Record<string, unknown> = {};
  const chain = () => qb;

  for (const method of [
    'innerJoin',
    'select',
    'addSelect',
    'where',
    'andWhere',
    'groupBy',
    'addGroupBy',
    'orderBy',
    'addOrderBy',
    'offset',
    'limit',
  ]) {
    qb[method] = jest.fn(chain);
  }

  qb.getRawMany = jest.fn(() => Promise.resolve(many));
  qb.getRawOne = jest.fn(() => Promise.resolve(one));
  qb.getCount = jest.fn(() => Promise.resolve(many.length));

  return qb;
};

const Q2 = 'q2';
const Q1 = 'q1';

/** Epic 7 BE-4 as reworked by Epic 4.6 §6. */
describe('ReflectionService (dashboard)', () => {
  let service: ReflectionService;
  let answers: Repository<CareerReflectionAnswerEntity>;
  let questions: Repository<CareerReflectionQuestionEntity>;
  let countsQb: ReturnType<typeof makeQb>;
  let totalsQb: ReturnType<typeof makeQb>;
  let questionQb: ReturnType<typeof makeQb>;
  let enrollmentQb: ReturnType<typeof makeQb>;

  const filters: DashboardFilters = {
    period: resolvePeriod(
      '30d',
      undefined,
      undefined,
      new Date('2026-09-15T02:00:00Z'),
    ),
  };

  const questionRows = [
    {
      id: Q1,
      questionType: 'free_text',
      questionText: 'Mục đích ban đầu?',
      questionTextTranslations: { en: 'Purpose?' },
      options: null,
      displayOrder: '1',
      courseId: null,
    },
    {
      id: Q2,
      questionType: 'selection',
      questionText: 'Bạn đạt được gì?',
      questionTextTranslations: { en: 'What did you gain?' },
      // Displayed in this order, which is not key order.
      options: [
        { key: 3, label: 'Chưa xác định' },
        { key: 1, label: 'Có thể hợp', labelTranslations: { en: 'Could fit' } },
        { key: 2, label: 'Không hợp' },
      ],
      displayOrder: '2',
      courseId: null,
    },
  ];

  beforeEach(() => {
    countsQb = makeQb([
      { questionId: Q2, key: '1', count: '6' },
      { questionId: Q2, key: '3', count: '2' },
      { questionId: Q1, key: null, count: '9' },
    ]);
    totalsQb = makeQb([], { answers: '17', responses: '10' });
    questionQb = makeQb(questionRows);
    enrollmentQb = makeQb([], { completed: '20', responded: '10' });

    let answerCall = 0;
    answers = {
      // summary() builds the counts query first, then the totals query.
      createQueryBuilder: jest.fn(() =>
        answerCall++ % 2 === 0 ? countsQb : totalsQb,
      ),
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as Repository<CareerReflectionAnswerEntity>;

    questions = {
      createQueryBuilder: jest.fn(() => questionQb),
      find: jest.fn(),
    } as unknown as Repository<CareerReflectionQuestionEntity>;

    const metrics = {
      enrollmentQuery: jest.fn(() => enrollmentQb),
      applyFilters: jest.fn((qb: unknown) => qb),
      applyWindow: jest.fn((qb: unknown) => qb),
    } as unknown as MetricsQueryService;

    service = new ReflectionService(metrics, answers, questions);
  });

  it('should aggregate through the query builder, never find()', async () => {
    await service.summary(filters);

    expect(answers.createQueryBuilder).toHaveBeenCalled();
    expect(answers.find).not.toHaveBeenCalled();
    expect(answers.findOne).not.toHaveBeenCalled();
    expect(questions.find).not.toHaveBeenCalled();
  });

  it('should return one distribution per selection question', async () => {
    const summary = await service.summary(filters);

    expect(summary.selections).toHaveLength(1);
    expect(summary.selections[0].questionId).toBe(Q2);
  });

  it('should list every declared option, zero included, in display order', async () => {
    const summary = await service.summary(filters);

    expect(summary.selections[0].options).toEqual([
      { key: 3, label: 'Chưa xác định', count: 2, pct: 25 },
      { key: 1, label: 'Có thể hợp', count: 6, pct: 75 },
      { key: 2, label: 'Không hợp', count: 0, pct: 0 },
    ]);
  });

  it('should count the answers to a question and its share of responses', async () => {
    const summary = await service.summary(filters);

    expect(summary.selections[0].answered).toBe(8);
    expect(summary.selections[0].responseShare).toBe(80);
  });

  it('should list free-text questions separately, for the comments filter', async () => {
    const summary = await service.summary(filters);

    expect(summary.freeText).toEqual([
      {
        questionId: Q1,
        questionText: 'Mục đích ban đầu?',
        displayOrder: 1,
        courseId: null,
        answered: 9,
      },
    ]);
  });

  it('should return a null share for a question nobody answered, not zero', async () => {
    countsQb.getRawMany = jest.fn(() => Promise.resolve([]));
    totalsQb.getRawOne = jest.fn(() =>
      Promise.resolve({ answers: '0', responses: '0' }),
    );

    const summary = await service.summary(filters);

    expect(summary.selections[0].answered).toBe(0);
    expect(summary.selections[0].responseShare).toBeNull();
    expect(summary.selections[0].options.every((o) => o.pct === null)).toBe(
      true,
    );
  });

  it('should compute the response rate against completed enrolments', async () => {
    const summary = await service.summary(filters);

    expect(summary.responseRate).toEqual({
      rate: 50,
      responded: 10,
      completed: 20,
    });
  });

  it('should return a null rate when nobody completed, not zero', async () => {
    enrollmentQb.getRawOne = jest.fn(() =>
      Promise.resolve({ completed: '0', responded: '0' }),
    );

    const summary = await service.summary(filters);

    expect(summary.responseRate.rate).toBeNull();
  });

  it('should read active questions only, so the retired Likert form stays gone', async () => {
    await service.summary(filters);

    expect(questionQb.where).toHaveBeenCalledWith('question.is_active = true');
  });

  it('should localise question text and option labels', async () => {
    const holder = new LocaleHolder();
    holder.explicit = 'en';

    const summary = await LocaleContext.run(holder, () =>
      service.summary(filters),
    );

    expect(summary.selections[0].questionText).toBe('What did you gain?');
    expect(summary.selections[0].options[1].label).toBe('Could fit');
    // No English for this one — Vietnamese fallback.
    expect(summary.selections[0].options[0].label).toBe('Chưa xác định');
  });

  describe('comments', () => {
    beforeEach(() => {
      answers.createQueryBuilder = jest.fn(() => countsQb) as never;
    });

    it('should scope comments to non-empty text', async () => {
      await service.comments(filters, 1, 20);

      const clauses = (countsQb.andWhere as jest.Mock).mock.calls
        .map((call) => String(call[0]))
        .join(' ');

      expect(clauses).toContain('text_answer IS NOT NULL');
      expect(clauses).toContain("TRIM(answer.text_answer) <> ''");
    });

    it('should filter by question when one is given', async () => {
      await service.comments(filters, 1, 20, Q1);

      expect(countsQb.andWhere).toHaveBeenCalledWith(
        'question.id = :questionId',
        { questionId: Q1 },
      );
    });

    it('should not filter by question when none is given', async () => {
      await service.comments(filters, 1, 20);

      const clauses = (countsQb.andWhere as jest.Mock).mock.calls.map((call) =>
        String(call[0]),
      );

      expect(clauses).not.toContain('question.id = :questionId');
    });

    it('should page with offset and limit', async () => {
      await service.comments(filters, 3, 20);

      expect(countsQb.offset).toHaveBeenCalledWith(40);
      expect(countsQb.limit).toHaveBeenCalledWith(20);
    });

    it('should never leak the raw translation map into an item', async () => {
      countsQb.getRawMany = jest.fn(() =>
        Promise.resolve([
          {
            answerId: 'a1',
            text: 'Nên thêm bài tập',
            questionId: Q1,
            questionText: 'Feedback?',
            questionTextTranslations: { en: 'Feedback in English' },
            questionOrder: '4',
            courseTitle: 'Toán',
            submittedAt: null,
          },
        ]),
      );

      const { items } = await service.comments(filters, 1, 20);

      expect(items[0]).not.toHaveProperty('questionTextTranslations');
      expect(items[0].questionOrder).toBe(4);
    });
  });
});
