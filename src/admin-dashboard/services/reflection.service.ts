import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CareerReflectionAnswerEntity } from '../../career-reflection-answers/infrastructure/persistence/relational/entities/career-reflection-answer.entity';
import {
  CareerReflectionOption,
  SELECTION_TYPE,
} from '../../career-reflection-questions/career-reflection-question-types';
import { CareerReflectionQuestionEntity } from '../../career-reflection-questions/infrastructure/persistence/relational/entities/career-reflection-question.entity';
import { LocaleContext } from '../../utils/i18n/locale-context';
import { pickLocalized } from '../../utils/i18n/pick-localized';
import { TranslationMap } from '../../utils/i18n/translation-map.type';
import { DashboardFilters, MetricsQueryService } from './metrics-query.service';

const { num, round } = MetricsQueryService;

export type OptionCount = {
  key: number;
  label: string;
  count: number;
  /** Share of this question's answers. `null` when nobody answered it. */
  pct: number | null;
};

export type SelectionDistribution = {
  questionId: string;
  questionText: string;
  displayOrder: number;
  /** `null` for a global question. */
  courseId: string | null;
  /** Answers to this question in the window. */
  answered: number;
  /**
   * Share of all responses that answered this question — Epic 4.6 §6's
   * "Q2 response share", generalised to every question.
   */
  responseShare: number | null;
  options: OptionCount[];
};

export type FreeTextQuestion = {
  questionId: string;
  questionText: string;
  displayOrder: number;
  courseId: string | null;
  answered: number;
};

export type ReflectionSummary = {
  /** One bar chart per selection question (E1, E2, E3 on the seeded form). */
  selections: SelectionDistribution[];
  /** The questions `/reflection/comments` can be filtered by (F). */
  freeText: FreeTextQuestion[];
  /** Distinct enrolments that submitted at least one answer in the window. */
  totalResponses: number;
  /** Individual answer rows, several per response. */
  totalAnswers: number;
  responseRate: {
    /** Percent, or `null` when nobody completed a course in the window. */
    rate: number | null;
    responded: number;
    completed: number;
  };
};

export type ReflectionComment = {
  answerId: string;
  text: string;
  questionId: string;
  questionText: string;
  questionOrder: number;
  courseTitle: string;
  submittedAt: Date | null;
};

type QuestionRow = {
  id: string;
  questionType: string;
  questionText: string;
  questionTextTranslations: TranslationMap | null;
  options: CareerReflectionOption[] | null;
  displayOrder: number;
  courseId: string | null;
};

/**
 * Epic 7 BE-4, reworked by Epic 4.6 §6.
 *
 * The radar over six Likert categories is gone: the reworked form asks
 * single-choice questions whose options are categories, not points on a
 * scale, so an average of them would mean nothing. Each selection question is
 * now a distribution — how many chose each option.
 *
 * It is driven by the question rows rather than hardcoded to Q2/Q3/Q5, so an
 * admin who adds or edits a question changes the dashboard without a deploy.
 *
 * Every query is a `createQueryBuilder` with explicit selects:
 * `CareerReflectionAnswerEntity.question` and `.enrollment` are `eager`, so a
 * `find()` would hydrate two joined objects per answer row.
 */
@Injectable()
export class ReflectionService {
  constructor(
    private readonly metrics: MetricsQueryService,
    @InjectRepository(CareerReflectionAnswerEntity)
    private readonly answers: Repository<CareerReflectionAnswerEntity>,
    @InjectRepository(CareerReflectionQuestionEntity)
    private readonly questions: Repository<CareerReflectionQuestionEntity>,
  ) {}

  private scopedAnswers(filters: DashboardFilters, alias = 'answer') {
    const qb = this.answers
      .createQueryBuilder(alias)
      .innerJoin(`${alias}.enrollment`, 'enrollment');

    this.metrics.applyFilters(qb, filters, 'enrollment.course_id');
    this.metrics.applyWindow(qb, filters.period, `${alias}.submitted_at`);

    return qb;
  }

  async summary(filters: DashboardFilters): Promise<ReflectionSummary> {
    const [questions, counts, totals, rate] = await Promise.all([
      this.questionsInScope(filters),
      this.optionCounts(filters),
      this.totals(filters),
      this.responseRate(filters),
    ]);

    const locale = LocaleContext.current();
    const byQuestion = new Map<string, Map<number | null, number>>();

    for (const row of counts) {
      const perKey = byQuestion.get(row.questionId) ?? new Map();
      perKey.set(row.key, row.count);
      byQuestion.set(row.questionId, perKey);
    }

    const text = (q: QuestionRow) =>
      pickLocalized(q.questionTextTranslations, locale, q.questionText);
    const answeredFor = (id: string) =>
      [...(byQuestion.get(id)?.values() ?? [])].reduce((a, b) => a + b, 0);

    const selections: SelectionDistribution[] = [];
    const freeText: FreeTextQuestion[] = [];

    for (const question of questions) {
      const answered = answeredFor(question.id);

      if (question.questionType !== SELECTION_TYPE) {
        freeText.push({
          questionId: question.id,
          questionText: text(question),
          displayOrder: question.displayOrder,
          courseId: question.courseId,
          answered,
        });
        continue;
      }

      const perKey = byQuestion.get(question.id) ?? new Map();

      selections.push({
        questionId: question.id,
        questionText: text(question),
        displayOrder: question.displayOrder,
        courseId: question.courseId,
        answered,
        responseShare: totals.responses
          ? round((answered / totals.responses) * 100)
          : null,
        // Every declared option appears, zero included, in the admin's display
        // order — a choice nobody picked is a finding, not a gap.
        options: (question.options ?? []).map((option) => {
          const count = perKey.get(option.key) ?? 0;

          return {
            key: option.key,
            label: pickLocalized(
              option.labelTranslations,
              locale,
              option.label,
            ),
            count,
            pct: answered ? round((count / answered) * 100) : null,
          };
        }),
      });
    }

    return {
      selections,
      freeText,
      totalResponses: totals.responses,
      totalAnswers: totals.answers,
      responseRate: rate,
    };
  }

  /**
   * The active questions this view is about: the global ones, plus
   * course-specific ones for the courses in scope.
   *
   * Active only. Every Epic 4.1 Likert question was deactivated by the rework,
   * and listing them would put the retired radar back on the page as a row of
   * empty charts.
   */
  private async questionsInScope(
    filters: DashboardFilters,
  ): Promise<QuestionRow[]> {
    const qb = this.questions
      .createQueryBuilder('question')
      .select('question.id', 'id')
      .addSelect('question.question_type', 'questionType')
      .addSelect('question.question_text', 'questionText')
      .addSelect(
        'question.question_text_translations',
        'questionTextTranslations',
      )
      .addSelect('question.options', 'options')
      .addSelect('question.display_order', 'displayOrder')
      .addSelect('question.course_id', 'courseId')
      .where('question.is_active = true');

    // A global question is always in scope. A course-specific one is in scope
    // when its course survives the same filters as the answers — the two
    // conditions are ANDed exactly as `applyFilters` ANDs them.
    if (filters.courseId) {
      qb.andWhere(
        '(question.course_id IS NULL OR question.course_id = :courseId)',
        { courseId: filters.courseId },
      );
    }

    // Permission model §1.9 — other courses' questions stay out of scope.
    if (filters.courseIds) {
      qb.andWhere(
        filters.courseIds.length
          ? '(question.course_id IS NULL OR question.course_id IN (:...scopeCourseIds))'
          : 'question.course_id IS NULL',
        { scopeCourseIds: filters.courseIds },
      );
    }

    if (filters.groupId) {
      qb.andWhere(
        `(question.course_id IS NULL OR question.course_id IN (
           SELECT cga."course_id" FROM "course_group_assignment" cga
            WHERE cga."group_id" = :groupId
         ))`,
        { groupId: filters.groupId },
      );
    }

    return qb
      .orderBy('question.course_id', 'ASC', 'NULLS FIRST')
      .addOrderBy('question.display_order', 'ASC')
      .addOrderBy('question.created_at', 'ASC')
      .getRawMany<QuestionRow>()
      .then((rows) =>
        rows.map((row) => ({ ...row, displayOrder: Number(row.displayOrder) })),
      );
  }

  /** Answers per (question, option key) in the window. Free text has key null. */
  private async optionCounts(filters: DashboardFilters) {
    const rows = await this.scopedAnswers(filters)
      .select('answer.question_id', 'questionId')
      .addSelect('answer.rating_answer', 'key')
      .addSelect('COUNT(answer.id)', 'count')
      .groupBy('answer.question_id')
      .addGroupBy('answer.rating_answer')
      .getRawMany<{ questionId: string; key: string | null; count: string }>();

    return rows.map((row) => ({
      questionId: row.questionId,
      key: row.key === null ? null : Number(row.key),
      count: num(row.count) ?? 0,
    }));
  }

  private async totals(filters: DashboardFilters) {
    const row = await this.scopedAnswers(filters)
      .select('COUNT(answer.id)', 'answers')
      .addSelect('COUNT(DISTINCT answer.enrollment_id)', 'responses')
      .getRawOne<{ answers: string; responses: string }>();

    return {
      answers: num(row?.answers) ?? 0,
      responses: num(row?.responses) ?? 0,
    };
  }

  /**
   * Responded ÷ completed.
   *
   * The denominator is completed enrolments because the form is only offered
   * after completion — measuring against all enrolments would report a rate
   * no amount of prompting could ever move. Both sides are the same cohort,
   * enrolments that completed inside the window, which keeps it ≤ 100%.
   */
  private async responseRate(filters: DashboardFilters) {
    const qb = this.metrics
      .enrollmentQuery()
      .select('COUNT(enrollment.id)', 'completed')
      .addSelect(
        `COUNT(enrollment.id) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM "career_reflection_answer" a
              WHERE a."enrollment_id" = enrollment.id
           )
         )`,
        'responded',
      )
      .where("enrollment.status = 'completed'");

    this.metrics.applyFilters(qb, filters, 'enrollment.course_id');
    this.metrics.applyWindow(qb, filters.period, 'enrollment.completedAt');

    const row = await qb.getRawOne<{ completed: string; responded: string }>();
    const completed = num(row?.completed) ?? 0;
    const responded = num(row?.responded) ?? 0;

    return {
      rate: completed ? round((responded / completed) * 100) : null,
      responded,
      completed,
    };
  }

  /**
   * Free-text answers, newest first (F) — Q1 purpose and Q4 feedback on the
   * seeded form. `questionId` narrows to one question.
   */
  async comments(
    filters: DashboardFilters,
    page: number,
    limit: number,
    questionId?: string,
  ): Promise<{ items: ReflectionComment[]; total: number }> {
    const qb = this.scopedAnswers(filters)
      .innerJoin('enrollment.course', 'course')
      .innerJoin('answer.question', 'question')
      .select('answer.id', 'answerId')
      .addSelect('answer.text_answer', 'text')
      .addSelect('question.id', 'questionId')
      .addSelect('question.question_text', 'questionText')
      .addSelect(
        'question.question_text_translations',
        'questionTextTranslations',
      )
      .addSelect('question.display_order', 'questionOrder')
      .addSelect('course.title', 'courseTitle')
      .addSelect('answer.submitted_at', 'submittedAt')
      .andWhere('answer.text_answer IS NOT NULL')
      .andWhere("TRIM(answer.text_answer) <> ''")
      .orderBy('answer.submitted_at', 'DESC')
      .addOrderBy('answer.id', 'DESC');

    if (questionId) {
      qb.andWhere('question.id = :questionId', { questionId });
    }

    const total = await qb.getCount();
    const rows = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<
        ReflectionComment & { questionTextTranslations: TranslationMap | null }
      >();
    const locale = LocaleContext.current();

    return {
      items: rows.map(({ questionTextTranslations, ...row }) => ({
        ...row,
        questionText: pickLocalized(
          questionTextTranslations,
          locale,
          row.questionText,
        ),
        questionOrder: Number(row.questionOrder),
      })),
      total,
    };
  }
}
